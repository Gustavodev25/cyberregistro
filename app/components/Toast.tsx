'use client';

import { useEffect } from 'react';

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
  type?: 'error' | 'success' | 'info';
}

export default function Toast({ message, onClose, duration = 4000, type = 'error' }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const typeStyles = {
    error: 'bg-red-50 border-red-200 text-red-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  return (
    <div className={`rounded-lg border px-4 py-3 shadow-lg min-w-[300px] max-w-md transition-all duration-300 ${typeStyles[type]}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{message}</p>
        <button
          onClick={onClose}
          className="text-current opacity-70 hover:opacity-100 transition-opacity flex-shrink-0"
          aria-label="Fechar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
  );
}
