/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react';
import './DialogContext.css';

const DialogContext = createContext(null);

export const DialogProvider = ({ children }) => {
  const [confirmState, setConfirmState] = useState(null);
  const [toasts, setToasts] = useState([]);
  const resolveRef = useRef(null);

  /**
   * Muestra un diálogo de confirmación asíncrono (reemplazo de window.confirm)
   * @param {string | { title?: string, message: string, confirmText?: string, cancelText?: string, variant?: 'danger' | 'warning' | 'primary' }} options
   * @returns {Promise<boolean>}
   */
  const confirm = useCallback((options) => {
    const config = typeof options === 'string'
      ? {
          title: 'Confirmar acción',
          message: options,
          confirmText: 'Confirmar',
          cancelText: 'Cancelar',
          variant: 'danger'
        }
      : {
          title: options.title || 'Confirmar acción',
          message: options.message || '',
          confirmText: options.confirmText || 'Confirmar',
          cancelText: options.cancelText || 'Cancelar',
          variant: options.variant || 'danger'
        };

    setConfirmState(config);

    return new Promise((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleConfirmClose = (result) => {
    setConfirmState(null);
    if (resolveRef.current) {
      resolveRef.current(result);
      resolveRef.current = null;
    }
  };

  /**
   * Muestra una notificación flotante (reemplazo de window.alert)
   */
  const showToast = useCallback((message, type = 'info', duration = 3800) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (msg) => showToast(msg, 'success'),
    error: (msg) => showToast(msg, 'error', 5000),
    warning: (msg) => showToast(msg, 'warning', 4500),
    info: (msg) => showToast(msg, 'info')
  };

  return (
    <DialogContext.Provider value={{ confirm, showToast, toast }}>
      {children}

      {/* Modal de Confirmación */}
      {confirmState && (
        <div className="confirm-modal-overlay" onClick={() => handleConfirmClose(false)}>
          <div className="confirm-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-header">
              <div className={`confirm-modal-icon ${confirmState.variant}`}>
                <AlertTriangle size={22} />
              </div>
              <h3 className="confirm-modal-title">{confirmState.title}</h3>
            </div>
            <p className="confirm-modal-message">{confirmState.message}</p>
            <div className="confirm-modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => handleConfirmClose(false)}
              >
                {confirmState.cancelText}
              </button>
              <button
                type="button"
                className={confirmState.variant === 'danger' ? 'btn-confirm-danger' : 'btn-primary'}
                onClick={() => handleConfirmClose(true)}
                autoFocus
              >
                {confirmState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contenedor de Toasts */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map(item => (
            <div key={item.id} className={`toast-item ${item.type}`}>
              {item.type === 'success' && <CheckCircle size={18} style={{ color: 'var(--success-color)', flexShrink: 0 }} />}
              {item.type === 'error' && <XCircle size={18} style={{ color: 'var(--danger-color)', flexShrink: 0 }} />}
              {item.type === 'warning' && <AlertTriangle size={18} style={{ color: 'var(--warning-color)', flexShrink: 0 }} />}
              {item.type === 'info' && <Info size={18} style={{ color: 'var(--primary-color)', flexShrink: 0 }} />}
              <span>{item.message}</span>
              <button type="button" className="toast-close-btn" onClick={() => removeToast(item.id)}>
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </DialogContext.Provider>
  );
};

export const useConfirm = () => {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    return async (msg) => window.confirm(typeof msg === 'string' ? msg : msg?.message);
  }
  return ctx.confirm;
};

export const useToast = () => {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    return {
      showToast: (msg) => window.alert(msg),
      toast: {
        success: (msg) => window.alert(msg),
        error: (msg) => window.alert(msg),
        warning: (msg) => window.alert(msg),
        info: (msg) => window.alert(msg)
      }
    };
  }
  return { showToast: ctx.showToast, toast: ctx.toast };
};

