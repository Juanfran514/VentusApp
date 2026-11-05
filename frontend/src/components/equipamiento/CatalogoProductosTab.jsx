import { Plus, Trash2, Edit2, Package, Search, Palette, Ruler } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const CatalogoProductosTab = ({
  searchCatalogo,
  onSearchChange,
  productosFiltrados,
  onEditProduct,
  onDeleteProduct,
  onOpenNewProduct
}) => {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
          gap: '1rem',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ position: 'relative', flex: '1', maxWidth: '400px' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)'
            }}
          />
          <input
            type="text"
            placeholder="Buscar producto en catálogo..."
            value={searchCatalogo}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 38px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-dark)',
              color: 'var(--text-light)'
            }}
          />
        </div>

        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          {productosFiltrados.length}{' '}
          {productosFiltrados.length === 1 ? 'producto' : 'productos'} en catálogo
        </div>
      </div>

      {productosFiltrados.length > 0 ? (
        <div className="productos-grid">
          {productosFiltrados.map(prod => {
            const coloresList = Array.isArray(prod.colores)
              ? prod.colores
              : (prod.colores ? prod.colores.split(',').map(s => s.trim()).filter(Boolean) : []);

            const tallasList = Array.isArray(prod.tallas)
              ? prod.tallas
              : (prod.tallas ? prod.tallas.split(',').map(s => s.trim()).filter(Boolean) : []);

            const beneficio = Number(prod.beneficio) || 0;
            const precio = Number(prod.precio) || 0;
            const margenPct = precio > 0 && beneficio > 0 ? Math.round((beneficio / precio) * 100) : null;

            return (
              <div key={prod.id} className="producto-card">
                <div className="producto-img-container">
                  {prod.foto ? (
                    <img src={prod.foto} alt={prod.nombre} className="producto-img" />
                  ) : (
                    <div className="producto-placeholder">
                      <Package size={36} />
                      <span>Sin foto</span>
                    </div>
                  )}
                </div>
                <div className="producto-body">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="producto-nombre" title={prod.nombre}>
                      {prod.nombre}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                      <span className="producto-precio">{formatCurrency(prod.precio)}</span>
                      {beneficio > 0 && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#22c55e',
                            background: 'rgba(34, 197, 94, 0.1)',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            border: '1px solid rgba(34, 197, 94, 0.2)'
                          }}
                          title={`Beneficio gimnasio: ${formatCurrency(beneficio)} (${margenPct}%)`}
                        >
                          +{formatCurrency(beneficio)} ganancia
                        </span>
                      )}
                    </div>

                    {/* Tags de Variantes: Colores y Tallas */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                      {coloresList.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                          <Palette size={12} style={{ color: 'var(--text-muted)' }} />
                          {coloresList.map((col, idx) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: '0.7rem',
                                padding: '1px 6px',
                                borderRadius: '10px',
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

                      {tallasList.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                          <Ruler size={12} style={{ color: 'var(--text-muted)' }} />
                          {tallasList.map((tal, idx) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: '0.7rem',
                                padding: '1px 6px',
                                borderRadius: '10px',
                                background: 'var(--bg-panel)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-muted)'
                              }}
                            >
                              {tal}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="producto-actions">
                    <button
                      className="btn-icon text-primary"
                      title="Editar producto"
                      onClick={() => onEditProduct(prod)}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      className="btn-icon text-danger"
                      title="Eliminar producto"
                      onClick={() => onDeleteProduct(prod.id, prod.nombre)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
          <Package size={48} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
          <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
            {searchCatalogo
              ? 'No se encontraron productos coincidentes.'
              : 'Aún no tienes productos en el catálogo.'}
          </p>
          <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Crea productos con nombre, PVP, colores y tallas para poder asignarlos fácilmente a los alumnos.
          </p>
          <button className="btn-primary" onClick={onOpenNewProduct}>
            <Plus size={16} style={{ marginRight: '6px' }} />
            Crear Primer Producto
          </button>
        </div>
      )}
    </div>
  );
};

export default CatalogoProductosTab;
