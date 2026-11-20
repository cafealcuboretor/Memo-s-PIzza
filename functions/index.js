const { onRequest } = require('firebase-functions/v2/https');
const { handleCatalog } = require('./catalog-http');

exports.memosPizzaApi = onRequest({ region: 'us-central1' }, handleCatalog);
