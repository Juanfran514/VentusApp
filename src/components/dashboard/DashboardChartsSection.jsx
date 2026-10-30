import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { analyticsService } from '../../services/analyticsService';

const DashboardChartsSection = ({
  selectedYear,
  mesSeleccionadoNombre,
  chartData = [],
  expensesByCategory = []
}) => {
  return (
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
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <RechartsTooltip
                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                itemStyle={{ color: '#f3f4f6' }}
              />
              <Area
                type="monotone"
                dataKey="Ingresos"
                stroke="#22c55e"
                fillOpacity={1}
                fill="url(#colorIngresos)"
              />
              <Area
                type="monotone"
                dataKey="Gastos"
                stroke="#ef4444"
                fillOpacity={1}
                fill="url(#colorGastos)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-header">
          <div className="chart-title">Gastos por Categoría ({mesSeleccionadoNombre})</div>
        </div>
        <div
          style={{
            flex: 1,
            width: '100%',
            minHeight: '300px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
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
                    <Cell
                      key={`cell-${index}`}
                      fill={analyticsService.getCategoryColor(entry.name, index)}
                    />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    borderColor: '#374151',
                    color: '#f3f4f6'
                  }}
                  itemStyle={{ color: '#f3f4f6' }}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: '#9ca3af' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ color: '#9ca3af', textAlign: 'center' }}>
              No hay gastos registrados este mes.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardChartsSection;

