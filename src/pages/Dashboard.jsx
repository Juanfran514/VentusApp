import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  alumnoService,
  pagoService,
  gastoService,
  grupoService,
  analyticsService,
  reportService
} from '../services';
import { MESES, getNombreMes, generarRangoAños } from '../constants/fechas';
import DashboardKpiRow from '../components/dashboard/DashboardKpiRow';
import RecaudacionPendientePanel from '../components/dashboard/RecaudacionPendientePanel';
import RentabilidadGruposSection from '../components/dashboard/RentabilidadGruposSection';
import DashboardChartsSection from '../components/dashboard/DashboardChartsSection';
import { FileDown } from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
  const alumnosRaw = useLiveQuery(() => alumnoService.getAll(), []);
  const pagosRaw = useLiveQuery(() => pagoService.getAll(), []);
  const gastosRaw = useLiveQuery(() => gastoService.getAll(), []);
  const gruposRaw = useLiveQuery(() => grupoService.getAll(), []);
  const gastosFijosRaw = useLiveQuery(() => gastoService.getAllFijos(), []);

  const alumnos = useMemo(() => alumnosRaw || [], [alumnosRaw]);
  const pagos = useMemo(() => pagosRaw || [], [pagosRaw]);
  const gastos = useMemo(() => gastosRaw || [], [gastosRaw]);
  const grupos = useMemo(() => gruposRaw || [], [gruposRaw]);
  const gastosFijos = useMemo(() => gastosFijosRaw || [], [gastosFijosRaw]);

  const alumnosMap = useMemo(() => alumnoService.buildAlumnosMap(alumnos), [alumnos]);

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  const años = generarRangoAños(today.getFullYear(), 2, 2);
  const mesSeleccionadoNombre = getNombreMes(selectedMonth);

  const activeStudentsCount = useMemo(
    () => alumnos.filter(a => a.estado === 'activo').length,
    [alumnos]
  );

  const currentMonthIncome = useMemo(
    () => analyticsService.calcularIngresosMes(pagos, selectedMonth, selectedYear),
    [pagos, selectedMonth, selectedYear]
  );

  const estadoFijosMes = useMemo(
    () => gastoService.calcularEstadoFijosMes(gastosFijos, gastos, selectedMonth, selectedYear),
    [gastosFijos, gastos, selectedMonth, selectedYear]
  );

  const currentMonthExpenses = useMemo(
    () => analyticsService.calcularGastosMes(gastos, selectedMonth, selectedYear),
    [gastos, selectedMonth, selectedYear]
  );

  const netProfit = currentMonthIncome - currentMonthExpenses;

  const dineroPorRecaudar = useMemo(
    () => analyticsService.calcularDineroPorRecaudar(alumnos, pagos, selectedMonth, selectedYear),
    [alumnos, pagos, selectedMonth, selectedYear]
  );

  const rentabilidadGrupos = useMemo(
    () => analyticsService.calcularRentabilidadGrupos(grupos, alumnos),
    [grupos, alumnos]
  );

  const grupoLider = rentabilidadGrupos.length > 0 ? rentabilidadGrupos[0] : null;

  const ocupacionMedia = useMemo(
    () => analyticsService.calcularOcupacionMedia(rentabilidadGrupos),
    [rentabilidadGrupos]
  );

  const chartData = useMemo(
    () => analyticsService.calcularFlujoCajaAnual(pagos, gastos, selectedYear),
    [pagos, gastos, selectedYear]
  );

  const expensesByCategory = useMemo(
    () => gastoService.agruparPorCategoria(gastos, selectedMonth, selectedYear),
    [gastos, selectedMonth, selectedYear]
  );

  const handleExportBalancePdf = async () => {
    await reportService.exportarBalanceMensual({
      pagos,
      gastos,
      alumnosMap,
      mes: selectedMonth,
      año: selectedYear,
      totalIngresos: currentMonthIncome,
      totalGastos: currentMonthExpenses,
      beneficioNeto: netProfit
    });
  };

  return (
    <div className="dashboard-container">
      <div
        className="dashboard-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
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
            {MESES.map(m => (
              <option key={m.num} value={m.num}>
                {m.nombre}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            style={{ width: 'auto' }}
          >
            {años.map(y => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
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

      <DashboardKpiRow
        activeStudentsCount={activeStudentsCount}
        currentMonthIncome={currentMonthIncome}
        currentMonthExpenses={currentMonthExpenses}
        estadoFijosMes={estadoFijosMes}
        netProfit={netProfit}
        dineroPorRecaudar={dineroPorRecaudar}
      />

      <RecaudacionPendientePanel
        mesSeleccionadoNombre={mesSeleccionadoNombre}
        dineroPorRecaudar={dineroPorRecaudar}
        estadoFijosMes={estadoFijosMes}
        alumnosMap={alumnosMap}
      />

      <RentabilidadGruposSection
        rentabilidadGrupos={rentabilidadGrupos}
        grupoLider={grupoLider}
        ocupacionMedia={ocupacionMedia}
      />

      <DashboardChartsSection
        selectedYear={selectedYear}
        mesSeleccionadoNombre={mesSeleccionadoNombre}
        chartData={chartData}
        expensesByCategory={expensesByCategory}
      />
    </div>
  );
};

export default Dashboard;
