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

    // Pagos de cuota del mes correspondiente
    const pagosCuotaMes = pagos.filter(p => 
      p.tipo === 'cuota' && 
      Number(p.mes) === mesNum && 
      Number(p.año) === añoNum
    );

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
  }
};
