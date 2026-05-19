const path = require('path');
const fs = require('fs');
const { getPool, sql } = require('../db/connection');

async function listar(req, res, next) {
  try {
    const id = parseInt(req.params.id_expediente);
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT d.id_documento, d.nombre_original, d.nombre_archivo, d.tipo_mime, d.tamano_bytes, d.fecha_subida,
               u.nombre_completo AS subido_por
        FROM DocumentosExpediente d
        JOIN Usuarios u ON u.id_usuario = d.id_usuario_subio
        WHERE d.id_expediente = @id
        ORDER BY d.fecha_subida DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    next(err);
  }
}

async function subir(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo.' });
    const id = parseInt(req.params.id_expediente);
    const pool = await getPool();

    const expCheck = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT id_expediente FROM Expedientes WHERE id_expediente = @id');
    if (!expCheck.recordset[0]) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Expediente no encontrado.' });
    }

    const result = await pool.request()
      .input('id_expediente',    sql.Int,      id)
      .input('nombre_original',  sql.NVarChar, req.file.originalname)
      .input('nombre_archivo',   sql.NVarChar, req.file.filename)
      .input('tipo_mime',        sql.NVarChar, req.file.mimetype)
      .input('tamano_bytes',     sql.Int,      req.file.size)
      .input('id_usuario',       sql.Int,      req.user.id)
      .query(`
        INSERT INTO DocumentosExpediente (id_expediente, nombre_original, nombre_archivo, tipo_mime, tamano_bytes, id_usuario_subio)
        OUTPUT INSERTED.id_documento, INSERTED.fecha_subida
        VALUES (@id_expediente, @nombre_original, @nombre_archivo, @tipo_mime, @tamano_bytes, @id_usuario)
      `);

    res.status(201).json({
      id_documento:    result.recordset[0].id_documento,
      nombre_original: req.file.originalname,
      nombre_archivo:  req.file.filename,
      tipo_mime:       req.file.mimetype,
      tamano_bytes:    req.file.size,
      fecha_subida:    result.recordset[0].fecha_subida,
      mensaje: 'Documento adjuntado correctamente.',
    });
  } catch (err) {
    if (req.file?.path) try { fs.unlinkSync(req.file.path); } catch {}
    next(err);
  }
}

async function descargar(req, res, next) {
  try {
    const id = parseInt(req.params.id_documento);
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT nombre_original, nombre_archivo, tipo_mime, id_expediente FROM DocumentosExpediente WHERE id_documento = @id');

    if (!result.recordset[0]) return res.status(404).json({ error: 'Documento no encontrado.' });

    const doc = result.recordset[0];
    const filePath = path.join(__dirname, '..', '..', 'uploads', 'expedientes', String(doc.id_expediente), doc.nombre_archivo);

    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Archivo no encontrado en el servidor.' });

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.nombre_original)}"`);
    res.setHeader('Content-Type', doc.tipo_mime || 'application/octet-stream');
    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
}

async function eliminar(req, res, next) {
  try {
    const id = parseInt(req.params.id_documento);
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT nombre_archivo, id_expediente FROM DocumentosExpediente WHERE id_documento = @id');

    if (!result.recordset[0]) return res.status(404).json({ error: 'Documento no encontrado.' });

    const doc = result.recordset[0];
    await pool.request().input('id', sql.Int, id).query('DELETE FROM DocumentosExpediente WHERE id_documento = @id');

    const filePath = path.join(__dirname, '..', '..', 'uploads', 'expedientes', String(doc.id_expediente), doc.nombre_archivo);
    try { fs.unlinkSync(filePath); } catch {}

    res.json({ mensaje: 'Documento eliminado correctamente.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, subir, descargar, eliminar };
