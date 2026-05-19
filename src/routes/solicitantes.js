const router = require('express').Router();
const { getPool, sql } = require('../db/connection');
const { authMiddleware, requireRol } = require('../middlewares/auth');

router.use(authMiddleware);
router.use(requireRol('administrador', 'operador'));

router.get('/', async (req, res, next) => {
  try {
    const { buscar } = req.query;
    if (!buscar || buscar.trim().length < 3) {
      return res.json([]);
    }
    const termino = `%${buscar.trim()}%`;
    const pool = await getPool();
    const result = await pool.request()
      .input('t', sql.NVarChar, termino)
      .query(`
        SELECT TOP 10 id_solicitante, tipo_persona, apellidos_nombres, razon_social,
               dni_ce, ruc, telefono, email, av_jr_ca_pje, nro_int_mz_lt, urb_aahh, distrito, provincia
        FROM Solicitantes
        WHERE apellidos_nombres LIKE @t
           OR razon_social      LIKE @t
           OR dni_ce            LIKE @t
           OR ruc               LIKE @t
        ORDER BY id_solicitante DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
