'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import Toast from './Toast';

interface ToastData {
  id: string;
  message: string;
  type: 'error' | 'success' | 'info';
  isExiting?: boolean;
}

interface ToastContextType {
  showToast: (message: string, type?: 'error' | 'success' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = useCallback((message: string, type: 'error' | 'success' | 'info' = 'error') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, isExiting: false }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    // Mark as exiting first
    setToasts((prev) =>
      prev.map((toast) =>
        toast.id === id ? { ...toast, isExiting: true } : toast
      )
    );
    
    // Remove after animation completes
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 300);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <div className="relative flex items-center justify-center">
          {toasts.map((toast, index) => (
            <div
              key={toast.id}
              className={`absolute pointer-events-auto ${
                toast.isExiting ? 'animate-toast-exit' : 'animate-toast-enter'
              }`}
              style={{
                transform: `translateY(${index * -4}px) scale(${1 - index * 0.05})`,
                opacity: toast.isExiting ? 0 : 1 - index * 0.2,
                zIndex: toasts.length - index,
                transition: 'transform 0.3s ease, opacity 0.3s ease',
              }}
            >
              <Toast
                message={toast.message}
                type={toast.type}
                onClose={() => removeToast(toast.id)}
              />
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
