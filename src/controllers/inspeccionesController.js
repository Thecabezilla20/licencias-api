const { getPool, sql } = require('../db/connection');
const { TRANSICIONES_VALIDAS } = require('../utils/estadosMachine');

async function listarTodas(req, res, next) {
  try {
    const pagina = Math.max(1, parseInt(req.query.pagina) || 1);
    const limite = Math.min(100, Math.max(1, parseInt(req.query.limite) || 50));
    const offset = (pagina - 1) * limite;
    const { resultado, tipo_inspeccion } = req.query;

    const condiciones = [];
    if (resultado)        condiciones.push(`resultado = @resultado`);
    if (tipo_inspeccion)  condiciones.push(`tipo_inspeccion = @tipo_inspeccion`);
    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

    const pool = await getPool();

    const buildReq = () => {
      const r = pool.request()
        .input('offset', sql.Int, offset)
        .input('limite', sql.Int, limite);
      if (resultado)       r.input('resultado',       sql.NVarChar, resultado);
      if (tipo_inspeccion) r.input('tipo_inspeccion', sql.NVarChar, tipo_inspeccion);
      return r;
    };

    const buildCountReq = () => {
      const r = pool.request();
      if (resultado)       r.input('resultado',       sql.NVarChar, resultado);
      if (tipo_inspeccion) r.input('tipo_inspeccion', sql.NVarChar, tipo_inspeccion);
      return r;
    };

    const [countRes, dataRes] = await Promise.all([
      buildCountReq().query(`SELECT COUNT(*) AS total FROM vw_InspeccionesExpediente ${where}`),
      buildReq().query(`
        SELECT * FROM vw_InspeccionesExpediente ${where}
        ORDER BY fecha_programada DESC
        OFFSET @offset ROWS FETCH NEXT @limite ROWS ONLY
      `),
    ]);

    const totalRegistros = countRes.recordset[0].total;
    res.json({
      datos: dataRes.recordset,
      total: totalRegistros,
      total_paginas: Math.ceil(totalRegistros / limite),
      pagina,
      limite,
    });
  } catch (err) {
    next(err);
  }
}

