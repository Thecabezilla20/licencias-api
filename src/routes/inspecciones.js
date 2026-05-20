const router = require('express').Router();
const ctrl = require('../controllers/inspeccionesController');
const { authMiddleware, requireRol } = require('../middlewares/auth');
const { programarInspeccionRules, registrarResultadoRules, validate } = require('../middlewares/validators');

router.use(authMiddleware);

const ROLES_ITSE = ['administrador', 'operador', 'defensa_civil'];

/**
 * @swagger
 * tags:
 *   name: Inspecciones
 *   description: Programación y seguimiento de inspecciones técnicas (ITSE)
 */

/**
 * @swagger
 * /inspecciones:
 *   get:
 *     summary: Listar todas las inspecciones
 *     tags: [Inspecciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: estado
 *         schema: { type: string, example: "programada" }
 *       - in: query
 *         name: page
 *         schema: { type: integer, example: 1 }
 *     responses:
 *       200:
 *         description: Lista de inspecciones
 *       403:
 *         description: Rol insuficiente
 *   post:
 *     summary: Programar nueva inspección
 *     tags: [Inspecciones]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id_expediente, id_inspector, fecha_programada]
 *             properties:
 *               id_expediente:
 *                 type: integer
 *                 example: 15
 *               id_inspector:
 *                 type: integer
 *                 example: 3
 *               fecha_programada:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-08-10T09:00:00"
 *               observaciones:
 *                 type: string
 *     responses:
 *       201:
 *         description: Inspección programada correctamente
 *       400:
 *         description: Datos inválidos
 *       403:
 *         description: Solo administrador u operador
 */
router.get('/',  requireRol(...ROLES_ITSE), ctrl.listarTodas);
router.post('/', requireRol('administrador', 'operador'), programarInspeccionRules, validate, ctrl.programar);

/**
 * @swagger
 * /inspecciones/expediente/{id_expediente}:
 *   get:
 *     summary: Listar inspecciones de un expediente
 *     tags: [Inspecciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_expediente
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Inspecciones del expediente especificado
 *       404:
 *         description: Expediente no encontrado
 */
router.get('/expediente/:id_expediente', requireRol(...ROLES_ITSE), ctrl.listarPorExpediente);

/**
 * @swagger
 * /inspecciones/{id}:
 *   get:
 *     summary: Obtener inspección por ID
 *     tags: [Inspecciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Detalle completo de la inspección
 *       404:
 *         description: Inspección no encontrada
 */
router.get('/:id', requireRol(...ROLES_ITSE), ctrl.obtener);

/**
 * @swagger
 * /inspecciones/{id}/resultado:
 *   patch:
 *     summary: Registrar resultado de inspección
 *     tags: [Inspecciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [resultado]
 *             properties:
 *               resultado:
 *                 type: string
 *                 enum: [conforme, no_conforme, observado]
 *               informe:
 *                 type: string
 *               fecha_inspeccion:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Resultado registrado correctamente
 *       400:
 *         description: Datos inválidos
 */
router.patch('/:id/resultado', requireRol(...ROLES_ITSE), registrarResultadoRules, validate, ctrl.registrarResultado);

/**
 * @swagger
 * /inspecciones/{id}/observaciones:
 *   post:
 *     summary: Agregar observación a una inspección
 *     tags: [Inspecciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [descripcion]
 *             properties:
 *               descripcion:
 *                 type: string
 *                 example: "Extintores vencidos en el área de cocina"
 *               plazo_subsanacion:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Observación registrada
 */
router.post('/:id/observaciones', requireRol(...ROLES_ITSE), ctrl.agregarObservacion);

/**
 * @swagger
 * /inspecciones/{id}/observaciones/{id_obs}:
 *   patch:
 *     summary: Marcar observación como subsanada
 *     tags: [Inspecciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID de la inspección
 *       - in: path
 *         name: id_obs
 *         required: true
 *         schema: { type: integer }
 *         description: ID de la observación
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               evidencia: { type: string }
 *     responses:
 *       200:
 *         description: Observación marcada como subsanada
 *       404:
 *         description: Observación no encontrada
 */
router.patch('/:id/observaciones/:id_obs', requireRol(...ROLES_ITSE), ctrl.subsanarObservacion);

module.exports = router;