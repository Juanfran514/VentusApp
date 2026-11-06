import { useState, useEffect } from 'react';
import { 
  Palette, 
  Building2, 
  Sparkles, 
  RotateCcw, 
  Save, 
  Check, 
  Layers, 
  Sliders, 
  ShieldCheck,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/DialogContext';
import ImagePicker from '../components/common/ImagePicker';
import { TEMAS_PREDEFINIDOS, THEME_DEFAULT, oscurecerColor, aplicarTema } from '../utils/theme';
import { VentusIcon } from '../components/common/VentusLogo';
import './Ajustes.css';

const Ajustes = () => {
  const { gimnasio, actualizarBranding } = useAuth();
  const { toast } = useToast();

  const [logoUrl, setLogoUrl] = useState(gimnasio?.logo_url || '');
  const [colorPrimario, setColorPrimario] = useState(gimnasio?.color_primario || THEME_DEFAULT.primary);
  const [colorSecundario, setColorSecundario] = useState(
    gimnasio?.color_secundario || oscurecerColor(gimnasio?.color_primario || THEME_DEFAULT.primary, 15)
  );
  const [guardando, setGuardando] = useState(false);

  // Sincronizar estado si cambian los datos de gimnasio
  useEffect(() => {
    if (gimnasio) {
      setLogoUrl(gimnasio.logo_url || '');
      setColorPrimario(gimnasio.color_primario || THEME_DEFAULT.primary);
      setColorSecundario(
        gimnasio.color_secundario || oscurecerColor(gimnasio.color_primario || THEME_DEFAULT.primary, 15)
      );
    }
  }, [gimnasio]);

  // Selección de paleta predefinida
  const handleSelectPreset = (preset) => {
    setColorPrimario(preset.primary);
    setColorSecundario(preset.dark);
    // Aplicación temporal en vivo para previsualización inmediata
    aplicarTema(preset.primary, preset.dark);
  };

  // Cambio manual de color primario
  const handleColorPrimarioChange = (color) => {
    setColorPrimario(color);
    const darkShade = oscurecerColor(color, 15);
    setColorSecundario(darkShade);
    aplicarTema(color, darkShade);
  };

  // Guardar configuración en backend y contexto
  const handleGuardar = async () => {
    setGuardando(true);
    try {
      await actualizarBranding({
        logoUrl: logoUrl || null,
        colorPrimario,
        colorSecundario
      });
      toast.success('¡Personalización de marca guardada con éxito!');
    } catch (err) {
      console.error('Error al guardar ajustes:', err);
      toast.error('No se pudieron guardar los ajustes. Inténtalo de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  // Restablecer colores por defecto
  const handleRestablecer = () => {
    setColorPrimario(THEME_DEFAULT.primary);
    setColorSecundario(THEME_DEFAULT.dark);
    aplicarTema(THEME_DEFAULT.primary, THEME_DEFAULT.dark);
    toast.info('Se han restablecido los colores por defecto. Haz clic en Guardar para conservarlos.');
  };

  return (
    <div className="ajustes-container">
      {/* Encabezado */}
      <div className="ajustes-header">
        <div>
          <h1 className="ajustes-title">Personalización y Ajustes</h1>
          <p className="ajustes-subtitle">
            Configura la identidad de marca, el logotipo de tu club y la paleta de colores de toda la aplicación.
          </p>
        </div>

        <div className="ajustes-header-actions">
          <button 
            type="button" 
            className="btn-secondary ajustes-btn-reset" 
            onClick={handleRestablecer}
            disabled={guardando}
            title="Volver a los colores originales de VentusApp"
          >
            <RotateCcw size={16} />
            <span>Restablecer</span>
          </button>
          
          <button 
            type="button" 
            className="btn-primary ajustes-btn-save" 
            onClick={handleGuardar}
            disabled={guardando}
          >
            <Save size={16} />
            <span>{guardando ? 'Guardando...' : 'Guardar Cambios'}</span>
          </button>
        </div>
      </div>

      <div className="ajustes-grid">
        {/* Columna Izquierda: Logo e Información del Club */}
        <div className="ajustes-col">
          <div className="card ajustes-card">
            <div className="ajustes-card-header">
              <div className="ajustes-card-icon">
                <Building2 size={20} />
              </div>
              <div>
                <h2>Logotipo del Club / Gimnasio</h2>
                <p>Este logo sustituirá a la marca por defecto en el menú lateral y cabeceras internas.</p>
              </div>
            </div>

            <div className="ajustes-logo-section">
              <ImagePicker
                value={logoUrl}
                onChange={setLogoUrl}
                shape="rounded"
                size={84}
                label="Subir Nuevo Logotipo"
                changeLabel="Cambiar Logotipo"
                placeholderIcon="image"
                hint="Se recomienda formato PNG con fondo transparente o JPG. Tamaño optimizado automáticamente."
              />

              {logoUrl && (
                <div className="ajustes-logo-preview-box">
                  <span className="ajustes-badge-label">Vista previa en menú lateral:</span>
                  <div className="ajustes-sidebar-preview-mockup">
                    <img src={logoUrl} alt="Logo Club" className="ajustes-mockup-logo" />
                    <span className="ajustes-mockup-gymname">{gimnasio?.nombre || 'Mi Gimnasio'}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="ajustes-info-box">
              <HelpCircle size={18} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--text-muted)' }} />
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                <strong>Privacidad de Marca:</strong> La pantalla pública de acceso (login) mantiene la marca neutral de VentusApp para proteger la confidencialidad de cada club. Una vez inicias sesión, la app adoptará tu logo y colores.
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Selector de Colores */}
        <div className="ajustes-col">
          <div className="card ajustes-card">
            <div className="ajustes-card-header">
              <div className="ajustes-card-icon">
                <Palette size={20} />
              </div>
              <div>
                <h2>Paleta de Colores de la Aplicación</h2>
                <p>Elige una paleta prediseñada o personaliza tu color exacto de marca corporativa.</p>
              </div>
            </div>

            {/* Presets Rápidos */}
            <div className="ajustes-section-block">
              <label className="ajustes-label">
                <Sparkles size={15} />
                Paletas Rápidas Recomendadas
              </label>
              
              <div className="ajustes-presets-grid">
                {TEMAS_PREDEFINIDOS.map((preset) => {
                  const isSelected = colorPrimario.toLowerCase() === preset.primary.toLowerCase();
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      className={`ajustes-preset-card ${isSelected ? 'active' : ''}`}
                      onClick={() => handleSelectPreset(preset)}
                    >
                      <div 
                        className="ajustes-preset-color-circle" 
                        style={{ backgroundColor: preset.primary }}
                      >
                        {isSelected && <Check size={14} color="#ffffff" strokeWidth={3} />}
                      </div>
                      <span className="ajustes-preset-title">{preset.nombre}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selector de Color Personalizado */}
            <div className="ajustes-section-block">
              <label className="ajustes-label">
                <Sliders size={15} />
                Color Personalizado (Código HEX)
              </label>

              <div className="ajustes-color-picker-row">
                <div className="ajustes-color-swatch-wrapper">
                  <input
                    type="color"
                    className="ajustes-native-color-picker"
                    value={colorPrimario}
                    onChange={(e) => handleColorPrimarioChange(e.target.value)}
                    title="Haz clic para abrir el selector de color"
                  />
                  <div 
                    className="ajustes-color-swatch-display" 
                    style={{ backgroundColor: colorPrimario }} 
                  />
                </div>

                <div className="ajustes-hex-input-wrapper">
                  <span className="ajustes-hex-prefix">#</span>
                  <input
                    type="text"
                    className="ajustes-hex-input"
                    value={colorPrimario.replace('#', '')}
                    maxLength={7}
                    onChange={(e) => {
                      const val = '#' + e.target.value.replace(/[^0-9A-Fa-f]/g, '');
                      setColorPrimario(val);
                      if (val.length === 7) {
                        const dark = oscurecerColor(val, 15);
                        setColorSecundario(dark);
                        aplicarTema(val, dark);
                      }
                    }}
                    placeholder="22c55e"
                  />
                </div>

                <div className="ajustes-shade-preview">
                  <span className="ajustes-shade-label">Tono Contraste/Hover:</span>
                  <div 
                    className="ajustes-shade-box" 
                    style={{ backgroundColor: colorSecundario }} 
                    title={`Color oscuro automático: ${colorSecundario}`}
                  >
                    <span>{colorSecundario}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Muestra en Vivo de Componentes */}
            <div className="ajustes-section-block">
              <label className="ajustes-label">
                <Layers size={15} />
                Previsualización en Vivo de Componentes
              </label>

              <div className="ajustes-live-preview-box">
                <div className="ajustes-preview-row">
                  <button type="button" className="btn-primary" style={{ pointerEvents: 'none' }}>
                    Botón Principal
                  </button>
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    style={{ 
                      pointerEvents: 'none',
                      borderColor: 'var(--primary-color)',
                      color: 'var(--primary-color)' 
                    }}
                  >
                    Botón Secundario
                  </button>
                  <span 
                    className="ajustes-preview-badge"
                    style={{
                      background: 'rgba(var(--primary-rgb, 34, 197, 94), 0.15)',
                      color: 'var(--primary-color)',
                      border: '1px solid rgba(var(--primary-rgb, 34, 197, 94), 0.3)'
                    }}
                  >
                    <CheckCircle2 size={13} />
                    Insignia de Cuota Pagada
                  </span>
                </div>

                <div className="ajustes-preview-sidebar-item" style={{ backgroundColor: 'var(--primary-dark)' }}>
                  <ShieldCheck size={18} />
                  <span>Módulo Activo en Menú</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Ajustes;

