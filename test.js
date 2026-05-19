require('dotenv').config();
const sql = require('mssql');
sql.connect({
  server: 'localhost',
  database: 'LicenciasLaredo',
  user: 'licencias_user',
  password: 'Licencias2026!',
  port: 1433,
  options: { encrypt: false, trustServerCertificate: true }
}).then(() => { console.log('CONEXION OK'); process.exit(0); })
  .catch(e => { console.error('ERROR:', e.message); process.exit(1); });