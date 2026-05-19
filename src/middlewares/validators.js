const { body, validationResult } = require('express-validator');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
}

const loginRules = [
  body('credencial')
    .notEmpty().withMessage('El usuario o correo es obligatorio.'),
  body('password')
    .notEmpty().withMessage('La contraseña es obligatoria.'),
];

const TIPOS_PERSONA_NATURAL = ['Natural', 'Natural con local alquilado'];

const crearExpedienteRules = [
  body('id_tipo_licencia').isInt({ min: 1 }).withMessage('Debe seleccionar un tipo de licencia válido.'),
  body('modalidad_tramite').optional({ checkFalsy: true })
    .isIn(['Regular', 'Automático', 'Especial']).withMessage('La modalidad de trámite no es válida.'),
  body('prioridad').optional({ checkFalsy: true })
    .isIn(['Normal', 'Urgente']).withMessage('La prioridad debe ser Normal o Urgente.'),
  body('tipo_tramite').optional({ checkFalsy: true })
    .isIn(['Licencia Nueva', 'Cambio de denominación', 'Transferencia', 'Cese de actividades', 'Otro'])
    .withMessage('El tipo de trámite no es válido.'),
  body('duracion_licencia').optional({ checkFalsy: true })
    .isIn(['Indeterminada', 'Temporal']).withMessage('La duración debe ser Indeterminada o Temporal.'),
  body('solicitante.tipo_persona').isIn(['Natural', 'Natural con local alquilado', 'Jurídica']).withMessage('El tipo de persona no es válido.'),
  body('solicitante.apellidos_nombres').if((_, { req }) => TIPOS_PERSONA_NATURAL.includes(req.body?.solicitante?.tipo_persona))
    .notEmpty().withMessage('Apellidos y nombres son obligatorios para persona natural.'),
  body('solicitante.razon_social').if(body('solicitante.tipo_persona').equals('Jurídica'))
    .notEmpty().withMessage('La razón social es obligatoria para persona jurídica.'),
  body('solicitante.dni_ce').optional({ checkFalsy: true })
    .matches(/^\d{8}$/).withMessage('El DNI debe tener exactamente 8 dígitos numéricos.'),
  body('solicitante.ruc').optional({ checkFalsy: true })
    .matches(/^\d{11}$/).withMessage('El RUC debe tener exactamente 11 dígitos numéricos.'),
  body('solicitante.email').optional({ checkFalsy: true })
    .isEmail().withMessage('El correo electrónico no tiene un formato válido.'),
  body('solicitante.telefono').optional({ checkFalsy: true })
    .matches(/^\d{9}$/).withMessage('El teléfono debe tener 9 dígitos numéricos.'),
  body('representante.dni_ce').optional({ checkFalsy: true })
    .matches(/^\d{8}$/).withMessage('El DNI del representante debe tener 8 dígitos.'),
  body('declaracion.dni_firmante').optional({ checkFalsy: true })
    .matches(/^\d{8}$/).withMessage('El DNI del firmante debe tener 8 dígitos.'),
];

const cambiarEstadoRules = [
  body('estado')
    .notEmpty().withMessage('El estado es obligatorio.')
    .isIn(['Recibido', 'En evaluación', 'Inspección programada', 'Inspeccionado', 'Observado', 'Aprobado', 'Denegado', 'Anulado'])
    .withMessage('El estado no es válido.'),
];

const clasificarRiesgoRules = [
  body('nivel_riesgo')
    .notEmpty().withMessage('El nivel de riesgo es obligatorio.')
    .isIn(['Bajo', 'Medio', 'Alto', 'Muy Alto']).withMessage('El nivel de riesgo debe ser Bajo, Medio, Alto o Muy Alto.'),
  body('nombre_calificador').optional({ checkFalsy: true }).isString().withMessage('El nombre del calificador no es válido.'),
  body('fecha_clasificacion').optional({ checkFalsy: true }).isDate().withMessage('La fecha de clasificación no es válida.'),
];

const programarInspeccionRules = [
  body('id_expediente').isInt({ min: 1 }).withMessage('Debe indicar un expediente válido.'),
  body('id_establecimiento').isInt({ min: 1 }).withMessage('Debe indicar un establecimiento válido.'),
  body('fecha_programada').isDate().withMessage('La fecha programada no es válida.'),
  body('tipo_inspeccion').optional()
    .isIn(['Primera Inspección', 'Reinspección', 'Inspección Especial'])
    .withMessage('El tipo de inspección debe ser: Primera Inspección, Reinspección o Inspección Especial.'),
];

const registrarResultadoRules = [
  body('fecha_ejecutada').isDate().withMessage('La fecha ejecutada no es válida.'),
  body('resultado').isIn(['Conforme', 'No Conforme', 'Observado'])
    .withMessage('El resultado debe ser Conforme, No Conforme u Observado.'),
];

const crearInspectorRules = [
  body('apellidos_nombres').notEmpty().withMessage('Los apellidos y nombres son obligatorios.'),
  body('dni').matches(/^\d{8}$/).withMessage('El DNI debe tener exactamente 8 dígitos numéricos.'),
  body('email').optional({ checkFalsy: true })
    .isEmail().withMessage('El correo electrónico no tiene un formato válido.'),
  body('telefono').optional({ checkFalsy: true })
    .matches(/^\d{9}$/).withMessage('El teléfono debe tener 9 dígitos numéricos.'),
];

const cambiarPasswordRules = [
  body('password_actual').notEmpty().withMessage('La contraseña actual es obligatoria.'),
  body('password_nuevo')
    .notEmpty().withMessage('La nueva contraseña es obligatoria.')
    .isLength({ min: 6 }).withMessage('La nueva contraseña debe tener al menos 6 caracteres.'),
];

const crearUsuarioRules = [
  body('nombre_completo').notEmpty().withMessage('El nombre completo es obligatorio.'),
  body('email').isEmail().withMessage('El correo electrónico no tiene un formato válido.'),
  body('username')
    .notEmpty().withMessage('El nombre de usuario es obligatorio.')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('El usuario solo puede contener letras, números y guión bajo.'),
  body('password')
    .notEmpty().withMessage('La contraseña es obligatoria.')
    .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres.'),
  body('rol').isIn(['administrador', 'operador', 'defensa_civil']).withMessage('El rol no es válido.'),
  body('cargo').optional({ checkFalsy: true }).isString(),
];

const actualizarUsuarioRules = [
  body('nombre_completo').optional({ checkFalsy: true }).isString().withMessage('El nombre completo no es válido.'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('El correo electrónico no tiene un formato válido.'),
  body('username').optional({ checkFalsy: true })
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('El usuario solo puede contener letras, números y guión bajo.'),
  body('rol').optional({ checkFalsy: true })
    .isIn(['administrador', 'operador', 'defensa_civil']).withMessage('El rol no es válido.'),
  body('cargo').optional({ checkFalsy: true }).isString(),
];

module.exports = {
  validate,
  loginRules,
  crearExpedienteRules,
  cambiarEstadoRules,
  clasificarRiesgoRules,
  programarInspeccionRules,
  registrarResultadoRules,
  crearInspectorRules,
  cambiarPasswordRules,
  crearUsuarioRules,
  actualizarUsuarioRules,
};
