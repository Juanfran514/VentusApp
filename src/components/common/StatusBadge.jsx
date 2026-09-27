import React from 'react';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

/**
 * Componente unificado para badges de estado (activo, baja, pagado, pendiente)
 */
const StatusBadge = ({ status, onClick, title, style }) => {
  const s = (status || '').toLowerCase();

  let className = 'badge';
  let icon = null;
  let label = status?.toUpperCase() || '';

  if (s === 'activo') {
    className += ' badge-activo';
  } else if (s === 'baja') {
    className += ' badge-baja';
  } else if (s === 'pagado') {
    className += ' badge-activo flex-center';
    icon = <CheckCircle size={14} style={{ marginRight: '4px' }} />;
    label = 'Pagado';
  } else if (s === 'pendiente') {
    className += ' badge-baja flex-center';
    icon = <Clock size={14} style={{ marginRight: '4px' }} />;
    label = 'Pendiente';
  }

  return (
    <span
      className={className}
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        width: 'fit-content',
        ...style
      }}
      title={title}
    >
      {icon}
      {label}
    </span>
  );
};

export default StatusBadge;
