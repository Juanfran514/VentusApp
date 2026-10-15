import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { alumnoService } from '../services/alumnoService';
import { pagoService } from '../services/pagoService';
import { gastoService } from '../services/gastoService';
import { grupoService } from '../services/grupoService';
import { 
  Users, TrendingUp, TrendingDown, DollarSign, Clock, AlertCircle, 
  ShoppingBag, Award, ArrowUpRight, BarChart3, ChevronRight, CheckCircle2,
  FileDown
} from 'lucide-react';
import { formatCurrency, formatDate, getNombreCompleto } from '../utils/formatters';
import { exportarBalanceFinancieroPDF } from '../utils/pdfExport';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar
} from 'recharts';
import './Dashboard.css';

const Dashboard = () => {
  const alumnos = useLiveQuery(() => alumnoService.getAll(), []) || [];
  const pagos = useLiveQuery(() => pagoService.getAll(), []) || [];
  const gastos = useLiveQuery(() => gastoService.getAll(), []) || [];
  const grupos = useLiveQuery(() => grupoService.getAll(), []) || [];

  const alumnosMap = useMemo(() => alumnoService.buildAlumnosMap(alumnos), [alumnos]);

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [tabRecaudar, setTabRecaudar] = useState('cuotas'); // 'cuotas' | 'material' | 'examenes'

  const meses = [
    { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' }, { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' }, { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' }, { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' }
  ];

  // Generamos años desde 2 años antes hasta 2 años después
  const años = Array.from(new Array(5), (_, index) => today.getFullYear() - 2 + index);


  // KPIs clásicos
  const activeStudentsCount = useMemo(() => {
    return alumnos.filter(a => a.estado === 'activo').length;
  }, [alumnos]);

  const currentMonthIncome = useMemo(() => {
    return pagos
      .filter(p => Number(p.mes) === selectedMonth && Number(p.año) === selectedYear && p.estado === 'pagado')
      .reduce((sum, p) => sum + Number(p.importe), 0);
  }, [pagos, selectedMonth, selectedYear]);

  const currentMonthExpenses = useMemo(() => {
    return gastos
      .filter(g => {
        const date = new Date(g.fecha);
        return (date.getMonth() + 1) === selectedMonth && date.getFullYear() === selectedYear;
      })
      .reduce((sum, g) => sum + Number(g.importe), 0);
  }, [gastos, selectedMonth, selectedYear]);

  const netProfit = currentMonthIncome - currentMonthExpenses;

  // Exportar Balance Financiero en PDF
  const handleExportBalancePdf = async () => {
    const mesObj = meses.find(m => m.value === selectedMonth);
    const mesNombre = `${mesObj?.label || ''} ${selectedYear}`;

    // 1. Pagos abonados en el mes seleccionado
    const pagosMes = pagos.filter(p => {
      if (p.estado !== 'pagado') return false;
      const pMes = p.mes ? Number(p.mes) : (p.fecha ? new Date(p.fecha).getMonth() + 1 : null);
      const pAño = p.año ? Number(p.año) : (p.fecha ? new Date(p.fecha).getFullYear() : null);
      return pMes === selectedMonth && pAño === selectedYear;
    });

    // 2. Gastos en el mes seleccionado
    const gastosMes = gastos.filter(g => {
      const d = new Date(g.fecha);
      return (d.getMonth() + 1) === selectedMonth && d.getFullYear() === selectedYear;
    });

    // 3. Desglose de ingresos por fuente (cuota, examen, material, licencia)
    const fuentesMap = {
      cuota: { fuente: 'Cuotas Mensuales', cantidad: 0, total: 0 },
      examen: { fuente: 'Exámenes de Grado', cantidad: 0, total: 0 },
      material: { fuente: 'Venta de Equipamiento', cantidad: 0, total: 0 },
      licencia: { fuente: 'Licencias Deportivas', cantidad: 0, total: 0 }
    };

    pagosMes.forEach(p => {
      const tipoKey = p.tipo || 'cuota';
      if (!fuentesMap[tipoKey]) {
        fuentesMap[tipoKey] = { fuente: `Otros (${tipoKey})`, cantidad: 0, total: 0 };
      }
      fuentesMap[tipoKey].cantidad += 1;
      fuentesMap[tipoKey].total += Number(p.importe) || 0;
    });

    const desgloseIngresos = Object.values(fuentesMap).filter(f => f.cantidad > 0);

    // 4. Desglose de gastos por categoría
    const desgloseGastos = gastoService.agruparPorCategoria(gastos, selectedMonth, selectedYear)
      .map(g => ({ categoria: g.name, total: g.value }));

    // 5. Filas detalladas de ingresos
    const filasIngresos = pagosMes.map(p => {
      const al = alumnosMap[p.alumnoId];
      const nombreAl = al ? getNombreCompleto(al) : 'Alumno sin nombre';
      const tipoLabel = p.tipo ? p.tipo.charAt(0).toUpperCase() + p.tipo.slice(1) : 'Pago';
      const conceptoStr = p.concepto || (p.tipo === 'cuota' ? `Cuota ${mesObj?.label} ${selectedYear}` : '-');
      return [
        formatDate(p.fecha),
        nombreAl,
        tipoLabel,
        conceptoStr,
        `+${formatCurrency(p.importe)}`
      ];
    });

    // 6. Filas detalladas de gastos
    const filasGastos = gastosMes.map(g => [
      formatDate(g.fecha),
      g.concepto || '-',
      g.categoria || 'Otros',
      `-${formatCurrency(g.importe)}`
    ]);

    await exportarBalanceFinancieroPDF({
      mesNombre,
      totalIngresos: currentMonthIncome,
      totalGastos: currentMonthExpenses,
      beneficioNeto: netProfit,
      desgloseIngresos,
      desgloseGastos,
      filasIngresos,
      filasGastos,
      nombreArchivo: `balance_financiero_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.pdf`
    });
  };

  // =========================================================================
  // 1. DINERO POR RECAUDAR (Cuotas pendientes, equipamiento, exámenes)
  // =========================================================================
  const dineroPorRecaudar = useMemo(() => {
    const alumnosActivos = alumnos.filter(a => a.estado === 'activo');
    
    // Cuotas del mes seleccionado que faltan por cobrar
    const { pendientes: alumnosPendientesCuota } = pagoService.calcularEstadoCuotasMes(
      alumnosActivos,
      pagos,
      selectedMonth,
      selectedYear
    );
    const totalCuotasPendientes = alumnosPendientesCuota.reduce((acc, a) => acc + (Number(a.cuota) || 0), 0);

    // Equipamiento / Material pendiente
    const materialesPendientes = pagos.filter(p => p.tipo === 'material' && p.estado === 'pendiente');
    const totalMaterialPendiente = materialesPendientes.reduce((acc, p) => acc + (Number(p.importe) || 0), 0);

    // Exámenes pendientes
    const examenesPendientes = pagos.filter(p => p.tipo === 'examen' && p.estado === 'pendiente');
    const totalExamenesPendientes = examenesPendientes.reduce((acc, p) => acc + (Number(p.importe) || 0), 0);

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
  }, [alumnos, pagos, selectedMonth, selectedYear]);

  // =========================================================================
  // 2. RENTABILIDAD POR GRUPO Y CUOTAS (Identificar cuáles generan más dinero)
  // =========================================================================
  const rentabilidadGrupos = useMemo(() => {
    if (!grupos || grupos.length === 0) return [];

    const alumnosActivos = alumnos.filter(a => a.estado === 'activo');
    const totalCuotasEstimadas = alumnosActivos.reduce((sum, a) => sum + (Number(a.cuota) || 0), 0);

    const data = grupos.map(g => {
      // Alumnos activos inscritos en este grupo
      const alumnosEnGrupo = alumnosActivos.filter(a => 
        a.inscripciones?.some(ins => Number(ins.grupoId) === g.id)
      );

      // Calcular recaudación mensual que genera este grupo
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
      const tasaOcupacion = plazasMax > 0 ? Math.min(100, Math.round((plazasOcupadas / plazasMax) * 100)) : 0;
      const ticketMedio = plazasOcupadas > 0 ? Math.round((recaudacionMensual / plazasOcupadas) * 100) / 100 : 0;
      const porcentajeDelTotal = totalCuotasEstimadas > 0 ? Math.round((recaudacionMensual / totalCuotasEstimadas) * 100) : 0;

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

    // Ordenar de mayor a menor recaudación mensual
    return data.sort((a, b) => b.recaudacionMensual - a.recaudacionMensual);
  }, [grupos, alumnos]);

  const grupoLider = rentabilidadGrupos.length > 0 ? rentabilidadGrupos[0] : null;

  const ocupacionMedia = useMemo(() => {
    const gruposConPlazas = rentabilidadGrupos.filter(g => g.plazasMax > 0);
    if (gruposConPlazas.length === 0) return 0;
    const suma = gruposConPlazas.reduce((acc, g) => acc + g.tasaOcupacion, 0);
    return Math.round(suma / gruposConPlazas.length);
  }, [rentabilidadGrupos]);


  // Flujo de Caja anual: Ingresos vs Gastos mes a mes
  const chartData = useMemo(() => {
    const data = [];
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    for (let m = 1; m <= 12; m++) {
      const incomeForMonth = pagos
        .filter(p => Number(p.mes) === m && Number(p.año) === selectedYear && p.estado === 'pagado')
        .reduce((sum, p) => sum + Number(p.importe), 0);
      
      const expensesForMonth = gastos
        .filter(g => {
          const date = new Date(g.fecha);
          return (date.getMonth() + 1) === m && date.getFullYear() === selectedYear;
        })
        .reduce((sum, g) => sum + Number(g.importe), 0);

      data.push({
        name: months[m - 1],
        Ingresos: incomeForMonth,
        Gastos: expensesForMonth
      });
    }
    return data;
  }, [pagos, gastos, selectedYear]);

  // Gastos por categoría para el mes seleccionado vía gastoService
  const expensesByCategory = useMemo(() => {
    return gastoService.agruparPorCategoria(gastos, selectedMonth, selectedYear);
  }, [gastos, selectedMonth, selectedYear]);

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
    'Alquiler': '#6366f1',
    'Luz / Electricidad': '#f59e0b',
    'Luz': '#f59e0b',
    'Agua': '#06b6d4',
    'Material Deportivo': '#10b981',
    'Material': '#10b981',
    'Mantenimiento': '#f97316',
    'Licencias / Seguros': '#8b5cf6',
    'Licencias': '#8b5cf6',
    'Publicidad': '#ec4899',
    'Impuestos': '#ef4444',
    'Otros': '#64748b'
  };

  const getCategoryColor = (name, index) => {
    if (name && CATEGORY_COLORS[name]) return CATEGORY_COLORS[name];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIndex = Math.abs(hash) % VIBRANT_PALETTE.length;
    return VIBRANT_PALETTE[colorIndex] || VIBRANT_PALETTE[index % VIBRANT_PALETTE.length];
  };

  const COLORS = VIBRANT_PALETTE;
  const mesSeleccionadoNombre = meses.find(m => m.value === selectedMonth)?.label || '';

  return (
    <div className="dashboard-container">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Dashboard</h1>
          <p>Resumen financiero, control de recaudación y rentabilidad</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            style={{ width: 'auto' }}
          >
            {meses.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            style={{ width: 'auto' }}
          >
            {años.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button 
            type="button" 
            className="btn-primary flex-center" 
            onClick={handleExportBalancePdf}
            title="Descargar el Balance Financiero completo en PDF"
            style={{ padding: '0.55rem 0.9rem', fontSize: '0.9rem' }}
          >
            <FileDown size={17} style={{ marginRight: '6px' }} />
            Exportar Balance PDF
          </button>
        </div>
      </div>

      {/* Grid de KPIs principales */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-title">
            <Users size={16} /> Alumnos Activos
          </div>
          <div className="kpi-value">{activeStudentsCount}</div>
        </div>
        
        <div className="kpi-card">
          <div className="kpi-title">
            <TrendingUp size={16} /> Ingresos (Mes)
          </div>
          <div className="kpi-value positive">{formatCurrency(currentMonthIncome)}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">
            <TrendingDown size={16} /> Gastos (Mes)
          </div>
          <div className="kpi-value negative">{formatCurrency(currentMonthExpenses)}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">
            <DollarSign size={16} /> Beneficio Neto
          </div>
          <div className={`kpi-value ${netProfit >= 0 ? 'positive' : 'negative'}`}>
            {formatCurrency(netProfit)}
          </div>
        </div>

        {/* Nuevo KPI: Dinero por recaudar */}
        <div className="kpi-card kpi-warning">
          <div className="kpi-title">
            <Clock size={16} /> Por Recaudar
          </div>
          <div className="kpi-value warning">{formatCurrency(dineroPorRecaudar.totalGeneral)}</div>
          <div className="kpi-subtext">
            {dineroPorRecaudar.alumnosPendientesCuota.length} cuotas ({formatCurrency(dineroPorRecaudar.totalCuotasPendientes)})
            {dineroPorRecaudar.totalMaterialPendiente > 0 && ` • ${dineroPorRecaudar.materialesPendientes.length} material`}
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECCIÓN: DINERO POR RECAUDAR (DETALLE Y GESTIÓN)
          ========================================================================= */}
      <div className="dashboard-section-card">
        <div className="dashboard-section-header">
          <div>
            <div className="dashboard-section-title">
              <AlertCircle size={20} color="#f59e0b" /> Dinero por Recaudar
            </div>
            <div className="dashboard-section-subtitle">
              Pendientes de cobro en cuotas del mes ({mesSeleccionadoNombre}) y equipamientos
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f59e0b' }}>
              Total Pendiente: {formatCurrency(dineroPorRecaudar.totalGeneral)}
            </span>
          </div>
        </div>

        {/* Mini resumen de importes por categoría */}
        <div className="pending-summary-cards">
          <div className="pending-summary-card">
            <div className="pending-summary-label">
              <Users size={15} /> Cuotas Pendientes ({mesSeleccionadoNombre})
            </div>
            <div className="pending-summary-amount">{formatCurrency(dineroPorRecaudar.totalCuotasPendientes)}</div>
            <small className="text-muted">{dineroPorRecaudar.alumnosPendientesCuota.length} alumnos por cobrar</small>
          </div>

          <div className="pending-summary-card">
            <div className="pending-summary-label">
              <ShoppingBag size={15} /> Equipamiento / Material
            </div>
            <div className="pending-summary-amount">{formatCurrency(dineroPorRecaudar.totalMaterialPendiente)}</div>
            <small className="text-muted">{dineroPorRecaudar.materialesPendientes.length} pedidos sin pagar</small>
          </div>

          {dineroPorRecaudar.totalExamenesPendientes > 0 && (
            <div className="pending-summary-card">
              <div className="pending-summary-label">
                <Award size={15} /> Exámenes
              </div>
              <div className="pending-summary-amount">{formatCurrency(dineroPorRecaudar.totalExamenesPendientes)}</div>
              <small className="text-muted">{dineroPorRecaudar.examenesPendientes.length} inscripciones pendientes</small>
            </div>
          )}
        </div>

        {/* Pestañas para ver el desglose */}
        <div className="pending-tabs-bar">
          <button 
            type="button"
            className={`pending-tab-btn ${tabRecaudar === 'cuotas' ? 'active' : ''}`}
            onClick={() => setTabRecaudar('cuotas')}
          >
            <Users size={16} /> Alumnos sin pagar cuota
            <span className="pending-badge">{dineroPorRecaudar.alumnosPendientesCuota.length}</span>
          </button>

          <button 
            type="button"
            className={`pending-tab-btn ${tabRecaudar === 'material' ? 'active' : ''}`}
            onClick={() => setTabRecaudar('material')}
          >
            <ShoppingBag size={16} /> Equipamiento pendiente
            <span className="pending-badge">{dineroPorRecaudar.materialesPendientes.length}</span>
          </button>

          {dineroPorRecaudar.examenesPendientes.length > 0 && (
            <button 
              type="button"
              className={`pending-tab-btn ${tabRecaudar === 'examenes' ? 'active' : ''}`}
              onClick={() => setTabRecaudar('examenes')}
            >
              <Award size={16} /> Exámenes
              <span className="pending-badge">{dineroPorRecaudar.examenesPendientes.length}</span>
            </button>
          )}
        </div>

        {/* Contenido de la pestaña activa */}
        <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {tabRecaudar === 'cuotas' && (
            <table>
              <thead>
                <tr>
                  <th>Alumno</th>
                  <th>Teléfono</th>
                  <th>Cuota</th>
                  <th style={{ textAlign: 'right' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {dineroPorRecaudar.alumnosPendientesCuota.map(a => (
                  <tr key={a.id}>
                    <td>
                      <Link to={`/alumnos/${a.id}`} style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600 }}>
                        {getNombreCompleto(a)}
                      </Link>
                    </td>
                    <td>{a.telefono || '-'}</td>
                    <td><strong style={{ color: '#f59e0b' }}>{formatCurrency(a.cuota)}</strong></td>
                    <td style={{ textAlign: 'right' }}>
                      <Link 
                        to="/cobros" 
                        className="btn-secondary" 
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}
                      >
                        Cobrar <ArrowUpRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
                {dineroPorRecaudar.alumnosPendientesCuota.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center" style={{ padding: '1.5rem', color: 'var(--primary-color)' }}>
                      <CheckCircle2 size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
                      ¡Todas las cuotas de {mesSeleccionadoNombre} están al día!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {tabRecaudar === 'material' && (
            <table>
              <thead>
                <tr>
                  <th>Alumno</th>
                  <th>Concepto / Material</th>
                  <th>Fecha</th>
                  <th>Importe</th>
                  <th style={{ textAlign: 'right' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {dineroPorRecaudar.materialesPendientes.map(p => {
                  const al = alumnosMap[p.alumnoId];
                  return (
                    <tr key={p.id}>
                      <td>
                        <strong>{al ? getNombreCompleto(al) : 'Alumno eliminado'}</strong>
                      </td>
                      <td>{p.concepto || 'Material deportivo'}</td>
                      <td>{formatDate(p.fecha)}</td>
                      <td><strong style={{ color: '#f59e0b' }}>{formatCurrency(p.importe)}</strong></td>
                      <td style={{ textAlign: 'right' }}>
                        <Link 
                          to="/equipamiento" 
                          className="btn-secondary" 
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}
                        >
                          Gestionar <ArrowUpRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {dineroPorRecaudar.materialesPendientes.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center" style={{ padding: '1.5rem', color: 'var(--text-muted)' }}>
                      No hay cobros de equipamiento pendientes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {tabRecaudar === 'examenes' && (
            <table>
              <thead>
                <tr>
                  <th>Alumno</th>
                  <th>Examen</th>
                  <th>Fecha</th>
                  <th>Importe</th>
                  <th style={{ textAlign: 'right' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {dineroPorRecaudar.examenesPendientes.map(p => {
                  const al = alumnosMap[p.alumnoId];
                  return (
                    <tr key={p.id}>
                      <td><strong>{al ? getNombreCompleto(al) : 'Alumno'}</strong></td>
                      <td>{p.concepto || 'Examen de cinturón'}</td>
                      <td>{formatDate(p.fecha)}</td>
                      <td><strong style={{ color: '#f59e0b' }}>{formatCurrency(p.importe)}</strong></td>
                      <td style={{ textAlign: 'right' }}>
                        <Link 
                          to="/examenes" 
                          className="btn-secondary" 
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}
                        >
                          Gestionar <ArrowUpRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* =========================================================================
          SECCIÓN: RENTABILIDAD POR CUOTA / GRUPO (CUÁL ES MÁS RENTABLE)
          ========================================================================= */}
      <div className="dashboard-section-card">
        <div className="dashboard-section-header">
          <div>
            <div className="dashboard-section-title">
              <BarChart3 size={20} color="#22c55e" /> Rentabilidad por Cuota y Grupo
            </div>
            <div className="dashboard-section-subtitle">
              Comparativa de recaudación mensual estimada e ingresos generados por cada grupo
            </div>
          </div>
          <Link 
            to="/grupos" 
            style={{ fontSize: '0.875rem', color: 'var(--primary-color)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}
          >
            Ver todos los grupos <ChevronRight size={16} />
          </Link>
        </div>

        {/* Barra de destacados */}
        <div className="rentabilidad-summary-bar">
          <div className="rentabilidad-kpi-item">
            <span className="rentabilidad-kpi-label">Grupo más rentable</span>
            <span className="rentabilidad-kpi-val" style={{ color: '#22c55e' }}>
              {grupoLider ? `${grupoLider.nombre} (${formatCurrency(grupoLider.recaudacionMensual)}/mes)` : 'Sin datos'}
            </span>
          </div>

          <div className="rentabilidad-kpi-item">
            <span className="rentabilidad-kpi-label">Ocupación Media</span>
            <span className="rentabilidad-kpi-val" style={{ color: '#38bdf8' }}>
              {ocupacionMedia}%
            </span>
          </div>

          <div className="rentabilidad-kpi-item">
            <span className="rentabilidad-kpi-label">Total Cuotas en Activo</span>
            <span className="rentabilidad-kpi-val" style={{ color: 'var(--text-light)' }}>
              {formatCurrency(rentabilidadGrupos.reduce((sum, g) => sum + g.recaudacionMensual, 0))} /mes
            </span>
          </div>
        </div>

        {/* Contenido dividido: Gráfico a la izquierda y Ranking a la derecha */}
        <div className="rentabilidad-grid">
          {/* Gráfico de barras */}
          <div style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
            <h4 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-light)' }}>
              Recaudación por Grupo (€ / mes)
            </h4>
            <div style={{ flex: 1, width: '100%', minHeight: '260px' }}>
              {rentabilidadGrupos.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={rentabilidadGrupos} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="nombre" 
                      stroke="#9ca3af" 
                      tick={{ fontSize: 11 }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                    />
                    <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} />
                    <RechartsTooltip 
                      formatter={(value) => [`${formatCurrency(value)}`, 'Recaudación']}
                      contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6', borderRadius: '6px' }}
                      itemStyle={{ color: '#22c55e', fontWeight: 600 }}
                    />
                    <Bar dataKey="recaudacionMensual" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: '3rem' }}>
                  No hay grupos registrados.
                </div>
              )}
            </div>
          </div>

          {/* Ranking y tabla de rentabilidad */}
          <div className="table-container" style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem 1rem' }}>
            <table style={{ marginBottom: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>Grupo</th>
                  <th>Ocupación</th>
                  <th>Recaudación</th>
                  <th style={{ textAlign: 'right' }}>% Total</th>
                </tr>
              </thead>
              <tbody>
                {rentabilidadGrupos.map((g, index) => (
                  <tr key={g.id}>
                    <td>
                      <span className={`rank-badge ${index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : 'rank-default'}`}>
                        {index + 1}
                      </span>
                    </td>
                    <td>
                      <strong>{g.nombre}</strong>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{g.actividad}</div>
                    </td>
                    <td>
                      <div style={{ minWidth: '85px' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{g.plazasOcupadas}/{g.plazasMax}</span>
                          <span>{g.tasaOcupacion}%</span>
                        </div>
                        <div className="progress-track">
                          <div 
                            className={`progress-fill ${g.tasaOcupacion >= 100 ? 'fill-red' : g.tasaOcupacion >= 80 ? 'fill-orange' : 'fill-green'}`} 
                            style={{ width: `${g.tasaOcupacion}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong style={{ color: '#22c55e' }}>{formatCurrency(g.recaudacionMensual)}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {formatCurrency(g.ticketMedio)}/alumno
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="badge" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>
                        {g.porcentajeDelTotal}%
                      </span>
                    </td>
                  </tr>
                ))}
                {rentabilidadGrupos.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center" style={{ padding: '2rem', color: 'var(--text-muted)' }}>
                      No hay información de grupos disponible.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECCIÓN HISTÓRICA: FLUJO DE CAJA Y GASTOS POR CATEGORÍA
          ========================================================================= */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title">Flujo de Caja Anual ({selectedYear})</div>
          </div>
          <div style={{ flex: 1, width: '100%', minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                  itemStyle={{ color: '#f3f4f6' }}
                />
                <Area type="monotone" dataKey="Ingresos" stroke="#22c55e" fillOpacity={1} fill="url(#colorIngresos)" />
                <Area type="monotone" dataKey="Gastos" stroke="#ef4444" fillOpacity={1} fill="url(#colorGastos)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title">Gastos por Categoría ({mesSeleccionadoNombre})</div>
          </div>
          <div style={{ flex: 1, width: '100%', minHeight: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {expensesByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {expensesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name, index)} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                    itemStyle={{ color: '#f3f4f6' }}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: '#9ca3af' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ color: '#9ca3af', textAlign: 'center' }}>No hay gastos registrados este mes.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
