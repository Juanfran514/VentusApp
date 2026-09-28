import { db, Pago } from '../db/db';
import { getNombreCompleto } from '../utils/formatters';
import { saveStoredCategoria, DEFAULT_CATEGORIAS_MATERIAL } from '../utils/categorias';

export const pagoService = {
  /**
   * Obtiene todos los pagos ordenados por fecha descendente
   */
  async getAll() {
    return db.pagos.toArray();
  },

  /**
   * Obtiene todos los pagos de un alumno específico
   */
  async getByAlumno(alumnoId) {
    if (!alumnoId) return [];
    return db.pagos.where('alumnoId').equals(Number(alumnoId)).toArray();
  },

  /**
   * Obtiene los pagos de un tipo específico ('cuota', 'examen', 'material')
   */
  async getByTipo(tipo) {
    if (!tipo) return db.pagos.toArray();
    return db.pagos.where('tipo').equals(tipo).toArray();
  },

  /**
   * Crea un nuevo registro de pago
   */
  async create(data) {
    const pagoInstance = new Pago({
      ...data,
      alumnoId: Number(data.alumnoId),
      importe: Number(data.importe),
      mes: data.mes ? Number(data.mes) : undefined,
      año: data.año ? Number(data.año) : undefined,
      fecha: data.fecha ? new Date(data.fecha).toISOString() : new Date().toISOString()
    });
    const id = await db.pagos.add(pagoInstance);
    if (data.tipo === 'material' && data.concepto) {
      saveStoredCategoria('material', data.concepto.trim(), DEFAULT_CATEGORIAS_MATERIAL);
    }
    return id;
  },

  /**
   * Marca un pago como 'pagado'
   */
  async marcarPagado(id) {
    return db.pagos.update(Number(id), { estado: 'pagado' });
  },

  /**
   * Revierte un pago a 'pendiente'
   */
  async revertirPago(id) {
    return db.pagos.update(Number(id), { estado: 'pendiente' });
  },

  /**
   * Elimina un registro de pago
   */
  async delete(id) {
    return db.pagos.delete(Number(id));
  },

  /**
   * Filtra pagos pendientes y pagados para listados (exámenes, material)
   */
  separarPendientesYPagados(pagos = [], alumnosMap = {}, search = '') {
    if (!pagos) return { pendientes: [], pagados: [] };

    const term = search.toLowerCase().trim();
    let filtrados = pagos;

    if (term) {
      filtrados = pagos.filter(p => {
        const al = alumnosMap[p.alumnoId];
        const nombreAl = al ? getNombreCompleto(al).toLowerCase() : '';
        const concepto = (p.concepto || '').toLowerCase();
        return nombreAl.includes(term) || concepto.includes(term);
      });
    }

    const pendientes = filtrados
      .filter(p => p.estado === 'pendiente')
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    const pagados = filtrados
      .filter(p => p.estado === 'pagado')
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    return { pendientes, pagados };
  },

  /**
   * Calcula el estado de cobros de cuotas para un mes y año concretos
   */
  calcularEstadoCuotasMes(alumnos = [], pagos = [], mes, año, search = '') {
    if (!alumnos || !pagos) return { pendientes: [], pagados: [] };

    const mesNum = Number(mes);
    const añoNum = Number(año);
    const term = search.toLowerCase().trim();

    // Pagos de cuota del mes correspondiente (soporta p.mes/p.año o fallback a p.fecha)
    const pagosCuotaMes = pagos.filter(p => {
      if (p.tipo !== 'cuota') return false;
      const pMes = p.mes ? Number(p.mes) : (p.fecha ? new Date(p.fecha).getMonth() + 1 : null);
      const pAño = p.año ? Number(p.año) : (p.fecha ? new Date(p.fecha).getFullYear() : null);
      return pMes === mesNum && pAño === añoNum;
    });

    const alumnosPagadosIds = new Set(pagosCuotaMes.map(p => Number(p.alumnoId)));

    const pendientes = [];
    const pagados = [];

    alumnos.forEach(al => {
      if (term && !getNombreCompleto(al).toLowerCase().includes(term)) {
        return;
      }
      if (alumnosPagadosIds.has(al.id)) {
        pagados.push(al);
      } else {
        pendientes.push(al);
      }
    });

    return { pendientes, pagados };
  },

  /**
   * Agrupa pagos por mes y año en orden cronológico descendente
   * @param {Array} pagos
   * @returns {Array<{ key: string, mesNombre: string, año: number, mes: number, totalImporte: number, totalItems: number, items: Array }>}
   */
  agruparPagosPorMes(pagos = []) {
    if (!pagos || !pagos.length) return [];

    const MESES_NOMBRES = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const gruposMap = {};

    pagos.forEach(p => {
      let año = null;
      let mes = null;

      if (p.tipo === 'cuota' && p.año && p.mes) {
        año = Number(p.año);
        mes = Number(p.mes);
      } else if (p.fecha) {
        const d = new Date(p.fecha);
        if (!isNaN(d.getTime())) {
          año = d.getFullYear();
          mes = d.getMonth() + 1;
        }
      }

      if (!año || !mes) {
        const now = new Date();
        año = now.getFullYear();
        mes = now.getMonth() + 1;
      }

      const key = `${año}-${String(mes).padStart(2, '0')}`;
      if (!gruposMap[key]) {
        gruposMap[key] = {
          key,
          año,
          mes,
          mesNombre: `${MESES_NOMBRES[mes - 1] || 'Mes'} ${año}`,
          totalImporte: 0,
          totalItems: 0,
          items: []
        };
      }

      gruposMap[key].items.push(p);
      gruposMap[key].totalImporte += Number(p.importe) || 0;
      gruposMap[key].totalItems += 1;
    });

    // Ordenar de más reciente a más antiguo
    const gruposOrdenados = Object.values(gruposMap).sort((a, b) => b.key.localeCompare(a.key));

    // Dentro de cada mes, ordenar los pagos por fecha descendente
    gruposOrdenados.forEach(grupo => {
      grupo.items.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    });

    return gruposOrdenados;
  }
};

