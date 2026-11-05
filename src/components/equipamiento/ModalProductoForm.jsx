import Modal from '../ui/Modal';
import ImagePicker from '../common/ImagePicker';
import { Palette, Ruler } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const ModalProductoForm = ({
  isOpen,
  onClose,
  productForm,
  setProductForm,
  onSubmit
}) => {
  const pvp = Number(productForm.precio) || 0;
  const beneficio = Number(productForm.beneficio) || 0;

  const margenPct = pvp > 0 && beneficio > 0 ? Math.round((beneficio / pvp) * 100) : null;

  const handlePvpChange = (val) => {
    const numPvp = Number(val);
    const updates = { precio: val };
    if (!isNaN(numPvp) && val !== '') {
      if (productForm.coste !== '' && !isNaN(Number(productForm.coste))) {
        updates.beneficio = Math.max(0, numPvp - Number(productForm.coste)).toFixed(2);
      } else if (productForm.beneficio !== '' && !isNaN(Number(productForm.beneficio))) {
        updates.coste = Math.max(0, numPvp - Number(productForm.beneficio)).toFixed(2);
      }
    }
    setProductForm(prev => ({ ...prev, ...updates }));
  };

  const handleCosteChange = (val) => {
    const numCoste = Number(val);
    const updates = { coste: val };
    if (!isNaN(numCoste) && val !== '' && !isNaN(pvp)) {
      updates.beneficio = Math.max(0, pvp - numCoste).toFixed(2);
    }
    setProductForm(prev => ({ ...prev, ...updates }));
  };

  const handleBeneficioChange = (val) => {
    const numBen = Number(val);
    const updates = { beneficio: val };
    if (!isNaN(numBen) && val !== '' && !isNaN(pvp)) {
      updates.coste = Math.max(0, pvp - numBen).toFixed(2);
    }
    setProductForm(prev => ({ ...prev, ...updates }));
  };

  const chipsColores = (productForm.colores || '')
    .split(',')
    .map(c => c.trim())
    .filter(Boolean);

  const chipsTallas = (productForm.tallas || '')
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={productForm.id ? 'Editar Producto' : 'Nuevo Producto'}
    >
      <form onSubmit={onSubmit} className="form-grid">
        <div className="form-group full-width">
          <label>Nombre del Producto *</label>
          <input
            type="text"
            name="nombre"
            value={productForm.nombre}
            onChange={(e) => setProductForm({ ...productForm, nombre: e.target.value })}
            placeholder="Ej: Guantes Leone, Kimono BJJ, Espinilleras, Vendas..."
            required
            autoFocus
          />
        </div>

        {/* Variantes: Colores y Tallas/Onzas */}
        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Palette size={16} /> Colores Disponibles
          </label>
          <input
            type="text"
            name="colores"
            value={productForm.colores}
            onChange={(e) => setProductForm({ ...productForm, colores: e.target.value })}
            placeholder="Ej: Negro, Rojo, Blanco (separados por coma)"
          />
          {chipsColores.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
              {chipsColores.map((col, idx) => (
                <span
                  key={idx}
                  style={{
                    fontSize: '0.75rem',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-light)'
                  }}
                >
                  {col}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Ruler size={16} /> Tallas / Onzas Disponibles
          </label>
          <input
            type="text"
            name="tallas"
            value={productForm.tallas}
            onChange={(e) => setProductForm({ ...productForm, tallas: e.target.value })}
            placeholder="Ej: 10oz, 12oz, 14oz o S, M, L (separadas por coma)"
          />
          {chipsTallas.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
              {chipsTallas.map((tal, idx) => (
                <span
                  key={idx}
                  style={{
                    fontSize: '0.75rem',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-light)'
                  }}
                >
                  {tal}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Sección Económica: PVP, Coste y Beneficio */}
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
                  Margen: {margenPct}% (+{formatCurrency(beneficio)})
                </span>
              )}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '12px'
              }}
            >
              <div>
                <label style={{ fontSize: '0.8rem' }}>P.V.P. (€) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="precio"
                  value={productForm.precio}
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
                  name="coste"
                  value={productForm.coste}
                  onChange={(e) => handleCosteChange(e.target.value)}
                  placeholder="0.00"
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                  Lo que cuesta al gimnasio
                </small>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#22c55e' }}>Beneficio Limpio (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="beneficio"
                  value={productForm.beneficio}
                  onChange={(e) => handleBeneficioChange(e.target.value)}
                  placeholder="0.00"
                  style={{ borderColor: 'rgba(34, 197, 94, 0.5)' }}
                />
                <small style={{ color: '#22c55e', fontSize: '0.7rem' }}>
                  Ganancia real por unidad
                </small>
              </div>
            </div>
          </div>
        </div>

        {/* Foto */}
        <div className="form-group full-width">
          <label>Foto del Producto (Opcional)</label>
          <div className="image-upload-container">
            <ImagePicker
              value={productForm.foto}
              onChange={(foto) => setProductForm(prev => ({ ...prev, foto }))}
              shape="rounded"
              size={64}
              label="Subir Imagen"
              changeLabel="Cambiar Foto"
              placeholderIcon="image"
              hint="La imagen se comprime automáticamente a miniatura (~25 KB) para no saturar el almacenamiento local."
            />
          </div>
        </div>

        <div className="form-actions full-width">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary">
            {productForm.id ? 'Guardar Cambios' : 'Crear Producto'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ModalProductoForm;
