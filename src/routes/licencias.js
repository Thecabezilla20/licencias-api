const router = require('express').Router();
const {
  listarTipos, obtenerTipo, requisitosDelTipo,
  listarEmitidas, emitir, obtenerLicencia,
  crearTipo, actualizarTipo, eliminarTipo
} = require('../controllers/licenciasController');
const { authMiddleware, requireRol } = require('../middlewares/auth');

router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Licencias
 *   description: Gestión de tipos de licencias y licencias emitidas
 */

/**
 * @swagger
 * /licencias/emitidas:
 *   get:
 *     summary: Listar todas las licencias emitidas
 *     tags: [Licencias]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, example: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, example: 20 }
 *     responses:
 *       200:
 *         description: Lista de licencias emitidas
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Rol insuficiente
 *   post:
 *     summary: Emitir una nueva licencia
 *     tags: [Licencias]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id_expediente]
 *             properties:
 *               id_expediente:
 *                 type: integer
 *                 example: 42
 *               observaciones:
 *                 type: string
 *     responses:
 *       201:
 *         description: Licencia emitida correctamente
 *       400:
 *         description: Datos inválidos
 *       403:
 *         description: Rol insuficiente
 */
router.get('/emitidas',  requireRol('administrador', 'operador'), listarEmitidas);
router.post('/emitidas', requireRol('administrador', 'operador'), emitir);

/**
 * @swagger
 * /licencias/emitidas/{id_expediente}:
 *   get:
 *     summary: Obtener licencia emitida por expediente
 *     tags: [Licencias]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_expediente
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Licencia encontrada
 *       404:
 *         description: Licencia no encontrada
 */
router.get('/emitidas/:id_expediente', requireRol('administrador', 'operador'), obtenerLicencia);

/**
 * @swagger
 * /licencias:
 *   get:
 *     summary: Listar tipos de licencia
 *     tags: [Licencias]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de tipos de licencia disponibles
 *   post:
 *     summary: Crear nuevo tipo de licencia
 *     tags: [Licencias]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre]
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: "Licencia de Funcionamiento"
 *               descripcion:
 *                 type: string
 *               vigencia_dias:
 *                 type: integer
 *                 example: 365
 *     responses:
 *       201:
 *         description: Tipo de licencia creado
 *       403:
 *         description: Solo administradores
 */
router.get('/',  listarTipos);
router.post('/', requireRol('administrador'), crearTipo);

/**
 * @swagger
 * /licencias/{id}:
 *   get:
 *     summary: Obtener tipo de licencia por ID
 *     tags: [Licencias]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Tipo de licencia encontrado
 *       404:
 *         description: No encontrado
 *   put:
 *     summary: Actualizar tipo de licencia
 *     tags: [Licencias]
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
 *               descripcion: { type: string }
 *               vigencia_dias: { type: integer }
 *     responses:
 *       200:
 *         description: Actualizado correctamente
 *       403:
 *         description: Solo administradores
 *   delete:
 *     summary: Eliminar tipo de licencia
 *     tags: [Licencias]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Eliminado correctamente
 *       403:
 *         description: Solo administradores
 */
router.get('/:id',    obtenerTipo);
router.put('/:id',    requireRol('administrador'), actualizarTipo);
router.delete('/:id', requireRol('administrador'), eliminarTipo);

/**
 * @swagger
 * /licencias/{id}/requisitos:
 *   get:
 *     summary: Obtener requisitos de un tipo de licencia
 *     tags: [Licencias]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lista de requisitos del tipo de licencia
 *       404:
 *         description: Tipo de licencia no encontrado
 */
router.get('/:id/requisitos', requisitosDelTipo);

module.exports = router;