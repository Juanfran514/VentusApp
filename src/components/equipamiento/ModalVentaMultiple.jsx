import { useState } from 'react';
import Modal from '../ui/Modal';
import { Plus, Trash2, Package, ShoppingCart, Search } from 'lucide-react';
import { formatCurrency, getNombreCompleto } from '../../utils/formatters';

const ModalVentaMultiple = ({
  isOpen,
  onClose,
  alumnos = [],
  productos = [],
  saleAlumnoId,
  setSaleAlumnoId,
  saleFecha,
  setSaleFecha,
  saleEstado,
  setSaleEstado,
  cesta,
  totalCesta,
  onAddProduct,
  onUpdateCantidad,
  onUpdatePrecio,
  onRemoveProduct,
  onSubmit
}) => {
  const [filtroBusqueda, setFiltroBusqueda] = useState('');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Vender / Asignar Equipamiento">
      <form onSubmit={onSubmit} className="form-grid">
        {/* SELECCIÓN DE ALUMNO */}
        <div className="form-group full-width">
          <label>Alumno *</label>
          <select
            value={saleAlumnoId}
            onChange={(e) => setSaleAlumnoId(e.target.value)}
            required
          >
            <option value="">-- Seleccionar Alumno --</option>
            {alumnos
              .filter(a => a.estado === 'activo')
              .map(al => (
                <option key={al.id} value={al.id}>
                  {getNombreCompleto(al)}
                </option>
              ))}
          </select>
        </div>

        <div className="form-group">
          <label>Fecha de Venta *</label>
          <input
            type="date"
            value={saleFecha}
            onChange={(e) => setSaleFecha(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Estado del Cobro *</label>
          <select
            value={saleEstado}
            onChange={(e) => setSaleEstado(e.target.value)}
            required
          >
            <option value="pendiente">Pendiente de cobro (Deuda)</option>
            <option value="pagado">Cobrado al momento (Pagado)</option>
          </select>
        </div>

        {/* SELECTOR DE PRODUCTOS DEL CATÁLOGO */}
        <div className="form-group full-width seccion-catalogo-selector">
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Añadir Productos del Catálogo</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Haz clic en un producto para añadirlo
            </span>
          </label>

          {productos.length > 0 ? (
            <>
              <div style={{ position: 'relative', marginTop: '0.5rem' }}>
                <Search
                  size={14}
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }}
                />
                <input
                  type="text"
                  placeholder="Filtrar por nombre..."
                  value={filtroBusqueda}
                  onChange={(e) => setFiltroBusqueda(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '5px 10px 5px 30px',
                    fontSize: '0.85rem',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-panel)',
                    color: 'var(--text-light)'
                  }}
                />
              </div>

              <div className="catalogo-pills-list">
                {productos
                  .filter(p => !filtroBusqueda || p.nombre.toLowerCase().includes(filtroBusqueda.toLowerCase().trim()))
                  .map(prod => (
                    <button
                      type="button"
                      key={prod.id}
                      className="catalogo-pill-item"
                      onClick={() => onAddProduct(prod)}
                      title={`Añadir ${prod.nombre} (${formatCurrency(prod.precio)})`}
                    >
                      {prod.foto ? (
                        <img src={prod.foto} alt="" className="catalogo-pill-thumb" />
                      ) : (
                        <Package size={14} style={{ color: 'var(--text-muted)' }} />
                      )}
                      <span>{prod.nombre}</span>
                      <strong style={{ color: 'var(--primary-color)' }}>
                        {formatCurrency(prod.precio)}
                      </strong>
                      <Plus size={14} style={{ marginLeft: '2px' }} />
                    </button>
                  ))}
              </div>
            </>
          ) : (
            <div style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No tienes productos en el catálogo todavía. Puedes crear artículos en la pestaña Catálogo.
            </div>
          )}
        </div>

        {/* CESTA DE LA VENTA */}
        <div className="form-group full-width">
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Cesta de Artículos ({cesta.length})</span>
          </label>

          {cesta.length > 0 ? (
            <div>
              <table className="cesta-table">
                <thead>
                  <tr>
                    <th>Artículo</th>
                    <th style={{ textAlign: 'center', width: '100px' }}>Cant.</th>
                    <th style={{ width: '85px' }}>Precio</th>
                    <th style={{ width: '85px' }}>Subtotal</th>
                    <th style={{ width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {cesta.map((item, idx) => {
                    const subtotal = (Number(item.precio) || 0) * (Number(item.cantidad) || 1);
                    return (
                      <tr key={idx}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {item.foto ? (
                              <img
                                src={item.foto}
                                alt=""
                                style={{ width: '28px', height: '28px', borderRadius: '4px', objectFit: 'cover' }}
                              />
                            ) : (
                              <Package size={18} style={{ color: 'var(--text-muted)' }} />
                            )}
                            <strong>{item.nombre}</strong>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="cesta-qty-controls">
                            <button
                              type="button"
                              className="cesta-qty-btn"
                              onClick={() => onUpdateCantidad(idx, -1)}
                            >
                              -
                            </button>
                            <span className="cesta-qty-val">{item.cantidad}</span>
                            <button
                              type="button"
                              className="cesta-qty-btn"
                              onClick={() => onUpdateCantidad(idx, 1)}
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.precio}
                            onChange={(e) => onUpdatePrecio(idx, e.target.value)}
                            style={{ width: '75px', padding: '3px 6px', fontSize: '0.85rem' }}
                          />
                        </td>
                        <td style={{ fontWeight: 'bold' }}>{formatCurrency(subtotal)}</td>
                        <td>
                          <button
                            type="button"
                            className="btn-icon text-danger"
                            onClick={() => onRemoveProduct(idx)}
                            title="Quitar de la cesta"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="cesta-total-box">
                <span className="cesta-total-label">
                  Total a {saleEstado === 'pendiente' ? 'asignar (Deuda)' : 'cobrar'}:
                </span>
                <span className="cesta-total-amount">{formatCurrency(totalCesta)}</span>
              </div>
            </div>
          ) : (
            <div
              style={{
                border: '1px dashed var(--border-color)',
                borderRadius: '6px',
                padding: '1.5rem',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.9rem'
              }}
            >
              <ShoppingCart size={28} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
              <div>La cesta está vacía. Selecciona productos arriba para añadirlos a la venta.</div>
            </div>
          )}
        </div>

        <div className="form-actions full-width" style={{ marginTop: '1rem' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={cesta.length === 0 || !saleAlumnoId}
          >
            {saleEstado === 'pendiente' ? 'Asignar Deuda al Alumno' : 'Cobrar y Finalizar Venta'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ModalVentaMultiple;

