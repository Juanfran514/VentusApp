/**
 * Formatea un número como moneda en euros (€)
 * @param {number|string} amount 
 * @returns {string} Ejemplo: "25 €" o "25,50 €"
 */
export const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  }).format(num);
};

/**
 * Formatea una fecha ISO o string a formato legible en español
 * @param {string|Date} date 
 * @param {object} options 
 * @returns {string} Ejemplo: "27/9/2026"
 */
export const formatDate = (date, options = {}) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-ES', options);
};

/**
 * Calcula la edad a partir de la fecha de nacimiento
 * @param {string} fechaNac 
 * @returns {number|null}
 */
export const calculateAge = (fechaNac) => {
  if (!fechaNac) return null;
  const hoy = new Date();
  const nac = new Date(fechaNac);
  if (isNaN(nac.getTime())) return null;

  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) {
    edad--;
  }
  return edad;
};

/**
 * Obtiene el nombre completo del alumno
 * @param {object} alumno 
 * @returns {string}
 */
export const getNombreCompleto = (alumno) => {
  if (!alumno) return '';
  if (typeof alumno.nombreCompleto === 'string') return alumno.nombreCompleto;
  return `${alumno.nombre || ''} ${alumno.apellidos || ''}`.trim();
};
