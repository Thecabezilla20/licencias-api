const router = require('express').Router();
const { listarLogs } = require('../controllers/auditController');
const { authMiddleware, requireRol } = require('../middlewares/auth');

router.use(authMiddleware);
router.use(requireRol('administrador'));

router.get('/logs', listarLogs);

module.exports = router;
