require('dotenv').config();
const bcrypt = require('bcryptjs');
const path = require('path');
const { getPool, sql } = require(path.join(__dirname, '..', 'src', 'db', 'connection'));

async function crearAdmin() {
  const email    = process.argv[2] || 'admin@munilaredo.gob.pe';
  const password = process.argv[3] || 'Admin1234!';
  const nombre   = process.argv[4] || 'Administrador del Sistema';

  const hash = await bcrypt.hash(password, 12);

  const pool = await getPool();
  const result = await pool.request()
    .input('email',  sql.NVarChar, email)
    .input('hash',   sql.NVarChar, hash)
    .input('nombre', sql.NVarChar, nombre)
    .query(`
      UPDATE Usuarios
      SET password_hash = @hash, nombre_completo = @nombre
      WHERE email = @email
    `);

  if (result.rowsAffected[0] === 0) {
    console.log(`⚠ No se encontró el usuario con email: ${email}`);
    console.log('  Asegúrate de haber ejecutado el script SQL primero.');
  } else {
    console.log(`✔ Contraseña actualizada para: ${email}`);
  }
  process.exit(0);
}

crearAdmin().catch(err => { console.error(err); process.exit(1); });