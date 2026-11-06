import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Building2, 
  User, 
  Mail, 
  Lock, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles,
  Upload
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { VentusIcon } from '../components/common/VentusLogo';
import ImagePicker from '../components/common/ImagePicker';
import { restablecerTemaPorDefecto } from '../utils/theme';
import './Auth.css';

const Auth = () => {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [nombreGimnasio, setNombreGimnasio] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { login, register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // En la vista pública de Auth, garantizar siempre el tema neutral por defecto de VentusApp
  useEffect(() => {
    restablecerTemaPorDefecto();
  }, []);

  // Si ya está autenticado, redirigir a la ruta previa o a /dashboard
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      if (mode === 'login') {
        if (!email || !password) {
          throw new Error('Por favor, introduce tu email y contraseña.');
        }
        await login(email, password);
        const from = location.state?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      } else {
        if (!nombreGimnasio.trim()) {
          throw new Error('Debes indicar el nombre de tu gimnasio o club.');
        }
        if (!nombre.trim()) {
          throw new Error('Indica tu nombre.');
        }
        if (password.length < 6) {
          throw new Error('La contraseña debe tener al menos 6 caracteres.');
        }

        const res = await register({
          email,
          password,
          nombre,
          nombreGimnasio,
          logoUrl
        });

        // Si Supabase requiere verificación de correo electrónico
        if (res?.user && !res?.session) {
          setSuccessMsg(
            '¡Cuenta creada con éxito! Hemos enviado un enlace de confirmación a tu correo. Por favor revísalo para acceder.'
          );
          setMode('login');
        }
      }
    } catch (err) {
      console.error('Error de autenticación:', err);
      let mensaje = err.message || 'Ha ocurrido un error inesperado.';
      if (mensaje.includes('Invalid login credentials')) {
        mensaje = 'Correo electrónico o contraseña incorrectos.';
      } else if (mensaje.includes('User already registered')) {
        mensaje = 'Ya existe una cuenta con este correo electrónico.';
      } else if (mensaje.includes('Password should be at least')) {
        mensaje = 'La contraseña debe tener al menos 6 caracteres.';
      }
      setErrorMsg(mensaje);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo-wrapper">
            <VentusIcon size={64} />
          </div>
          <h1 className="auth-title">
            {mode === 'login' ? 'Bienvenido a VentusApp' : 'Crea tu Gimnasio en VentusApp'}
          </h1>
          <p className="auth-subtitle">
            {mode === 'login'
              ? 'Gestión integral para gimnasios, clubes y centros deportivos'
              : 'Empieza tu prueba gratuita de 14 días. Sin tarjeta de crédito.'}
          </p>
        </div>

        {/* Pestañas de Login / Registro */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => {
              setMode('login');
              setErrorMsg(null);
            }}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'register' ? 'active' : ''}`}
            onClick={() => {
              setMode('register');
              setErrorMsg(null);
            }}
          >
            Registrar Gimnasio
          </button>
        </div>

        {/* Alertas */}
        {errorMsg && (
          <div className="auth-alert error">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="auth-alert success">
            <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{successMsg}</span>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <div className="auth-field">
                <label htmlFor="nombreGimnasio">
                  <Building2 size={15} />
                  Nombre del Gimnasio o Club
                </label>
                <div className="auth-input-wrapper">
                  <Building2 size={18} className="auth-input-icon" />
                  <input
                    id="nombreGimnasio"
                    type="text"
                    className="auth-input"
                    placeholder="Ej. Club Deportivo Olimpo"
                    value={nombreGimnasio}
                    onChange={(e) => setNombreGimnasio(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="nombreUsuario">
                  <User size={15} />
                  Tu Nombre
                </label>
                <div className="auth-input-wrapper">
                  <User size={18} className="auth-input-icon" />
                  <input
                    id="nombreUsuario"
                    type="text"
                    className="auth-input"
                    placeholder="Ej. Juan Pérez"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="auth-field" style={{ marginTop: '0.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                  <Sparkles size={15} />
                  Logo de tu Gimnasio o Club (Opcional)
                </label>
                <ImagePicker
                  value={logoUrl}
                  onChange={setLogoUrl}
                  shape="rounded"
                  size={60}
                  label="Subir Logo del Club"
                  changeLabel="Cambiar Logo"
                  placeholderIcon="image"
                  hint="PNG o JPG. Podrás cambiarlo o ajustarlo en cualquier momento."
                />
              </div>
            </>
          )}

          <div className="auth-field">
            <label htmlFor="email">
              <Mail size={15} />
              Correo Electrónico
            </label>
            <div className="auth-input-wrapper">
              <Mail size={18} className="auth-input-icon" />
              <input
                id="email"
                type="email"
                className="auth-input"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="password">
              <Lock size={15} />
              Contraseña
            </label>
            <div className="auth-input-wrapper">
              <Lock size={18} className="auth-input-icon" />
              <input
                id="password"
                type="password"
                className="auth-input"
                placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={submitting}
          >
            {submitting ? (
              'Procesando...'
            ) : mode === 'login' ? (
              <>
                Entrar a mi gimnasio
                <ArrowRight size={18} />
              </>
            ) : (
              <>
                Crear Gimnasio y Comenzar
                <Sparkles size={18} />
              </>
            )}
          </button>
        </form>

        {/* Ventajas para SaaS */}
        <div className="auth-perks">
          <div className="auth-perk-item">
            <ShieldCheck size={16} />
            <span>Datos 100% seguros y respaldados para tu club</span>
          </div>
          <div className="auth-perk-item">
            <CheckCircle2 size={16} />
            <span>Gestión de cuotas, alumnos, asistencias y gastos en un solo lugar</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;

