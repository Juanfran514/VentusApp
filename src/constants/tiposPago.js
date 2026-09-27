/**
 * Configuración y especificación extensible de tipos de pago (OCP - Open/Closed Principle)
 * Para añadir un nuevo tipo de pago en el futuro (ej. "matricula", "seminario"),
 * basta con registrarlo aquí sin tener que alterar la lógica del resto de la app.
 */

export const TIPOS_PAGO = {
  CUOTA: {
    id: 'cuota',
    label: 'Cuota',
    modalTitle: 'Cobro de Cuota',
    estadoInicial: 'pagado',
    requiresPeriod: true, // Requiere mes y año
    placeholderConcepto: 'Ej: Cuota Septiembre 2026',
    defaultConcepto: (mesNombre, año) => `Cuota ${mesNombre || ''} ${año || ''}`.trim()
  },
  EXAMEN: {
    id: 'examen',
    label: 'Examen',
    modalTitle: 'Examen de Grado',
    estadoInicial: 'pendiente',
    requiresPeriod: false,
    placeholderConcepto: 'Ej: Cinturón Amarillo',
    defaultConcepto: () => 'Examen de Grado'
  },
  MATERIAL: {
    id: 'material',
    label: 'Material',
    modalTitle: 'Venta de Material',
    estadoInicial: 'pendiente',
    requiresPeriod: false,
    placeholderConcepto: 'Ej: Guantes 12oz, Espinilleras...',
    defaultConcepto: () => ''
  }
};

export const getTipoPagoConfig = (tipo) => {
  return TIPOS_PAGO[tipo?.toUpperCase()] || {
    id: tipo || 'otro',
    label: tipo || 'Pago',
    modalTitle: `Cobro de ${tipo || 'Pago'}`,
    estadoInicial: 'pagado',
    requiresPeriod: false,
    placeholderConcepto: 'Concepto del pago',
    defaultConcepto: () => ''
  };
};
