const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { createCatalogHandler } = require('./catalog-http');
const { createCatalogReader } = require('./catalog-postgres');
const { createApiHandler } = require('./operations-http');

const databaseUrl = defineSecret('MEMOS_PIZZA_DATABASE_URL');
let loadCatalog;
const catalog = createCatalogHandler(() => {
  loadCatalog ??= createCatalogReader(databaseUrl.value());
  return loadCatalog();
});
const api = createApiHandler(catalog, process.env.MEMOS_PIZZA_OPERATIONS_DATABASE_URL, {
  origins: ['https://memos-family-dinner.web.app', 'https://memos-family-dinner.firebaseapp.com'],
  secureCookies: true,
});

exports.memosPizzaApi = onRequest(
  { region: 'us-central1', secrets: [databaseUrl] },
  api,
);
