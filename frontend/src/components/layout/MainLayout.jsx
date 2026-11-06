import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  Home, Users, BookOpen, CreditCard, Receipt, Medal, Package, IdCard,
  ShieldCheck, Download, Upload, CheckCircle, AlertTriangle, LogOut, Building2,
  Settings, Menu, X, MoreHorizontal
} from 'lucide-react';
import Modal from '../ui/Modal';
import { exportarCopiaSeguridad, restaurarCopiaSeguridad } from '../../utils/backup';
import { useAuth } from '../../context/AuthContext';
import { VentusIcon } from '../common/VentusLogo';

const MainLayout = () => {
  const { user, perfil, gimnasio, logout } = useAuth();
  const navigate = useNavigate();
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [candidateBackup, setCandidateBackup] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    setIsMobileMenuOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  const handleExport = async () => {
    setIsProcessing(true);
    setMensaje(null);
    try {
      const res = await exportarCopiaSeguridad();
      if (res?.exito) {
        setMensaje({ 
          tipo: 'success', 
          texto: res.metodo === 'share' 
            ? 'Copia guardada / compartida correctamente.' 
            : `Copia descargada (${res.filename}). Se guarda en tus Descargas o iCloud.` 
        });
      }
    } catch (err) {
      console.error(err);
      setMensaje({ tipo: 'error', texto: 'Error al exportar los datos.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!parsed.data) {
          throw new Error('Archivo de copia no válido.');
        }
        setCandidateBackup(parsed);
        setMensaje(null);
      } catch (err) {
        setMensaje({ tipo: 'error', texto: err.message || 'Error al leer el archivo.' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleRestore = async (modo = 'reemplazar') => {
    if (!candidateBackup) return;
    setIsProcessing(true);
    setMensaje(null);
    try {
      const stats = await restaurarCopiaSeguridad(candidateBackup, modo);
      setCandidateBackup(null);
      setMensaje({ 
        tipo: 'success', 
        texto: `¡Restauración completada con éxito! (${stats.alumnos} alumnos, ${stats.grupos} grupos, ${stats.pagos} cobros/cuotas, ${stats.gastos} gastos y ${stats.productos || 0} productos de equipamiento).` 
      });
    } catch (err) {
      console.error(err);
      setMensaje({ tipo: 'error', texto: 'Error al restaurar los datos.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const openBackupModal = () => {
    setMensaje(null);
    setCandidateBackup(null);
    setIsBackupModalOpen(true);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="layout-container">
      {/* HEADER SUPERIOR PARA MÓVILES (< 768px) */}
      <header className="mobile-header">
        <div className="mobile-header-brand">
          {gimnasio?.logo_url ? (
            <img src={gimnasio.logo_url} alt={gimnasio.nombre || 'Logo'} className="mobile-header-logo" />
          ) : (
            <VentusIcon size={30} />
          )}
          <span className="mobile-header-gymname">{gimnasio?.nombre || 'VentusApp'}</span>
        </div>

        <button 
          type="button" 
          className="mobile-header-btn" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* OVERLAY Y DRAWER MÓVIL */}
      {isMobileMenuOpen && (
        <div 
          className="mobile-drawer-overlay" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className={`mobile-drawer ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {gimnasio?.logo_url ? (
              <img src={gimnasio.logo_url} alt="Logo" style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'contain' }} />
            ) : (
              <VentusIcon size={32} />
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-light)' }}>
                {gimnasio?.nombre || 'VentusApp'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--primary-color)' }}>
                Gestión de Club
              </div>
            </div>
          </div>
          <button 
            type="button" 
            className="mobile-header-btn" 
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="mobile-drawer-nav">
          <NavLink to="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Home size={20} />
            <span className="nav-text">Dashboard</span>
          </NavLink>
          <NavLink to="/cobros" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <CreditCard size={20} />
            <span className="nav-text">Cuotas y Cobros</span>
          </NavLink>
          <NavLink to="/examenes" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Medal size={20} />
            <span className="nav-text">Exámenes y Grados</span>
          </NavLink>
          <NavLink to="/equipamiento" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Package size={20} />
            <span className="nav-text">Equipamiento y Material</span>
          </NavLink>
          <NavLink to="/licencias" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <IdCard size={20} />
            <span className="nav-text">Licencias Federativas</span>
          </NavLink>
          <NavLink to="/alumnos" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Users size={20} />
            <span className="nav-text">Alumnos</span>
          </NavLink>
          <NavLink to="/grupos" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <BookOpen size={20} />
            <span className="nav-text">Grupos y Clases</span>
          </NavLink>
          <NavLink to="/gastos" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Receipt size={20} />
            <span className="nav-text">Gastos</span>
          </NavLink>
          <NavLink to="/ajustes" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Settings size={20} />
            <span className="nav-text">Ajustes y Marca</span>
          </NavLink>
        </div>

        <div className="mobile-drawer-footer">
          <button 
            type="button" 
            className="sidebar-backup-btn" 
            onClick={openBackupModal}
          >
            <ShieldCheck size={18} />
            <span>Copia de seguridad</span>
          </button>

          {user && (
            <div className="user-profile-widget">
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="user-profile-name">
                  {perfil?.nombre || user.email?.split('@')[0]}
                </div>
                <div className="user-profile-role">
                  {perfil?.rol || 'Administrador'}
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="btn-logout"
                title="Cerrar sesión"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* SIDEBAR PARA TABLET Y DESKTOP (>= 768px) */}
      <nav className="sidebar">
        <div className="sidebar-header" style={{ flexDirection: 'column', gap: '0.75rem', paddingBottom: '1rem' }}>
          {gimnasio?.logo_url ? (
            <img src={gimnasio.logo_url} alt={gimnasio.nombre || 'Logo'} className="sidebar-logo" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
              <VentusIcon size={46} />
            </div>
          )}
          {gimnasio && (
            <div className="sidebar-gym-badge">
              <Building2 size={13} style={{ flexShrink: 0 }} />
              <span className="sidebar-gym-name">
                {gimnasio.nombre}
              </span>
            </div>
          )}
        </div>

        <div className="sidebar-nav">
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} title="Dashboard">
            <Home size={20} />
            <span className="nav-text">Dashboard</span>
          </NavLink>
          <NavLink to="/cobros" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} title="Cuotas">
            <CreditCard size={20} />
            <span className="nav-text">Cuotas</span>
          </NavLink>
          <NavLink to="/examenes" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} title="Exámenes">
            <Medal size={20} />
            <span className="nav-text">Exámenes</span>
          </NavLink>
          <NavLink to="/equipamiento" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} title="Equipamiento">
            <Package size={20} />
            <span className="nav-text">Equipamiento</span>
          </NavLink>
          <NavLink to="/licencias" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} title="Licencias">
            <IdCard size={20} />
            <span className="nav-text">Licencias</span>
          </NavLink>
          <NavLink to="/alumnos" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} title="Alumnos">
            <Users size={20} />
            <span className="nav-text">Alumnos</span>
          </NavLink>
          <NavLink to="/grupos" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} title="Grupos">
            <BookOpen size={20} />
            <span className="nav-text">Grupos</span>
          </NavLink>
          <NavLink to="/gastos" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} title="Gastos">
            <Receipt size={20} />
            <span className="nav-text">Gastos</span>
          </NavLink>
          <NavLink to="/ajustes" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} title="Ajustes">
            <Settings size={20} />
            <span className="nav-text">Ajustes</span>
          </NavLink>
        </div>

        {/* Pie con usuario, logout y copia de seguridad */}
        <div className="sidebar-footer">
          <button 
            type="button" 
            className="sidebar-backup-btn" 
            onClick={openBackupModal}
            title="Copia de seguridad y datos"
          >
            <ShieldCheck size={18} />
            <span>Copia de seguridad</span>
          </button>

          {user && (
            <div className="user-profile-widget">
              <div style={{ minWidth: 0, flex: 1, paddingRight: '0.5rem' }}>
                <div className="user-profile-name">
                  {perfil?.nombre || user.email?.split('@')[0]}
                </div>
                <div className="user-profile-role">
                  {perfil?.rol || 'Administrador'}
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="btn-logout"
                title="Cerrar sesión"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* CONTENIDO PRINCIPAL */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* BARRA INFERIOR RÁPIDA PARA MÓVILES (< 768px) */}
      <nav className="mobile-bottom-nav">
        <NavLink to="/dashboard" className={({ isActive }) => `mobile-bottom-item ${isActive ? 'active' : ''}`}>
          <Home size={20} />
          <span>Inicio</span>
        </NavLink>
        <NavLink to="/cobros" className={({ isActive }) => `mobile-bottom-item ${isActive ? 'active' : ''}`}>
          <CreditCard size={20} />
          <span>Cuotas</span>
        </NavLink>
        <NavLink to="/alumnos" className={({ isActive }) => `mobile-bottom-item ${isActive ? 'active' : ''}`}>
          <Users size={20} />
          <span>Alumnos</span>
        </NavLink>
        <NavLink to="/gastos" className={({ isActive }) => `mobile-bottom-item ${isActive ? 'active' : ''}`}>
          <Receipt size={20} />
          <span>Gastos</span>
        </NavLink>
        <button 
          type="button" 
          className="mobile-bottom-item"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <MoreHorizontal size={20} />
          <span>Más</span>
        </button>
      </nav>

      {/* Modal para descargar / restaurar copia de seguridad */}
      <Modal 
        isOpen={isBackupModalOpen} 
        onClose={() => {
          setIsBackupModalOpen(false);
          setCandidateBackup(null);
        }} 
        title="Copia de Seguridad Cloud"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5 }}>
            Exporta o restaura toda la información de tu club (alumnos, grupos, cuotas, gastos, equipamiento y configuración de marca) en un archivo <strong>.json seguro</strong>. Es compatible tanto con tablets iPad/Android como con teléfonos y ordenadores.
          </p>

          {mensaje && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              background: mensaje.tipo === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${mensaje.tipo === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              color: mensaje.tipo === 'success' ? '#4ade80' : '#f87171'
            }}>
              {mensaje.tipo === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
              <span>{mensaje.texto}</span>
            </div>
          )}

          {!candidateBackup ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button 
                type="button" 
                className="btn-primary flex-center" 
                style={{ padding: '0.85rem 1rem', fontSize: '0.95rem' }}
                onClick={handleExport}
                disabled={isProcessing}
              >
                <Download size={18} style={{ marginRight: '8px' }} />
                {isProcessing ? 'Generando copia...' : 'Exportar Copia de Seguridad'}
              </button>

              <label 
                className="btn-secondary flex-center" 
                style={{ padding: '0.85rem 1rem', fontSize: '0.95rem', cursor: 'pointer', textAlign: 'center' }}
              >
                <Upload size={18} style={{ marginRight: '8px' }} />
                Restaurar desde archivo (.json)
                <input 
                  type="file" 
                  accept=".json,application/json" 
                  style={{ display: 'none' }} 
                  onChange={handleFileChange} 
                />
              </label>
            </div>
          ) : (
            <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <strong style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-color)' }}>
                Archivo cargado con éxito:
              </strong>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
                • Alumnos: {candidateBackup.data?.alumnos?.length || 0}<br />
                • Grupos: {candidateBackup.data?.grupos?.length || 0}<br />
                • Cobros y cuotas: {candidateBackup.data?.pagos?.length || 0}<br />
                • Gastos: {candidateBackup.data?.gastos?.length || 0}<br />
                • Catálogo de equipamiento: {candidateBackup.data?.productos?.length || 0}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <button 
                  type="button" 
                  className="btn-primary" 
                  style={{ padding: '0.75rem' }}
                  onClick={() => handleRestore('reemplazar')}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Restaurando...' : 'Reemplazar todo (Copia completa)'}
                </button>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  style={{ padding: '0.75rem' }}
                  onClick={() => handleRestore('fusionar')}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Fusionando...' : 'Fusionar datos (Conservar actuales)'}
                </button>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  style={{ padding: '0.6rem', background: 'transparent' }}
                  onClick={() => setCandidateBackup(null)}
                  disabled={isProcessing}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default MainLayout;
