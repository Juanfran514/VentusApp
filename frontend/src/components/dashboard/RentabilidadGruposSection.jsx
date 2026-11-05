import { Link } from 'react-router-dom';
import { BarChart3, ChevronRight } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { formatCurrency } from '../../utils/formatters';

const RentabilidadGruposSection = ({
  rentabilidadGrupos = [],
  grupoLider,
  ocupacionMedia
}) => {
  return (
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
          style={{
            fontSize: '0.875rem',
            color: 'var(--primary-color)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontWeight: 600
          }}
        >
          Ver todos los grupos <ChevronRight size={16} />
        </Link>
      </div>

      {/* Barra de destacados */}
      <div className="rentabilidad-summary-bar">
        <div className="rentabilidad-kpi-item">
          <span className="rentabilidad-kpi-label">Grupo más rentable</span>
          <span className="rentabilidad-kpi-val" style={{ color: '#22c55e' }}>
            {grupoLider
              ? `${grupoLider.nombre} (${formatCurrency(grupoLider.recaudacionMensual)}/mes)`
              : 'Sin datos'}
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
            {formatCurrency(rentabilidadGrupos.reduce((sum, g) => sum + g.recaudacionMensual, 0))}{' '}
            /mes
          </span>
        </div>
      </div>

      {/* Contenido dividido: Gráfico a la izquierda y Ranking a la derecha */}
      <div className="rentabilidad-grid">
        <div
          style={{
            background: 'var(--bg-dark)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <h4 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-light)' }}>
            Recaudación por Grupo (€ / mes)
          </h4>
          <div style={{ flex: 1, width: '100%', minHeight: '260px' }}>
            {rentabilidadGrupos.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={rentabilidadGrupos}
                  margin={{ top: 10, right: 10, left: -10, bottom: 25 }}
                >
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
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      borderColor: '#374151',
                      color: '#f3f4f6',
                      borderRadius: '6px'
                    }}
                    itemStyle={{ color: '#22c55e', fontWeight: 600 }}
                  />
                  <Bar dataKey="recaudacionMensual" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  paddingTop: '3rem'
                }}
              >
                No hay grupos registrados.
              </div>
            )}
          </div>
        </div>

        <div
          className="table-container"
          style={{
            background: 'var(--bg-dark)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '0.5rem 1rem'
          }}
        >
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
                    <span
                      className={`rank-badge ${
                        index === 0
                          ? 'rank-1'
                          : index === 1
                          ? 'rank-2'
                          : index === 2
                          ? 'rank-3'
                          : 'rank-default'
                      }`}
                    >
                      {index + 1}
                    </span>
                  </td>
                  <td>
                    <strong>{g.nombre}</strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {g.actividad}
                    </div>
                  </td>
                  <td>
                    <div style={{ minWidth: '85px' }}>
                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--text-muted)',
                          display: 'flex',
                          justifyContent: 'space-between'
                        }}
                      >
                        <span>
                          {g.plazasOcupadas}/{g.plazasMax}
                        </span>
                        <span>{g.tasaOcupacion}%</span>
                      </div>
                      <div className="progress-track">
                        <div
                          className={`progress-fill ${
                            g.tasaOcupacion >= 100
                              ? 'fill-red'
                              : g.tasaOcupacion >= 80
                              ? 'fill-orange'
                              : 'fill-green'
                          }`}
                          style={{ width: `${g.tasaOcupacion}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td>
                    <strong style={{ color: '#22c55e' }}>
                      {formatCurrency(g.recaudacionMensual)}
                    </strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {formatCurrency(g.ticketMedio)}/alumno
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span
                      className="badge"
                      style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}
                    >
                      {g.porcentajeDelTotal}%
                    </span>
                  </td>
                </tr>
              ))}
              {rentabilidadGrupos.length === 0 && (
                <tr>
                  <td
                    colSpan="5"
                    className="text-center"
                    style={{ padding: '2rem', color: 'var(--text-muted)' }}
                  >
                    No hay información de grupos disponible.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RentabilidadGruposSection;

