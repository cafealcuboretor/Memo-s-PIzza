const { createServer } = require('node:http');
const { createCatalogHandler } = require('./catalog-http');
const { createCatalogReader } = require('./catalog-postgres');

const loadCatalog = createCatalogReader(process.env.MEMOS_PIZZA_DATABASE_URL);
createServer(createCatalogHandler(loadCatalog)).listen(5001, '127.0.0.1', () => {
  console.log('Catálogo de Memo’s Pizza disponible en http://127.0.0.1:5001/api/products');
});
