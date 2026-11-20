const { createServer } = require('node:http');
const { createCatalogHandler } = require('./catalog-http');
const { createCatalogReader } = require('./catalog-postgres');
const { createApiHandler } = require('./operations-http');

const loadCatalog = createCatalogReader(process.env.MEMOS_PIZZA_DATABASE_URL);
const origins = [4205, 5001].flatMap(port => ['localhost', '127.0.0.1'].map(host => `http://${host}:${port}`));
const api = createApiHandler(createCatalogHandler(loadCatalog), process.env.MEMOS_PIZZA_OPERATIONS_DATABASE_URL, {
  origins, secureCookies: false,
});
createServer(api).listen(5001, '127.0.0.1', () => {
  console.log('Catálogo de Memo’s Pizza disponible en http://127.0.0.1:5001/api/products');
});
