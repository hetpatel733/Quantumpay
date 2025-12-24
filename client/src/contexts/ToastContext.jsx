import React, { createContext, useContext, useState, useCallback } from 'react';
import Icon from '../components/AppIcon';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Return a no-op function if context is not available (for components outside provider)
    return {
      showToast: (message, type) => {
        console.warn('Toast called outside of ToastProvider:', message, type);
      },
      removeToast: () => {}
    };
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
};

const Toast = ({ toast, onRemove }) => {
  const { id, message, type } = toast;

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-500 dark:bg-green-600',
          icon: 'CheckCircle',
          iconColor: 'text-white'
        };
      case 'error':
        return {
          bg: 'bg-red-500 dark:bg-red-600',
          icon: 'XCircle',
          iconColor: 'text-white'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-500 dark:bg-yellow-600',
          icon: 'AlertTriangle',
          iconColor: 'text-white'
        };
      default:
        return {
          bg: 'bg-blue-500 dark:bg-blue-600',
          icon: 'Info',
          iconColor: 'text-white'
        };
    }
  };

  const styles = getToastStyles();

  return (
    <div
      className={`${styles.bg} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 pointer-events-auto animate-slideIn`}
    >
      <Icon name={styles.icon} size={20} className={styles.iconColor} />
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={() => onRemove(id)}
        className="hover:bg-white/20 rounded p-1 transition-colors flex-shrink-0"
      >
        <Icon name="X" size={16} className="text-white" />
      </button>
    </div>
  );
};

export default ToastProvider;
