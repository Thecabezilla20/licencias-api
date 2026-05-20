const sql = require('mssql');

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: 1433,
  options: {
    encrypt: true,
    trustServerCertificate: false,
  },
  pool: {
    max: 10,
    min: 2,
    idleTimeoutMillis: 30000,
  },
};

let pool;

async function getPool() {
  if (pool?.connected) return pool;
  if (pool) {
    try { await pool.close(); } catch {}
    pool = null;
  }
  pool = await sql.connect(config);
  pool.on('error', () => { pool = null; });
  console.log('Conectado a Azure SQL — LicenciasLaredo');
  return pool;
}

module.exports = { getPool, sql };