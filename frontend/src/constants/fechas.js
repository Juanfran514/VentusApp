/**
 * Constantes y utilidades centralizadas de fechas, meses y trimestres (DRY)
 */

export const MESES = [
  { num: 1, nombre: 'Enero', corto: 'Ene' },
  { num: 2, nombre: 'Febrero', corto: 'Feb' },
  { num: 3, nombre: 'Marzo', corto: 'Mar' },
  { num: 4, nombre: 'Abril', corto: 'Abr' },
  { num: 5, nombre: 'Mayo', corto: 'May' },
  { num: 6, nombre: 'Junio', corto: 'Jun' },
  { num: 7, nombre: 'Julio', corto: 'Jul' },
  { num: 8, nombre: 'Agosto', corto: 'Ago' },
  { num: 9, nombre: 'Septiembre', corto: 'Sep' },
  { num: 10, nombre: 'Octubre', corto: 'Oct' },
  { num: 11, nombre: 'Noviembre', corto: 'Nov' },
  { num: 12, nombre: 'Diciembre', corto: 'Dic' }
];

export const MESES_NOMBRES = MESES.map(m => m.nombre);
export const MESES_CORTOS = MESES.map(m => m.corto);

export const TRIMESTRES = [
  { id: 'all', label: 'Todo el año', meses: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  { id: '1T', label: '1T (Ene - Mar)', meses: [1, 2, 3] },
  { id: '2T', label: '2T (Abr - Jun)', meses: [4, 5, 6] },
  { id: '3T', label: '3T (Jul - Sep)', meses: [7, 8, 9] },
  { id: '4T', label: '4T (Oct - Dic)', meses: [10, 11, 12] }
];

/**
 * Obtiene el nombre completo del mes (1-12)
 */
export const getNombreMes = (mesNum) => {
  const m = MESES.find(item => item.num === Number(mesNum));
  return m ? m.nombre : '';
};

/**
 * Genera una lista de años alrededor de un año base
 */
export const generarRangoAños = (baseYear = new Date().getFullYear(), before = 2, after = 2) => {
  const years = [];
  for (let y = baseYear - before; y <= baseYear + after; y++) {
    years.push(y);
  }
  return years;
};

