import React from 'react';
import { DollarSign, Clock, AlertTriangle, ShieldCheck, Edit2 } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';

const AlumnoKpiCards = ({
  cuota = 0,
  gruposCount = 0,
  estadoCuotaMesActual = { pagada: false, registro: null },
  totalDeuda = 0,
  itemsPendientesCount = 0,
  totalPagado = 0,
  totalCobrosCount = 0,
  currentMonthName = '',
  onEditarCuota
}) => {
  return (
    <div className="student-kpi-grid">
      <div className="student-kpi-card">
        <div className="student-kpi-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="flex-center" style={{ gap: '4px' }}>
            <DollarSign size={16} /> Cuota Mensual
          </span>
          {onEditarCuota && (
            <button
              type="button"
              onClick={onEditarCuota}
              className="btn-icon"
              style={{ padding: '2px', color: 'var(--text-muted)' }}
              title="Modificar precio de cuota mensual"
            >
              <Edit2 size={14} />
            </button>
          )}
        </div>
        <div className="student-kpi-value">{formatCurrency(cuota)}</div>
        <div className="student-kpi-sub">
          {gruposCount} grupo(s) asignado(s)
        </div>
      </div>

      <div className="student-kpi-card">
        <div className="student-kpi-title">
          <Clock size={16} /> Cuota {currentMonthName}
        </div>
        <div className={`student-kpi-value ${estadoCuotaMesActual.pagada ? 'kpi-success' : 'kpi-danger'}`}>
          {estadoCuotaMesActual.pagada ? 'PAGADA' : 'PENDIENTE'}
        </div>
        <div className="student-kpi-sub">
          {estadoCuotaMesActual.pagada 
            ? `Abonada el ${formatDate(estadoCuotaMesActual.registro?.fecha)}` 
            : 'Requiere cobro este mes'}
        </div>
      </div>

      <div className="student-kpi-card">
        <div className="student-kpi-title">
          <AlertTriangle size={16} /> Saldo Adeudado
        </div>
        <div className={`student-kpi-value ${totalDeuda > 0 ? 'kpi-danger' : 'kpi-success'}`}>
          {formatCurrency(totalDeuda)}
        </div>
        <div className="student-kpi-sub">
          {totalDeuda > 0 ? `${itemsPendientesCount} concepto(s) pendientes` : 'Al corriente de pagos'}
        </div>
      </div>

      <div className="student-kpi-card">
        <div className="student-kpi-title">
          <ShieldCheck size={16} /> Total Pagado Histórico
        </div>
        <div className="student-kpi-value kpi-success">
          {formatCurrency(totalPagado)}
        </div>
        <div className="student-kpi-sub">
          {totalCobrosCount} cobro(s) registrados
        </div>
      </div>
    </div>
  );
};

export default AlumnoKpiCards;
