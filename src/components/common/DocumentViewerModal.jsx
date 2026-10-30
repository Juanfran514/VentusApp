import Modal from '../ui/Modal';
import { Download } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { descargarFactura } from '../../utils/facturaProcessor';

/**
 * Modal de previsualización y descarga de facturas / documentos (PDF o Imagen)
 */
const DocumentViewerModal = ({ isOpen, onClose, gasto, factura }) => {
  const activeFactura = factura || gasto?.factura;
  if (!isOpen || !activeFactura) return null;

  const title = gasto?.concepto
    ? `Factura: ${gasto.concepto} (${formatCurrency(gasto.importe || 0)})`
    : 'Factura Adjunta';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="factura-preview-modal-body">
          {activeFactura.tipo === 'pdf' ? (
            <iframe
              src={activeFactura.archivo}
              title="Factura PDF"
              className="factura-preview-iframe"
            />
          ) : (
            <img
              src={activeFactura.archivo}
              alt="Factura"
              className="factura-preview-img"
            />
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border-color)',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}
        >
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {activeFactura.nombre}{' '}
            {activeFactura.tamano ? `(${(activeFactura.tamano / 1024).toFixed(1)} KB)` : ''}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn-primary flex-center"
              onClick={() => descargarFactura(activeFactura, gasto?.concepto)}
            >
              <Download size={16} style={{ marginRight: '6px' }} />
              Descargar Factura
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default DocumentViewerModal;
