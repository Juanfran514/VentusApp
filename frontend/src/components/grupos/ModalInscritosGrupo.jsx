import Modal from '../ui/Modal';
import { Plus, Trash2 } from 'lucide-react';
import { getNombreCompleto, formatCurrency } from '../../utils/formatters';

const ModalInscritosGrupo = ({
  isOpen,
  onClose,
  selectedGroup,
  alumnosTotales = [],
  alumnosInscritos = [],
  alumnosDisponibles = [],
  quickAlumnoState,
  setQuickAlumnoState,
  onQuickInscribir,
  onQuickDesinscribir,
  onUpdateDias
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Alumnos en: ${selectedGroup?.nombre || ''}`}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}
      >
        <div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            <strong>Actividad:</strong> {selectedGroup?.actividad || '-'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Plazas:</span>
          <span
            className={`badge ${
              (selectedGroup?.plazasOcupadas || 0) >= (selectedGroup?.plazasMax || 0)
                ? 'badge-baja'
                : 'badge-activo'
            }`}
          >
            {selectedGroup?.plazasOcupadas || 0} / {selectedGroup?.plazasMax || 0} ocupadas
          </span>
        </div>
      </div>

      {/* Formulario rápido para añadir alumno */}
      <div
        style={{
          backgroundColor: 'var(--bg-dark)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1.5rem'
        }}
      >
        <label
          style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: 600,
            marginBottom: '0.75rem',
            color: 'var(--text-light)'
          }}
        >
          + Inscribir alumno a este grupo
        </label>

        {alumnosDisponibles.length > 0 ? (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '180px' }}>
              <select
                value={quickAlumnoState.alumnoId}
                onChange={(e) => setQuickAlumnoState(prev => ({ ...prev, alumnoId: e.target.value }))}
              >
                <option value="">Selecciona un alumno...</option>
                {alumnosDisponibles.map(a => (
                  <option key={a.id} value={a.id}>
                    {getNombreCompleto(a)}
                  </option>
                ))}
              </select>
            </div>

            <div className="dias-input" style={{ width: 'auto' }}>
              <span>Días/sem:</span>
              <input
                type="number"
                min="1"
                max="7"
                style={{ width: '60px' }}
                value={quickAlumnoState.dias}
                onChange={(e) => setQuickAlumnoState(prev => ({ ...prev, dias: Number(e.target.value) || 1 }))}
              />
            </div>

            <button
              type="button"
              className="btn-primary flex-center"
              disabled={!quickAlumnoState.alumnoId}
              onClick={onQuickInscribir}
              style={{ opacity: !quickAlumnoState.alumnoId ? 0.6 : 1, whiteSpace: 'nowrap' }}
            >
              <Plus size={16} style={{ marginRight: '6px' }} />
              Inscribir
            </button>
          </div>
        ) : (
          <p className="text-muted" style={{ fontSize: '0.875rem', margin: 0 }}>
            {alumnosTotales.filter(a => a.estado === 'activo').length === 0
              ? 'No hay alumnos activos registrados en la aplicación.'
              : 'Todos los alumnos activos ya están inscritos en este grupo.'}
          </p>
        )}

        {selectedGroup?.tarifas && Object.keys(selectedGroup.tarifas).length > 0 && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Tarifas:{' '}
            {Object.entries(selectedGroup.tarifas)
              .map(([dias, precio]) => `${dias}d: ${formatCurrency(precio)}`)
              .join(' • ')}
          </div>
        )}
      </div>

      {/* Tabla de alumnos inscritos */}
      <div className="table-container" style={{ maxHeight: '380px', overflowY: 'auto' }}>
        <table style={{ marginBottom: 0 }}>
          <thead>
            <tr>
              <th>Alumno</th>
              <th>Días/sem</th>
              <th>Tarifa Est.</th>
              <th>Teléfono</th>
              <th style={{ textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {alumnosInscritos.map(alumno => {
              const ins = alumno.inscripciones?.find(
                i => Number(i.grupoId) === selectedGroup?.id
              );
              const tarifa = selectedGroup?.tarifas ? selectedGroup.tarifas[ins?.dias] : null;
              return (
                <tr key={alumno.id}>
                  <td>
                    <strong>{getNombreCompleto(alumno)}</strong>
                  </td>
                  <td>
                    <select
                      value={ins?.dias || 1}
                      onChange={(e) => onUpdateDias(alumno.id, Number(e.target.value))}
                      style={{ width: '85px', padding: '3px 6px', fontSize: '0.85em' }}
                    >
                      {[1, 2, 3, 4, 5, 6, 7].map(d => (
                        <option key={d} value={d}>
                          {d} {d === 1 ? 'día' : 'días'}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {tarifa !== undefined && tarifa !== null ? formatCurrency(tarifa) : '-'}
                  </td>
                  <td>{alumno.telefono || '-'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className="btn-icon text-danger"
                      title="Desinscribir del grupo"
                      onClick={() => onQuickDesinscribir(alumno)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {alumnosInscritos.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center" style={{ padding: '2rem 1rem' }}>
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                    No hay alumnos inscritos en este grupo todavía.
                  </p>
                  <small style={{ color: 'var(--text-muted)' }}>
                    Usa el formulario de arriba para añadir alumnos.
                  </small>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="form-actions full-width" style={{ marginTop: '1.25rem' }}>
        <button type="button" className="btn-primary" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </Modal>
  );
};

export default ModalInscritosGrupo;

