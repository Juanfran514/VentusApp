import { Users, TrendingUp, TrendingDown, DollarSign, Clock } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const DashboardKpiRow = ({
  activeStudentsCount,
  currentMonthIncome,
  currentMonthExpenses,
  estadoFijosMes,
  netProfit,
  dineroPorRecaudar
}) => {
  return (
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
        <div className="kpi-value negative">-{formatCurrency(currentMonthExpenses)}</div>
        {estadoFijosMes.totalPendiente > 0 ? (
          <div className="kpi-subtext" style={{ color: '#d97706', fontWeight: 600 }}>
            ⚠️ {estadoFijosMes.countPendientes} fijos pendientes: -
            {formatCurrency(estadoFijosMes.totalPendiente)}
          </div>
        ) : (
          <div className="kpi-subtext" style={{ color: 'var(--text-muted)' }}>
            Fijos y variables abonados
          </div>
        )}
      </div>

      <div className="kpi-card">
        <div className="kpi-title">
          <DollarSign size={16} /> Beneficio Neto
        </div>
        <div className={`kpi-value ${netProfit >= 0 ? 'positive' : 'negative'}`}>
          {formatCurrency(netProfit)}
        </div>
      </div>

      <div className="kpi-card kpi-warning">
        <div className="kpi-title">
          <Clock size={16} /> Por Recaudar
        </div>
        <div className="kpi-value warning">{formatCurrency(dineroPorRecaudar.totalGeneral)}</div>
        <div className="kpi-subtext">
          {dineroPorRecaudar.alumnosPendientesCuota.length} cuotas (
          {formatCurrency(dineroPorRecaudar.totalCuotasPendientes)})
          {dineroPorRecaudar.totalMaterialPendiente > 0 &&
            ` • ${dineroPorRecaudar.materialesPendientes.length} material`}
        </div>
      </div>
    </div>
  );
};

export default DashboardKpiRow;

