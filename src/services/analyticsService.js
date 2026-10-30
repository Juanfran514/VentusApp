import { pagoService } from './pagoService';
import { MESES_CORTOS } from '../constants/fechas';

const VIBRANT_PALETTE = [
  '#8b5cf6', // Violeta
  '#06b6d4', // Cían / Azul
  '#f59e0b', // Ámbar / Amarillo
  '#ec4899', // Rosa
  '#10b981', // Verde Esmeralda
  '#6366f1', // Índigo
  '#f97316', // Naranja
  '#3b82f6', // Azul Eléctrico
  '#14b8a6', // Turquesa
  '#a855f7'  // Púrpura
];

const CATEGORY_COLORS = {
  Alquiler: '#6366f1',
  'Luz / Electricidad': '#f59e0b',
  Luz: '#f59e0b',
  Agua: '#06b6d4',
  'Material Deportivo': '#10b981',
  Material: '#10b981',
  Mantenimiento: '#f97316',
  'Licencias / Seguros': '#8b5cf6',
  Licencias: '#8b5cf6',
  Publicidad: '#ec4899',
  Impuestos: '#ef4444',
  Otros: '#64748b'
};

/**
 * Servicio puro de analítica financiera y métricas operativas (SRP)
 */
export const analyticsService = {
  calcularIngresosMes(pagos = [], mes, año) {
    const mesNum = Number(mes);
    const añoNum = Number(año);
    return pagos
      .filter(p => Number(p.mes) === mesNum && Number(p.año) === añoNum && p.estado === 'pagado')
      .reduce((sum, p) => sum + (Number(p.importe) || 0), 0);
  },

  calcularGastosMes(gastos = [], mes, año) {
    const mesNum = Number(mes);
    const añoNum = Number(año);
    return gastos
      .filter(g => {
        if (g.mes && g.año) {
          return Number(g.mes) === mesNum && Number(g.año) === añoNum;
        }
        const date = new Date(g.fecha);
        return date.getMonth() + 1 === mesNum && date.getFullYear() === añoNum;
      })
      .reduce((sum, g) => sum + (Number(g.importe) || 0), 0);
  },

  calcularDineroPorRecaudar(alumnos = [], pagos = [], mes, año) {
    const alumnosActivos = alumnos.filter(a => a.estado === 'activo');

    const { pendientes: alumnosPendientesCuota } = pagoService.calcularEstadoCuotasMes(
      alumnosActivos,
      pagos,
      mes,
      año
    );
    const totalCuotasPendientes = alumnosPendientesCuota.reduce(
      (acc, a) => acc + (Number(a.cuota) || 0),
      0
    );

    const materialesPendientes = pagos.filter(p => p.tipo === 'material' && p.estado === 'pendiente');
    const totalMaterialPendiente = materialesPendientes.reduce(
      (acc, p) => acc + (Number(p.importe) || 0),
      0
    );

    const examenesPendientes = pagos.filter(p => p.tipo === 'examen' && p.estado === 'pendiente');
    const totalExamenesPendientes = examenesPendientes.reduce(
      (acc, p) => acc + (Number(p.importe) || 0),
      0
    );

    const totalGeneral = totalCuotasPendientes + totalMaterialPendiente + totalExamenesPendientes;

    return {
      totalGeneral,
      totalCuotasPendientes,
      totalMaterialPendiente,
      totalExamenesPendientes,
      alumnosPendientesCuota,
      materialesPendientes,
      examenesPendientes
    };
  },

  calcularRentabilidadGrupos(grupos = [], alumnos = []) {
    if (!grupos || grupos.length === 0) return [];

    const alumnosActivos = alumnos.filter(a => a.estado === 'activo');
    const totalCuotasEstimadas = alumnosActivos.reduce((sum, a) => sum + (Number(a.cuota) || 0), 0);

    const data = grupos.map(g => {
      const alumnosEnGrupo = alumnosActivos.filter(a =>
        a.inscripciones?.some(ins => Number(ins.grupoId) === g.id)
      );

      let recaudacionMensual = 0;
      alumnosEnGrupo.forEach(a => {
        const ins = a.inscripciones.find(i => Number(i.grupoId) === g.id);
        const dias = ins?.dias || 1;
        let precio = 0;
        if (g.tarifas && g.tarifas[dias] !== undefined) {
          precio = Number(g.tarifas[dias]);
        } else if (a.cuota > 0) {
          precio = Number(a.cuota) / (a.inscripciones.length || 1);
        }
        recaudacionMensual += precio;
      });

      const plazasOcupadas = alumnosEnGrupo.length;
      const plazasMax = Number(g.plazasMax) || 0;
      const tasaOcupacion =
        plazasMax > 0 ? Math.min(100, Math.round((plazasOcupadas / plazasMax) * 100)) : 0;
      const ticketMedio =
        plazasOcupadas > 0 ? Math.round((recaudacionMensual / plazasOcupadas) * 100) / 100 : 0;
      const porcentajeDelTotal =
        totalCuotasEstimadas > 0 ? Math.round((recaudacionMensual / totalCuotasEstimadas) * 100) : 0;

      return {
        id: g.id,
        nombre: g.nombre,
        actividad: g.actividad,
        plazasOcupadas,
        plazasMax,
        tasaOcupacion,
        recaudacionMensual: Math.round(recaudacionMensual * 100) / 100,
        ticketMedio,
        porcentajeDelTotal,
        tarifas: g.tarifas || {}
      };
    });

    return data.sort((a, b) => b.recaudacionMensual - a.recaudacionMensual);
  },

  calcularOcupacionMedia(rentabilidadGrupos = []) {
    const gruposConPlazas = rentabilidadGrupos.filter(g => g.plazasMax > 0);
    if (gruposConPlazas.length === 0) return 0;
    const suma = gruposConPlazas.reduce((acc, g) => acc + g.tasaOcupacion, 0);
    return Math.round(suma / gruposConPlazas.length);
  },

  calcularFlujoCajaAnual(pagos = [], gastos = [], año) {
    const añoNum = Number(año);
    const data = [];

    for (let m = 1; m <= 12; m++) {
      const incomeForMonth = pagos
        .filter(p => Number(p.mes) === m && Number(p.año) === añoNum && p.estado === 'pagado')
        .reduce((sum, p) => sum + (Number(p.importe) || 0), 0);

      const expensesForMonth = gastos
        .filter(g => {
          const date = new Date(g.fecha);
          return date.getMonth() + 1 === m && date.getFullYear() === añoNum;
        })
        .reduce((sum, g) => sum + (Number(g.importe) || 0), 0);

      data.push({
        name: MESES_CORTOS[m - 1],
        Ingresos: incomeForMonth,
        Gastos: expensesForMonth
      });
    }
    return data;
  },

  getCategoryColor(name, index = 0) {
    if (name && CATEGORY_COLORS[name]) return CATEGORY_COLORS[name];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIndex = Math.abs(hash) % VIBRANT_PALETTE.length;
    return VIBRANT_PALETTE[colorIndex] || VIBRANT_PALETTE[index % VIBRANT_PALETTE.length];
  }
};

