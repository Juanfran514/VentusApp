import { UserPlus, UserMinus } from 'lucide-react';
import Modal from '../ui/Modal';
import { formatDate, getNombreCompleto } from '../../utils/formatters';

const renderListaMovimientos = (lista, alumnosMap, emptyMessage, accentColor) => {
  if (lista.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '0.5rem 0' }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {lista.map(mov => {
        const alumno = alumnosMap[mov.alumnoId];
        const nombre = alumno
          ? getNombreCompleto(alumno)
          : mov.alumnoNombre || 'Alumno eliminado';

        return (
          <div
            key={mov.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.6rem 0.75rem',
              borderRadius: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-color)',
              borderLeft: `3px solid ${accentColor}`
            }}
          >
            <span style={{ fontWeight: 500, color: 'var(--text-light)' }}>{nombre}</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {formatDate(mov.fecha)}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const ModalAltasBajasMes = ({
  isOpen,
  onClose,
  mesNombre,
  año,
  altasYBajas,
  alumnosMap = {}
}) => {
  const { altas = 0, bajas = 0, neto = 0, listaAltas = [], listaBajas = [] } = altasYBajas || {};
  const netoLabel = neto > 0 ? `+${neto}` : `${neto}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Altas y Bajas — ${mesNombre} ${año}`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.75rem',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.25)'
            }}
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Altas</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#22c55e' }}>+{altas}</div>
          </div>
          <div
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)'
            }}
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Bajas</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#ef4444' }}>-{bajas}</div>
          </div>
          <div
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-color)'
            }}
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Balance neto</div>
            <div
              style={{
                fontSize: '1.35rem',
                fontWeight: 700,
                color: neto > 0 ? '#22c55e' : neto < 0 ? '#ef4444' : 'var(--text-light)'
              }}
            >
              {netoLabel}
            </div>
          </div>
        </div>

        <div>
          <h3
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              fontSize: '1rem',
              marginBottom: '0.6rem',
              color: '#22c55e'
            }}
          >
            <UserPlus size={17} /> Altas ({altas})
          </h3>
          {renderListaMovimientos(
            listaAltas,
            alumnosMap,
            'No hay altas registradas en este mes.',
            '#22c55e'
          )}
        </div>

        <div>
          <h3
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              fontSize: '1rem',
              marginBottom: '0.6rem',
              color: '#ef4444'
            }}
          >
            <UserMinus size={17} /> Bajas ({bajas})
          </h3>
          {renderListaMovimientos(
            listaBajas,
            alumnosMap,
            'No hay bajas registradas en este mes.',
            '#ef4444'
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ModalAltasBajasMes;

