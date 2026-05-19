const TRANSICIONES_VALIDAS = {
  'Recibido':              ['En evaluación', 'Anulado'],
  'En evaluación':         ['Inspección programada', 'Aprobado', 'Denegado', 'Anulado'],
  'Inspección programada': ['Inspeccionado', 'Observado', 'Anulado'],
  'Inspeccionado':         ['Aprobado', 'Denegado', 'Anulado'],
  'Observado':             ['Inspección programada', 'Denegado', 'Anulado'],
  'Aprobado':              [],
  'Denegado':              [],
  'Anulado':               [],
};

module.exports = { TRANSICIONES_VALIDAS };
