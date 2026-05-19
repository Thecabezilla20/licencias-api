const { getPool, sql } = require('../db/connection');
const { TRANSICIONES_VALIDAS } = require('../utils/estadosMachine');

async function listar(req, res, next) {
  try {
    const pagina = Math.max(1, parseInt(req.query.pagina) || 1);
    const limite = Math.min(100, Math.max(1, parseInt(req.query.limite) || 20));
    const { estado, prioridad } = req.query;
    const buscar = req.query.buscar?.trim() || null;
    const offset = (pagina - 1) * limite;

    const pool = await getPool();
    const request = pool.request()
      .input('offset', sql.Int, offset)
      .input('limite', sql.Int, limite);

    const condiciones = [];
    if (estado)    { condiciones.push(`e.estado = @estado`);       request.input('estado',    sql.NVarChar, estado); }
    if (prioridad) { condiciones.push(`e.prioridad = @prioridad`); request.input('prioridad', sql.NVarChar, prioridad); }
    if (buscar)    {
      condiciones.push(`(e.nro_expediente LIKE @buscar OR s.apellidos_nombres LIKE @buscar OR s.razon_social LIKE @buscar)`);
      request.input('buscar', sql.NVarChar, `%${buscar}%`);
    }
    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

    const result = await request.query(`
      SELECT
        e.id_expediente,
        e.nro_expediente,
        COALESCE(s.apellidos_nombres, s.razon_social) AS solicitante,
        s.tipo_persona,
        tl.nombre AS tipo_licencia,
        e.tipo_tramite,
        e.estado,
        e.prioridad,
        e.fecha_recepcion,
        DATEDIFF(DAY, e.fecha_recepcion, GETDATE()) AS dias_transcurridos,
        u.nombre_completo AS usuario_asignado
      FROM Expedientes e
      JOIN Solicitantes s      ON s.id_solicitante    = e.id_solicitante
      JOIN TiposLicencia tl    ON tl.id_tipo_licencia = e.id_tipo_licencia
      LEFT JOIN Usuarios u     ON u.id_usuario         = e.id_usuario_asignado
      ${where}
      ORDER BY e.fecha_recepcion DESC
      OFFSET @offset ROWS FETCH NEXT @limite ROWS ONLY
    `);

    const countReq = pool.request();
    if (estado)    countReq.input('estado',    sql.NVarChar, estado);
    if (prioridad) countReq.input('prioridad', sql.NVarChar, prioridad);
    if (buscar)    countReq.input('buscar',    sql.NVarChar, `%${buscar}%`);
    const total = await countReq.query(
      `SELECT COUNT(*) AS total
       FROM Expedientes e
       JOIN Solicitantes s ON s.id_solicitante = e.id_solicitante
       ${where}`
    );

    const totalRegistros = total.recordset[0].total;
    res.json({
      datos: result.recordset,
      total: totalRegistros,
      total_paginas: Math.ceil(totalRegistros / limite),
      pagina,
      limite,
    });
  } catch (err) {
    next(err);
  }
}

