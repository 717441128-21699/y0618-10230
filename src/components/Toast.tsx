import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, X, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export default function Toast({ toasts, onRemove }: ToastProps) {
  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} className="text-green-500" />;
      case 'error':
        return <XCircle size={20} className="text-red-500" />;
      case 'warning':
        return <AlertTriangle size={20} className="text-orange-500" />;
      case 'info':
        return <Info size={20} className="text-blue-500" />;
    }
  };

  const getStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-orange-200 bg-orange-50';
      case 'info':
        return 'border-blue-200 bg-blue-50';
    }
  };

  return (
    <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={onRemove}
          icon={getIcon(toast.type)}
          styles={getStyles(toast.type)}
        />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onRemove,
  icon,
  styles,
}: {
  toast: ToastMessage;
  onRemove: (id: string) => void;
  icon: React.ReactNode;
  styles: string;
}) {
  useEffect(() => {
    const duration = toast.duration ?? 3000;
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg animate-[slideInRight_0.3s_ease-out] ${styles}`}
    >
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <p className="flex-1 text-sm font-medium text-slate-700">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 p-1 rounded-lg hover:bg-white/50 transition-colors"
      >
        <X size={16} className="text-slate-400" />
      </button>
    </div>
  );
}
