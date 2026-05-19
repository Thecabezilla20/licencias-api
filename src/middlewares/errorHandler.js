function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.name === 'RequestError') {
    return res.status(400).json({ error: 'Error al procesar la solicitud. Verifique los datos enviados.' });
  }

  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Error interno del servidor'
    : (err.message || 'Error interno del servidor');
  res.status(status).json({ error: message });
}

module.exports = errorHandler;
