import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, TrendingDown, AlertCircle, ShoppingBag, Award, ArrowUpRight, CheckCircle2
} from 'lucide-react';
import { formatCurrency, formatDate, getNombreCompleto } from '../../utils/formatters';

const RecaudacionPendientePanel = ({
  mesSeleccionadoNombre,
  dineroPorRecaudar,
  estadoFijosMes,
  alumnosMap
}) => {
  const [tabRecaudar, setTabRecaudar] = useState('cuotas');

  return (
    <div className="dashboard-section-card">
      <div className="dashboard-section-header">
        <div>
          <div className="dashboard-section-title">
            <AlertCircle size={20} color="#f59e0b" /> Dinero por Recaudar y Control de Pagos
          </div>
          <div className="dashboard-section-subtitle">
            Pendientes de cobro en cuotas del mes ({mesSeleccionadoNombre}), equipamientos y control de gastos fijos
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f59e0b' }}>
            Cobros Pendientes: {formatCurrency(dineroPorRecaudar.totalGeneral)}
          </span>
        </div>
      </div>

      {/* Mini resumen de importes por categoría */}
      <div className="pending-summary-cards">
        <div className="pending-summary-card">
          <div className="pending-summary-label">
            <Users size={15} /> Cuotas Pendientes ({mesSeleccionadoNombre})
          </div>
          <div className="pending-summary-amount">
            {formatCurrency(dineroPorRecaudar.totalCuotasPendientes)}
          </div>
          <small className="text-muted">
            {dineroPorRecaudar.alumnosPendientesCuota.length} alumnos por cobrar
          </small>
        </div>

        <div className="pending-summary-card">
          <div className="pending-summary-label">
            <ShoppingBag size={15} /> Equipamiento / Material
          </div>
          <div className="pending-summary-amount">
            {formatCurrency(dineroPorRecaudar.totalMaterialPendiente)}
          </div>
          <small className="text-muted">
            {dineroPorRecaudar.materialesPendientes.length} pedidos sin pagar
          </small>
        </div>

        {dineroPorRecaudar.totalExamenesPendientes > 0 && (
          <div className="pending-summary-card">
            <div className="pending-summary-label">
              <Award size={15} /> Exámenes
            </div>
            <div className="pending-summary-amount">
              {formatCurrency(dineroPorRecaudar.totalExamenesPendientes)}
            </div>
            <small className="text-muted">
              {dineroPorRecaudar.examenesPendientes.length} inscripciones pendientes
            </small>
          </div>
        )}

        {estadoFijosMes.totalPendiente > 0 && (
          <div className="pending-summary-card" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
            <div className="pending-summary-label" style={{ color: '#ef4444' }}>
              <TrendingDown size={15} /> Gastos Fijos por Pagar ({mesSeleccionadoNombre})
            </div>
            <div className="pending-summary-amount" style={{ color: '#ef4444' }}>
              -{formatCurrency(estadoFijosMes.totalPendiente)}
            </div>
            <small className="text-muted">{estadoFijosMes.countPendientes} gastos fijos sin tildar</small>
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

        {estadoFijosMes.countPendientes > 0 && (
          <button
            type="button"
            className={`pending-tab-btn ${tabRecaudar === 'gastos_fijos' ? 'active' : ''}`}
            onClick={() => setTabRecaudar('gastos_fijos')}
            style={{ color: tabRecaudar === 'gastos_fijos' ? '#ef4444' : undefined }}
          >
            <TrendingDown size={16} /> Gastos fijos por pagar
            <span
              className="pending-badge"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}
            >
              {estadoFijosMes.countPendientes}
            </span>
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
                    <Link
                      to={`/alumnos/${a.id}`}
                      style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600 }}
                    >
                      {getNombreCompleto(a)}
                    </Link>
                  </td>
                  <td>{a.telefono || '-'}</td>
                  <td>
                    <strong style={{ color: '#f59e0b' }}>{formatCurrency(a.cuota)}</strong>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Link
                      to="/cobros"
                      className="btn-secondary"
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.8rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        textDecoration: 'none'
                      }}
                    >
                      Cobrar <ArrowUpRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
              {dineroPorRecaudar.alumnosPendientesCuota.length === 0 && (
                <tr>
                  <td
                    colSpan="4"
                    className="text-center"
                    style={{ padding: '1.5rem', color: 'var(--primary-color)' }}
                  >
                    <CheckCircle2
                      size={24}
                      style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }}
                    />
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
                    <td>
                      <strong style={{ color: '#f59e0b' }}>{formatCurrency(p.importe)}</strong>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        to="/equipamiento"
                        className="btn-secondary"
                        style={{
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.8rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          textDecoration: 'none'
                        }}
                      >
                        Gestionar <ArrowUpRight size={14} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {dineroPorRecaudar.materialesPendientes.length === 0 && (
                <tr>
                  <td
                    colSpan="5"
                    className="text-center"
                    style={{ padding: '1.5rem', color: 'var(--text-muted)' }}
                  >
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
                    <td>
                      <strong>{al ? getNombreCompleto(al) : 'Alumno'}</strong>
                    </td>
                    <td>{p.concepto || 'Examen de cinturón'}</td>
                    <td>{formatDate(p.fecha)}</td>
                    <td>
                      <strong style={{ color: '#f59e0b' }}>{formatCurrency(p.importe)}</strong>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        to="/examenes"
                        className="btn-secondary"
                        style={{
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.8rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          textDecoration: 'none'
                        }}
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

        {tabRecaudar === 'gastos_fijos' && (
          <table>
            <thead>
              <tr>
                <th>Gasto Fijo Pendiente</th>
                <th>Categoría</th>
                <th>Importe Previsto</th>
                <th style={{ textAlign: 'right' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {estadoFijosMes.pendientes.map(item => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.concepto}</strong>
                  </td>
                  <td>
                    <span
                      className="badge"
                      style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}
                    >
                      {item.categoria}
                    </span>
                  </td>
                  <td>
                    <strong style={{ color: '#ef4444' }}>-{formatCurrency(item.importe)}</strong>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Link
                      to="/gastos"
                      className="btn-secondary"
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.8rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        textDecoration: 'none'
                      }}
                    >
                      Tildar en Gastos <ArrowUpRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default RecaudacionPendientePanel;

