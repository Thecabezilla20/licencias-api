const router = require('express').Router();
const ctrl = require('../controllers/usuariosController');
const { authMiddleware, requireRol } = require('../middlewares/auth');
const { crearUsuarioRules, actualizarUsuarioRules, validate } = require('../middlewares/validators');

router.use(authMiddleware);
router.use(requireRol('administrador'));

router.get('/',                  ctrl.listar);
router.get('/:id',               ctrl.obtener);
router.post('/',                 crearUsuarioRules, validate, ctrl.crear);
router.put('/:id',               actualizarUsuarioRules, validate, ctrl.actualizar);
router.patch('/:id/activo',      ctrl.toggleActivo);
router.patch('/:id/password',    ctrl.resetPassword);

module.exports = router;
