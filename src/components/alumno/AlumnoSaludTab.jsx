import React from 'react';
import { AlertTriangle, FileText } from 'lucide-react';

const AlumnoSaludTab = ({ lesiones = '', observaciones = '' }) => {
  return (
    <div className="health-notes-grid">
      <div className="note-card medical">
        <div className="note-card-title">
          <AlertTriangle size={18} /> Información Médica y Lesiones
        </div>
        <div className="note-content">
          {lesiones && lesiones.trim() !== '' ? (
            lesiones
          ) : (
            <span className="text-muted">No hay información médica ni lesiones registradas para este alumno.</span>
          )}
        </div>
      </div>

      <div className="note-card general">
        <div className="note-card-title">
          <FileText size={18} /> Observaciones Generales
        </div>
        <div className="note-content">
          {observaciones && observaciones.trim() !== '' ? (
            observaciones
          ) : (
            <span className="text-muted">Sin observaciones adicionales.</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlumnoSaludTab;
