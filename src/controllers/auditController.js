const fs = require('fs');
const path = require('path');
const { getPool, sql } = require('../db/connection');

const LOG_PATH = path.join(__dirname, '..', '..', 'logs', 'audit.log');

async function listarLogs(req, res, next) {
  try {
    const pagina = Math.max(1, parseInt(req.query.pagina) || 1);
    const limite = Math.min(100, Math.max(10, parseInt(req.query.limite) || 50));
    const { desde, hasta, metodo, usuario_id } = req.query;

    if (!fs.existsSync(LOG_PATH)) {
      return res.json({ datos: [], total: 0, total_paginas: 0, pagina, limite });
    }

    const contenido = fs.readFileSync(LOG_PATH, 'utf8');
    let entradas = contenido
      .split('\n')
      .filter(Boolean)
      .map(line => { try { return JSON.parse(line); } catch { return null; } })
      .filter(Boolean)
      .reverse();

    if (desde) entradas = entradas.filter(e => e.ts >= desde);
    if (hasta) {
      const hastaFin = hasta + 'T23:59:59.999Z';
      entradas = entradas.filter(e => e.ts <= hastaFin);
    }
    if (metodo) entradas = entradas.filter(e => e.method === metodo.toUpperCase());
    if (usuario_id) entradas = entradas.filter(e => e.user_id === parseInt(usuario_id));

    const total = entradas.length;
    const total_paginas = Math.ceil(total / limite);
    const datos = entradas.slice((pagina - 1) * limite, pagina * limite);

    const userIds = [...new Set(datos.map(e => e.user_id).filter(id => Number.isInteger(id) && id > 0))];
    let usuariosMap = {};
    if (userIds.length > 0) {
      const pool = await getPool();
      const result = await pool.request().query(
        `SELECT id_usuario, nombre_completo, username FROM Usuarios WHERE id_usuario IN (${userIds.map(Number).join(',')})`
      );
      result.recordset.forEach(u => { usuariosMap[u.id_usuario] = u; });
    }

    const datosEnriquecidos = datos.map(e => ({
      ...e,
      usuario: e.user_id ? (usuariosMap[e.user_id] || { nombre_completo: 'Desconocido', username: null }) : null,
    }));

    res.json({ datos: datosEnriquecidos, total, total_paginas, pagina, limite });
  } catch (err) {
    next(err);
  }
}

module.exports = { listarLogs };
