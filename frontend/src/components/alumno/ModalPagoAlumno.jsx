import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { productoService } from '../../services';
import { getTipoPagoConfig } from '../../constants/tiposPago';
import { MESES_NOMBRES } from '../../constants/fechas';
import { formatCurrency } from '../../utils/formatters';
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
      coste: '',
      beneficio: 0,
      estadoPedido: config.id === 'material' ? 'sin_pedir' : null,
      mes: mesIdx + 1,
      año: añoActual,
      fecha: now.toISOString().split('T')[0],
      estado: config.estadoInicial
    };
  });

  const pvp = Number(formData.importe) || 0;
  const beneficio = Number(formData.beneficio) || 0;
  const margenPct = pvp > 0 && beneficio > 0 ? Math.round((beneficio / pvp) * 100) : null;

  const handlePvpChange = (val) => {
    const numPvp = Number(val);
    const updates = { importe: val };
    if (!isNaN(numPvp) && val !== '') {
      if (formData.coste !== '' && !isNaN(Number(formData.coste))) {
        updates.beneficio = Math.max(0, numPvp - Number(formData.coste)).toFixed(2);
      } else if (formData.beneficio !== '' && !isNaN(Number(formData.beneficio))) {
        updates.coste = Math.max(0, numPvp - Number(formData.beneficio)).toFixed(2);
      }
    }
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleCosteChange = (val) => {
    const numCoste = Number(val);
    const updates = { coste: val };
    if (!isNaN(numCoste) && val !== '' && !isNaN(pvp)) {
      updates.beneficio = Math.max(0, pvp - numCoste).toFixed(2);
    }
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleBeneficioChange = (val) => {
    const numBen = Number(val);
    const updates = { beneficio: val };
    if (!isNaN(numBen) && val !== '' && !isNaN(pvp)) {
      updates.coste = Math.max(0, pvp - numBen).toFixed(2);
    }
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      importe: Number(formData.importe) || 0,
      coste: formData.coste !== '' ? Number(formData.coste) : 0,
      beneficio: formData.beneficio !== '' ? Number(formData.beneficio) : 0
    });
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
                      importe: Number(prod.precio) || 0,
                      beneficio: Number(prod.beneficio) || 0,
                      productoId: prod.id
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

      {config.id === 'cuota' ? (
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
      ) : (
        <div className="form-group full-width" style={{ marginTop: '0.25rem' }}>
          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              background: 'var(--bg-dark)',
              border: '1px solid var(--border-color)'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px'
              }}
            >
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                PRECIO Y MARGEN COMERCIAL
              </span>
              {margenPct !== null && (
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'rgba(34, 197, 94, 0.15)',
                    color: '#22c55e',
                    border: '1px solid rgba(34, 197, 94, 0.3)'
                  }}
                >
                  Margen: {margenPct}% (+{formatCurrency(formData.beneficio)})
                </span>
              )}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '12px'
              }}
            >
              <div>
                <label style={{ fontSize: '0.8rem' }}>P.V.P. (€) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.importe}
                  onChange={(e) => handlePvpChange(e.target.value)}
                  placeholder="0.00"
                  required
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                  Lo que paga el alumno
                </small>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem' }}>Precio Coste (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.coste}
                  onChange={(e) => handleCosteChange(e.target.value)}
                  placeholder="0.00"
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                  Coste trámite / material
                </small>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#22c55e' }}>Beneficio Limpio (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.beneficio}
                  onChange={(e) => handleBeneficioChange(e.target.value)}
                  placeholder="0.00"
                  style={{ borderColor: 'rgba(34, 197, 94, 0.5)' }}
                />
                <small style={{ color: '#22c55e', fontSize: '0.7rem' }}>
                  Ganancia para el gimnasio
                </small>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {config.id === 'material' && (
        <div className="form-group full-width">
          <label>Logística del Material</label>
          <select
            value={formData.estadoPedido || 'sin_pedir'}
            onChange={(e) => setFormData({ ...formData, estadoPedido: e.target.value })}
          >
            <option value="sin_pedir">Pendiente de pedir al proveedor</option>
            <option value="pedido">Ya pedido al proveedor</option>
          </select>
        </div>
      )}

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
