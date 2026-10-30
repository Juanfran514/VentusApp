/**
 * Configuración y especificación extensible de tipos de pago (OCP - Open/Closed Principle)
 * Para añadir un nuevo tipo de pago en el futuro (ej. "matricula", "seminario"),
 * basta con registrarlo aquí sin tener que alterar la lógica del resto de la app.
 */

export const TIPOS_PAGO = {
  CUOTA: {
    id: 'cuota',
    label: 'Cuota',
    pluralLabel: 'Cuotas',
    modalTitle: 'Registrar Cobro de Cuota',
    estadoInicial: 'pagado',
    requiresPeriod: true, // Requiere mes y año
    usesCatalog: false,
    suggestionKey: null,
    placeholderConcepto: 'Ej: Cuota Septiembre 2026',
    defaultConcepto: (mesNombre, año) => `Cuota ${mesNombre || ''} ${año || ''}`.trim(),
    defaultImporte: (alumno) => Number(alumno?.cuota) || 0
  },
  EXAMEN: {
    id: 'examen',
    label: 'Examen',
    pluralLabel: 'Exámenes',
    modalTitle: 'Registrar Examen',
    estadoInicial: 'pendiente',
    requiresPeriod: false,
    usesCatalog: false,
    suggestionKey: null,
    placeholderConcepto: 'Ej: Cinturón Amarillo',
    defaultConcepto: () => 'Examen de Grado',
    defaultImporte: () => 0
  },
  MATERIAL: {
    id: 'material',
    label: 'Material',
    pluralLabel: 'Materiales',
    modalTitle: 'Registrar Material',
    estadoInicial: 'pendiente',
    requiresPeriod: false,
    usesCatalog: true,
    suggestionKey: 'materialesSugeridos',
    placeholderConcepto: 'Escribe o selecciona un material...',
    defaultConcepto: () => '',
    defaultImporte: () => 0
  },
  LICENCIA: {
    id: 'licencia',
    label: 'Licencia',
    pluralLabel: 'Licencias',
    modalTitle: 'Registrar Licencia Deportiva',
    estadoInicial: 'pendiente',
    requiresPeriod: false,
    usesCatalog: false,
    suggestionKey: 'licenciasSugeridas',
    placeholderConcepto: 'Escribe o selecciona una licencia...',
    defaultConcepto: () => 'Licencia Autonómica',
    defaultImporte: () => 0
  }
};

export const getTipoPagoConfig = (tipo) => {
  return TIPOS_PAGO[tipo?.toUpperCase()] || {
    id: tipo || 'otro',
    label: tipo || 'Pago',
    pluralLabel: 'Pagos',
    modalTitle: `Registrar ${tipo || 'Pago'}`,
    estadoInicial: 'pagado',
    requiresPeriod: false,
    usesCatalog: false,
    suggestionKey: null,
    placeholderConcepto: 'Concepto del pago',
    defaultConcepto: () => '',
    defaultImporte: () => 0
  };
};
