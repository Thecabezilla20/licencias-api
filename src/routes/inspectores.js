const router = require('express').Router();
const ctrl = require('../controllers/inspectoresController');
const { authMiddleware, requireRol } = require('../middlewares/auth');
const { crearInspectorRules, validate } = require('../middlewares/validators');

router.use(authMiddleware);

router.get('/',      ctrl.listar);
router.get('/:id',   ctrl.obtener);
router.post('/',     requireRol('administrador', 'operador'), crearInspectorRules, validate, ctrl.crear);
router.put('/:id',   requireRol('administrador'), crearInspectorRules, validate, ctrl.actualizar);

module.exports = router;