const { getPool, sql } = require('../db/connection');

async function listarTipos(req, res, next) {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`SELECT id_tipo_licencia, nombre, descripcion, requiere_autorizacion_sect
              FROM TiposLicencia ORDER BY nombre`);
    res.json(result.recordset);
  } catch (err) {
    next(err);
  }
}

async function obtenerTipo(req, res, next) {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`SELECT id_tipo_licencia, nombre, descripcion, requiere_autorizacion_sect
              FROM TiposLicencia WHERE id_tipo_licencia = @id`);

    if (!result.recordset[0])
      return res.status(404).json({ error: 'Tipo de licencia no encontrado' });

    res.json(result.recordset[0]);
  } catch (err) {
    next(err);
  }
}

async function requisitosDelTipo(req, res, next) {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`SELECT id_requisito, nombre_requisito, obligatorio, descripcion
              FROM Requisitos
              WHERE id_tipo_licencia = @id
              ORDER BY obligatorio DESC, nombre_requisito`);
    res.json(result.recordset);
  } catch (err) {
    next(err);
  }
}

async function listarEmitidas(req, res, next) {
  try {
    const pagina = Math.max(1, parseInt(req.query.pagina) || 1);
    const limite = Math.min(100, Math.max(1, parseInt(req.query.limite) || 20));
    const offset = (pagina - 1) * limite;

    const pool = await getPool();

    const [countRes, dataRes] = await Promise.all([
      pool.request().query(`SELECT COUNT(*) AS total FROM LicenciasEmitidas`),
      pool.request()
        .input('offset', sql.Int, offset)
        .input('limite', sql.Int, limite)
        .query(`
          SELECT
            l.id_licencia,
            l.nro_licencia,
            l.fecha_emision,
            l.fecha_vencimiento,
            l.estado_licencia          AS estado,
            tl.nombre                  AS tipo_licencia,
            s.apellidos_nombres        AS nombre_natural,
            s.razon_social,
            est.nombre_comercial       AS establecimiento
          FROM LicenciasEmitidas l
          JOIN Expedientes e      ON e.id_expediente    = l.id_expediente
          JOIN Solicitantes s     ON s.id_solicitante   = e.id_solicitante
          JOIN TiposLicencia tl   ON tl.id_tipo_licencia = e.id_tipo_licencia
          LEFT JOIN Establecimientos est ON est.id_expediente = e.id_expediente
          ORDER BY l.fecha_emision DESC
          OFFSET @offset ROWS FETCH NEXT @limite ROWS ONLY
        `),
    ]);

    const totalRegistros = countRes.recordset[0].total;
    const data = dataRes.recordset.map(({ nombre_natural, razon_social, ...r }) => ({
      ...r,
      solicitante: razon_social || nombre_natural,
    }));

    res.json({
      datos: data,
      total: totalRegistros,
      total_paginas: Math.ceil(totalRegistros / limite),
      pagina,
      limite,
    });
  } catch (err) {
    next(err);
  }
}

async function emitir(req, res, next) {
  try {
    const { id_expediente, fecha_vencimiento, observaciones_licencia } = req.body;

    if (!id_expediente)
      return res.status(400).json({ error: 'El id_expediente es obligatorio.' });

    const pool = await getPool();

    const expCheck = await pool.request()
      .input('id', sql.Int, id_expediente)
      .query(`SELECT estado, duracion_licencia FROM Expedientes WHERE id_expediente = @id`);

    if (!expCheck.recordset[0])
      return res.status(404).json({ error: 'Expediente no encontrado.' });

    const { estado, duracion_licencia } = expCheck.recordset[0];
    if (estado !== 'Aprobado')
      return res.status(400).json({ error: `Solo se puede emitir licencia para expedientes Aprobados. Estado actual: "${estado}".` });

    const yaEmitida = await pool.request()
      .input('id', sql.Int, id_expediente)
      .query(`SELECT id_licencia FROM LicenciasEmitidas WHERE id_expediente = @id`);

    if (yaEmitida.recordset[0])
      return res.status(409).json({ error: 'Este expediente ya tiene una licencia emitida.', id_licencia: yaEmitida.recordset[0].id_licencia });

    const anio = new Date().getFullYear();
    const countRes = await pool.request()
      .input('anio', sql.Int, anio)
      .query(`SELECT COUNT(*) AS c FROM LicenciasEmitidas WITH (UPDLOCK, HOLDLOCK) WHERE YEAR(fecha_emision) = @anio`);
    const correlativo = String(countRes.recordset[0].c + 1).padStart(4, '0');
    const nro_licencia = `LIC-${anio}-${correlativo}`;

    const vencimiento = duracion_licencia === 'Temporal' ? (fecha_vencimiento || null) : null;

    const result = await pool.request()
      .input('nro_licencia',          sql.NVarChar, nro_licencia)
      .input('id_expediente',         sql.Int,      id_expediente)
      .input('fecha_vencimiento',     sql.Date,     vencimiento)
      .input('observaciones',         sql.NVarChar, observaciones_licencia || null)
      .input('id_usuario',            sql.Int,      req.user.id)
      .query(`
        INSERT INTO LicenciasEmitidas
          (nro_licencia, id_expediente, fecha_vencimiento, observaciones_licencia, id_usuario_emitio)
        OUTPUT INSERTED.id_licencia, INSERTED.fecha_emision
        VALUES
          (@nro_licencia, @id_expediente, @fecha_vencimiento, @observaciones, @id_usuario)
      `);

    res.status(201).json({
      id_licencia:   result.recordset[0].id_licencia,
      nro_licencia,
      fecha_emision: result.recordset[0].fecha_emision,
      mensaje:       'Licencia emitida correctamente.',
    });
  } catch (err) {
    next(err);
  }
}

