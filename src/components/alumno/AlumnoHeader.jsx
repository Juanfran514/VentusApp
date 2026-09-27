import React from 'react';
import { Phone, Calendar, Award, User, Mail } from 'lucide-react';
import { CINTURONES_DISPONIBLES, normalizarCinturon, getBeltClass } from '../../utils/cinturones';
import { formatDate, getNombreCompleto } from '../../utils/formatters';

const AlumnoHeader = ({ alumno, edad, onCambioCinturon, onToggleEstado }) => {
  if (!alumno) return null;

  const beltClass = getBeltClass(alumno.cinturon);
  const nombreCompleto = getNombreCompleto(alumno);
  const iniciales = `${alumno.nombre?.charAt(0) || ''}${alumno.apellidos ? alumno.apellidos.charAt(0) : ''}`;

  return (
    <div className="profile-card">
      <div className="profile-avatar-wrapper">
        <div className="profile-avatar">
          {iniciales}
        </div>
        <span
          className={`badge badge-${alumno.estado}`}
          onClick={onToggleEstado}
          style={{ cursor: 'pointer' }}
          title="Clic para alternar estado"
        >
          {alumno.estado?.toUpperCase()}
        </span>
      </div>

      <div className="profile-main-info">
        <div className="profile-name-row">
          <h1 className="profile-name">{nombreCompleto}</h1>
          
          {/* Grado / Cinturón con selector rápido */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className={`belt-tag ${beltClass}`}>
              <Award size={16} /> {normalizarCinturon(alumno.cinturon) || 'Blanco'}
            </span>
            <select
              value={normalizarCinturon(alumno.cinturon) || 'Blanco'}
              onChange={(e) => onCambioCinturon(e.target.value)}
              style={{ width: 'auto', padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
              title="Cambiar cinturón rápidamente"
            >
              {CINTURONES_DISPONIBLES.map(c => (
                <option key={c.nombre} value={c.nombre}>{c.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="profile-meta-grid">
          <div className="profile-meta-item">
            <Phone size={16} />
            {alumno.telefono ? (
              <a href={`tel:${alumno.telefono}`}>{alumno.telefono}</a>
            ) : (
              <span className="text-muted">Sin teléfono</span>
            )}
          </div>

          {alumno.nTutor && (
            <div className="profile-meta-item">
              <User size={16} />
              <span>Tutor: <strong>{alumno.nTutor}</strong></span>
            </div>
          )}

          <div className="profile-meta-item">
            <Calendar size={16} />
            <span>
              {alumno.fechaNac ? (
                <>
                  {formatDate(alumno.fechaNac)} {edad !== null && `(${edad} años)`}
                </>
              ) : (
                <span className="text-muted">Sin fecha nacimiento</span>
              )}
            </span>
          </div>

          {alumno.email && (
            <div className="profile-meta-item">
              <Mail size={16} />
              <a href={`mailto:${alumno.email}`}>{alumno.email}</a>
            </div>
          )}
        </div>
      </div>

      {/* Acciones directas de contacto */}
      {alumno.telefono && (
        <div className="profile-actions-bar">
          <a href={`tel:${alumno.telefono}`} className="btn-secondary flex-center" style={{ textDecoration: 'none' }}>
            <Phone size={16} style={{ marginRight: '6px' }} /> Llamar
          </a>
        </div>
      )}
    </div>
  );
};

export default AlumnoHeader;
