const router = require('express').Router();
const { listarLogs } = require('../controllers/auditController');
const { authMiddleware, requireRol } = require('../middlewares/auth');

router.use(authMiddleware);
router.use(requireRol('administrador'));

/**
 * @swagger
 * tags:
 *   name: Auditoría
 *   description: Trazabilidad de acciones del sistema (solo administrador)
 */

/**
 * @swagger
 * /audit/logs:
 *   get:
 *     summary: Listar logs de auditoría
 *     tags: [Auditoría]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, example: 1 }
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema: { type: integer, example: 50 }
 *         description: Registros por página
 *       - in: query
 *         name: usuario
 *         schema: { type: string }
 *         description: Filtrar por nombre de usuario
 *       - in: query
 *         name: accion
 *         schema: { type: string }
 *         description: Filtrar por tipo de acción
 *       - in: query
 *         name: desde
 *         schema: { type: string, format: date, example: "2025-01-01" }
 *       - in: query
 *         name: hasta
 *         schema: { type: string, format: date, example: "2025-12-31" }
 *     responses:
 *       200:
 *         description: Logs de auditoría paginados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total: { type: integer }
 *                 page: { type: integer }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id_log: { type: integer }
 *                       usuario: { type: string }
 *                       accion: { type: string }
 *                       tabla: { type: string }
 *                       id_registro: { type: integer }
 *                       fecha: { type: string, format: date-time }
 *                       ip: { type: string }
 *       403:
 *         description: Solo administradores
 */
router.get('/logs', listarLogs);

module.exports = router;