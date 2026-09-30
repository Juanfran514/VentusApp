import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { alumnoService } from '../services/alumnoService';
import { pagoService } from '../services/pagoService';
import { gastoService } from '../services/gastoService';
import { Users, TrendingUp, TrendingDown, DollarSign, FileDown } from 'lucide-react';
import { formatCurrency, formatDate, getNombreCompleto } from '../utils/formatters';
import { exportarBalanceFinancieroPDF } from '../utils/pdfExport';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import './Dashboard.css';

const Dashboard = () => {
  const alumnos = useLiveQuery(() => alumnoService.getAll(), []) || [];
  const pagos = useLiveQuery(() => pagoService.getAll(), []) || [];
  const gastos = useLiveQuery(() => gastoService.getAll(), []) || [];

  const alumnosMap = useMemo(() => alumnoService.buildAlumnosMap(alumnos), [alumnos]);

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  const meses = [
    { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' }, { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' }, { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' }, { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' }
  ];

  // Generamos años desde 2 años antes hasta 2 años después
  const años = Array.from(new Array(5), (_, index) => today.getFullYear() - 2 + index);

  // KPIs
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

  return (
    <div className="dashboard-container">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Dashboard</h1>
          <p>Resumen financiero y estado de la academia</p>
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
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title">Flujo de Caja ({selectedYear})</div>
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
            <div className="chart-title">Gastos por Categoría ({meses.find(m => m.value === selectedMonth)?.label})</div>
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
