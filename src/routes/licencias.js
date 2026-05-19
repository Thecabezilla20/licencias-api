const router = require('express').Router();
const { listarTipos, obtenerTipo, requisitosDelTipo, listarEmitidas, emitir, obtenerLicencia, crearTipo, actualizarTipo, eliminarTipo } = require('../controllers/licenciasController');
const { authMiddleware, requireRol } = require('../middlewares/auth');

router.use(authMiddleware);

router.get('/emitidas',                    requireRol('administrador', 'operador'), listarEmitidas);
router.post('/emitidas',                   requireRol('administrador', 'operador'), emitir);
router.get('/emitidas/:id_expediente',     requireRol('administrador', 'operador'), obtenerLicencia);
router.post('/',                           requireRol('administrador'), crearTipo);
router.get('/',                            listarTipos);
router.get('/:id',                         obtenerTipo);
router.get('/:id/requisitos',              requisitosDelTipo);
router.put('/:id',                         requireRol('administrador'), actualizarTipo);
router.delete('/:id',                      requireRol('administrador'), eliminarTipo);

module.exports = router;