async function obtenerLicencia(req, res, next) {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id_expediente', sql.Int, req.params.id_expediente)
      .query(`
        SELECT l.id_licencia, l.nro_licencia, l.fecha_emision,
               l.fecha_vencimiento, l.estado_licencia, l.observaciones_licencia,
               u.nombre_completo AS emitido_por
        FROM LicenciasEmitidas l
        LEFT JOIN Usuarios u ON u.id_usuario = l.id_usuario_emitio
        WHERE l.id_expediente = @id_expediente
      `);
    if (!result.recordset[0])
      return res.status(404).json({ error: 'No hay licencia emitida para este expediente.' });
    res.json(result.recordset[0]);
  } catch (err) {
    next(err);
  }
}

async function crearTipo(req, res, next) {
  try {
    const { nombre, descripcion, requiere_autorizacion_sect } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio.' });
    const pool = await getPool();
    const result = await pool.request()
      .input('nombre',       sql.NVarChar, nombre)
      .input('descripcion',  sql.NVarChar, descripcion || null)
      .input('req_aut',      sql.Bit,      requiere_autorizacion_sect ? 1 : 0)
      .query(`
        INSERT INTO TiposLicencia (nombre, descripcion, requiere_autorizacion_sect)
        OUTPUT INSERTED.id_tipo_licencia
        VALUES (@nombre, @descripcion, @req_aut)
      `);
    res.status(201).json({ id_tipo_licencia: result.recordset[0].id_tipo_licencia, mensaje: 'Tipo de licencia creado.' });
  } catch (err) {
    next(err);
  }
}

async function actualizarTipo(req, res, next) {
  try {
    const { nombre, descripcion, requiere_autorizacion_sect } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio.' });
    const pool = await getPool();
    const result = await pool.request()
      .input('id',           sql.Int,      req.params.id)
      .input('nombre',       sql.NVarChar, nombre)
      .input('descripcion',  sql.NVarChar, descripcion || null)
      .input('req_aut',      sql.Bit,      requiere_autorizacion_sect ? 1 : 0)
      .query(`
        UPDATE TiposLicencia
        SET nombre = @nombre, descripcion = @descripcion, requiere_autorizacion_sect = @req_aut
        WHERE id_tipo_licencia = @id
      `);
    if (result.rowsAffected[0] === 0)
      return res.status(404).json({ error: 'Tipo de licencia no encontrado.' });
    res.json({ mensaje: 'Tipo de licencia actualizado.' });
  } catch (err) {
    next(err);
  }
}

async function eliminarTipo(req, res, next) {
  try {
    const pool = await getPool();
    const inUse = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`SELECT COUNT(*) AS c FROM Expedientes WHERE id_tipo_licencia = @id`);
    if (inUse.recordset[0].c > 0)
      return res.status(409).json({ error: 'No se puede eliminar: hay expedientes que usan este tipo de licencia.' });
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`DELETE FROM TiposLicencia WHERE id_tipo_licencia = @id`);
    if (result.rowsAffected[0] === 0)
      return res.status(404).json({ error: 'Tipo de licencia no encontrado.' });
    res.json({ mensaje: 'Tipo de licencia eliminado.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listarTipos, obtenerTipo, requisitosDelTipo, listarEmitidas, emitir, obtenerLicencia, crearTipo, actualizarTipo, eliminarTipo };
