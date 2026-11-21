const { Client } = require('pg');
const { connectToCloudSql, requiredEnvironment } = require('./cloud-sql');

async function removeTest() {
  const email = process.argv[2];
  if (!/^cloud-check-[a-z0-9]{32}@memos\.test$/.test(email ?? '')) {
    throw new Error('Se requiere el correo exacto de la prueba automatizada.');
  }
  const password = requiredEnvironment('MEMOS_CLOUD_OWNER_PASSWORD');
  const { connector, options } = await connectToCloudSql();
  const db = new Client({ ...options, database: 'memos_pizza', user: 'postgres', password });
  try {
    await db.connect();
    await db.query('BEGIN');
    const { rows: [account] } = await db.query(`
      SELECT id FROM memos_pizza.cuentas
      WHERE correo = $1 AND rol = 'cliente' AND nombre = 'Comprobación de backend'
      FOR UPDATE
    `, [email]);
    if (account) {
      const { rows: orders } = await db.query('SELECT id FROM memos_pizza.pedidos WHERE cuenta_id = $1', [account.id]);
      const ids = orders.map(order => order.id);
      await db.query(`
        UPDATE memos_pizza.inventario_demo i SET existencias = i.existencias + d.units
        FROM (
          SELECT sku, sum(cantidad)::integer AS units
          FROM memos_pizza.partidas_pedido WHERE pedido_id = ANY($1::uuid[]) GROUP BY sku
        ) d
        WHERE i.sku = d.sku
      `, [ids]);
      await db.query('DELETE FROM memos_pizza.eventos_pedido WHERE pedido_id = ANY($1::uuid[])', [ids]);
      await db.query('DELETE FROM memos_pizza.partidas_pedido WHERE pedido_id = ANY($1::uuid[])', [ids]);
      await db.query('DELETE FROM memos_pizza.pedidos WHERE id = ANY($1::uuid[])', [ids]);
      await db.query('DELETE FROM memos_pizza.sesiones WHERE cuenta_id = $1', [account.id]);
      await db.query('DELETE FROM memos_pizza.consentimientos WHERE cuenta_id = $1', [account.id]);
      await db.query('DELETE FROM memos_pizza.cuentas WHERE id = $1', [account.id]);
    }
    await db.query('COMMIT');
    console.log('Prueba temporal retirada de la base de datos.');
  } catch (error) {
    await db.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    try {
      await db.end();
    } finally {
      connector.close();
    }
  }
}

removeTest().catch(error => {
  console.error('No se pudo retirar la prueba temporal.', error.code ?? error.name);
  process.exitCode = 1;
});
