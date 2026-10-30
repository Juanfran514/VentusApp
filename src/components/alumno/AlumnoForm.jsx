import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { CINTURONES, normalizarCinturon } from '../../utils/cinturones';
import { grupoService } from '../../services/grupoService';
import { formatCurrency, formatGrupoHorarios } from '../../utils/formatters';
import ImagePicker from '../common/ImagePicker';

const INITIAL_ALUMNO = {
  nombre: '',
  apellidos: '',
  fechaNac: '',
  telefono: '',
  nTutor: '',
  email: '',
  cinturon: '',
  cuota: 0,
  estado: 'activo',
  inscripciones: [],
  observaciones: '',
  lesiones: '',
  foto: ''
};

const buildFormData = (alumno) => {
  if (!alumno) return { ...INITIAL_ALUMNO, inscripciones: [] };
  return {
    nombre: alumno.nombre || '',
    apellidos: alumno.apellidos || '',
    fechaNac: alumno.fechaNac || '',
    telefono: alumno.telefono || '',
    nTutor: alumno.nTutor || '',
    email: alumno.email || '',
    cinturon: alumno.cinturon ? normalizarCinturon(alumno.cinturon) : '',
    cuota: alumno.cuota !== undefined ? alumno.cuota : 0,
    estado: alumno.estado || 'activo',
    inscripciones: alumno.inscripciones ? alumno.inscripciones.map(i => ({ ...i })) : [],
    observaciones: alumno.observaciones || '',
    lesiones: alumno.lesiones || '',
    foto: alumno.foto || ''
  };
};

/**
 * Formulario unificado de creación/edición de Alumno (DRY / SRP)
 */
