// Utilidades y constantes para los cinturones

export const CINTURONES = [
  'Blanco',
  'Blanco - Amarillo',
  'Amarillo',
  'Amarillo - Verde',
  'Verde',
  'Verde - Azul',
  'Azul',
  'Azul - Rojo',
  'Rojo',
  'Rojo - Negro',
  'Negro'
];

export const CINTURONES_DISPONIBLES = [
  { nombre: 'Blanco', cssClass: 'belt-blanco' },
  { nombre: 'Blanco - Amarillo', cssClass: 'belt-blanco-amarillo' },
  { nombre: 'Amarillo', cssClass: 'belt-amarillo' },
  { nombre: 'Amarillo - Verde', cssClass: 'belt-amarillo-verde' },
  { nombre: 'Verde', cssClass: 'belt-verde' },
  { nombre: 'Verde - Azul', cssClass: 'belt-verde-azul' },
  { nombre: 'Azul', cssClass: 'belt-azul' },
  { nombre: 'Azul - Rojo', cssClass: 'belt-azul-rojo' },
  { nombre: 'Rojo', cssClass: 'belt-rojo' },
  { nombre: 'Rojo - Negro', cssClass: 'belt-rojo-negro' },
  { nombre: 'Negro', cssClass: 'belt-negro' }
];

/**
 * Normaliza nombres anteriores (con Gup o Dan) a nombres limpios solo con colores
 */
export const normalizarCinturon = (cinturon) => {
  if (!cinturon) return 'Blanco';
  const c = cinturon.toLowerCase().trim();
  if (c.includes('blanco') && (c.includes('amarill') || c.includes('9'))) return 'Blanco - Amarillo';
  if (c.includes('blanco')) return 'Blanco';
  if (c.includes('amarill') && (c.includes('verd') || c.includes('7'))) return 'Amarillo - Verde';
  if (c.includes('amarill')) return 'Amarillo';
  if (c.includes('verd') && (c.includes('azul') || c.includes('5'))) return 'Verde - Azul';
  if (c.includes('verd')) return 'Verde';
  if (c.includes('azul') && (c.includes('roj') || c.includes('3'))) return 'Azul - Rojo';
  if (c.includes('azul')) return 'Azul';
  if (c.includes('roj') && (c.includes('negr') || c.includes('1'))) return 'Rojo - Negro';
  if (c.includes('roj')) return 'Rojo';
  if (c.includes('negr') || c.includes('dan')) return 'Negro';
  return cinturon;
};

/**
 * Devuelve la clase CSS correspondiente según el color del cinturón
 */
export const getBeltClass = (cinturon) => {
  if (!cinturon) return 'belt-blanco';
  const c = cinturon.toLowerCase();
  if (c.includes('blanco') && (c.includes('amarill') || c.includes('9'))) return 'belt-blanco-amarillo';
  if (c.includes('blanco')) return 'belt-blanco';
  if (c.includes('amarill') && (c.includes('verd') || c.includes('7'))) return 'belt-amarillo-verde';
  if (c.includes('amarill') && c.includes('naranj')) return 'belt-amarillo-naranja';
  if (c.includes('amarill')) return 'belt-amarillo';
  if (c.includes('naranj') && c.includes('verd')) return 'belt-naranja-verde';
  if (c.includes('naranj')) return 'belt-naranja';
  if (c.includes('verd') && (c.includes('azul') || c.includes('5'))) return 'belt-verde-azul';
  if (c.includes('verd')) return 'belt-verde';
  if (c.includes('azul') && (c.includes('roj') || c.includes('3'))) return 'belt-azul-rojo';
  if (c.includes('azul') && c.includes('marron')) return 'belt-azul-marron';
  if (c.includes('azul')) return 'belt-azul';
  if (c.includes('marron')) return 'belt-marron';
  if (c.includes('roj') && (c.includes('negr') || c.includes('1'))) return 'belt-rojo-negro';
  if (c.includes('roj')) return 'belt-rojo';
  if (c.includes('negr') || c.includes('dan')) return 'belt-negro';
  return 'belt-blanco';
};
