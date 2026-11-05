import { useState } from 'react';
import { Upload, Trash2, FileText, Eye } from 'lucide-react';
import { procesarArchivoFactura } from '../../utils/facturaProcessor';
import { useToast } from '../../context/DialogContext';

/**
 * Selector de archivo adjunto (PDF o Imagen) con compresión y previsualización (ISP / DRY)
 */
const AttachmentPicker = ({
  value = null,
  onChange,
  onPreview,
  label = 'Factura / Ticket Justificante (Opcional)',
  buttonLabel = 'Adjuntar PDF o Foto de Factura',
  hint = 'Formatos admitidos: PDF o Imágenes (JPG, PNG). Las fotos se optimizan automáticamente para no saturar memoria.'
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsProcessing(true);
      const facturaObj = await procesarArchivoFactura(file);
      onChange(facturaObj);
    } catch (err) {
      toast.error(err.message || 'Error al procesar el archivo adjunto.');
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  return (
    <div className="form-group full-width">
      {label && <label>{label}</label>}
      {value ? (
        <div className="factura-adjunta-card">
          <div className="factura-file-info">
            {value.tipo === 'pdf' ? (
              <FileText size={24} style={{ color: 'var(--primary-color)', flexShrink: 0 }} />
            ) : (
              <img
                src={value.archivo}
                alt=""
                style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }}
              />
            )}
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                {value.nombre || 'Factura adjunta'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {value.tipo?.toUpperCase()}
                {value.tamano ? ` • ${(value.tamano / 1024).toFixed(1)} KB` : ''}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {onPreview && (
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
                onClick={() => onPreview(value)}
              >
                <Eye size={14} style={{ marginRight: '4px' }} /> Ver
              </button>
            )}
            <button
              type="button"
              className="btn-icon text-danger"
              onClick={() => onChange(null)}
              title="Eliminar factura"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="factura-upload-box">
          <label className="btn-secondary flex-center" style={{ cursor: 'pointer', alignSelf: 'flex-start' }}>
            <Upload size={16} style={{ marginRight: '6px' }} />
            {isProcessing ? 'Procesando archivo...' : buttonLabel}
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              disabled={isProcessing}
            />
          </label>
          {hint && (
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {hint}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default AttachmentPicker;