const AlumnoForm = ({
  initialData = null,
  grupos = [],
  gruposMap = {},
  submitLabel = 'Guardar Alumno',
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState(() => buildFormData(initialData));

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'cuota' ? (value ? Number(value) : '') : value
    }));
  };

  const handleAddInscripcion = () => {
    setFormData(prev => ({
      ...prev,
      inscripciones: [...prev.inscripciones, { grupoId: '', dias: 1 }]
    }));
  };

  const handleRemoveInscripcion = (index) => {
    setFormData(prev => {
      const newInscripciones = prev.inscripciones.filter((_, i) => i !== index);
      const prevCalc = grupoService.calcularCuotaTotal(prev.inscripciones, gruposMap);
      const newCalc = grupoService.calcularCuotaTotal(newInscripciones, gruposMap);
      const shouldAutoUpdate =
        prev.cuota === 0 || prev.cuota === '' || Number(prev.cuota) === Number(prevCalc);
      return {
        ...prev,
        inscripciones: newInscripciones,
        cuota: shouldAutoUpdate ? newCalc : prev.cuota
      };
    });
  };

  const handleInscripcionChange = (index, field, value) => {
    setFormData(prev => {
      const newIns = [...prev.inscripciones];
      newIns[index] = { ...newIns[index], [field]: value };
      const prevCalc = grupoService.calcularCuotaTotal(prev.inscripciones, gruposMap);
      const newCalc = grupoService.calcularCuotaTotal(newIns, gruposMap);
      const shouldAutoUpdate =
        prev.cuota === 0 || prev.cuota === '' || Number(prev.cuota) === Number(prevCalc);
      return {
        ...prev,
        inscripciones: newIns,
        cuota: shouldAutoUpdate ? newCalc : prev.cuota
      };
    });
  };

  const cuotaCalculada = useMemo(() => {
    return grupoService.calcularCuotaTotal(formData.inscripciones, gruposMap);
  }, [formData.inscripciones, gruposMap]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const inscripcionesValidas = formData.inscripciones
      .filter(ins => ins.grupoId !== '')
      .map(ins => ({
        grupoId: Number(ins.grupoId),
        dias: Number(ins.dias)
      }));
    const gruposIds = inscripcionesValidas.map(ins => ins.grupoId);

    onSubmit({
      ...formData,
      cuota: Number(formData.cuota) || 0,
      inscripciones: inscripcionesValidas,
      grupos: gruposIds
    });
  };

  return (
    <form onSubmit={handleFormSubmit} className="form-grid">
      {/* FOTO DEL ALUMNO */}
      <div
        className="form-group full-width"
        style={{
          padding: '0.5rem 0',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '0.5rem'
        }}
      >
        <ImagePicker
          value={formData.foto}
          onChange={(foto) => setFormData(prev => ({ ...prev, foto }))}
          shape="circle"
          size={72}
          label="Subir Foto"
          changeLabel="Cambiar Foto"
          placeholderIcon="user"
        />
      </div>

      <div className="form-group">
        <label>Nombre *</label>
        <input name="nombre" value={formData.nombre} onChange={handleInputChange} required />
      </div>
      <div className="form-group">
        <label>Apellidos *</label>
        <input name="apellidos" value={formData.apellidos} onChange={handleInputChange} required />
      </div>
      <div className="form-group">
        <label>Fecha Nacimiento</label>
        <input type="date" name="fechaNac" value={formData.fechaNac} onChange={handleInputChange} />
      </div>
      <div className="form-group">
        <label>Teléfono (Alumno o Tutor)</label>
        <input name="telefono" value={formData.telefono} onChange={handleInputChange} />
      </div>
      <div className="form-group">
        <label>Nombre del Tutor (si es menor)</label>
        <input name="nTutor" value={formData.nTutor} onChange={handleInputChange} />
      </div>
      <div className="form-group">
        <label>Email</label>
        <input type="email" name="email" value={formData.email || ''} onChange={handleInputChange} />
      </div>
      <div className="form-group">
        <label>Cinturón</label>
        <select
          name="cinturon"
          value={formData.cinturon ? normalizarCinturon(formData.cinturon) : ''}
          onChange={handleInputChange}
        >
          <option value="">Sin cinturón</option>
          {CINTURONES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label>Estado</label>
        <select name="estado" value={formData.estado} onChange={handleInputChange}>
          <option value="activo">Activo</option>
          <option value="baja">Baja</option>
        </select>
      </div>

      {/* Inscripciones a Grupos */}
      <div className="form-group full-width">
        <label>Inscripciones a Grupos y Días</label>
        <div className="inscripciones-list">
          {formData.inscripciones.map((ins, index) => (
            <div key={index} className="inscripcion-row">
              <select
                value={ins.grupoId}
                onChange={(e) => handleInscripcionChange(index, 'grupoId', e.target.value)}
                required
              >
                <option value="">Selecciona un grupo...</option>
                {grupos.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.nombre} ({formatGrupoHorarios(g)})
                  </option>
                ))}
              </select>

              <div className="dias-input">
                <span>Días/sem:</span>
                <input
                  type="number"
                  min="1"
                  max="7"
                  value={ins.dias}
                  onChange={(e) => handleInscripcionChange(index, 'dias', e.target.value)}
                  required
                />
              </div>

              <button
                type="button"
                className="btn-icon text-danger"
                onClick={() => handleRemoveInscripcion(index)}
              >
                <X size={20} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn-secondary add-inscripcion-btn"
            onClick={handleAddInscripcion}
          >
            + Añadir Grupo
          </button>
        </div>
      </div>

      <div className="form-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <label style={{ margin: 0 }}>Cuota Mensual (€) *</label>
          {Number(formData.cuota) !== Number(cuotaCalculada) && (
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '2px 8px', fontSize: '0.75rem' }}
              onClick={() => setFormData(prev => ({ ...prev, cuota: cuotaCalculada }))}
              title="Restablecer precio calculado según tarifas de grupo"
            >
              Usar tarifa estándar ({cuotaCalculada} €)
            </button>
          )}
        </div>
        <input
          type="number"
          step="0.01"
          min="0"
          name="cuota"
          value={formData.cuota}
          onChange={handleInputChange}
          required
          placeholder="0.00"
        />
        <small className="text-muted" style={{ display: 'block', marginTop: '4px' }}>
          Tarifa estándar por grupos: <strong>{formatCurrency(cuotaCalculada)}</strong>
          {Number(formData.cuota) !== Number(cuotaCalculada) && (
            <span style={{ color: 'var(--primary-color)', marginLeft: '6px', fontWeight: 600 }}>
              (Precio personalizado)
            </span>
          )}
        </small>
      </div>

      <div className="form-group full-width">
        <label>Lesiones o Información médica</label>
        <textarea name="lesiones" value={formData.lesiones} onChange={handleInputChange} rows="2" />
      </div>
      <div className="form-group full-width">
        <label>Otras observaciones</label>
        <textarea name="observaciones" value={formData.observaciones} onChange={handleInputChange} rows="2" />
      </div>

      <div className="form-actions full-width">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
};

export default AlumnoForm;

