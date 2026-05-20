const router = require('express').Router();
const { getPool, sql } = require('../db/connection');
const { authMiddleware, requireRol } = require('../middlewares/auth');

router.use(authMiddleware);
router.use(requireRol('administrador', 'operador'));

/**
 * @swagger
 * tags:
 *   name: Solicitantes
 *   description: Búsqueda de solicitantes registrados en el padrón
 */

/**
 * @swagger
 * /solicitantes:
 *   get:
 *     summary: Buscar solicitantes por nombre, DNI o RUC
 *     tags: [Solicitantes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: buscar
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 3
 *           example: "Garcia"
 *         description: Término de búsqueda — mínimo 3 caracteres (busca en nombre, razón social, DNI/CE y RUC)
 *     responses:
 *       200:
 *         description: Hasta 10 solicitantes que coinciden con el término
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id_solicitante: { type: integer }
 *                   tipo_persona:
 *                     type: string
 *                     enum: [natural, juridica]
 *                   apellidos_nombres: { type: string }
 *                   razon_social: { type: string }
 *                   dni_ce: { type: string }
 *                   ruc: { type: string }
 *                   telefono: { type: string }
 *                   email: { type: string }
 *                   av_jr_ca_pje: { type: string }
 *                   nro_int_mz_lt: { type: string }
 *                   urb_aahh: { type: string }
 *                   distrito: { type: string }
 *                   provincia: { type: string }
 *       400:
 *         description: El parámetro buscar debe tener al menos 3 caracteres
 *       403:
 *         description: Rol insuficiente
 */
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