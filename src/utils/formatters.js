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

const DIAS_ABREV_MAP = {
  'lunes': 'L',
  'martes': 'M',
  'miércoles': 'X',
  'miercoles': 'X',
  'jueves': 'J',
  'viernes': 'V',
  'sábado': 'S',
  'sabado': 'S',
  'domingo': 'D'
};

/**
 * Convierte el nombre de un día a su abreviatura (L, M, X, J, V, S, D)
 * @param {string} diaStr 
 * @returns {string}
 */
export const abreviarDia = (diaStr) => {
  if (!diaStr) return '';
  const key = String(diaStr).trim().toLowerCase();
  return DIAS_ABREV_MAP[key] || diaStr.charAt(0).toUpperCase();
};

/**
 * Formatea los horarios de un grupo en una cadena resumida (ej: "L, X 17:00-18:00")
 * @param {object} grupo 
 * @returns {string}
 */
export const formatGrupoHorarios = (grupo) => {
  if (!grupo) return '';
  if (!grupo.horarios) return 'Sin horarios';

  if (typeof grupo.horarios === 'string') {
    let str = grupo.horarios;
    Object.entries(DIAS_ABREV_MAP).forEach(([full, abrev]) => {
      const reg = new RegExp(`\\b${full}\\b`, 'gi');
      str = str.replace(reg, abrev);
    });
    return str || 'Sin horarios';
  }

  if (Array.isArray(grupo.horarios) && grupo.horarios.length > 0) {
    const timeGroups = [];
    const timeGroupsMap = new Map();

    grupo.horarios.forEach(h => {
      if (!h) return;
      if (typeof h === 'string') {
        timeGroups.push({ timeKey: '', days: [h] });
        return;
      }
      const dayAbrev = abreviarDia(h.dia);
      const timeKey = h.horaInicio && h.horaFin
        ? `${h.horaInicio}-${h.horaFin}`
        : (h.horaInicio || '');

      if (timeKey) {
        if (!timeGroupsMap.has(timeKey)) {
          const groupObj = { timeKey, days: [dayAbrev] };
          timeGroupsMap.set(timeKey, groupObj);
          timeGroups.push(groupObj);
        } else {
          timeGroupsMap.get(timeKey).days.push(dayAbrev);
        }
      } else if (dayAbrev) {
        timeGroups.push({ timeKey: '', days: [dayAbrev] });
      }
    });

    const formatted = timeGroups
      .map(g => {
        const daysStr = g.days.join(', ');
        return g.timeKey ? `${daysStr} ${g.timeKey}` : daysStr;
      })
      .filter(Boolean)
      .join(', ');

    return formatted || 'Sin horarios';
  }

  return 'Sin horarios';
};