async function obtener(req, res, next) {
  try {
    const pool = await getPool();

    const expResult = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`
        SELECT
          e.id_expediente, e.nro_expediente, e.estado, e.prioridad,
          e.modalidad_tramite, e.tipo_tramite, e.duracion_licencia, e.plazo_temporal,
          e.incluye_anuncio_pub, e.tipo_anuncio, e.es_cesionario, e.nro_licencia_principal,
          e.es_mercado_galeria, e.nro_licencia_referencia, e.nueva_denominacion,
          e.otros_especificar, e.nro_recibo_pago, e.fecha_pago,
          e.fecha_recepcion, e.observaciones, e.fecha_ultima_act,
          tl.nombre AS tipo_licencia, tl.requiere_autorizacion_sect,
          u.nombre_completo AS usuario_asignado,
          s.tipo_persona, s.apellidos_nombres, s.razon_social,
          s.dni_ce, s.ruc, s.telefono, s.email AS email_solicitante,
          s.av_jr_ca_pje, s.nro_int_mz_lt, s.urb_aahh, s.distrito, s.provincia
        FROM Expedientes e
        JOIN Solicitantes s   ON s.id_solicitante    = e.id_solicitante
        JOIN TiposLicencia tl ON tl.id_tipo_licencia = e.id_tipo_licencia
        LEFT JOIN Usuarios u  ON u.id_usuario        = e.id_usuario_asignado
        WHERE e.id_expediente = @id
      `);

    if (!expResult.recordset[0])
      return res.status(404).json({ error: 'Expediente no encontrado' });

    const exp = expResult.recordset[0];

    const [estResult, repResult, histResult, decResult, clasResult] = await Promise.all([
      pool.request()
        .input('id', sql.Int, req.params.id)
        .query(`
          SELECT id_establecimiento, nombre_comercial, codigo_ciiu, giro, actividad,
                 zonificacion, av_jr_ca_pje, nro_int_mz_lt, urb_aahh, provincia,
                 area_total_m2, nivel_riesgo, resultado_itse, fecha_ultima_inspeccion
          FROM Establecimientos WHERE id_expediente = @id
        `),
      pool.request()
        .input('id', sql.Int, req.params.id)
        .query(`
          SELECT apellidos_nombres, dni_ce, nro_partida_sunarp, asiento_inscripcion
          FROM RepresentantesLegales WHERE id_expediente = @id
        `),
      pool.request()
        .input('id', sql.Int, req.params.id)
        .query(`
          SELECT h.estado_anterior, h.estado_nuevo, h.fecha_cambio,
                 h.comentario, u.nombre_completo AS usuario
          FROM HistorialEstados h
          JOIN Usuarios u ON u.id_usuario = h.id_usuario
          WHERE h.id_expediente = @id
          ORDER BY h.fecha_cambio DESC
        `),
      pool.request()
        .input('id', sql.Int, req.params.id)
        .query(`
          SELECT declara_poder_vigente, declara_seguridad_edif,
                 declara_titulo_profesional, declara_conocimiento_fis,
                 observaciones_solicitante, nombre_firmante, dni_firmante, fecha_firma
          FROM DeclaracionesJuradas WHERE id_expediente = @id
        `),
      pool.request()
        .input('id', sql.Int, req.params.id)
        .query(`
          SELECT c.nivel_riesgo, c.nombre_calificador, c.fecha_clasificacion,
                 u.nombre_completo AS calificador_usuario
          FROM ClasificacionRiesgoITSE c
          JOIN Usuarios u ON u.id_usuario = c.id_usuario
          WHERE c.id_expediente = @id
        `),
    ]);

    res.json({
      id_expediente:     exp.id_expediente,
      nro_expediente:    exp.nro_expediente,
      estado:            exp.estado,
      prioridad:         exp.prioridad,
      fecha_recepcion:   exp.fecha_recepcion,
      observaciones:     exp.observaciones,
      fecha_ultima_act:  exp.fecha_ultima_act,
      tipo_licencia:     exp.tipo_licencia,
      requiere_autorizacion_sect: exp.requiere_autorizacion_sect,
      usuario_asignado:  exp.usuario_asignado,
      // Sección I
      modalidad_tramite:      exp.modalidad_tramite,
      tipo_tramite:           exp.tipo_tramite,
      duracion_licencia:      exp.duracion_licencia,
      plazo_temporal:         exp.plazo_temporal,
      incluye_anuncio_pub:    exp.incluye_anuncio_pub,
      tipo_anuncio:           exp.tipo_anuncio,
      es_cesionario:          exp.es_cesionario,
      nro_licencia_principal: exp.nro_licencia_principal,
      es_mercado_galeria:     exp.es_mercado_galeria,
      nro_licencia_referencia:exp.nro_licencia_referencia,
      nueva_denominacion:     exp.nueva_denominacion,
      otros_especificar:      exp.otros_especificar,
      nro_recibo_pago:        exp.nro_recibo_pago,
      fecha_pago:             exp.fecha_pago,
      // Secciones II-VI
      solicitante: {
        tipo_persona:      exp.tipo_persona,
        apellidos_nombres: exp.apellidos_nombres,
        razon_social:      exp.razon_social,
        dni_ce:            exp.dni_ce,
        ruc:               exp.ruc,
        telefono:          exp.telefono,
        email:             exp.email_solicitante,
        av_jr_ca_pje:      exp.av_jr_ca_pje,
        nro_int_mz_lt:     exp.nro_int_mz_lt,
        urb_aahh:          exp.urb_aahh,
        distrito:          exp.distrito,
        provincia:         exp.provincia,
      },
      establecimiento:    estResult.recordset[0] || null,
      representante:      repResult.recordset[0] || null,
      declaracion:        decResult.recordset[0] || null,
      clasificacion_itse: clasResult.recordset[0] || null,
      historial:          histResult.recordset,
    });
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const {
      id_tipo_licencia, modalidad_tramite, prioridad,
      tipo_tramite, duracion_licencia, plazo_temporal,
      incluye_anuncio_pub, tipo_anuncio, es_cesionario, nro_licencia_principal,
      es_mercado_galeria, nro_licencia_referencia, nueva_denominacion, otros_especificar,
      nro_recibo_pago, fecha_pago,
      solicitante, representante, establecimiento, declaracion,
    } = req.body;

    if (!id_tipo_licencia || !solicitante?.tipo_persona)
      return res.status(400).json({ error: 'Faltan campos obligatorios' });

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. Solicitante
      const solResult = await new sql.Request(transaction)
        .input('tipo_persona',      sql.NVarChar, solicitante.tipo_persona)
        .input('apellidos_nombres', sql.NVarChar, solicitante.apellidos_nombres || null)
        .input('razon_social',      sql.NVarChar, solicitante.razon_social || null)
        .input('dni_ce',            sql.NVarChar, solicitante.dni_ce || null)
        .input('ruc',               sql.NVarChar, solicitante.ruc || null)
        .input('telefono',          sql.NVarChar, solicitante.telefono || null)
        .input('email',             sql.NVarChar, solicitante.email || null)
        .input('av_jr_ca_pje',      sql.NVarChar, solicitante.av_jr_ca_pje || null)
        .input('nro_int_mz_lt',     sql.NVarChar, solicitante.nro_int_mz_lt || null)
        .input('urb_aahh',          sql.NVarChar, solicitante.urb_aahh || null)
        .input('distrito',          sql.NVarChar, solicitante.distrito || null)
        .input('provincia',         sql.NVarChar, solicitante.provincia || null)
        .query(`
          INSERT INTO Solicitantes
            (tipo_persona, apellidos_nombres, razon_social, dni_ce, ruc,
             telefono, email, av_jr_ca_pje, nro_int_mz_lt, urb_aahh, distrito, provincia)
          OUTPUT INSERTED.id_solicitante
          VALUES
            (@tipo_persona, @apellidos_nombres, @razon_social, @dni_ce, @ruc,
             @telefono, @email, @av_jr_ca_pje, @nro_int_mz_lt, @urb_aahh, @distrito, @provincia)
        `);

      const id_solicitante = solResult.recordset[0].id_solicitante;

      // 2. Número de expediente
      const anio = new Date().getFullYear();
      const countResult = await new sql.Request(transaction)
        .input('anio', sql.Int, anio)
        .query(`SELECT COUNT(*) AS c FROM Expedientes WITH (UPDLOCK, HOLDLOCK) WHERE YEAR(fecha_recepcion) = @anio`);
      const correlativo = String(countResult.recordset[0].c + 1).padStart(4, '0');
      const nro_expediente = `EXP-${anio}-${correlativo}`;

      // 3. Expediente con todos los campos de la Sección I
      const expResult = await new sql.Request(transaction)
        .input('nro_expediente',         sql.NVarChar, nro_expediente)
        .input('id_solicitante',         sql.Int,      id_solicitante)
        .input('id_tipo_licencia',       sql.Int,      id_tipo_licencia)
        .input('modalidad_tramite',      sql.NVarChar, modalidad_tramite || null)
        .input('prioridad',              sql.NVarChar, prioridad || 'Normal')
        .input('tipo_tramite',           sql.NVarChar, tipo_tramite || 'Licencia Nueva')
        .input('duracion_licencia',      sql.NVarChar, duracion_licencia || 'Indeterminada')
        .input('plazo_temporal',         sql.NVarChar, plazo_temporal || null)
        .input('incluye_anuncio_pub',    sql.Bit,      incluye_anuncio_pub ? 1 : 0)
        .input('tipo_anuncio',           sql.NVarChar, tipo_anuncio || null)
        .input('es_cesionario',          sql.Bit,      es_cesionario ? 1 : 0)
        .input('nro_licencia_principal', sql.NVarChar, nro_licencia_principal || null)
        .input('es_mercado_galeria',     sql.Bit,      es_mercado_galeria ? 1 : 0)
        .input('nro_licencia_ref',       sql.NVarChar, nro_licencia_referencia || null)
        .input('nueva_denominacion',     sql.NVarChar, nueva_denominacion || null)
        .input('otros_especificar',      sql.NVarChar, otros_especificar || null)
        .input('nro_recibo_pago',        sql.NVarChar, nro_recibo_pago || null)
        .input('fecha_pago',             sql.Date,     fecha_pago || null)
        .input('id_usuario',             sql.Int,      req.user.id)
        .query(`
          INSERT INTO Expedientes
            (nro_expediente, id_solicitante, id_tipo_licencia, modalidad_tramite, prioridad,
             tipo_tramite, duracion_licencia, plazo_temporal, incluye_anuncio_pub, tipo_anuncio,
             es_cesionario, nro_licencia_principal, es_mercado_galeria, nro_licencia_referencia,
             nueva_denominacion, otros_especificar, nro_recibo_pago, fecha_pago, id_usuario_asignado)
          OUTPUT INSERTED.id_expediente
          VALUES
            (@nro_expediente, @id_solicitante, @id_tipo_licencia, @modalidad_tramite, @prioridad,
             @tipo_tramite, @duracion_licencia, @plazo_temporal, @incluye_anuncio_pub, @tipo_anuncio,
             @es_cesionario, @nro_licencia_principal, @es_mercado_galeria, @nro_licencia_ref,
             @nueva_denominacion, @otros_especificar, @nro_recibo_pago, @fecha_pago, @id_usuario)
        `);

      const id_expediente = expResult.recordset[0].id_expediente;

      // 4. Representante legal
      if (representante?.apellidos_nombres) {
        await new sql.Request(transaction)
          .input('id_expediente',       sql.Int,      id_expediente)
          .input('apellidos_nombres',   sql.NVarChar, representante.apellidos_nombres)
          .input('dni_ce',              sql.NVarChar, representante.dni_ce || null)
          .input('nro_partida_sunarp',  sql.NVarChar, representante.nro_partida_sunarp || null)
          .input('asiento_inscripcion', sql.NVarChar, representante.asiento_inscripcion || null)
          .query(`
            INSERT INTO RepresentantesLegales
              (id_expediente, apellidos_nombres, dni_ce, nro_partida_sunarp, asiento_inscripcion)
            VALUES
              (@id_expediente, @apellidos_nombres, @dni_ce, @nro_partida_sunarp, @asiento_inscripcion)
          `);
      }

      // 5. Establecimiento
      if (establecimiento?.nombre_comercial) {
        const estResult = await new sql.Request(transaction)
          .input('id_expediente',    sql.Int,      id_expediente)
          .input('nombre_comercial', sql.NVarChar, establecimiento.nombre_comercial)
          .input('codigo_ciiu',      sql.NVarChar, establecimiento.codigo_ciiu || null)
          .input('giro',             sql.NVarChar, establecimiento.giro || null)
          .input('actividad',        sql.NVarChar, establecimiento.actividad || null)
          .input('zonificacion',     sql.NVarChar, establecimiento.zonificacion || null)
          .input('av_jr_ca_pje',     sql.NVarChar, establecimiento.av_jr_ca_pje || null)
          .input('nro_int_mz_lt',    sql.NVarChar, establecimiento.nro_int_mz_lt || null)
          .input('urb_aahh',         sql.NVarChar, establecimiento.urb_aahh || null)
          .input('provincia',        sql.NVarChar, establecimiento.provincia || null)
          .input('area_total_m2',    sql.Decimal,  establecimiento.area_total_m2 || null)
          .query(`
            INSERT INTO Establecimientos
              (id_expediente, nombre_comercial, codigo_ciiu, giro, actividad,
               zonificacion, av_jr_ca_pje, nro_int_mz_lt, urb_aahh, provincia, area_total_m2)
            OUTPUT INSERTED.id_establecimiento
            VALUES
              (@id_expediente, @nombre_comercial, @codigo_ciiu, @giro, @actividad,
               @zonificacion, @av_jr_ca_pje, @nro_int_mz_lt, @urb_aahh, @provincia, @area_total_m2)
          `);

        const id_establecimiento = estResult.recordset[0].id_establecimiento;
        if (establecimiento.autorizacion?.entidad_autorizante) {
          await new sql.Request(transaction)
            .input('id_establecimiento',  sql.Int,      id_establecimiento)
            .input('entidad_autorizante', sql.NVarChar, establecimiento.autorizacion.entidad_autorizante)
            .input('denominacion',        sql.NVarChar, establecimiento.autorizacion.denominacion || null)
            .input('fecha_autorizacion',  sql.Date,     establecimiento.autorizacion.fecha_autorizacion || null)
            .input('nro_autorizacion',    sql.NVarChar, establecimiento.autorizacion.nro_autorizacion || null)
            .query(`
              INSERT INTO AutorizacionesSectoriales
                (id_establecimiento, entidad_autorizante, denominacion, fecha_autorizacion, nro_autorizacion)
              VALUES
                (@id_establecimiento, @entidad_autorizante, @denominacion, @fecha_autorizacion, @nro_autorizacion)
            `);
        }
      }

      // 6. Declaración jurada
      if (declaracion) {
        await new sql.Request(transaction)
          .input('id_expediente',         sql.Int,      id_expediente)
          .input('declara_poder_vigente', sql.Bit,      declaracion.declara_poder_vigente ? 1 : 0)
          .input('declara_seguridad_edif',sql.Bit,      declaracion.declara_seguridad_edif ? 1 : 0)
          .input('declara_titulo_prof',   sql.Bit,      declaracion.declara_titulo_profesional ? 1 : 0)
          .input('declara_conocimiento',  sql.Bit,      declaracion.declara_conocimiento_fis ? 1 : 0)
          .input('observaciones',         sql.NVarChar, declaracion.observaciones_solicitante || null)
          .input('nombre_firmante',       sql.NVarChar, declaracion.nombre_firmante || null)
          .input('dni_firmante',          sql.NVarChar, declaracion.dni_firmante || null)
          .input('fecha_firma',           sql.Date,     declaracion.fecha_firma || null)
          .query(`
            INSERT INTO DeclaracionesJuradas
              (id_expediente, declara_poder_vigente, declara_seguridad_edif,
               declara_titulo_profesional, declara_conocimiento_fis,
               observaciones_solicitante, nombre_firmante, dni_firmante, fecha_firma)
            VALUES
              (@id_expediente, @declara_poder_vigente, @declara_seguridad_edif,
               @declara_titulo_prof, @declara_conocimiento,
               @observaciones, @nombre_firmante, @dni_firmante,
               COALESCE(@fecha_firma, CAST(GETDATE() AS DATE)))
          `);
      }

      // 7. Historial inicial
      await new sql.Request(transaction)
        .input('id_expediente', sql.Int,      id_expediente)
        .input('estado_nuevo',  sql.NVarChar, 'Recibido')
        .input('id_usuario',    sql.Int,      req.user.id)
        .input('comentario',    sql.NVarChar, 'Expediente creado')
        .query(`
          INSERT INTO HistorialEstados (id_expediente, estado_nuevo, id_usuario, comentario)
          VALUES (@id_expediente, @estado_nuevo, @id_usuario, @comentario)
        `);

      await transaction.commit();
      res.status(201).json({ id_expediente, nro_expediente, mensaje: 'Expediente creado' });

    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

async function clasificar(req, res, next) {
  try {
    const { nivel_riesgo, nombre_calificador, fecha_clasificacion } = req.body;

    const pool = await getPool();

    const expCheck = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`SELECT id_expediente FROM Expedientes WHERE id_expediente = @id`);
    if (!expCheck.recordset[0])
      return res.status(404).json({ error: 'Expediente no encontrado' });

    await pool.request()
      .input('id_expediente',      sql.Int,      req.params.id)
      .input('nivel_riesgo',       sql.NVarChar, nivel_riesgo)
      .input('nombre_calificador', sql.NVarChar, nombre_calificador || null)
      .input('fecha_clasificacion',sql.Date,     fecha_clasificacion || null)
      .input('id_usuario',         sql.Int,      req.user.id)
      .query(`
        MERGE ClasificacionRiesgoITSE AS t
        USING (SELECT @id_expediente AS id_expediente) AS s ON t.id_expediente = s.id_expediente
        WHEN MATCHED THEN
          UPDATE SET nivel_riesgo = @nivel_riesgo, nombre_calificador = @nombre_calificador,
                     fecha_clasificacion = @fecha_clasificacion, id_usuario = @id_usuario, fecha_registro = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (id_expediente, nivel_riesgo, nombre_calificador, fecha_clasificacion, id_usuario)
          VALUES (@id_expediente, @nivel_riesgo, @nombre_calificador, @fecha_clasificacion, @id_usuario);
      `);

    res.json({ mensaje: 'Clasificación de riesgo registrada correctamente.' });
  } catch (err) {
    next(err);
  }
}

