const router = require('express').Router();
const ctrl = require('../controllers/expedientesController');
const { authMiddleware, requireRol } = require('../middlewares/auth');
const { crearExpedienteRules, cambiarEstadoRules, clasificarRiesgoRules, validate } = require('../middlewares/validators');

router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Expedientes
 *   description: Gestión de expedientes de licencias
 */

/**
 * @swagger
 * /expedientes:
 *   get:
 *     summary: Listar expedientes
 *     tags: [Expedientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, example: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, example: 20 }
 *       - in: query
 *         name: estado
 *         schema: { type: string, example: "en_proceso" }
 *     responses:
 *       200:
 *         description: Lista paginada de expedientes
 *       403:
 *         description: Rol insuficiente
 *   post:
 *     summary: Crear nuevo expediente
 *     tags: [Expedientes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id_solicitante, id_tipo_licencia]
 *             properties:
 *               id_solicitante:
 *                 type: integer
 *                 example: 10
 *               id_tipo_licencia:
 *                 type: integer
 *                 example: 3
 *               observaciones:
 *                 type: string
 *     responses:
 *       201:
 *         description: Expediente creado correctamente
 *       400:
 *         description: Datos de entrada inválidos
 */
router.get('/',  requireRol('administrador', 'operador'), ctrl.listar);
router.post('/', requireRol('administrador', 'operador'), crearExpedienteRules, validate, ctrl.crear);

/**
 * @swagger
 * /expedientes/resumen:
 *   get:
 *     summary: Resumen general de expedientes
 *     tags: [Expedientes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Contadores y métricas de expedientes por estado
 */
router.get('/resumen', requireRol('administrador', 'operador'), ctrl.resumen);

/**
 * @swagger
 * /expedientes/estadisticas:
 *   get:
 *     summary: Estadísticas detalladas de expedientes
 *     tags: [Expedientes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas agrupadas por período, tipo y estado
 */
router.get('/estadisticas', requireRol('administrador', 'operador'), ctrl.estadisticas);

/**
 * @swagger
 * /expedientes/{id}:
 *   get:
 *     summary: Obtener expediente por ID
 *     tags: [Expedientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID del expediente
 *     responses:
 *       200:
 *         description: Expediente encontrado con todos sus datos
 *       404:
 *         description: Expediente no encontrado
 */
router.get('/:id', requireRol('administrador', 'operador'), ctrl.obtener);

/**
 * @swagger
 * /expedientes/{id}/estado:
 *   patch:
 *     summary: Cambiar estado del expediente
 *     tags: [Expedientes]
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
 *             required: [estado]
 *             properties:
 *               estado:
 *                 type: string
 *                 enum: [en_proceso, aprobado, rechazado, subsanacion, archivado]
 *               motivo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Estado actualizado correctamente
 *       400:
 *         description: Estado inválido
 */
router.patch('/:id/estado', requireRol('administrador', 'operador'), cambiarEstadoRules, validate, ctrl.cambiarEstado);

/**
 * @swagger
 * /expedientes/{id}/clasificar:
 *   patch:
 *     summary: Clasificar nivel de riesgo del expediente (solo administrador)
 *     tags: [Expedientes]
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
 *             required: [nivel_riesgo]
 *             properties:
 *               nivel_riesgo:
 *                 type: string
 *                 enum: [bajo, medio, alto, muy_alto]
 *     responses:
 *       200:
 *         description: Riesgo clasificado correctamente
 *       403:
 *         description: Solo administradores
 */
router.patch('/:id/clasificar', requireRol('administrador'), clasificarRiesgoRules, validate, ctrl.clasificar);

/**
 * @swagger
 * /expedientes/{id}/datos:
 *   patch:
 *     summary: Editar datos generales del expediente
 *     tags: [Expedientes]
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
 *             properties:
 *               observaciones: { type: string }
 *               id_tipo_licencia: { type: integer }
 *     responses:
 *       200:
 *         description: Datos del expediente actualizados
 *       404:
 *         description: Expediente no encontrado
 */
router.patch('/:id/datos', requireRol('administrador', 'operador'), ctrl.editarDatos);

module.exports = router;