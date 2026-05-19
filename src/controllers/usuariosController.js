const { getPool, sql } = require('../db/connection');
const bcrypt = require('bcryptjs');

async function listar(req, res, next) {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT id_usuario, nombre_completo, cargo, email, username, rol, activo
      FROM Usuarios
      ORDER BY nombre_completo
    `);
    res.json(result.recordset);
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const { nombre_completo, cargo, email, username, password, rol } = req.body;

    const pool = await getPool();

    const emailCheck = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT id_usuario FROM Usuarios WHERE email = @email');
    if (emailCheck.recordset.length > 0) {
      return res.status(400).json({ error: 'Ya existe un usuario con ese correo electrónico.' });
    }

    const usernameCheck = await pool.request()
      .input('username', sql.NVarChar, username)
      .query('SELECT id_usuario FROM Usuarios WHERE username = @username');
    if (usernameCheck.recordset.length > 0) {
      return res.status(400).json({ error: 'Ya existe un usuario con ese nombre de usuario.' });
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await pool.request()
      .input('nombre_completo', sql.NVarChar, nombre_completo)
      .input('cargo',           sql.NVarChar, cargo || null)
      .input('email',           sql.NVarChar, email)
      .input('username',        sql.NVarChar, username)
      .input('password_hash',   sql.NVarChar, hash)
      .input('rol',             sql.NVarChar, rol)
      .query(`
        INSERT INTO Usuarios (nombre_completo, cargo, email, username, password_hash, rol, activo)
        OUTPUT INSERTED.id_usuario
        VALUES (@nombre_completo, @cargo, @email, @username, @password_hash, @rol, 1)
      `);

    res.status(201).json({ mensaje: 'Usuario creado correctamente.', id_usuario: result.recordset[0].id_usuario });
  } catch (err) {
    next(err);
  }
}

async function actualizar(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const { nombre_completo, cargo, email, username, rol } = req.body;

    if (id === req.user.id && rol && rol !== 'administrador') {
      return res.status(400).json({ error: 'No puedes cambiar tu propio rol.' });
    }

    const pool = await getPool();

    if (email) {
      const emailCheck = await pool.request()
        .input('email', sql.NVarChar, email)
        .input('id',    sql.Int,      id)
        .query('SELECT id_usuario FROM Usuarios WHERE email = @email AND id_usuario != @id');
      if (emailCheck.recordset.length > 0) {
        return res.status(400).json({ error: 'Ya existe un usuario con ese correo electrónico.' });
      }
    }

    if (username) {
      const usernameCheck = await pool.request()
        .input('username', sql.NVarChar, username)
        .input('id',       sql.Int,      id)
        .query('SELECT id_usuario FROM Usuarios WHERE username = @username AND id_usuario != @id');
      if (usernameCheck.recordset.length > 0) {
        return res.status(400).json({ error: 'Ya existe un usuario con ese nombre de usuario.' });
      }
    }

    await pool.request()
      .input('id',             sql.Int,      id)
      .input('nombre_completo',sql.NVarChar, nombre_completo || null)
      .input('cargo',          sql.NVarChar, cargo || null)
      .input('email',          sql.NVarChar, email || null)
      .input('username',       sql.NVarChar, username || null)
      .input('rol',            sql.NVarChar, rol || null)
      .query(`
        UPDATE Usuarios SET
          nombre_completo = COALESCE(@nombre_completo, nombre_completo),
          cargo           = COALESCE(@cargo, cargo),
          email           = COALESCE(@email, email),
          username        = COALESCE(@username, username),
          rol             = COALESCE(@rol, rol)
        WHERE id_usuario = @id
      `);

    res.json({ mensaje: 'Usuario actualizado correctamente.' });
  } catch (err) {
    next(err);
  }
}

async function toggleActivo(req, res, next) {
  try {
    const id = parseInt(req.params.id);

    if (id === req.user.id) {
      return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta.' });
    }

    const pool = await getPool();

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        UPDATE Usuarios SET activo = CASE WHEN activo = 1 THEN 0 ELSE 1 END
        OUTPUT INSERTED.activo
        WHERE id_usuario = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const nuevoEstado = result.recordset[0].activo;
    res.json({ mensaje: `Usuario ${nuevoEstado ? 'activado' : 'desactivado'} correctamente.`, activo: nuevoEstado });
  } catch (err) {
    next(err);
  }
}

async function obtener(req, res, next) {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`SELECT id_usuario, nombre_completo, cargo, email, username, rol, activo FROM Usuarios WHERE id_usuario = @id`);
    if (!result.recordset[0])
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    res.json(result.recordset[0]);
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { password } = req.body;
    if (!password || password.length < 6)
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });

    const hash = await bcrypt.hash(password, 12);
    const pool = await getPool();
    const result = await pool.request()
      .input('id',   sql.Int,      req.params.id)
      .input('hash', sql.NVarChar, hash)
      .query(`UPDATE Usuarios SET password_hash = @hash WHERE id_usuario = @id`);

    if (result.rowsAffected[0] === 0)
      return res.status(404).json({ error: 'Usuario no encontrado.' });

    res.json({ mensaje: 'Contraseña restablecida correctamente.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, obtener, crear, actualizar, toggleActivo, resetPassword };
