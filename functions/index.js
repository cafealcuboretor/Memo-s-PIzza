const { onRequest } = require('firebase-functions/v2/https');
const { Pool } = require('pg');
const { createCatalogHandler } = require('./catalog-http');
const { readCatalog } = require('./catalog-postgres');

const connectionString = process.env.MEMOS_PIZZA_DATABASE_URL;
let loadCatalog;

if (connectionString) {
  const pool = new Pool({
    connectionString,
    max: 3,
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 10000,
  });
  pool.on('error', error => console.error('Se perdió una conexión de PostgreSQL.', error.code ?? ''));
  loadCatalog = () => readCatalog(pool);
}

exports.memosPizzaApi = onRequest({ region: 'us-central1' }, createCatalogHandler(loadCatalog));