async function listarPorExpediente(req, res, next) {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id_expediente', sql.Int, req.params.id_expediente)
      .query(`
        SELECT * FROM vw_InspeccionesExpediente
        WHERE id_expediente = @id_expediente
        ORDER BY fecha_programada DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    next(err);
  }
}

async function obtener(req, res, next) {
  try {
    const pool = await getPool();
    const insp = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`SELECT * FROM vw_InspeccionesExpediente WHERE id_inspeccion = @id`);

    if (!insp.recordset[0])
      return res.status(404).json({ error: 'Inspección no encontrada' });

    const obs = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`
        SELECT id_observacion, categoria, descripcion, ubicacion_en_local,
               es_subsanable, estado_subsanacion, fecha_subsanacion,
               observacion_subsanacion, fecha_registro
        FROM ObservacionesITSE
        WHERE id_inspeccion = @id
        ORDER BY categoria
      `);

    res.json({ ...insp.recordset[0], observaciones: obs.recordset });
  } catch (err) {
    next(err);
  }
}

async function programar(req, res, next) {
  try {
    const {
      id_expediente, id_establecimiento, id_inspector,
      tipo_inspeccion, fecha_programada, id_inspeccion_previa
    } = req.body;

    if (!id_expediente || !id_establecimiento || !fecha_programada)
      return res.status(400).json({ error: 'Faltan campos obligatorios' });

    const pool = await getPool();

    // Verificar que el expediente existe y que la transición es válida
    const expCheck = await pool.request()
      .input('id', sql.Int, id_expediente)
      .query(`SELECT estado FROM Expedientes WHERE id_expediente = @id`);

    if (!expCheck.recordset[0])
      return res.status(404).json({ error: 'Expediente no encontrado' });

    const estadoActual = expCheck.recordset[0].estado;
    if (!TRANSICIONES_VALIDAS[estadoActual]?.includes('Inspección programada')) {
      return res.status(400).json({
        error: `No se puede programar inspección: el expediente está en estado "${estadoActual}".`,
        transiciones_permitidas: TRANSICIONES_VALIDAS[estadoActual],
      });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Insertar inspección
      const result = await new sql.Request(transaction)
        .input('id_expediente',        sql.Int,      id_expediente)
        .input('id_establecimiento',   sql.Int,      id_establecimiento)
        .input('id_inspector',         sql.Int,      id_inspector || null)
        .input('id_inspeccion_previa', sql.Int,      id_inspeccion_previa || null)
        .input('tipo_inspeccion',      sql.NVarChar, tipo_inspeccion || 'Primera Inspección')
        .input('fecha_programada',     sql.Date,     fecha_programada)
        .input('id_usuario',           sql.Int,      req.user.id)
        .query(`
          INSERT INTO InspeccionesITSE
            (id_expediente, id_establecimiento, id_inspector,
             id_inspeccion_previa, tipo_inspeccion, fecha_programada, id_usuario_programo)
          OUTPUT INSERTED.id_inspeccion
          VALUES
            (@id_expediente, @id_establecimiento, @id_inspector,
             @id_inspeccion_previa, @tipo_inspeccion, @fecha_programada, @id_usuario)
        `);

      const id_inspeccion = result.recordset[0].id_inspeccion;

      // Cambiar estado del expediente
      await new sql.Request(transaction)
        .input('id',    sql.Int,      id_expediente)
        .input('estado',sql.NVarChar, 'Inspección programada')
        .query(`UPDATE Expedientes SET estado = @estado, fecha_ultima_act = GETDATE() WHERE id_expediente = @id`);

      // Registrar en historial
      await new sql.Request(transaction)
        .input('id_expediente',   sql.Int,      id_expediente)
        .input('estado_anterior', sql.NVarChar, estadoActual)
        .input('estado_nuevo',    sql.NVarChar, 'Inspección programada')
        .input('id_usuario',      sql.Int,      req.user.id)
        .input('comentario',      sql.NVarChar, `Inspección ITSE programada para ${fecha_programada}`)
        .query(`
          INSERT INTO HistorialEstados (id_expediente, estado_anterior, estado_nuevo, id_usuario, comentario)
          VALUES (@id_expediente, @estado_anterior, @estado_nuevo, @id_usuario, @comentario)
        `);

      await transaction.commit();
      res.status(201).json({ id_inspeccion, mensaje: 'Inspección programada correctamente' });

    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

async function registrarResultado(req, res, next) {
  try {
    const {
      fecha_ejecutada, hora_inicio, hora_fin,
      resultado, nivel_riesgo_asignado, observaciones_generales,
      requiere_reinspeccion, fecha_limite_subsanacion
    } = req.body;

    if (!fecha_ejecutada || !resultado)
      return res.status(400).json({ error: 'Fecha ejecutada y resultado son obligatorios' });

    const pool = await getPool();

    // Verificar que la inspección existe y obtener id_expediente e id_establecimiento
    const inspCheck = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`
        SELECT id_expediente, id_establecimiento
        FROM InspeccionesITSE
        WHERE id_inspeccion = @id
      `);

    if (!inspCheck.recordset[0])
      return res.status(404).json({ error: 'Inspección no encontrada' });

    const { id_expediente, id_establecimiento } = inspCheck.recordset[0];

    // Verificar transición válida en el state machine
    const expEstado = await pool.request()
      .input('id', sql.Int, id_expediente)
      .query(`SELECT estado FROM Expedientes WHERE id_expediente = @id`);

    const estadoActual = expEstado.recordset[0]?.estado;
    const nuevoEstado = resultado === 'Conforme' ? 'Inspeccionado' : 'Observado';

    if (!TRANSICIONES_VALIDAS[estadoActual]?.includes(nuevoEstado)) {
      return res.status(400).json({
        error: `No se puede registrar resultado: el expediente está en estado "${estadoActual}" y no permite transición a "${nuevoEstado}".`,
      });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Actualizar inspección
      await new sql.Request(transaction)
        .input('id',                      sql.Int,      req.params.id)
        .input('fecha_ejecutada',         sql.Date,     fecha_ejecutada)
        .input('hora_inicio',             sql.NVarChar, hora_inicio || null)
        .input('hora_fin',                sql.NVarChar, hora_fin || null)
        .input('resultado',               sql.NVarChar, resultado)
        .input('nivel_riesgo',            sql.NVarChar, nivel_riesgo_asignado || null)
        .input('obs_generales',           sql.NVarChar, observaciones_generales || null)
        .input('requiere_reinspeccion',   sql.Bit,      requiere_reinspeccion ? 1 : 0)
        .input('fecha_limite',            sql.Date,     fecha_limite_subsanacion || null)
        .query(`
          UPDATE InspeccionesITSE SET
            fecha_ejecutada          = @fecha_ejecutada,
            hora_inicio              = @hora_inicio,
            hora_fin                 = @hora_fin,
            resultado                = @resultado,
            nivel_riesgo_asignado    = @nivel_riesgo,
            observaciones_generales  = @obs_generales,
            requiere_reinspeccion    = @requiere_reinspeccion,
            fecha_limite_subsanacion = @fecha_limite
          WHERE id_inspeccion = @id
        `);

      // Actualizar resumen en Establecimientos
      await new sql.Request(transaction)
        .input('id',            sql.Int,      id_establecimiento)
        .input('resultado',     sql.NVarChar, resultado)
        .input('fecha',         sql.Date,     fecha_ejecutada)
        .input('nivel_riesgo',  sql.NVarChar, nivel_riesgo_asignado || null)
        .query(`
          UPDATE Establecimientos SET
            tiene_inspeccion_itse   = 1,
            resultado_itse          = @resultado,
            fecha_ultima_inspeccion = @fecha,
            nivel_riesgo            = @nivel_riesgo
          WHERE id_establecimiento = @id
        `);

      await new sql.Request(transaction)
        .input('id',     sql.Int,      id_expediente)
        .input('estado', sql.NVarChar, nuevoEstado)
        .query(`UPDATE Expedientes SET estado = @estado, fecha_ultima_act = GETDATE() WHERE id_expediente = @id`);

      // Registrar en historial
      await new sql.Request(transaction)
        .input('id_expediente',   sql.Int,      id_expediente)
        .input('estado_anterior', sql.NVarChar, estadoActual)
        .input('estado_nuevo',    sql.NVarChar, nuevoEstado)
        .input('id_usuario',      sql.Int,      req.user.id)
        .input('comentario',      sql.NVarChar, `Inspección ITSE ejecutada. Resultado: ${resultado}`)
        .query(`
          INSERT INTO HistorialEstados (id_expediente, estado_anterior, estado_nuevo, id_usuario, comentario)
          VALUES (@id_expediente, @estado_anterior, @estado_nuevo, @id_usuario, @comentario)
        `);

      await transaction.commit();
      res.json({ mensaje: 'Resultado registrado correctamente' });

    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

async function agregarObservacion(req, res, next) {
  try {
    const { categoria, descripcion, ubicacion_en_local, es_subsanable } = req.body;

    if (!categoria || !descripcion)
      return res.status(400).json({ error: 'Categoría y descripción son obligatorias' });

    const pool = await getPool();

    const inspCheck = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`SELECT id_inspeccion FROM InspeccionesITSE WHERE id_inspeccion = @id`);
    if (!inspCheck.recordset[0])
      return res.status(404).json({ error: 'Inspección no encontrada' });

    const result = await pool.request()
      .input('id_inspeccion',     sql.Int,      req.params.id)
      .input('categoria',         sql.NVarChar, categoria)
      .input('descripcion',       sql.NVarChar, descripcion)
      .input('ubicacion',         sql.NVarChar, ubicacion_en_local || null)
      .input('es_subsanable',     sql.Bit,      es_subsanable !== false ? 1 : 0)
      .query(`
        INSERT INTO ObservacionesITSE
          (id_inspeccion, categoria, descripcion, ubicacion_en_local, es_subsanable)
        OUTPUT INSERTED.id_observacion
        VALUES
          (@id_inspeccion, @categoria, @descripcion, @ubicacion, @es_subsanable)
      `);

    res.status(201).json({
      id_observacion: result.recordset[0].id_observacion,
      mensaje: 'Observación registrada'
    });
  } catch (err) {
    next(err);
  }
}

async function subsanarObservacion(req, res, next) {
  try {
    const { observacion_subsanacion } = req.body;
    const pool = await getPool();

    const result = await pool.request()
      .input('id',           sql.Int,      req.params.id_obs)
      .input('id_insp',      sql.Int,      req.params.id)
      .input('observacion',  sql.NVarChar, observacion_subsanacion || null)
      .query(`
        UPDATE ObservacionesITSE SET
          estado_subsanacion      = 'Subsanado',
          fecha_subsanacion       = CAST(GETDATE() AS DATE),
          observacion_subsanacion = @observacion
        WHERE id_observacion = @id AND id_inspeccion = @id_insp
      `);

    if (result.rowsAffected[0] === 0)
      return res.status(404).json({ error: 'Observación no encontrada' });

    res.json({ mensaje: 'Observación subsanada' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listarTodas,
  listarPorExpediente,
  obtener,
  programar,
  registrarResultado,
  agregarObservacion,
  subsanarObservacion
};