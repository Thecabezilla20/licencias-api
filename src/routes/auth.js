const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { login, perfil, refresh, cambiarPassword } = require('../controllers/authController');
const { authMiddleware } = require('../middlewares/auth');
const { loginRules, cambiarPasswordRules, validate } = require('../middlewares/validators');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de acceso. Intente nuevamente en 15 minutos.' },
});

/**
 * @swagger
 * tags:
 *   name: Autenticación
 *   description: Endpoints para login, perfil y gestión de sesión
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [usuario, password]
 *             properties:
 *               usuario:
 *                 type: string
 *                 example: admin
 *               password:
 *                 type: string
 *                 example: "Mi@Password123"
 *     responses:
 *       200:
 *         description: Login exitoso — retorna token JWT
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 usuario:
 *                   type: object
 *       401:
 *         description: Credenciales inválidas
 *       429:
 *         description: Demasiados intentos — rate limit activo
 */
router.post('/login', loginLimiter, loginRules, validate, login);

/**
 * @swagger
 * /auth/perfil:
 *   get:
 *     summary: Obtener perfil del usuario autenticado
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos del usuario actual
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_usuario:
 *                   type: integer
 *                 usuario:
 *                   type: string
 *                 rol:
 *                   type: string
 *                 nombre:
 *                   type: string
 *       401:
 *         description: No autorizado
 */
router.get('/perfil', authMiddleware, perfil);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Renovar token de acceso
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token renovado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       401:
 *         description: Token inválido o expirado
 */
router.post('/refresh', authMiddleware, refresh);

/**
 * @swagger
 * /auth/cambiar-password:
 *   post:
 *     summary: Cambiar contraseña del usuario autenticado
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [passwordActual, passwordNuevo]
 *             properties:
 *               passwordActual:
 *                 type: string
 *                 example: "MiPasswordActual1"
 *               passwordNuevo:
 *                 type: string
 *                 example: "MiNuevoPass456"
 *     responses:
 *       200:
 *         description: Contraseña actualizada correctamente
 *       400:
 *         description: Validación fallida
 *       401:
 *         description: No autorizado o contraseña actual incorrecta
 */
router.post('/cambiar-password', authMiddleware, cambiarPasswordRules, validate, cambiarPassword);

module.exports = router;