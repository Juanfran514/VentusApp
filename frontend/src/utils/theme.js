/**
 * Utilidades para el theming dinámico de VentusApp
 * Inyecta variables CSS dinámicas en :root para personalizar colores por club
 */

export const THEME_DEFAULT = {
  primary: '#22c55e',
  dark: '#16a34a'
};

export const TEMAS_PREDEFINIDOS = [
  {
    id: 'emerald',
    nombre: 'Esmeralda',
    primary: '#22c55e',
    dark: '#16a34a'
  },
  {
    id: 'blue',
    nombre: 'Azul',
    primary: '#3b82f6',
    dark: '#2563eb'
  },
  {
    id: 'red',
    nombre: 'Rojo',
    primary: '#ef4444',
    dark: '#dc2626'
  },
  {
    id: 'violet',
    nombre: 'Violeta',
    primary: '#8b5cf6',
    dark: '#7c3aed'
  },
  {
    id: 'orange',
    nombre: 'Naranja',
    primary: '#f97316',
    dark: '#ea580c'
  },
  {
    id: 'amber',
    nombre: 'Amarillo',
    primary: '#eab308',
    dark: '#ca8a04'
  },
  {
    id: 'cyan',
    nombre: 'Cian',
    primary: '#06b6d4',
    dark: '#0891b2'
  }
];

/**
 * Convierte color HEX (#rrggbb) a objeto { r, g, b }
 */
export const hexToRgb = (hex) => {
  if (!hex || typeof hex !== 'string') return null;
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return { r, g, b };
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return { r, g, b };
  }
  return null;
};

/**
 * Oscurece un color HEX un porcentaje dado (por defecto 15%)
 */
export const oscurecerColor = (hex, percent = 15) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const factor = (100 - percent) / 100;
  const r = Math.max(0, Math.min(255, Math.round(rgb.r * factor)));
  const g = Math.max(0, Math.min(255, Math.round(rgb.g * factor)));
  const b = Math.max(0, Math.min(255, Math.round(rgb.b * factor)));

  const toHex = (n) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

/**
 * Aplica los colores de personalización a las CSS Variables de la aplicación
 */
export const aplicarTema = (colorPrimario, colorSecundario) => {
  if (typeof document === 'undefined') return;

  const primary = colorPrimario || THEME_DEFAULT.primary;
  const dark = colorSecundario || oscurecerColor(primary, 15);
  const rgb = hexToRgb(primary);

  const root = document.documentElement;
  root.style.setProperty('--primary-color', primary);
  root.style.setProperty('--primary-dark', dark);

  if (rgb) {
    root.style.setProperty('--primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
  }
};

/**
 * Restablece los colores por defecto de VentusApp
 */
export const restablecerTemaPorDefecto = () => {
  aplicarTema(THEME_DEFAULT.primary, THEME_DEFAULT.dark);
};

