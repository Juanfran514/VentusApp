import React from 'react';
import { Plus } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const AlumnoGruposTab = ({ gruposInscritos = [], onOpenEditModal }) => {
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Grupos en los que participa</h2>
        <button className="btn-secondary flex-center" onClick={onOpenEditModal}>
          <Plus size={16} style={{ marginRight: '6px' }} /> Gestionar Inscripciones
        </button>
      </div>

      <div className="groups-grid">
        {gruposInscritos.map((item, idx) => (
          <div key={idx} className="student-group-card">
            <div className="group-card-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{item.nombre}</h3>
                <span className="group-activity-badge">{item.actividad}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                  {formatCurrency(item.tarifa)}
                </span>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                  {item.dias} día(s) / sem
                </div>
              </div>
            </div>

            <div className="group-schedule-list">
              <span style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                Horarios de clase:
              </span>
              {Array.isArray(item.horarios) && item.horarios.length > 0 ? (
                item.horarios.map((h, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{h.dia}</span>
                    <strong>{h.horaInicio} - {h.horaFin}</strong>
                  </div>
                ))
              ) : (
                <span className="text-muted">Sin horarios específicos configurados</span>
              )}
            </div>
          </div>
        ))}

        {gruposInscritos.length === 0 && (
          <div className="full-width text-center" style={{ padding: '2rem', color: 'var(--text-muted)' }}>
            El alumno no está inscrito en ningún grupo actualmente.
          </div>
        )}
      </div>
    </div>
  );
};

export default AlumnoGruposTab;
