const { Connector } = require('@google-cloud/cloud-sql-connector');

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Configura ${name}.`);
  return value;
}

async function connectToCloudSql() {
  const connector = new Connector();
  try {
    const options = await connector.getOptions({
      instanceConnectionName: requiredEnvironment('MEMOS_CLOUD_SQL_INSTANCE'),
      ipType: 'PRIVATE',
    });
    return { connector, options };
  } catch (error) {
    connector.close();
    throw error;
  }
}

module.exports = { connectToCloudSql, requiredEnvironment };
