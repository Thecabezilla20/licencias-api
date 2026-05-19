const fs = require('fs');
const path = require('path');

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const logsDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logStream = fs.createWriteStream(path.join(logsDir, 'audit.log'), { flags: 'a' });

function auditMiddleware(req, res, next) {
  if (!WRITE_METHODS.has(req.method)) return next();

  res.on('finish', () => {
    const entry = {
      ts: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      user_id: req.user?.id ?? null,
      user_rol: req.user?.rol ?? null,
      ip: req.ip,
    };
    const line = JSON.stringify(entry) + '\n';
    logStream.write(line);
    console.log('[AUDIT]', line.trim());
  });

  next();
}

module.exports = auditMiddleware;
