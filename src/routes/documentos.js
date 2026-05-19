const router = require('express').Router({ mergeParams: true });
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ctrl = require('../controllers/documentosController');
const { authMiddleware, requireRol } = require('../middlewares/auth');

const TIPOS_PERMITIDOS = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', '..', 'uploads', 'expedientes', req.params.id_expediente);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (TIPOS_PERMITIDOS.has(file.mimetype)) cb(null, true);
    else cb(new Error('Tipo de archivo no permitido. Use PDF, Word, Excel o imágenes.'));
  },
});

router.use(authMiddleware);
router.use(requireRol('administrador', 'operador'));

router.get('/',  ctrl.listar);
router.post('/', (req, res, next) => {
  upload.single('archivo')(req, res, (err) => {
    if (err) {
      err.status = 400;
      return next(err);
    }
    next();
  });
}, ctrl.subir);
router.get('/:id_documento/descargar', ctrl.descargar);
router.delete('/:id_documento',       ctrl.eliminar);

module.exports = router;