async function cambiarEstado(req, res, next) {
  try {
    const { estado, comentario } = req.body;

    const pool = await getPool();
    const actual = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`SELECT estado FROM Expedientes WHERE id_expediente = @id`);

    if (!actual.recordset[0])
      return res.status(404).json({ error: 'Expediente no encontrado' });

    const estadoActual = actual.recordset[0].estado;
    const permitidos = TRANSICIONES_VALIDAS[estadoActual] ?? [];
    if (!permitidos.includes(estado)) {
      return res.status(400).json({
        error: `No se puede cambiar de "${estadoActual}" a "${estado}".`,
        transiciones_permitidas: permitidos,
      });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      await new sql.Request(transaction)
        .input('id',     sql.Int,      req.params.id)
        .input('estado', sql.NVarChar, estado)
        .query(`UPDATE Expedientes SET estado = @estado, fecha_ultima_act = GETDATE() WHERE id_expediente = @id`);

      await new sql.Request(transaction)
        .input('id_expediente',   sql.Int,      req.params.id)
        .input('estado_anterior', sql.NVarChar, estadoActual)
        .input('estado_nuevo',    sql.NVarChar, estado)
        .input('id_usuario',      sql.Int,      req.user.id)
        .input('comentario',      sql.NVarChar, comentario || null)
        .query(`
          INSERT INTO HistorialEstados
            (id_expediente, estado_anterior, estado_nuevo, id_usuario, comentario)
          VALUES
            (@id_expediente, @estado_anterior, @estado_nuevo, @id_usuario, @comentario)
        `);

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }

    res.json({ mensaje: `Estado actualizado a: ${estado}` });
  } catch (err) {
    next(err);
  }
}

