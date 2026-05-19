const router = require('express').Router();
const ctrl = require('../controllers/inspeccionesController');
const { authMiddleware, requireRol } = require('../middlewares/auth');
const { programarInspeccionRules, registrarResultadoRules, validate } = require('../middlewares/validators');

router.use(authMiddleware);

const ROLES_ITSE = ['administrador', 'operador', 'defensa_civil'];

router.get('/',                            requireRol(...ROLES_ITSE), ctrl.listarTodas);
router.get('/expediente/:id_expediente',   requireRol(...ROLES_ITSE), ctrl.listarPorExpediente);
router.get('/:id',                         requireRol(...ROLES_ITSE), ctrl.obtener);
router.post('/',                           requireRol('administrador', 'operador'), programarInspeccionRules, validate, ctrl.programar);
router.patch('/:id/resultado',             requireRol(...ROLES_ITSE), registrarResultadoRules, validate, ctrl.registrarResultado);
router.post('/:id/observaciones',          requireRol(...ROLES_ITSE), ctrl.agregarObservacion);
router.patch('/:id/observaciones/:id_obs', requireRol(...ROLES_ITSE), ctrl.subsanarObservacion);

module.exports = router;