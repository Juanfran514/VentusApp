import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { productoService } from '../../services';
import { getTipoPagoConfig } from '../../constants/tiposPago';
import { MESES_NOMBRES } from '../../constants/fechas';
import Modal from '../ui/Modal';

const PagoAlumnoForm = ({
  config,
  alumno,
  productos = [],
  materialesSugeridos = [],
  licenciasSugeridas = [],
  mesesNombres = MESES_NOMBRES,
  onSave,
  onClose
}) => {
  const [formData, setFormData] = useState(() => {
    const now = new Date();
    const mesIdx = now.getMonth();
    const añoActual = now.getFullYear();

    return {
      tipo: config.id,
      concepto: config.defaultConcepto(mesesNombres[mesIdx], añoActual),
      importe: config.defaultImporte(alumno),
      mes: mesIdx + 1,
      año: añoActual,
      fecha: now.toISOString().split('T')[0],
      estado: config.estadoInicial
    };
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const suggestionsMap = {
    materialesSugeridos,
    licenciasSugeridas
  };
  const currentSuggestions = config.suggestionKey ? (suggestionsMap[config.suggestionKey] || []) : [];
  const datalistId = config.suggestionKey ? `datalist-${config.id}` : undefined;

  return (
    <form onSubmit={handleSubmit} className="form-grid">
      {config.requiresPeriod ? (
        <>
          <div className="form-group">
            <label>Mes *</label>
            <select
              value={formData.mes}
              onChange={(e) => {
                const nuevoMes = Number(e.target.value);
                setFormData(prev => ({
                  ...prev,
                  mes: nuevoMes,
                  concepto: config.defaultConcepto(mesesNombres[nuevoMes - 1], prev.año)
                }));
              }}
              required
            >
              {mesesNombres.map((m, idx) => (
                <option key={idx + 1} value={idx + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Año *</label>
            <input
              type="number"
              value={formData.año}
              onChange={(e) => {
                const nuevoAño = Number(e.target.value);
                setFormData(prev => ({
                  ...prev,
                  año: nuevoAño,
                  concepto: config.defaultConcepto(mesesNombres[prev.mes - 1], nuevoAño)
                }));
              }}
              required
            />
          </div>
        </>
      ) : (
        <>
          {config.usesCatalog && productos.length > 0 && (
            <div className="form-group full-width">
              <label>Elegir del Catálogo de Productos</label>
              <select
                onChange={(e) => {
                  const prodId = Number(e.target.value);
                  const prod = productos.find(p => p.id === prodId);
                  if (prod) {
                    setFormData(prev => ({
                      ...prev,
                      concepto: prod.nombre,
                      importe: Number(prod.precio) || 0
                    }));
                  }
                }}
                defaultValue=""
              >
                <option value="">-- Seleccionar producto para autorrellenar --</option>
                {productos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({Number(p.precio).toFixed(2)} €)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group full-width">
            <label>Concepto / Detalle *</label>
            <input
              type="text"
              value={formData.concepto}
              onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
              required
              list={datalistId}
              placeholder={config.placeholderConcepto}
              autoComplete="off"
            />
            {datalistId && currentSuggestions.length > 0 && (
              <datalist id={datalistId}>
                {currentSuggestions.map((item, idx) => (
                  <option key={idx} value={item} />
                ))}
              </datalist>
            )}
          </div>
        </>
      )}

      <div className="form-group">
        <label>Fecha *</label>
        <input
          type="date"
          value={formData.fecha}
          onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
          required
        />
      </div>

      <div className="form-group">
        <label>Importe (€) *</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={formData.importe}
          onChange={(e) => setFormData({ ...formData, importe: Number(e.target.value) })}
          required
        />
      </div>

      <div className="form-group full-width">
        <label>Estado del Pago *</label>
        <select
          value={formData.estado}
          onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
          required
        >
          <option value="pagado">Pagado (Abonado)</option>
          <option value="pendiente">Pendiente (Adeudo)</option>
        </select>
      </div>

      <div className="form-actions full-width">
        <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn-primary">Guardar Registro</button>
      </div>
    </form>
  );
};

const ModalPagoAlumno = ({
  isOpen,
  onClose,
  tipo = 'cuota',
  alumno,
  materialesSugeridos = [],
  licenciasSugeridas = [],
  onSave,
  mesesNombres = MESES_NOMBRES
}) => {
  const config = getTipoPagoConfig(tipo);
  const productos = useLiveQuery(() => productoService.getAll(), []) || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={config.modalTitle}>
      {isOpen && (
        <PagoAlumnoForm
          key={`${config.id}-${alumno?.id || 'none'}`}
          config={config}
          alumno={alumno}
          productos={productos}
          materialesSugeridos={materialesSugeridos}
          licenciasSugeridas={licenciasSugeridas}
          mesesNombres={mesesNombres}
          onSave={onSave}
          onClose={onClose}
        />
      )}
    </Modal>
  );
};

export default ModalPagoAlumno;
