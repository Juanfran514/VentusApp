import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Users, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import './Dashboard.css';

const Dashboard = () => {
  const alumnos = useLiveQuery(() => db.alumnos.toArray(), []);
  const pagos = useLiveQuery(() => db.pagos.toArray(), []);
  const gastos = useLiveQuery(() => db.gastos.toArray(), []);

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  const meses = [
    { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' }, { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' }, { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' }, { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' }
  ];

  // Generamos años desde 2023 hasta el actual + 1
  const años = Array.from(new Array(5), (val, index) => today.getFullYear() - 2 + index);

  // KPIs
  const activeStudentsCount = useMemo(() => {
    if (!alumnos) return 0;
    return alumnos.filter(a => a.estado === 'activo').length;
  }, [alumnos]);

  const currentMonthIncome = useMemo(() => {
    if (!pagos) return 0;
    return pagos
      .filter(p => p.mes === selectedMonth && p.año === selectedYear && p.estado === 'pagado')
      .reduce((sum, p) => sum + Number(p.importe), 0);
  }, [pagos, selectedMonth, selectedYear]);

  const currentMonthExpenses = useMemo(() => {
    if (!gastos) return 0;
    return gastos
      .filter(g => {
        const date = new Date(g.fecha);
        return (date.getMonth() + 1) === selectedMonth && date.getFullYear() === selectedYear;
      })
      .reduce((sum, g) => sum + Number(g.importe), 0);
  }, [gastos, selectedMonth, selectedYear]);

  const netProfit = currentMonthIncome - currentMonthExpenses;

  // Chart Data: Income vs Expenses over the year
  const chartData = useMemo(() => {
    const data = [];
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    for (let m = 1; m <= 12; m++) {
      const incomeForMonth = pagos?.filter(p => p.mes === m && p.año === selectedYear && p.estado === 'pagado')
                                  .reduce((sum, p) => sum + Number(p.importe), 0) || 0;
      
      const expensesForMonth = gastos?.filter(g => {
        const date = new Date(g.fecha);
        return (date.getMonth() + 1) === m && date.getFullYear() === selectedYear;
      }).reduce((sum, g) => sum + Number(g.importe), 0) || 0;

      data.push({
        name: months[m - 1],
        Ingresos: incomeForMonth,
        Gastos: expensesForMonth
      });
    }
    return data;
  }, [pagos, gastos, selectedYear]);

  // Pie Chart Data: Expenses by Category for the current month
  const expensesByCategory = useMemo(() => {
    if (!gastos) return [];
    
    const currentMonthG = gastos.filter(g => {
      const date = new Date(g.fecha);
      return (date.getMonth() + 1) === selectedMonth && date.getFullYear() === selectedYear;
    });

    const categoryMap = {};
    currentMonthG.forEach(g => {
      const cat = g.categoria || 'Otros';
      categoryMap[cat] = (categoryMap[cat] || 0) + Number(g.importe);
    });

    return Object.keys(categoryMap).map(key => ({
      name: key,
      value: categoryMap[key]
    })).sort((a, b) => b.value - a.value);
  }, [gastos, selectedMonth, selectedYear]);

  const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#06b6d4', '#8b5cf6'];

  return (
    <div className="dashboard-container">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Dashboard</h1>
          <p>Resumen financiero y estado de la academia</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
          <div className="kpi-value positive">{currentMonthIncome.toFixed(2)} €</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">
            <TrendingDown size={16} /> Gastos (Mes)
          </div>
          <div className="kpi-value negative">{currentMonthExpenses.toFixed(2)} €</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">
            <DollarSign size={16} /> Beneficio Neto
          </div>
          <div className={`kpi-value ${netProfit >= 0 ? 'positive' : 'negative'}`}>
            {netProfit.toFixed(2)} €
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
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
