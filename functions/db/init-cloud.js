const { readFile } = require('node:fs/promises');
const { join } = require('node:path');
const { Client } = require('pg');
const { initializeCatalog } = require('./init-catalog');
const { connectToCloudSql, requiredEnvironment } = require('./cloud-sql');

async function initializeCloudDatabase() {
  const roles = [
    ['memos_catalogo_lector', requiredEnvironment('MEMOS_CLOUD_CATALOG_PASSWORD')],
    ['memos_operacion', requiredEnvironment('MEMOS_CLOUD_OPERATIONS_PASSWORD')],
  ];
  if (roles.some(([, password]) => !/^[a-f0-9]{64}$/.test(password))) {
    throw new Error('Formato de credencial inesperado.');
  }
  const { connector, options } = await connectToCloudSql();
  const admin = { ...options, user: 'postgres', password: requiredEnvironment('MEMOS_CLOUD_OWNER_PASSWORD') };
  const postgres = new Client({ ...admin, database: 'postgres', connectionTimeoutMillis: 12000 });
  try {
    await postgres.connect();
    await postgres.query('SELECT pg_advisory_lock($1)', [28672317]);
    const database = await postgres.query('SELECT 1 FROM pg_database WHERE datname = $1', ['memos_pizza']);
    if (!database.rowCount) await postgres.query('CREATE DATABASE memos_pizza');
    for (const [name, password] of roles) {
      const existing = await postgres.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [name]);
      if (!existing.rowCount) await postgres.query(`CREATE ROLE ${name} LOGIN PASSWORD '${password}'`);
    }

    const connection = { ...admin, database: 'memos_pizza' };
    await initializeCatalog(connection);
    const db = new Client({ ...connection, connectionTimeoutMillis: 12000 });
    try {
      await db.connect();
      await db.query('BEGIN');
      for (const migration of ['002_operacion.sql', '003_permisos_operacion.sql']) {
        await db.query(await readFile(join(__dirname, migration), 'utf8'));
      }
      await db.query('COMMIT');
      const { rows: [{ products }] } = await db.query('SELECT count(*)::int AS products FROM memos_pizza.productos');
      console.log(`Catálogo y operación inicializados. Productos registrados: ${products}.`);
    } catch (error) {
      await db.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      await db.end();
    }
  } finally {
    try {
      await postgres.end();
    } finally {
      connector.close();
    }
  }
}

initializeCloudDatabase().catch(error => {
  console.error('No se pudo inicializar PostgreSQL.', error.code ?? error.name);
  process.exitCode = 1;
});
