const router = require('express').Router();
const ctrl = require('../controllers/usuariosController');
const { authMiddleware, requireRol } = require('../middlewares/auth');
const { crearUsuarioRules, actualizarUsuarioRules, validate } = require('../middlewares/validators');

router.use(authMiddleware);
router.use(requireRol('administrador'));

/**
 * @swagger
 * tags:
 *   name: Usuarios
 *   description: Administración de usuarios del sistema (solo administrador)
 */

/**
 * @swagger
 * /usuarios:
 *   get:
 *     summary: Listar usuarios del sistema
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios registrados
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id_usuario: { type: integer }
 *                   usuario: { type: string }
 *                   nombre: { type: string }
 *                   rol: { type: string }
 *                   activo: { type: boolean }
 *       403:
 *         description: Solo administradores
 *   post:
 *     summary: Crear nuevo usuario
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [usuario, password, nombre, rol]
 *             properties:
 *               usuario:
 *                 type: string
 *                 example: "jperez"
 *               password:
 *                 type: string
 *                 example: "Inicial@123"
 *               nombre:
 *                 type: string
 *                 example: "Juan Pérez"
 *               rol:
 *                 type: string
 *                 enum: [administrador, operador, defensa_civil]
 *     responses:
 *       201:
 *         description: Usuario creado correctamente
 *       400:
 *         description: Datos inválidos o usuario ya existe
 */
router.get('/',  ctrl.listar);
router.post('/', crearUsuarioRules, validate, ctrl.crear);

/**
 * @swagger
 * /usuarios/{id}:
 *   get:
 *     summary: Obtener usuario por ID
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *       404:
 *         description: Usuario no encontrado
 *   put:
 *     summary: Actualizar datos del usuario
 *     tags: [Usuarios]
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
 *               rol:
 *                 type: string
 *                 enum: [administrador, operador, defensa_civil]
 *     responses:
 *       200:
 *         description: Usuario actualizado
 *       404:
 *         description: Usuario no encontrado
 */
router.get('/:id', ctrl.obtener);
router.put('/:id', actualizarUsuarioRules, validate, ctrl.actualizar);

/**
 * @swagger
 * /usuarios/{id}/activo:
 *   patch:
 *     summary: Activar o desactivar usuario
 *     tags: [Usuarios]
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
 *             required: [activo]
 *             properties:
 *               activo:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Estado del usuario actualizado
 */
router.patch('/:id/activo', ctrl.toggleActivo);

/**
 * @swagger
 * /usuarios/{id}/password:
 *   patch:
 *     summary: Resetear contraseña de usuario
 *     tags: [Usuarios]
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
 *             required: [nuevaPassword]
 *             properties:
 *               nuevaPassword:
 *                 type: string
 *                 example: "Reset@Temp123"
 *     responses:
 *       200:
 *         description: Contraseña reseteada correctamente
 *       404:
 *         description: Usuario no encontrado
 */
router.patch('/:id/password', ctrl.resetPassword);

module.exports = router;