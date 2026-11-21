const { createHash, randomUUID } = require('node:crypto');
const { inTransaction } = require('./accounts-postgres');
const { ApiError, assertFields, field, invalidInput } = require('./operations-validation');

const stages = ['pagado', 'preparando', 'horneando', 'empaquetando', 'en-camino', 'entregado'];
const stageSeconds = [0, 20, 40, 60, 80, 110];
const shippingCents = 3500;
const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

const orderSelect = `
  SELECT p.*, c.nombre, c.correo, clock_timestamp() AS hora_servidor,
    (SELECT json_agg(json_build_object(
      'id', d.sku, 'name', d.nombre, 'price', d.precio_centavos::numeric / 100,
      'quantity', d.cantidad, 'emoji', d.emoji, 'image', d.imagen, 'category', d.categoria
    ) ORDER BY d.sku) FROM memos_pizza.partidas_pedido d WHERE d.pedido_id = p.id) AS items
  FROM memos_pizza.pedidos p JOIN memos_pizza.cuentas c ON c.id = p.cuenta_id
`;

function effectiveStage(order) {
  const elapsed = (order.hora_servidor - order.creado_en) / 1000;
  const timedStage = stageSeconds.findLastIndex(second => elapsed >= second);
  return Math.max(order.etapa_minima, timedStage);
}

function serializeOrder(order) {
  const stage = effectiveStage(order);
  return {
    id: order.id,
    folio: order.folio,
    source: 'server',
    createdAt: order.creado_en,
    status: stages[stage],
    nextStatus: stages[stage + 1] ?? null,
    items: order.items,
    delivery: order.entrega,
    subtotal: order.subtotal_centavos / 100,
    shippingCost: order.envio_centavos / 100,
    total: order.total_centavos / 100,
    payment: {
      receiptNumber: `RC-${order.folio}`,
      invoiceNumber: `DEMO-${order.folio}`,
      paidAt: order.creado_en,
      method: order.metodo === 'efectivo' ? 'efectivo' : 'tarjeta',
      simulated: true,
    },
    customer: { name: order.nombre, email: order.correo },
  };
}

function parseCheckout(input) {
  assertFields(input, ['items', 'delivery', 'method', 'expectedTotalCents', 'termsVersion', 'accountId']);
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 25) {
    throw invalidInput('Agrega entre 1 y 25 productos distintos.');
  }
  const items = input.items.map(item => {
    assertFields(item, ['sku', 'quantity']);
    const sku = field(item.sku, 'producto', 120);
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) {
      throw invalidInput('Cada producto admite entre 1 y 20 unidades.');
    }
    return { sku, quantity: item.quantity };
  }).sort((a, b) => a.sku.localeCompare(b.sku));
  if (new Set(items.map(item => item.sku)).size !== items.length) {
    throw invalidInput('Agrupa las unidades de cada producto.');
  }
  if (!['efectivo', 'tarjeta_simulada'].includes(input.method) || !Number.isSafeInteger(input.expectedTotalCents)
      || input.expectedTotalCents < shippingCents) {
    throw invalidInput('Revisa el total y el método de pago simulado.');
  }
  assertFields(input.delivery, ['customerName', 'phone', 'address', 'neighborhood', 'specialInstructions']);
  const delivery = {
    customerName: field(input.delivery.customerName, 'nombre de entrega', 100),
    phone: field(input.delivery.phone, 'teléfono', 30),
    address: field(input.delivery.address, 'dirección', 180),
    neighborhood: field(input.delivery.neighborhood, 'colonia', 100, false),
    specialInstructions: field(input.delivery.specialInstructions, 'instrucciones', 280, false),
  };
  if (!/^[+() .\d-]+$/.test(delivery.phone) || !/^\d{10,15}$/.test(delivery.phone.replace(/\D/g, ''))) {
    throw invalidInput('Escribe un teléfono de entrega de 10 a 15 dígitos.');
  }
  return { items, delivery, method: input.method, expectedTotalCents: input.expectedTotalCents };
}

async function readOrder(db, id, accountId) {
  const { rows: [order] } = await db.query(`
    ${orderSelect} WHERE p.id = $1 AND ($2::uuid IS NULL OR p.cuenta_id = $2)
  `, [id, accountId]);
  if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'No se encontró ese pedido.');
  return order;
}

