require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const swaggerUi  = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const morgan     = require('morgan');

const { getPool }        = require('./src/db/connection');
const authRoutes         = require('./src/routes/auth');
const licenciasRoutes    = require('./src/routes/licencias');
const expedientesRoutes  = require('./src/routes/expedientes');
const inspectoresRoutes  = require('./src/routes/inspectores');
const inspeccionesRoutes = require('./src/routes/inspecciones');
const usuariosRoutes     = require('./src/routes/usuarios');
const auditRoutes        = require('./src/routes/audit');
const documentosRoutes   = require('./src/routes/documentos');
const solicitantesRoutes = require('./src/routes/solicitantes');
const errorHandler       = require('./src/middlewares/errorHandler');
const auditMiddleware    = require('./src/middlewares/audit');

const app = express();

// ─── Swagger Config (ANTES de helmet y rutas) ────────────────────────────────
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Miceroservicio de Licencias - MDL',
      version: '1.0.0',
      description: 'Microservicio para la gestión de licencias en MDL'
    },
    sservers: [
  { url: 'https://licencias-api-5y31.onrender.com/api', description: 'Producción' },
  { url: 'http://localhost:3000/api', description: 'Local' }
],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: ['./src/routes/*.js']
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);

// ─── Helmet (con CSP relajado para Swagger UI) ───────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc:  ["'self'", "'unsafe-inline'"],
        styleSrc:   ["'self'", "'unsafe-inline'"],
        imgSrc:     ["'self'", 'data:', 'https:'],
      }
    }
  })
);

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5174' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(auditMiddleware);

// ─── Swagger UI (ANTES del 404 handler) ──────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs, {
  customSiteTitle: 'MicroServicio de Licencias',
  swaggerOptions: { persistAuthorization: true }
}));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request().query('SELECT 1 AS ok');
    res.json({ estado: 'ok', db: 'conectada', sistema: 'Licencias Laredo', fecha: new Date() });
  } catch {
    res.status(503).json({ estado: 'error', db: 'no disponible', sistema: 'Licencias Laredo', fecha: new Date() });
  }
});

// ─── Rutas ────────────────────────────────────────────────────────────────────
app.use('/api/auth',         authRoutes);
app.use('/api/licencias',    licenciasRoutes);
app.use('/api/expedientes',  expedientesRoutes);
app.use('/api/inspectores',  inspectoresRoutes);
app.use('/api/inspecciones', inspeccionesRoutes);
app.use('/api/usuarios',     usuariosRoutes);
app.use('/api/audit',        auditRoutes);
app.use('/api/expedientes/:id_expediente/documentos', documentosRoutes);
app.use('/api/solicitantes', solicitantesRoutes);

// ─── Handlers globales ────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📚 Swagger UI disponible en http://localhost:${PORT}/api-docs`);
});