async function estadisticas(req, res, next) {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`SELECT * FROM vw_EstadisticasMensuales ORDER BY anio DESC, mes DESC`);
    res.json(result.recordset);
  } catch (err) {
    next(err);
  }
}

async function resumen(req, res, next) {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN estado NOT IN ('Aprobado', 'Denegado', 'Anulado') THEN 1 ELSE 0 END) AS activos,
        SUM(CASE WHEN estado = 'Aprobado'                               THEN 1 ELSE 0 END) AS aprobados,
        SUM(CASE WHEN estado IN ('Recibido', 'En evaluación')           THEN 1 ELSE 0 END) AS pendientes,
        SUM(CASE WHEN estado = 'Observado'                              THEN 1 ELSE 0 END) AS observados
      FROM Expedientes
    `);
    res.json(result.recordset[0]);
  } catch (err) {
    next(err);
  }
}

async function editarDatos(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const { solicitante, establecimiento, representante, declaracion, nro_recibo_pago, fecha_pago, prioridad, observaciones } = req.body;

    const pool = await getPool();

    const expRow = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT id_solicitante, id_expediente FROM Expedientes WHERE id_expediente = @id');
    if (!expRow.recordset[0]) return res.status(404).json({ error: 'Expediente no encontrado.' });

    const id_solicitante = expRow.recordset[0].id_solicitante;

    const updates = [];

    if (solicitante) {
      await pool.request()
        .input('id',               sql.Int,      id_solicitante)
        .input('apellidos_nombres',sql.NVarChar, solicitante.apellidos_nombres || null)
        .input('razon_social',     sql.NVarChar, solicitante.razon_social || null)
        .input('dni_ce',           sql.NVarChar, solicitante.dni_ce || null)
        .input('ruc',              sql.NVarChar, solicitante.ruc || null)
        .input('telefono',         sql.NVarChar, solicitante.telefono || null)
        .input('email',            sql.NVarChar, solicitante.email || null)
        .input('av_jr_ca_pje',     sql.NVarChar, solicitante.av_jr_ca_pje || null)
        .input('nro_int_mz_lt',    sql.NVarChar, solicitante.nro_int_mz_lt || null)
        .input('urb_aahh',         sql.NVarChar, solicitante.urb_aahh || null)
        .input('distrito',         sql.NVarChar, solicitante.distrito || null)
        .input('provincia',        sql.NVarChar, solicitante.provincia || null)
        .query(`
          UPDATE Solicitantes SET
            apellidos_nombres = COALESCE(@apellidos_nombres, apellidos_nombres),
            razon_social      = COALESCE(@razon_social, razon_social),
            dni_ce            = COALESCE(@dni_ce, dni_ce),
            ruc               = COALESCE(@ruc, ruc),
            telefono          = COALESCE(@telefono, telefono),
            email             = COALESCE(@email, email),
            av_jr_ca_pje      = COALESCE(@av_jr_ca_pje, av_jr_ca_pje),
            nro_int_mz_lt     = COALESCE(@nro_int_mz_lt, nro_int_mz_lt),
            urb_aahh          = COALESCE(@urb_aahh, urb_aahh),
            distrito          = COALESCE(@distrito, distrito),
            provincia         = COALESCE(@provincia, provincia)
          WHERE id_solicitante = @id
        `);
      updates.push('solicitante');
    }

    if (establecimiento) {
      await pool.request()
        .input('id',             sql.Int,      id)
        .input('nombre_comercial',sql.NVarChar, establecimiento.nombre_comercial || null)
        .input('codigo_ciiu',    sql.NVarChar, establecimiento.codigo_ciiu || null)
        .input('giro',           sql.NVarChar, establecimiento.giro || null)
        .input('actividad',      sql.NVarChar, establecimiento.actividad || null)
        .input('zonificacion',   sql.NVarChar, establecimiento.zonificacion || null)
        .input('av_jr_ca_pje',   sql.NVarChar, establecimiento.av_jr_ca_pje || null)
        .input('nro_int_mz_lt',  sql.NVarChar, establecimiento.nro_int_mz_lt || null)
        .input('urb_aahh',       sql.NVarChar, establecimiento.urb_aahh || null)
        .input('provincia',      sql.NVarChar, establecimiento.provincia || null)
        .input('area_total_m2',  sql.Decimal(10, 2), establecimiento.area_total_m2 || null)
        .query(`
          UPDATE Establecimientos SET
            nombre_comercial = COALESCE(@nombre_comercial, nombre_comercial),
            codigo_ciiu      = COALESCE(@codigo_ciiu, codigo_ciiu),
            giro             = COALESCE(@giro, giro),
            actividad        = COALESCE(@actividad, actividad),
            zonificacion     = COALESCE(@zonificacion, zonificacion),
            av_jr_ca_pje     = COALESCE(@av_jr_ca_pje, av_jr_ca_pje),
            nro_int_mz_lt    = COALESCE(@nro_int_mz_lt, nro_int_mz_lt),
            urb_aahh         = COALESCE(@urb_aahh, urb_aahh),
            provincia        = COALESCE(@provincia, provincia),
            area_total_m2    = COALESCE(@area_total_m2, area_total_m2)
          WHERE id_expediente = @id
        `);
      updates.push('establecimiento');
    }

    if (representante) {
      const repExists = await pool.request()
        .input('id', sql.Int, id)
        .query('SELECT COUNT(*) AS c FROM RepresentantesLegales WHERE id_expediente = @id');

      if (repExists.recordset[0].c > 0) {
        await pool.request()
          .input('id',               sql.Int,      id)
          .input('apellidos_nombres',sql.NVarChar, representante.apellidos_nombres || null)
          .input('dni_ce',           sql.NVarChar, representante.dni_ce || null)
          .input('nro_partida_sunarp',sql.NVarChar, representante.nro_partida_sunarp || null)
          .input('asiento_inscripcion',sql.NVarChar, representante.asiento_inscripcion || null)
          .query(`
            UPDATE RepresentantesLegales SET
              apellidos_nombres    = COALESCE(@apellidos_nombres, apellidos_nombres),
              dni_ce               = COALESCE(@dni_ce, dni_ce),
              nro_partida_sunarp   = COALESCE(@nro_partida_sunarp, nro_partida_sunarp),
              asiento_inscripcion  = COALESCE(@asiento_inscripcion, asiento_inscripcion)
            WHERE id_expediente = @id
          `);
      } else if (representante.apellidos_nombres) {
        await pool.request()
          .input('id',               sql.Int,      id)
          .input('apellidos_nombres',sql.NVarChar, representante.apellidos_nombres)
          .input('dni_ce',           sql.NVarChar, representante.dni_ce || null)
          .input('nro_partida_sunarp',sql.NVarChar, representante.nro_partida_sunarp || null)
          .input('asiento_inscripcion',sql.NVarChar, representante.asiento_inscripcion || null)
          .query(`
            INSERT INTO RepresentantesLegales (id_expediente, apellidos_nombres, dni_ce, nro_partida_sunarp, asiento_inscripcion)
            VALUES (@id, @apellidos_nombres, @dni_ce, @nro_partida_sunarp, @asiento_inscripcion)
          `);
      }
      updates.push('representante');
    }

    if (declaracion) {
      const decExists = await pool.request()
        .input('id', sql.Int, id)
        .query('SELECT COUNT(*) AS c FROM DeclaracionesJuradas WHERE id_expediente = @id');

      if (decExists.recordset[0].c > 0) {
        await pool.request()
          .input('id',                     sql.Int,      id)
          .input('declara_poder_vigente',  sql.Bit,      declaracion.declara_poder_vigente != null ? (declaracion.declara_poder_vigente ? 1 : 0) : null)
          .input('declara_seguridad_edif', sql.Bit,      declaracion.declara_seguridad_edif != null ? (declaracion.declara_seguridad_edif ? 1 : 0) : null)
          .input('declara_titulo_prof',    sql.Bit,      declaracion.declara_titulo_profesional != null ? (declaracion.declara_titulo_profesional ? 1 : 0) : null)
          .input('declara_conocimiento',   sql.Bit,      declaracion.declara_conocimiento_fis != null ? (declaracion.declara_conocimiento_fis ? 1 : 0) : null)
          .input('observaciones_sol',      sql.NVarChar, declaracion.observaciones_solicitante || null)
          .input('nombre_firmante',        sql.NVarChar, declaracion.nombre_firmante || null)
          .input('dni_firmante',           sql.NVarChar, declaracion.dni_firmante || null)
          .input('fecha_firma',            sql.Date,     declaracion.fecha_firma || null)
          .query(`
            UPDATE DeclaracionesJuradas SET
              declara_poder_vigente    = COALESCE(@declara_poder_vigente, declara_poder_vigente),
              declara_seguridad_edif   = COALESCE(@declara_seguridad_edif, declara_seguridad_edif),
              declara_titulo_profesional = COALESCE(@declara_titulo_prof, declara_titulo_profesional),
              declara_conocimiento_fis = COALESCE(@declara_conocimiento, declara_conocimiento_fis),
              observaciones_solicitante= COALESCE(@observaciones_sol, observaciones_solicitante),
              nombre_firmante          = COALESCE(@nombre_firmante, nombre_firmante),
              dni_firmante             = COALESCE(@dni_firmante, dni_firmante),
              fecha_firma              = COALESCE(@fecha_firma, fecha_firma)
            WHERE id_expediente = @id
          `);
      }
      updates.push('declaracion');
    }

    await pool.request()
      .input('id',              sql.Int,      id)
      .input('nro_recibo_pago', sql.NVarChar, nro_recibo_pago || null)
      .input('fecha_pago',      sql.Date,     fecha_pago || null)
      .input('prioridad',       sql.NVarChar, prioridad || null)
      .input('observaciones',   sql.NVarChar, observaciones || null)
      .query(`
        UPDATE Expedientes SET
          nro_recibo_pago  = COALESCE(@nro_recibo_pago, nro_recibo_pago),
          fecha_pago       = COALESCE(@fecha_pago, fecha_pago),
          prioridad        = COALESCE(@prioridad, prioridad),
          observaciones    = COALESCE(@observaciones, observaciones),
          fecha_ultima_act = GETDATE()
        WHERE id_expediente = @id
      `);

    res.json({ mensaje: 'Datos actualizados correctamente.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, obtener, crear, clasificar, cambiarEstado, estadisticas, resumen, editarDatos };
