import { Users, UserPlus, TrendingUp, TrendingDown, DollarSign, Clock } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const DashboardKpiRow = ({
  activeStudentsCount,
  altasYBajasMes = { altas: 0, bajas: 0, neto: 0 },
  onOpenAltasBajasModal,
  currentMonthIncome,
  currentMonthExpenses,
  currentMonthGain,
  estadoFijosMes,
  netProfit,
  dineroPorRecaudar
}) => {
  const { altas = 0, bajas = 0, neto = 0 } = altasYBajasMes;
  const netoLabel = neto > 0 ? `+${neto}` : `${neto}`;

  return (
    <div className="kpi-grid">
      <div className="kpi-card">
        <div className="kpi-title">
          <Users size={16} /> Alumnos Activos
        </div>
        <div className="kpi-value">{activeStudentsCount}</div>
      </div>

      <div
        className="kpi-card"
        role="button"
        tabIndex={0}
        onClick={onOpenAltasBajasModal}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && onOpenAltasBajasModal) {
            e.preventDefault();
            onOpenAltasBajasModal();
          }
        }}
        style={{ cursor: onOpenAltasBajasModal ? 'pointer' : 'default' }}
        title="Ver detalle de altas y bajas del mes"
      >
        <div className="kpi-title">
          <UserPlus size={16} /> Altas / Bajas (Mes)
        </div>
        <div className="kpi-value" style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
          <span style={{ color: '#22c55e' }}>+{altas}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '1.3rem' }}>/</span>
          <span style={{ color: '#ef4444' }}>-{bajas}</span>
        </div>
        <div className="kpi-subtext">
          Neto: {netoLabel} • Pulsa para ver detalle
        </div>
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
            {estadoFijosMes.countPendientes} fijos pendientes: -
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
        {currentMonthGain !== undefined && currentMonthIncome !== currentMonthGain && (
          <div className="kpi-subtext" style={{ color: 'var(--text-muted)' }}>
            Margen bruto: {formatCurrency(currentMonthGain)}
          </div>
        )}
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

