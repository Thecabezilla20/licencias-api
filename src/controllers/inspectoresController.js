const { getPool, sql } = require('../db/connection');

async function listar(req, res, next) {
  try {
    const soloActivos = req.query.activo === 'true';
    const pool = await getPool();
    const request = pool.request();
    const where = soloActivos ? 'WHERE activo = 1' : '';
    const result = await request.query(`
        SELECT id_inspector, apellidos_nombres, dni, cargo,
               entidad, telefono, email, activo, fecha_registro
        FROM InspectoresITSE
        ${where}
        ORDER BY apellidos_nombres
      `);
    res.json(result.recordset);
  } catch (err) {
    next(err);
  }
}

async function obtener(req, res, next) {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`
        SELECT id_inspector, apellidos_nombres, dni, cargo,
               entidad, telefono, email, activo, fecha_registro
        FROM InspectoresITSE
        WHERE id_inspector = @id
      `);
    if (!result.recordset[0])
      return res.status(404).json({ error: 'Inspector no encontrado' });
    res.json(result.recordset[0]);
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const { apellidos_nombres, dni, cargo, entidad, telefono, email } = req.body;
    const pool = await getPool();
    const result = await pool.request()
      .input('apellidos_nombres', sql.NVarChar, apellidos_nombres)
      .input('dni',               sql.NVarChar, dni)
      .input('cargo',             sql.NVarChar, cargo || 'Inspector ITSE')
      .input('entidad',           sql.NVarChar, entidad || 'Defensa Civil - Municipalidad Distrital de Laredo')
      .input('telefono',          sql.NVarChar, telefono || null)
      .input('email',             sql.NVarChar, email || null)
      .query(`
        INSERT INTO InspectoresITSE
          (apellidos_nombres, dni, cargo, entidad, telefono, email)
        OUTPUT INSERTED.id_inspector
        VALUES
          (@apellidos_nombres, @dni, @cargo, @entidad, @telefono, @email)
      `);
    res.status(201).json({ id_inspector: result.recordset[0].id_inspector, mensaje: 'Inspector registrado' });
  } catch (err) {
    next(err);
  }
}

async function actualizar(req, res, next) {
  try {
    const { apellidos_nombres, dni, cargo, entidad, telefono, email, activo } = req.body;
    const pool = await getPool();
    const result = await pool.request()
      .input('id',               sql.Int,      req.params.id)
      .input('apellidos_nombres',sql.NVarChar, apellidos_nombres)
      .input('dni',              sql.NVarChar, dni)
      .input('cargo',            sql.NVarChar, cargo)
      .input('entidad',          sql.NVarChar, entidad)
      .input('telefono',         sql.NVarChar, telefono || null)
      .input('email',            sql.NVarChar, email || null)
      .input('activo',           sql.Bit,      activo ? 1 : 0)
      .query(`
        UPDATE InspectoresITSE SET
          apellidos_nombres = @apellidos_nombres,
          dni               = @dni,
          cargo             = @cargo,
          entidad           = @entidad,
          telefono          = @telefono,
          email             = @email,
          activo            = @activo
        WHERE id_inspector = @id
      `);
    if (result.rowsAffected[0] === 0)
      return res.status(404).json({ error: 'Inspector no encontrado' });
    res.json({ mensaje: 'Inspector actualizado' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, obtener, crear, actualizar };