const { createServer } = require('node:http');
const { createCatalogHandler } = require('./catalog-http');
const { createCatalogReader } = require('./catalog-postgres');
const { createApiHandler } = require('./operations-http');
const { connectToCloudSql, requiredEnvironment } = require('./db/cloud-sql');

async function start() {
  const readerPassword = requiredEnvironment('MEMOS_CLOUD_CATALOG_PASSWORD');
  const operationsPassword = requiredEnvironment('MEMOS_CLOUD_OPERATIONS_PASSWORD');
  const { connector, options } = await connectToCloudSql();
  try {
    const connection = { ...options, database: 'memos_pizza' };
    const catalog = createCatalogReader({
      ...connection, user: 'memos_catalogo_lector', password: readerPassword,
    });
    await catalog();
    const handler = createApiHandler(createCatalogHandler(catalog), {
      ...connection, user: 'memos_operacion', password: operationsPassword,
    }, {
      origins: ['https://memos-family-dinner.web.app', 'https://memos-family-dinner.firebaseapp.com'],
      secureCookies: true,
    });
    const server = createServer({ requestTimeout: 15000 }, handler);
    server.listen(Number(process.env.PORT ?? 8080), '0.0.0.0');
    process.on('SIGTERM', () => {
      server.close(() => {
        connector.close();
        process.exit(0);
      });
    });
  } catch (error) {
    connector.close();
    throw error;
  }
}

start().catch(error => {
  console.error('La API no pudo abrir el catálogo de PostgreSQL.', error.code ?? error.name);
  process.exitCode = 1;
});
