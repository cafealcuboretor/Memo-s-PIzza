function connectionOptions(connection) {
  return typeof connection === 'string' ? { connectionString: connection } : connection;
}

module.exports = { connectionOptions };
