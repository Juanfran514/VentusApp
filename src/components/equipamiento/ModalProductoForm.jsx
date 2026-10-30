import Modal from '../ui/Modal';
import ImagePicker from '../common/ImagePicker';

const ModalProductoForm = ({
  isOpen,
  onClose,
  productForm,
  setProductForm,
  onSubmit
}) => {
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
            placeholder="Ej: Guantes de Boxeo 12oz, Kimono BJJ, Vendas..."
            required
            autoFocus
          />
        </div>

        <div className="form-group full-width">
          <label>Precio de Venta (€) *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            name="precio"
            value={productForm.precio}
            onChange={(e) => setProductForm({ ...productForm, precio: e.target.value })}
            placeholder="0.00"
            required
          />
        </div>

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

