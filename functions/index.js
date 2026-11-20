const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { createCatalogHandler } = require('./catalog-http');
const { createCatalogReader } = require('./catalog-postgres');

const databaseUrl = defineSecret('MEMOS_PIZZA_DATABASE_URL');
let loadCatalog;

exports.memosPizzaApi = onRequest(
  { region: 'us-central1', secrets: [databaseUrl] },
  createCatalogHandler(() => {
    loadCatalog ??= createCatalogReader(databaseUrl.value());
    return loadCatalog();
  }),
);
