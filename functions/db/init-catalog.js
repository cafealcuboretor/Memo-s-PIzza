const { readFile } = require('node:fs/promises');
const { join } = require('node:path');
const { Client } = require('pg');
const products = require('../catalog.json');

async function initializeCatalog(connectionString) {
  const schema = await readFile(join(__dirname, '001_catalogo.sql'), 'utf8');
  const client = new Client({ connectionString, connectionTimeoutMillis: 5000 });
  await client.connect();

  try {
    await client.query('BEGIN');
    await client.query(schema);
    const categories = [...new Set(products.map(product => product.category))];
    await client.query(
      `INSERT INTO memos_pizza.categorias (codigo)
       SELECT unnest($1::text[])
       ON CONFLICT (codigo) DO NOTHING`,
      [categories],
    );

    let added = 0;
    for (const [position, product] of products.entries()) {
      const result = await client.query(
        `INSERT INTO memos_pizza.productos (
           sku, categoria, nombre, descripcion, precio_centavos, emoji, imagen,
           etiqueta, insignia_texto, insignia_color, posicion
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (sku) DO NOTHING`,
        [
          product.id, product.category, product.name, product.description, product.priceCents,
          product.emoji, product.image, product.tag ?? null, product.badgeText ?? null,
          product.badgeColor ?? null, position,
        ],
      );
      added += result.rowCount;
    }

    await client.query('COMMIT');
    return added;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  const connectionString = process.env.MEMOS_PIZZA_DATABASE_URL;
  if (!connectionString) {
    console.error('Configura MEMOS_PIZZA_DATABASE_URL antes de inicializar el catálogo.');
    process.exitCode = 1;
  } else {
    initializeCatalog(connectionString)
      .then(added => console.log(`Catálogo listo. Productos agregados: ${added}.`))
      .catch(error => {
        console.error('No se pudo inicializar el catálogo PostgreSQL.', error.code ?? '');
        process.exitCode = 1;
      });
  }
}

module.exports = { initializeCatalog };
