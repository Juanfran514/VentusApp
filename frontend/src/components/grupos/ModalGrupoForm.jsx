import Modal from '../ui/Modal';
import { X } from 'lucide-react';
import { getNombreCompleto } from '../../utils/formatters';

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const ModalGrupoForm = ({
  isOpen,
  onClose,
  editingId,
  formData,
  setFormData,
  actividadesSugeridas = [],
  alumnosTotales = [],
  onSubmit
}) => {
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddHorario = () => {
    setFormData(prev => ({
      ...prev,
      horariosArray: [...prev.horariosArray, { dia: 'Lunes', horaInicio: '17:00', horaFin: '18:00' }]
    }));
  };

  const handleRemoveHorario = (index) => {
    setFormData(prev => ({
      ...prev,
      horariosArray: prev.horariosArray.filter((_, i) => i !== index)
    }));
  };

  const handleHorarioChange = (index, field, value) => {
    setFormData(prev => {
      const next = [...prev.horariosArray];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, horariosArray: next };
    });
  };

  const handleAddTarifa = () => {
    setFormData(prev => ({
      ...prev,
      tarifasArray: [...prev.tarifasArray, { dias: 1, importe: 0 }]
    }));
  };

  const handleRemoveTarifa = (index) => {
    setFormData(prev => ({
      ...prev,
      tarifasArray: prev.tarifasArray.filter((_, i) => i !== index)
    }));
  };

  const handleTarifaChange = (index, field, value) => {
    setFormData(prev => {
      const next = [...prev.tarifasArray];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, tarifasArray: next };
    });
  };

  const handleAddAlumnoInscrito = () => {
    const defaultDias = formData.tarifasArray.length > 0 ? Number(formData.tarifasArray[0].dias) : 1;
    setFormData(prev => ({
      ...prev,
      alumnosInscritos: [...prev.alumnosInscritos, { alumnoId: '', dias: defaultDias }]
    }));
  };

  const handleRemoveAlumnoInscrito = (index) => {
    setFormData(prev => ({
      ...prev,
      alumnosInscritos: prev.alumnosInscritos.filter((_, i) => i !== index)
    }));
  };

  const handleAlumnoInscritoChange = (index, field, value) => {
    setFormData(prev => {
      const next = [...prev.alumnosInscritos];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, alumnosInscritos: next };
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingId ? 'Editar Grupo' : 'Nuevo Grupo'}>
      <form onSubmit={onSubmit} className="form-grid">
        <div className="form-group">
          <label>Nombre del Grupo *</label>
          <input
            name="nombre"
            value={formData.nombre}
            onChange={handleInputChange}
            required
            placeholder="Ej: Infantil"
          />
        </div>
        <div className="form-group">
          <label>Actividad / Categoría *</label>
          <input
            name="actividad"
            value={formData.actividad}
            onChange={handleInputChange}
            required
            list="actividades-list"
            placeholder="Escribe o selecciona una actividad"
            autoComplete="off"
          />
          <datalist id="actividades-list">
            {actividadesSugeridas.map((act, idx) => (
              <option key={idx} value={act} />
            ))}
          </datalist>
        </div>
        <div className="form-group full-width">
          <label>Horarios (Días y Horas)</label>
          <div className="inscripciones-list">
            {formData.horariosArray.map((horario, index) => (
              <div key={index} className="inscripcion-row">
                <select
                  value={horario.dia}
                  onChange={(e) => handleHorarioChange(index, 'dia', e.target.value)}
                  required
                >
                  {DIAS_SEMANA.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <div className="dias-input" style={{ marginLeft: '15px' }}>
                  <span>Inicio:</span>
                  <input
                    type="time"
                    value={horario.horaInicio}
                    onChange={(e) => handleHorarioChange(index, 'horaInicio', e.target.value)}
                    required
                  />
                </div>
                <div className="dias-input">
                  <span>Fin:</span>
                  <input
                    type="time"
                    value={horario.horaFin}
                    onChange={(e) => handleHorarioChange(index, 'horaFin', e.target.value)}
                    required
                  />
                </div>
                <button type="button" className="btn-icon text-danger" onClick={() => handleRemoveHorario(index)}>
                  <X size={20} />
                </button>
              </div>
            ))}
            <button type="button" className="btn-secondary add-inscripcion-btn" onClick={handleAddHorario}>
              + Añadir Horario
            </button>
          </div>
        </div>
        <div className="form-group">
          <label>Plazas Máximas *</label>
          <input
            type="number"
            name="plazasMax"
            value={formData.plazasMax}
            onChange={handleInputChange}
            required
            min="1"
          />
        </div>

        <div className="form-group full-width">
          <label>Tarifas de Precios (Días por semana)</label>
          <div className="inscripciones-list">
            {formData.tarifasArray.map((tarifa, index) => (
              <div key={index} className="inscripcion-row">
                <div className="dias-input">
                  <span>Días/sem:</span>
                  <input
                    type="number"
                    min="1"
                    max="7"
                    value={tarifa.dias}
                    onChange={(e) => handleTarifaChange(index, 'dias', e.target.value)}
                    required
                  />
                </div>
                <div className="dias-input">
                  <span>Precio (€):</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={tarifa.importe}
                    onChange={(e) => handleTarifaChange(index, 'importe', e.target.value)}
                    required
                  />
                </div>
                <button type="button" className="btn-icon text-danger" onClick={() => handleRemoveTarifa(index)}>
                  <X size={20} />
                </button>
              </div>
            ))}
            <button type="button" className="btn-secondary add-inscripcion-btn" onClick={handleAddTarifa}>
              + Añadir Tarifa
            </button>
          </div>
          <small className="text-muted">
            Ejemplo: 2 días = 40€, 3 días = 50€. Estas tarifas se usarán para calcular la cuota de los alumnos automáticamente.
          </small>
        </div>

        {/* Sección de alumnos inscritos en el grupo */}
        <div className="form-group full-width">
          <label>Alumnos Inscritos</label>
          <div className="inscripciones-list">
            {formData.alumnosInscritos.map((item, index) => (
              <div key={index} className="inscripcion-row">
                <select
                  value={item.alumnoId}
                  onChange={(e) => handleAlumnoInscritoChange(index, 'alumnoId', e.target.value)}
                  required
                >
                  <option value="">Selecciona un alumno...</option>
                  {alumnosTotales
                    .filter(a => a.estado === 'activo' || Number(a.id) === Number(item.alumnoId))
                    .map(a => (
                      <option
                        key={a.id}
                        value={a.id}
                        disabled={formData.alumnosInscritos.some(
                          (other, i) => i !== index && Number(other.alumnoId) === Number(a.id)
                        )}
                      >
                        {getNombreCompleto(a)}
                      </option>
                    ))}
                </select>

                <div className="dias-input">
                  <span>Días/sem:</span>
                  <input
                    type="number"
                    min="1"
                    max="7"
                    value={item.dias}
                    onChange={(e) => handleAlumnoInscritoChange(index, 'dias', e.target.value)}
                    required
                  />
                </div>

                <button
                  type="button"
                  className="btn-icon text-danger"
                  title="Quitar alumno"
                  onClick={() => handleRemoveAlumnoInscrito(index)}
                >
                  <X size={20} />
                </button>
              </div>
            ))}

            <button
              type="button"
              className="btn-secondary add-inscripcion-btn"
              onClick={handleAddAlumnoInscrito}
            >
              + Añadir Alumno
            </button>
          </div>
          <small className="text-muted">
            {editingId
              ? 'Puedes añadir o quitar alumnos de este grupo. Se actualizarán automáticamente sus cuotas.'
              : 'Puedes inscribir alumnos a este grupo desde su creación. También podrás gestionarlos más adelante.'}
          </small>
        </div>

        <div className="form-actions full-width">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary">
            {editingId ? 'Actualizar Grupo' : 'Guardar Grupo'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ModalGrupoForm;

