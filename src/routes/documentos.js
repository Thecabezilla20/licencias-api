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

/**
 * @swagger
 * tags:
 *   name: Documentos
 *   description: Gestión de documentos adjuntos por expediente
 */

/**
 * @swagger
 * /expedientes/{id_expediente}/documentos:
 *   get:
 *     summary: Listar documentos de un expediente
 *     tags: [Documentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_expediente
 *         required: true
 *         schema: { type: integer }
 *         description: ID del expediente
 *     responses:
 *       200:
 *         description: Lista de documentos adjuntos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id_documento: { type: integer }
 *                   nombre_original: { type: string }
 *                   tipo_mime: { type: string }
 *                   tamanio_bytes: { type: integer }
 *                   fecha_subida: { type: string, format: date-time }
 *       403:
 *         description: Rol insuficiente
 *   post:
 *     summary: Subir documento al expediente
 *     tags: [Documentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_expediente
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [archivo]
 *             properties:
 *               archivo:
 *                 type: string
 *                 format: binary
 *                 description: Archivo a subir (PDF, Word, Excel o imagen — máx. 10 MB)
 *               descripcion:
 *                 type: string
 *     responses:
 *       201:
 *         description: Documento subido correctamente
 *       400:
 *         description: Tipo de archivo no permitido o excede el tamaño máximo
 */
router.get('/',  ctrl.listar);
router.post('/', (req, res, next) => {
  upload.single('archivo')(req, res, (err) => {
    if (err) { err.status = 400; return next(err); }
    next();
  });
}, ctrl.subir);

/**
 * @swagger
 * /expedientes/{id_expediente}/documentos/{id_documento}/descargar:
 *   get:
 *     summary: Descargar documento adjunto
 *     tags: [Documentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_expediente
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: id_documento
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Archivo descargado como stream binario
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Documento no encontrado
 */
router.get('/:id_documento/descargar', ctrl.descargar);

/**
 * @swagger
 * /expedientes/{id_expediente}/documentos/{id_documento}:
 *   delete:
 *     summary: Eliminar documento adjunto
 *     tags: [Documentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_expediente
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: id_documento
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Documento eliminado correctamente
 *       404:
 *         description: Documento no encontrado
 */
router.delete('/:id_documento', ctrl.eliminar);

module.exports = router;