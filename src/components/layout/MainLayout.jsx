import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { 
  Home, Users, BookOpen, CreditCard, Receipt, Medal, Package, 
  ShieldCheck, Download, Upload, CheckCircle, AlertTriangle 
} from 'lucide-react';
import Modal from '../ui/Modal';
import { exportarCopiaSeguridad, restaurarCopiaSeguridad } from '../../utils/backup';

const MainLayout = () => {
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [candidateBackup, setCandidateBackup] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleExport = async () => {
    setIsProcessing(true);
    setMensaje(null);
    try {
      const res = await exportarCopiaSeguridad();
      if (res.exito) {
        setMensaje({ 
          tipo: 'success', 
          texto: res.metodo === 'share' 
            ? 'Copia guardada / compartida correctamente.' 
            : `Copia descargada (${res.filename}). Se guarda en la app Archivos de tu iPad.` 
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
        texto: `¡Restauración completada con éxito! (${stats.alumnos} alumnos, ${stats.grupos} grupos, ${stats.pagos} pagos).` 
      });
    } catch (err) {
      console.error(err);
      setMensaje({ tipo: 'error', texto: 'Error al restaurar los datos.' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="layout-container">
      <nav className="sidebar">
        <div className="sidebar-header">
          Ventus App
        </div>
        <div className="sidebar-nav">
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Home size={20} />
            <span className="nav-text">Dashboard</span>
          </NavLink>
          <NavLink to="/cobros" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <CreditCard size={20} />
            <span className="nav-text">Cuotas</span>
          </NavLink>
          <NavLink to="/examenes" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Medal size={20} />
            <span className="nav-text">Exámenes</span>
          </NavLink>
          <NavLink to="/equipamiento" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Package size={20} />
            <span className="nav-text">Equipamiento</span>
          </NavLink>
          <NavLink to="/alumnos" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Users size={20} />
            <span className="nav-text">Alumnos</span>
          </NavLink>
          <NavLink to="/grupos" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <BookOpen size={20} />
            <span className="nav-text">Grupos</span>
          </NavLink>
          <NavLink to="/gastos" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Receipt size={20} />
            <span className="nav-text">Gastos</span>
          </NavLink>
        </div>

        {/* Pie discreto para copias de seguridad */}
        <div className="sidebar-footer">
          <button 
            type="button" 
            className="sidebar-backup-btn" 
            onClick={() => {
              setMensaje(null);
              setCandidateBackup(null);
              setIsBackupModalOpen(true);
            }}
            title="Copia de seguridad y datos"
          >
            <ShieldCheck size={18} />
            <span>Copia de seguridad</span>
          </button>
        </div>
      </nav>

      <main className="main-content">
        <Outlet />
      </main>

      {/* Modal discreto y orgánico para descargar / restaurar */}
      <Modal 
        isOpen={isBackupModalOpen} 
        onClose={() => {
          setIsBackupModalOpen(false);
          setCandidateBackup(null);
        }} 
        title="Copia de Seguridad"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5 }}>
            Exporta o restaura toda la información (alumnos, grupos, pagos, gastos y categorías) en un archivo <strong>.json</strong>. En iPad se guarda y lee desde la app <strong>Archivos / iCloud</strong>.
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
                style={{ padding: '0.75rem 1rem', fontSize: '0.95rem' }}
                onClick={handleExport}
                disabled={isProcessing}
              >
                <Download size={18} style={{ marginRight: '8px' }} />
                {isProcessing ? 'Descargando...' : 'Descargar Copia de Seguridad'}
              </button>

              <label 
                className="btn-secondary flex-center" 
                style={{ padding: '0.75rem 1rem', fontSize: '0.95rem', cursor: 'pointer', textAlign: 'center' }}
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
            <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <strong style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-color)' }}>
                Archivo cargado con éxito:
              </strong>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                • Alumnos: {candidateBackup.data?.alumnos?.length || 0}<br />
                • Grupos: {candidateBackup.data?.grupos?.length || 0}<br />
                • Pagos y cuotas: {candidateBackup.data?.pagos?.length || 0}<br />
                • Gastos: {candidateBackup.data?.gastos?.length || 0}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button 
                  type="button" 
                  className="btn-primary" 
                  style={{ padding: '0.65rem' }}
                  onClick={() => handleRestore('reemplazar')}
                  disabled={isProcessing}
                >
                  Reemplazar todo (Copia idéntica)
                </button>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  style={{ padding: '0.65rem' }}
                  onClick={() => handleRestore('fusionar')}
                  disabled={isProcessing}
                >
                  Fusionar datos (Conservar actuales)
                </button>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  style={{ padding: '0.5rem', background: 'transparent' }}
                  onClick={() => setCandidateBackup(null)}
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
