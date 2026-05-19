const router = require('express').Router();
const ctrl = require('../controllers/expedientesController');
const { authMiddleware, requireRol } = require('../middlewares/auth');
const { crearExpedienteRules, cambiarEstadoRules, clasificarRiesgoRules, validate } = require('../middlewares/validators');

router.use(authMiddleware);

router.get('/',                requireRol('administrador', 'operador'), ctrl.listar);
router.get('/resumen',         requireRol('administrador', 'operador'), ctrl.resumen);
router.get('/estadisticas',    requireRol('administrador', 'operador'), ctrl.estadisticas);
router.get('/:id',             requireRol('administrador', 'operador'), ctrl.obtener);
router.post('/',               requireRol('administrador', 'operador'), crearExpedienteRules, validate, ctrl.crear);
router.patch('/:id/estado',    requireRol('administrador', 'operador'), cambiarEstadoRules, validate, ctrl.cambiarEstado);
router.patch('/:id/clasificar',requireRol('administrador'), clasificarRiesgoRules, validate, ctrl.clasificar);
router.patch('/:id/datos',     requireRol('administrador', 'operador'), ctrl.editarDatos);

module.exports = router;