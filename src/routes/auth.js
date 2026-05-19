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

router.post('/login',            loginLimiter, loginRules, validate, login);
router.get('/perfil',            authMiddleware, perfil);
router.post('/refresh',          authMiddleware, refresh);
router.post('/cambiar-password', authMiddleware, cambiarPasswordRules, validate, cambiarPassword);

module.exports = router;
