import { Plus, Trash2, Edit2, Package, Search } from 'lucide-react';
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
          {productosFiltrados.map(prod => (
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
                <div>
                  <div className="producto-nombre" title={prod.nombre}>
                    {prod.nombre}
                  </div>
                  <div className="producto-precio">{formatCurrency(prod.precio)}</div>
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
          ))}
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
            Crea productos con nombre y precio para poder asignarlos fácilmente a los alumnos cuando los soliciten.
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