function createOrders(pool) {
  return {
    async checkout(accountId, input, attempt) {
      if (!uuidPattern.test(attempt ?? '')) throw invalidInput('Falta el identificador del intento de compra.');
      if (input.accountId !== accountId) {
        throw new ApiError(409, 'ACCOUNT_CHANGED', 'La sesión cambió. Vuelve a abrir el carrito con tu cuenta.');
      }
      const checkout = parseCheckout(input);
      const requestHash = createHash('sha256').update(JSON.stringify(checkout)).digest('hex');
      return inTransaction(pool, async client => {
        // Serializa los reintentos de una misma cuenta sin permitir que la API edite su rol.
        await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [accountId]);
        const { rows: [existing] } = await client.query(`
          SELECT id, solicitud_hash FROM memos_pizza.pedidos WHERE cuenta_id = $1 AND intento = $2
        `, [accountId, attempt]);
        if (existing) {
          if (existing.solicitud_hash !== requestHash) {
            throw new ApiError(409, 'ATTEMPT_CONFLICT', 'Ese intento corresponde a otra compra.');
          }
          return { order: serializeOrder(await readOrder(client, existing.id, accountId)), created: false };
        }

        const quantities = new Map(checkout.items.map(item => [item.sku, item.quantity]));
        const { rows: products } = await client.query(`
          SELECT p.*, i.existencias FROM memos_pizza.productos p
          JOIN memos_pizza.inventario_demo i ON i.sku = p.sku
          WHERE p.sku = ANY($1::text[])
          ORDER BY i.sku FOR UPDATE OF i
        `, [[...quantities.keys()]]);
        if (products.length !== quantities.size) {
          throw new ApiError(409, 'PRODUCT_UNAVAILABLE', 'Uno de los productos ya no está disponible.');
        }
        let subtotal = 0;
        for (const product of products) {
          const quantity = quantities.get(product.sku);
          if (quantity > product.existencias) {
            throw new ApiError(409, 'INSUFFICIENT_STOCK', `Existencias de prueba insuficientes para ${product.nombre}.`);
          }
          subtotal += product.precio_centavos * quantity;
        }
        if (subtotal + shippingCents !== checkout.expectedTotalCents) {
          throw new ApiError(409, 'PRICE_CHANGED', 'El total cambió. Actualiza los productos del carrito antes de confirmar.');
        }

        const id = randomUUID();
        const folio = `MEM-${new Date().getUTCFullYear()}-${id.replace(/-/g, '').slice(0, 12).toUpperCase()}`;
        await client.query(`
          INSERT INTO memos_pizza.pedidos
            (id, folio, cuenta_id, intento, solicitud_hash, metodo, entrega, subtotal_centavos, envio_centavos, version_terminos)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [id, folio, accountId, attempt, requestHash, checkout.method, checkout.delivery, subtotal, shippingCents, input.termsVersion]);
        for (const product of products) {
          const quantity = quantities.get(product.sku);
          await client.query(`
            INSERT INTO memos_pizza.partidas_pedido
              (pedido_id, sku, nombre, emoji, imagen, categoria, precio_centavos, cantidad)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [id, product.sku, product.nombre, product.emoji, product.imagen, product.categoria, product.precio_centavos, quantity]);
          await client.query('UPDATE memos_pizza.inventario_demo SET existencias = existencias - $2 WHERE sku = $1', [product.sku, quantity]);
        }
        await client.query(`
          INSERT INTO memos_pizza.eventos_pedido (id, pedido_id, actor_id, etapa) VALUES ($1, $2, $3, 0)
        `, [randomUUID(), id, accountId]);
        return { order: serializeOrder(await readOrder(client, id, accountId)), created: true };
      });
    },

    async list(accountId) {
      const { rows } = await pool.query(`
        ${orderSelect}
        WHERE ($1::uuid IS NULL OR p.cuenta_id = $1)
        ORDER BY p.creado_en DESC, p.id DESC
        LIMIT 100
      `, [accountId]);
      return rows.map(serializeOrder);
    },

    async get(id, accountId) {
      return serializeOrder(await readOrder(pool, id, accountId));
    },

    async inventory() {
      const { rows } = await pool.query(`
        SELECT i.sku, p.nombre AS name, i.existencias AS stock
        FROM memos_pizza.inventario_demo i JOIN memos_pizza.productos p ON p.sku = i.sku
        ORDER BY p.posicion, i.sku
      `);
      return rows;
    },

    async advance(id, actorId, input) {
      assertFields(input, ['expectedStatus']);
      return inTransaction(pool, async client => {
        await client.query('SELECT id FROM memos_pizza.pedidos WHERE id = $1 FOR UPDATE', [id]);
        const order = await readOrder(client, id, null);
        const stage = effectiveStage(order);
        if (input.expectedStatus !== stages[stage] || stage >= stages.length - 1) {
          throw new ApiError(409, 'STAGE_CHANGED', 'La etapa cambió. Actualiza el pedido para continuar.');
        }
        const next = stage + 1;
        await client.query('UPDATE memos_pizza.pedidos SET etapa_minima = $2 WHERE id = $1', [id, next]);
        await client.query(`
          INSERT INTO memos_pizza.eventos_pedido (id, pedido_id, actor_id, etapa)
          VALUES ($1, $2, $3, $4)
        `, [randomUUID(), id, actorId, next]);
        return serializeOrder(await readOrder(client, id, null));
      });
    },
  };
}

module.exports = { createOrders, uuidPattern };
