import { useState } from 'react';
import { Camera, Trash2, User, Image as ImageIcon } from 'lucide-react';
import { comprimirImagen } from '../../utils/imageCompressor';
import { useToast } from '../../context/DialogContext';

/**
 * Selector de imagen con compresión automática en cliente (ISP / DRY)
 */
const ImagePicker = ({
  value = '',
  onChange,
  shape = 'circle', // 'circle' o 'rounded'
  size = 72,
  label = 'Subir Foto',
  changeLabel = 'Cambiar Foto',
  hint = '',
  placeholderIcon = 'user', // 'user' | 'image'
  maxSize = 320,
  quality = 0.75
}) => {
  const [isCompressing, setIsCompressing] = useState(false);
  const { toast } = useToast();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      const dataUrl = await comprimirImagen(file, maxSize, quality);
      onChange(dataUrl);
    } catch (err) {
      console.error('Error al comprimir imagen:', err);
      toast.error('No se pudo procesar la imagen seleccionada.');
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  const Placeholder = placeholderIcon === 'image' ? ImageIcon : User;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: shape === 'circle' ? '50%' : '12px',
          overflow: 'hidden',
          background: 'var(--bg-dark)',
          border: '2px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        {value ? (
          <img
            src={value}
            alt="Previsualización"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Placeholder size={Math.round(size * 0.48)} style={{ color: 'var(--text-muted)' }} />
        )}
      </div>

      <div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label
            className="btn-secondary"
            style={{ cursor: 'pointer', fontSize: '0.85rem', padding: '0.4rem 0.8rem', display: 'inline-flex', alignItems: 'center' }}
          >
            <Camera size={14} style={{ marginRight: '5px' }} />
            {isCompressing ? 'Procesando...' : value ? changeLabel : label}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              disabled={isCompressing}
            />
          </label>
          {value && (
            <button
              type="button"
              className="btn-icon text-danger"
              onClick={() => onChange('')}
              title="Quitar imagen"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
        {hint && (
          <small className="text-muted" style={{ display: 'block', marginTop: '4px', fontSize: '0.75rem' }}>
            {hint}
          </small>
        )}
      </div>
    </div>
  );
};

export default ImagePicker;

