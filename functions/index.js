const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { createCatalogHandler } = require('./catalog-http');
const { createCatalogReader } = require('./catalog-postgres');
const { createApiHandler } = require('./operations-http');

const databaseUrl = defineSecret('MEMOS_PIZZA_DATABASE_URL');
const operationsDatabaseUrl = defineSecret('MEMOS_PIZZA_OPERATIONS_DATABASE_URL');
let api;

exports.memosPizzaApi = onRequest(
  {
    region: 'us-central1',
    secrets: [databaseUrl, operationsDatabaseUrl],
    maxInstances: 2,
    concurrency: 8,
    timeoutSeconds: 30,
  },
  (req, res) => {
    api ??= createApiHandler(
      createCatalogHandler(createCatalogReader(databaseUrl.value())),
      operationsDatabaseUrl.value(),
      {
        origins: ['https://memos-family-dinner.web.app', 'https://memos-family-dinner.firebaseapp.com'],
        secureCookies: true,
      },
    );
    return api(req, res);
  },
);
