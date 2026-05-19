const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getPool, sql } = require('../db/connection');

async function login(req, res, next) {
  try {
    const { credencial, password } = req.body;
    if (!credencial || !password) {
      return res.status(400).json({ error: 'Usuario/correo y contraseña requeridos' });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('credencial', sql.NVarChar, credencial)
      .query(`SELECT id_usuario, nombre_completo, cargo, email, username, password_hash, rol, activo
              FROM Usuarios WHERE email = @credencial OR username = @credencial`);

    const usuario = result.recordset[0];
    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const valido = await bcrypt.compare(password, usuario.password_hash);
    if (!valido) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const token = jwt.sign(
      { id: usuario.id_usuario, rol: usuario.rol, nombre: usuario.nombre_completo },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      token,
      usuario: {
        id: usuario.id_usuario,
        nombre: usuario.nombre_completo,
        username: usuario.username,
        cargo: usuario.cargo,
        rol: usuario.rol,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function cambiarPassword(req, res, next) {
  try {
    const { password_actual, password_nuevo } = req.body;

    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.user.id)
      .query('SELECT password_hash FROM Usuarios WHERE id_usuario = @id AND activo = 1');

    const usuario = result.recordset[0];
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const valido = await bcrypt.compare(password_actual, usuario.password_hash);
    if (!valido) {
      return res.status(400).json({ error: 'La contraseña actual es incorrecta.' });
    }

    const nuevo_hash = await bcrypt.hash(password_nuevo, 10);
    await pool.request()
      .input('id', sql.Int, req.user.id)
      .input('hash', sql.NVarChar, nuevo_hash)
      .query('UPDATE Usuarios SET password_hash = @hash WHERE id_usuario = @id');

    res.json({ mensaje: 'Contraseña actualizada correctamente.' });
  } catch (err) {
    next(err);
  }
}

async function perfil(req, res, next) {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.user.id)
      .query(`SELECT id_usuario, nombre_completo, cargo, email, rol
              FROM Usuarios WHERE id_usuario = @id`);

    if (!result.recordset[0]) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(result.recordset[0]);
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const { id, rol, nombre } = req.user;
    const token = jwt.sign(
      { id, rol, nombre },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );
    res.json({ token });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, perfil, refresh, cambiarPassword };
