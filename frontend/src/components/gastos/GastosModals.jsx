import Modal from '../ui/Modal';
import AttachmentPicker from '../common/AttachmentPicker';
import { RotateCcw } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export const ModalGastoVariable = ({
  isOpen,
  onClose,
  formData,
  setFormData,
  conceptosHabituales = [],
  categoriasSugeridas = [],
  onSelectRecuperacion,
  onPreviewFactura,
  onSubmit
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={formData.id ? 'Editar Gasto Variable' : 'Añadir Gasto Variable'}
    >
      <form onSubmit={onSubmit} className="form-grid">
        {!formData.id && conceptosHabituales.length > 0 && (
          <div className="full-width recuperar-selector-box">
            <label>
              <RotateCcw size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
              Recuperar de un gasto anterior frecuente:
            </label>
            <div className="recuperar-chips-container">
              {conceptosHabituales.slice(0, 8).map((hab, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="recuperar-chip"
                  onClick={() => onSelectRecuperacion(hab)}
                >
                  <span>{hab.concepto}</span>
                  <span style={{ color: 'var(--text-muted)' }}>({formatCurrency(hab.importe)})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="form-group full-width">
          <label>Concepto / Motivo *</label>
          <input
            type="text"
            name="concepto"
            value={formData.concepto}
            onChange={(e) => setFormData(prev => ({ ...prev, concepto: e.target.value }))}
            required
            list="conceptos-variables-list"
            placeholder="Ej: Compra de tatami, Botiquín, Reparación..."
            autoComplete="off"
          />
          <datalist id="conceptos-variables-list">
            {conceptosHabituales.map((c, idx) => (
              <option key={idx} value={c.concepto} />
            ))}
          </datalist>
        </div>

        <div className="form-group full-width">
          <label>Categoría *</label>
          <input
            type="text"
            name="categoria"
            value={formData.categoria}
            onChange={(e) => setFormData(prev => ({ ...prev, categoria: e.target.value }))}
            required
            list="categorias-variables-list"
            placeholder="Escribe o selecciona una categoría"
            autoComplete="off"
          />
          <datalist id="categorias-variables-list">
            {categoriasSugeridas.map((cat, idx) => (
              <option key={idx} value={cat} />
            ))}
          </datalist>
        </div>

        <div className="form-group">
          <label>Fecha *</label>
          <input
            type="date"
            name="fecha"
            value={formData.fecha}
            onChange={(e) => setFormData(prev => ({ ...prev, fecha: e.target.value }))}
            required
          />
        </div>

        <div className="form-group">
          <label>Importe (€) *</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            name="importe"
            value={formData.importe}
            onChange={(e) => setFormData(prev => ({ ...prev, importe: e.target.value ? Number(e.target.value) : '' }))}
            required
            placeholder="0.00"
          />
        </div>

        <AttachmentPicker
          value={formData.factura}
          onChange={(factura) => setFormData(prev => ({ ...prev, factura }))}
          onPreview={() => onPreviewFactura({
            concepto: formData.concepto,
            importe: formData.importe,
            factura: formData.factura
          })}
          label="Factura / Ticket Justificante (Opcional)"
          buttonLabel="Adjuntar PDF o Foto de Factura"
        />

        <div className="form-actions full-width">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary">
            {formData.id ? 'Guardar Cambios' : 'Guardar Gasto Variable'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export const ModalNuevoGastoFijo = ({
  isOpen,
  onClose,
  formData,
  setFormData,
  categoriasSugeridas = [],
  onSubmit
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Crear Nuevo Gasto Fijo Recurrente">
      <form onSubmit={onSubmit} className="form-grid">
        <div className="full-width" style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          Los gastos fijos se generarán automáticamente cada mes sin tildar para que puedas llevar el control de pago mensual.
        </div>

        <div className="form-group full-width">
          <label>Concepto del Gasto Fijo *</label>
          <input
            type="text"
            value={formData.concepto}
            onChange={(e) => setFormData(prev => ({ ...prev, concepto: e.target.value }))}
            required
            placeholder="Ej: Alquiler del Local, Seguro RC, Cuota Asesoría, Suministro Luz..."
          />
        </div>

        <div className="form-group full-width">
          <label>Categoría *</label>
          <input
            type="text"
            value={formData.categoria}
            onChange={(e) => setFormData(prev => ({ ...prev, categoria: e.target.value }))}
            required
            list="categorias-fijos-list"
            placeholder="Escribe o selecciona categoría (ej: Alquiler, Suministros, Seguros...)"
            autoComplete="off"
          />
          <datalist id="categorias-fijos-list">
            {categoriasSugeridas.map((cat, idx) => (
              <option key={idx} value={cat} />
            ))}
          </datalist>
        </div>

        <div className="form-group">
          <label>Importe Habitual (€) *</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={formData.importe}
            onChange={(e) => setFormData(prev => ({ ...prev, importe: e.target.value ? Number(e.target.value) : '' }))}
            required
            placeholder="0.00"
          />
        </div>

        <div className="form-group">
          <label>Día Habitual de Pago</label>
          <input
            type="number"
            min="1"
            max="31"
            value={formData.diaMes}
            onChange={(e) => setFormData(prev => ({ ...prev, diaMes: Number(e.target.value) || 1 }))}
            placeholder="1"
          />
        </div>

        <div className="form-actions full-width">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary">Guardar Gasto Fijo</button>
        </div>
      </form>
    </Modal>
  );
};

export const ModalModificarFijoMes = ({
  isOpen,
  onClose,
  fijoMesEditando,
  mesNombre,
  año,
  importe,
  setImporte,
  fecha,
  setFecha,
  factura,
  setFactura,
  onPreviewFactura,
  onSubmit
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Modificar Importe en ${mesNombre} ${año}`}
    >
      {fijoMesEditando && (
        <form onSubmit={onSubmit} className="form-grid">
          <div className="full-width modal-info-box">
            <div style={{ fontWeight: 600 }}>{fijoMesEditando.concepto}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Categoría: {fijoMesEditando.categoria} | Importe habitual: {formatCurrency(fijoMesEditando.gastoFijo?.importe || 0)}
            </div>
          </div>

          <div className="form-group full-width">
            <label>Importe para {mesNombre} (€) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={importe}
              onChange={(e) => setImporte(e.target.value ? Number(e.target.value) : '')}
              required
              placeholder="0.00"
            />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Si este mes el recibo varía (ej. factura de la luz), ajusta aquí el importe específico.
            </span>
          </div>

          <div className="form-group full-width">
            <label>Fecha de Pago *</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
            />
          </div>

          <AttachmentPicker
            value={factura}
            onChange={setFactura}
            onPreview={() => onPreviewFactura({
              concepto: fijoMesEditando.concepto,
              importe,
              factura
            })}
            label="Factura de este mes (Opcional)"
            buttonLabel="Adjuntar Factura de este mes (PDF o Foto)"
            hint="Ideal para recibos que varían cada mes (luz, agua, teléfono, suministros)."
          />

          <div className="form-actions full-width">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary">Guardar y Marcar Pagado</button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export const ModalEditarPlantillaFijo = ({
  isOpen,
  onClose,
  formData,
  setFormData,
  categoriasSugeridas = [],
  onSubmit
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Plantilla de Gasto Fijo">
      <form onSubmit={onSubmit} className="form-grid">
        <div className="form-group full-width">
          <label>Concepto *</label>
          <input
            type="text"
            value={formData.concepto}
            onChange={(e) => setFormData(prev => ({ ...prev, concepto: e.target.value }))}
            required
          />
        </div>

        <div className="form-group full-width">
          <label>Categoría *</label>
          <input
            type="text"
            value={formData.categoria}
            onChange={(e) => setFormData(prev => ({ ...prev, categoria: e.target.value }))}
            required
            list="categorias-fijos-edit-list"
          />
          <datalist id="categorias-fijos-edit-list">
            {categoriasSugeridas.map((cat, idx) => (
              <option key={idx} value={cat} />
            ))}
          </datalist>
        </div>

        <div className="form-group">
          <label>Importe Habitual (€) *</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={formData.importe}
            onChange={(e) => setFormData(prev => ({ ...prev, importe: e.target.value ? Number(e.target.value) : '' }))}
            required
          />
        </div>

        <div className="form-group">
          <label>Día Habitual de Pago</label>
          <input
            type="number"
            min="1"
            max="31"
            value={formData.diaMes}
            onChange={(e) => setFormData(prev => ({ ...prev, diaMes: Number(e.target.value) || 1 }))}
          />
        </div>

        <div className="form-actions full-width">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary">Guardar Plantilla</button>
        </div>
      </form>
    </Modal>
  );
};

