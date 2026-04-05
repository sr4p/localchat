import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { subscribeToast, dismissToast } from '../utils/toast';

interface ToastData {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

const TYPE_CONFIG: Record<ToastData['type'], { icon: typeof Info; bg: string; label: string }> = {
  success: { icon: CheckCircle, bg: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-200', label: 'Success' },
  error: { icon: AlertCircle, bg: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/50 dark:border-red-800 dark:text-red-200', label: 'Error' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-200', label: 'Warning' },
  info: { icon: Info, bg: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-200', label: 'Info' },
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    return subscribeToast((next) => setToasts(next as ToastData[]));
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-[9999] flex flex-col gap-2" data-toast-container>
      {toasts.map((t) => {
        const config = TYPE_CONFIG[t.type];
        const Icon = config.icon;
        return (
          <div
            key={t.id}
            className={`flex animate-rise-in max-w-sm items-start gap-3 rounded-xl border p-3 shadow-lg ${config.bg}`}
            role="alert"
            data-toast-id={t.id}
          >
            <Icon className="mt-0.5 h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">{t.message}</span>
            <button
              onClick={() => dismissToast(t.id)}
              className="ml-auto shrink-0 rounded p-0.5 opacity-60 hover:opacity-100 transition-opacity"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
