// Utilidades para persistencia y sugerencia de categorías y actividades

export const DEFAULT_CATEGORIAS_GRUPOS = [
  'Taekwondo',
  'Kickboxing',
  'Boxeo',
  'Defensa Personal',
  'Jiu-Jitsu',
  'Infantil',
  'Adultos'
];

export const DEFAULT_CATEGORIAS_MATERIAL = [
  'Guantes 10oz',
  'Guantes 12oz',
  'Guantes 14oz',
  'Espinilleras',
  'Dobok',
  'Karategui / Kimono',
  'Protector Bucal',
  'Vendas 4m',
  'Casco',
  'Peto Protector',
  'Comba'
];

export const DEFAULT_CATEGORIAS_GASTOS = [
  'Alquiler',
  'Luz / Electricidad',
  'Agua',
  'Material Deportivo',
  'Mantenimiento',
  'Licencias / Seguros',
  'Publicidad',
  'Impuestos',
  'Otros'
];

/**
 * Obtiene la lista de categorías almacenadas para una clave dada, combinándola con los valores por defecto
 */
export const getStoredCategorias = (key, defaultList = []) => {
  try {
    const raw = localStorage.getItem(`ventus_cat_${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return Array.from(new Set([...defaultList, ...parsed])).sort();
      }
    }
  } catch (err) {
    console.error(`Error leyendo categorías para ${key} desde localStorage:`, err);
  }
  return [...defaultList].sort();
};

/**
 * Guarda una nueva categoría en localStorage para que persista para siempre
 */
export const saveStoredCategoria = (key, newCat, defaultList = []) => {
  if (!newCat || typeof newCat !== 'string' || !newCat.trim()) return;
  const trimmed = newCat.trim();
  try {
    const current = getStoredCategorias(key, defaultList);
    if (!current.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      current.push(trimmed);
      current.sort();
      localStorage.setItem(`ventus_cat_${key}`, JSON.stringify(current));
    }
  } catch (err) {
    console.error(`Error guardando categoría para ${key} en localStorage:`, err);
  }
};

/**
 * Combina la lista guardada de categorías con los valores existentes en la base de datos
 */
export const mergeCategorias = (storedList = [], dbItems = [], field = '') => {
  const set = new Set(storedList);
  if (dbItems && Array.isArray(dbItems)) {
    dbItems.forEach(item => {
      const val = item?.[field];
      if (val && typeof val === 'string' && val.trim()) {
        set.add(val.trim());
      }
    });
  }
  return Array.from(set).sort();
};
