/**
 * Catálogo canónico de Feature Flags para VentusApp SaaS
 */
export const FEATURES = {
  // Módulos funcionales
  MODULE_EQUIPAMIENTO: 'module_equipamiento',
  MODULE_EXAMENES: 'module_examenes',
  MODULE_LICENCIAS: 'module_licencias',
  MODULE_GASTOS: 'module_gastos_contabilidad',

  // Características operativas
  FEATURE_CONTROL_AFORO: 'feature_control_aforo',
  FEATURE_TARIFAS_ESCALONADAS: 'feature_tarifas_escalonadas',
  FEATURE_FACTURAS_DIGITALES: 'feature_facturas_digitales',
  FEATURE_ANALYTICS_AVANZADAS: 'feature_analytics_avanzadas',
  FEATURE_EXPORT_PDF: 'feature_export_pdf_reports',

  // Límites numéricos (Metered)
  LIMIT_ALUMNOS: 'limit_active_students',
  LIMIT_GRUPOS: 'limit_groups',
  LIMIT_STORAGE_MB: 'limit_storage_mb'
};

/**
 * Definición canónica de Planes y Matriz de Flags
 */
export const PLANS = {
  STARTER: {
    id: 'starter',
    name: 'Starter (Dojo Esencial)',
    priceMonthly: 29,
    priceYearly: 290,
    features: {
      [FEATURES.MODULE_EQUIPAMIENTO]: false,
      [FEATURES.MODULE_EXAMENES]: false,
      [FEATURES.MODULE_LICENCIAS]: false,
      [FEATURES.MODULE_GASTOS]: false,
      [FEATURES.FEATURE_CONTROL_AFORO]: false,
      [FEATURES.FEATURE_TARIFAS_ESCALONADAS]: false,
      [FEATURES.FEATURE_FACTURAS_DIGITALES]: false,
      [FEATURES.FEATURE_ANALYTICS_AVANZADAS]: false,
      [FEATURES.FEATURE_EXPORT_PDF]: false
    },
    limits: {
      [FEATURES.LIMIT_ALUMNOS]: 50,
      [FEATURES.LIMIT_GRUPOS]: 4,
      [FEATURES.LIMIT_STORAGE_MB]: 200
    }
  },
  PRO: {
    id: 'pro',
    name: 'Pro (Academia Activa)',
    priceMonthly: 69,
    priceYearly: 690,
    features: {
      [FEATURES.MODULE_EQUIPAMIENTO]: false,
      [FEATURES.MODULE_EXAMENES]: true,
      [FEATURES.MODULE_LICENCIAS]: true,
      [FEATURES.MODULE_GASTOS]: true,
      [FEATURES.FEATURE_CONTROL_AFORO]: true,
      [FEATURES.FEATURE_TARIFAS_ESCALONADAS]: true,
      [FEATURES.FEATURE_FACTURAS_DIGITALES]: false,
      [FEATURES.FEATURE_ANALYTICS_AVANZADAS]: false,
      [FEATURES.FEATURE_EXPORT_PDF]: true
    },
    limits: {
      [FEATURES.LIMIT_ALUMNOS]: 200,
      [FEATURES.LIMIT_GRUPOS]: 15,
      [FEATURES.LIMIT_STORAGE_MB]: 2000
    }
  },
  ELITE: {
    id: 'elite',
    name: 'Elite (Centro Integral)',
    priceMonthly: 129,
    priceYearly: 1290,
    features: {
      [FEATURES.MODULE_EQUIPAMIENTO]: true,
      [FEATURES.MODULE_EXAMENES]: true,
      [FEATURES.MODULE_LICENCIAS]: true,
      [FEATURES.MODULE_GASTOS]: true,
      [FEATURES.FEATURE_CONTROL_AFORO]: true,
      [FEATURES.FEATURE_TARIFAS_ESCALONADAS]: true,
      [FEATURES.FEATURE_FACTURAS_DIGITALES]: true,
      [FEATURES.FEATURE_ANALYTICS_AVANZADAS]: true,
      [FEATURES.FEATURE_EXPORT_PDF]: true
    },
    limits: {
      [FEATURES.LIMIT_ALUMNOS]: -1, // Ilimitado
      [FEATURES.LIMIT_GRUPOS]: -1,
      [FEATURES.LIMIT_STORAGE_MB]: 10000
    }
  }
};

