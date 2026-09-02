import { createContext, useContext, useState, useCallback } from 'react';

// Export the context once
export const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((type, title, msg) => {
    setToast({ type, title, msg });
    setTimeout(() => setToast(null), 3500);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <div
          className={`fixed top-5 right-5 px-5 py-3 rounded-xl shadow-2xl transform transition-transform z-50 flex items-center gap-3 max-w-sm slide-in border ${
            toast.type === 'error'
              ? 'bg-gradient-to-r from-red-500 to-red-600 border-red-400'
              : toast.type === 'warning'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 border-amber-400'
              : 'bg-gradient-to-r from-emerald-500 to-emerald-600 border-emerald-400'
          }`}
        >
          <i
            className={`${
              toast.type === 'error'
                ? 'fas fa-exclamation-circle text-white'
                : toast.type === 'warning'
                ? 'fas fa-exclamation-triangle text-white'
                : 'fas fa-check-circle text-white'
            } text-xl`}
          ></i>
          <div className="text-white">
            <h4 className="font-bold text-sm">{toast.title}</h4>
            <p className="text-xs text-white/90">{toast.msg}</p>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

// Optionally export a hook directly (but we already have useToast.js)
export const useToast = () => useContext(ToastContext);