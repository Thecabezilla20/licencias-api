const router = require('express').Router();
const ctrl = require('../controllers/inspectoresController');
const { authMiddleware, requireRol } = require('../middlewares/auth');
const { crearInspectorRules, validate } = require('../middlewares/validators');

router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Inspectores
 *   description: Gestión del padrón de inspectores de campo
 */

/**
 * @swagger
 * /inspectores:
 *   get:
 *     summary: Listar todos los inspectores
 *     tags: [Inspectores]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de inspectores registrados
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id_inspector: { type: integer }
 *                   nombre: { type: string }
 *                   apellidos: { type: string }
 *                   dni: { type: string }
 *                   activo: { type: boolean }
 *   post:
 *     summary: Registrar nuevo inspector
 *     tags: [Inspectores]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, apellidos, dni]
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: "Carlos"
 *               apellidos:
 *                 type: string
 *                 example: "Gutierrez Rios"
 *               dni:
 *                 type: string
 *                 example: "41234567"
 *               telefono:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       201:
 *         description: Inspector registrado correctamente
 *       400:
 *         description: Datos inválidos
 *       403:
 *         description: Rol insuficiente
 */
router.get('/',  ctrl.listar);
router.post('/', requireRol('administrador', 'operador'), crearInspectorRules, validate, ctrl.crear);

/**
 * @swagger
 * /inspectores/{id}:
 *   get:
 *     summary: Obtener inspector por ID
 *     tags: [Inspectores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Inspector encontrado
 *       404:
 *         description: Inspector no encontrado
 *   put:
 *     summary: Actualizar datos del inspector (solo administrador)
 *     tags: [Inspectores]
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
 *               nombre: { type: string }
 *               apellidos: { type: string }
 *               dni: { type: string }
 *               telefono: { type: string }
 *               email: { type: string }
 *               activo: { type: boolean }
 *     responses:
 *       200:
 *         description: Inspector actualizado
 *       403:
 *         description: Solo administradores
 *       404:
 *         description: Inspector no encontrado
 */
router.get('/:id', ctrl.obtener);
router.put('/:id', requireRol('administrador'), crearInspectorRules, validate, ctrl.actualizar);

module.exports = router;