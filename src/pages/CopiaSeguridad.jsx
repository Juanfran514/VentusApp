import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import Modal from '../components/ui/Modal';
import { 
  Download, Upload, ShieldCheck, HardDrive, 
  Smartphone, CheckCircle, AlertTriangle, RefreshCw, Share2 
} from 'lucide-react';
import './CopiaSeguridad.css';
import './Alumnos.css';

const CopiaSeguridad = () => {
  const [isPersisted, setIsPersisted] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [restoreCandidate, setRestoreCandidate] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Estadísticas actuales de la base de datos
  const totalAlumnos = useLiveQuery(() => db.alumnos.count(), []);
  const totalGrupos = useLiveQuery(() => db.grupos.count(), []);
  const totalPagos = useLiveQuery(() => db.pagos.count(), []);
  const totalGastos = useLiveQuery(() => db.gastos.count(), []);

  // Comprobar si el navegador tiene activado almacenamiento persistente
  useEffect(() => {
    const checkPersistence = async () => {
      if (navigator.storage && navigator.storage.persisted) {
        const persisted = await navigator.storage.persisted();
        setIsPersisted(persisted);
      }
    };
    checkPersistence();
  }, []);

  // Solicitar almacenamiento persistente para evitar borrados automáticos
  const handleRequestPersistence = async () => {
    if (navigator.storage && navigator.storage.persist) {
      try {
        const granted = await navigator.storage.persist();
        setIsPersisted(granted);
        if (granted) {
          setMensaje({ tipo: 'success', texto: '¡Almacenamiento persistente activado! Safari y el iPad no borrarán tus datos para liberar espacio.' });
        } else {
          setMensaje({ tipo: 'error', texto: 'El navegador no concedió persistencia permanente. Recuerda hacer copias de seguridad periódicas.' });
        }
      } catch (err) {
        console.error('Error solicitando persistencia:', err);
      }
    }
  };

  // Crear y descargar/compartir copia de seguridad
  const handleExportBackup = async () => {
    setIsProcessing(true);
    setMensaje(null);
    try {
      const alumnos = await db.alumnos.toArray();
      const grupos = await db.grupos.toArray();
      const pagos = await db.pagos.toArray();
      const gastos = await db.gastos.toArray();

      const categoriasGastos = localStorage.getItem('ventus_cat_gastos');
      const categoriasGrupos = localStorage.getItem('ventus_cat_grupos');
      const categoriasMaterial = localStorage.getItem('ventus_cat_material');

      const backupData = {
        app: 'VentusApp',
        version: 1,
        fecha: new Date().toISOString(),
        data: {
          alumnos,
          grupos,
          pagos,
          gastos,
          categorias: {
            gastos: categoriasGastos ? JSON.parse(categoriasGastos) : [],
            grupos: categoriasGrupos ? JSON.parse(categoriasGrupos) : [],
            material: categoriasMaterial ? JSON.parse(categoriasMaterial) : []
          }
        }
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const datePart = new Date().toISOString().split('T')[0];
      const filename = `copia_seguridad_ventus_${datePart}.json`;
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const file = new File([blob], filename, { type: 'application/json' });

      // Si el iPad soporta Web Share con archivos (AirDrop, Guardar en Archivos, Mail...)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: filename,
            text: 'Copia de seguridad de Ventus App'
          });
          setMensaje({ tipo: 'success', texto: 'Copia de seguridad guardada / compartida correctamente.' });
          setIsProcessing(false);
          return;
        } catch (shareErr) {
          if (shareErr.name === 'AbortError') {
            setIsProcessing(false);
            return; // Cancelado por el usuario
          }
        }
      }

      // Descarga habitual (en iPad se guarda en la app Archivos -> carpeta Descargas)
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMensaje({ 
        tipo: 'success', 
        texto: `Copia descargada como "${filename}". En iPad se guarda automáticamente en la app Archivos (carpeta Descargas o iCloud Drive).` 
      });
    } catch (err) {
      console.error('Error al exportar:', err);
      setMensaje({ tipo: 'error', texto: 'Hubo un error al generar la copia de seguridad.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Cargar archivo para restaurar
  const handleFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!parsed.data || (!parsed.data.alumnos && !parsed.data.grupos && !parsed.data.pagos)) {
          throw new Error('El archivo seleccionado no es una copia de seguridad válida de VentusApp.');
        }
        setRestoreCandidate(parsed);
        setIsConfirmModalOpen(true);
      } catch (err) {
        setMensaje({ tipo: 'error', texto: err.message || 'Error al leer el archivo de copia de seguridad.' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Ejecutar restauración en la base de datos
  const handleExecuteRestore = async (modo = 'reemplazar') => {
    if (!restoreCandidate?.data) return;
    setIsProcessing(true);
    setMensaje(null);

    try {
      const { alumnos = [], grupos = [], pagos = [], gastos = [], categorias = {} } = restoreCandidate.data;

      if (modo === 'reemplazar') {
        await db.transaction('rw', [db.alumnos, db.grupos, db.pagos, db.gastos], async () => {
          await db.alumnos.clear();
          await db.grupos.clear();
          await db.pagos.clear();
          await db.gastos.clear();

          if (alumnos.length) await db.alumnos.bulkAdd(alumnos);
          if (grupos.length) await db.grupos.bulkAdd(grupos);
          if (pagos.length) await db.pagos.bulkAdd(pagos);
          if (gastos.length) await db.gastos.bulkAdd(gastos);
        });
      } else {
        // Modo fusionar / combinar
        await db.transaction('rw', [db.alumnos, db.grupos, db.pagos, db.gastos], async () => {
          if (alumnos.length) await db.alumnos.bulkPut(alumnos);
          if (grupos.length) await db.grupos.bulkPut(grupos);
          if (pagos.length) await db.pagos.bulkPut(pagos);
          if (gastos.length) await db.gastos.bulkPut(gastos);
        });
      }

      // Restaurar categorías personalizadas en localStorage
      if (categorias?.gastos && Array.isArray(categorias.gastos)) {
        localStorage.setItem('ventus_cat_gastos', JSON.stringify(categorias.gastos));
      }
      if (categorias?.grupos && Array.isArray(categorias.grupos)) {
        localStorage.setItem('ventus_cat_grupos', JSON.stringify(categorias.grupos));
      }
      if (categorias?.material && Array.isArray(categorias.material)) {
        localStorage.setItem('ventus_cat_material', JSON.stringify(categorias.material));
      }

      setIsConfirmModalOpen(false);
      setRestoreCandidate(null);
      setMensaje({ 
        tipo: 'success', 
        texto: `¡Restauración completada con éxito (${modo === 'reemplazar' ? 'reemplazo total' : 'fusión de datos'})!` 
      });
    } catch (err) {
      console.error('Error restaurando copia:', err);
      setMensaje({ tipo: 'error', texto: 'Hubo un error al restaurar los datos en la base de datos.' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="page-container copia-container">
      <div className="page-header">
        <div>
          <h1>Copia de Seguridad y Datos</h1>
          <p className="text-muted">Protege, exporta y restaura toda la información de tu academia</p>
        </div>
      </div>

      {mensaje && (
        <div className={`alert-message ${mensaje.tipo === 'success' ? 'alert-success' : 'alert-error'}`}>
          {mensaje.tipo === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          <span>{mensaje.texto}</span>
        </div>
      )}

      {/* Tarjeta de estado actual */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <HardDrive size={24} style={{ color: 'var(--primary-color)' }} />
            <div>
              <strong style={{ fontSize: '1.1rem' }}>Estado de la Base de Datos Local</strong>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {isPersisted ? (
                  <span style={{ color: '#4ade80', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <ShieldCheck size={16} /> Almacenamiento protegido contra borrado automático
                  </span>
                ) : (
                  <span style={{ color: '#fbbf24', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <AlertTriangle size={16} /> Almacenamiento estándar
                  </span>
                )}
              </div>
            </div>
          </div>

          {!isPersisted && (
            <button className="btn-secondary flex-center" onClick={handleRequestPersistence} style={{ padding: '0.5rem 1rem' }}>
              <ShieldCheck size={18} style={{ marginRight: '6px' }} />
              Blindar Almacenamiento en iPad
            </button>
          )}
        </div>

        <div className="copia-stats-grid">
          <div className="copia-stat-box">
            <div className="copia-stat-number">{totalAlumnos ?? '-'}</div>
            <div className="copia-stat-label">Alumnos</div>
          </div>
          <div className="copia-stat-box">
            <div className="copia-stat-number">{totalGrupos ?? '-'}</div>
            <div className="copia-stat-label">Grupos</div>
          </div>
          <div className="copia-stat-box">
            <div className="copia-stat-number">{totalPagos ?? '-'}</div>
            <div className="copia-stat-label">Pagos y Cuotas</div>
          </div>
          <div className="copia-stat-box">
            <div className="copia-stat-number">{totalGastos ?? '-'}</div>
            <div className="copia-stat-label">Gastos</div>
          </div>
        </div>
      </div>

      {/* Grid de Crear Copia y Restaurar Copia */}
      <div className="copia-grid">
        {/* Crear copia */}
        <div className="copia-card">
          <div>
            <div className="copia-card-header">
              <div className="copia-icon-wrapper">
                <Download size={24} />
              </div>
              <div>
                <h2>Crear Copia de Seguridad</h2>
                <span className="text-muted" style={{ fontSize: '0.85rem' }}>Descargar o Guardar en Archivos / iCloud</span>
              </div>
            </div>
            <p>
              Genera un archivo seguro <strong>.json</strong> que contiene absolutamente todos los alumnos, 
              grupos, tarifas, historial de pagos, exámenes, equipamiento y gastos.
            </p>
          </div>

          <button 
            className="btn-primary flex-center" 
            style={{ width: '100%', padding: '0.85rem', fontSize: '1rem' }}
            onClick={handleExportBackup}
            disabled={isProcessing}
          >
            <Share2 size={20} style={{ marginRight: '8px' }} />
            {isProcessing ? 'Generando copia...' : 'Guardar Copia de Seguridad'}
          </button>
        </div>

        {/* Restaurar copia */}
        <div className="copia-card">
          <div>
            <div className="copia-card-header">
              <div className="copia-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                <Upload size={24} />
              </div>
              <div>
                <h2>Restaurar Copia</h2>
                <span className="text-muted" style={{ fontSize: '0.85rem' }}>Cargar archivo .json desde tu iPad</span>
              </div>
            </div>
            <p>
              Recupera tus datos seleccionando un archivo de copia anterior desde la app <strong>Archivos</strong> de tu iPad Pro o iCloud.
            </p>
          </div>

          <label 
            className="btn-secondary flex-center" 
            style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', cursor: 'pointer', textAlign: 'center' }}
          >
            <Upload size={20} style={{ marginRight: '8px' }} />
            Seleccionar Archivo de Copia
            <input 
              type="file" 
              accept=".json,application/json" 
              style={{ display: 'none' }} 
              onChange={handleFileSelected} 
            />
          </label>
        </div>
      </div>

      {/* Guía iPad Pro */}
      <div className="ipad-tip-card">
        <div className="ipad-tip-header">
          <Smartphone size={22} />
          <span>Cómo usar VentusApp como App Nativa en iPad Pro</span>
        </div>
        <p style={{ margin: 0, color: 'var(--text-color)', fontSize: '0.95rem' }}>
          Para que la app se abra a <strong>pantalla completa (sin la barra de Safari)</strong> y proteja sus datos:
        </p>
        <ol className="ipad-steps">
          <li>Abre esta página en <strong>Safari</strong> en tu iPad Pro.</li>
          <li>Toca el botón <strong>Compartir</strong> de Safari (el cuadrado con la flecha hacia arriba).</li>
          <li>Desplázate y selecciona <strong>«Añadir a la pantalla de inicio»</strong>.</li>
          <li>Toca <strong>Añadir</strong>. ¡Listo! Se creará el icono de <strong>VentusApp</strong> y se abrirá como una aplicación nativa completa.</li>
        </ol>
      </div>

      {/* Modal de confirmación para restaurar */}
      <Modal 
        isOpen={isConfirmModalOpen} 
        onClose={() => setIsConfirmModalOpen(false)} 
        title="Confirmar Restauración de Datos"
      >
        {restoreCandidate && (
          <div>
            <p style={{ marginBottom: '1rem', color: 'var(--text-color)' }}>
              Se ha detectado una copia de seguridad creada el{' '}
              <strong>{new Date(restoreCandidate.fecha).toLocaleString()}</strong>.
            </p>

            <div className="copia-stats-grid" style={{ marginBottom: '1.5rem' }}>
              <div className="copia-stat-box">
                <div className="copia-stat-number">{restoreCandidate.data?.alumnos?.length || 0}</div>
                <div className="copia-stat-label">Alumnos</div>
              </div>
              <div className="copia-stat-box">
                <div className="copia-stat-number">{restoreCandidate.data?.grupos?.length || 0}</div>
                <div className="copia-stat-label">Grupos</div>
              </div>
              <div className="copia-stat-box">
                <div className="copia-stat-number">{restoreCandidate.data?.pagos?.length || 0}</div>
                <div className="copia-stat-label">Pagos</div>
              </div>
              <div className="copia-stat-box">
                <div className="copia-stat-number">{restoreCandidate.data?.gastos?.length || 0}</div>
                <div className="copia-stat-label">Gastos</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button 
                className="btn-primary" 
                onClick={() => handleExecuteRestore('reemplazar')}
                disabled={isProcessing}
                style={{ padding: '0.75rem' }}
              >
                Reemplazar todo (Copia exacta y limpia)
              </button>
              <button 
                className="btn-secondary" 
                onClick={() => handleExecuteRestore('fusionar')}
                disabled={isProcessing}
                style={{ padding: '0.75rem' }}
              >
                Fusionar con los datos actuales (No borra los existentes)
              </button>
              <button 
                className="btn-secondary" 
                onClick={() => setIsConfirmModalOpen(false)}
                style={{ padding: '0.6rem', marginTop: '0.5rem', background: 'transparent' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CopiaSeguridad;
