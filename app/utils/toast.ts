type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  durationMs: number;
}

type Subscriber = (toasts: Toast[]) => void;

const toasts: Toast[] = [];
const listeners: Subscriber[] = [];

let nextId = 1;

function notify() {
  for (const fn of listeners) fn([...toasts]);
}

export function addToast(
  message: string,
  type: ToastType = 'info',
  durationMs = 4000,
): string {
  const id = `toast-${nextId++}`;
  toasts.push({ id, type, message, durationMs });
  notify();
  if (durationMs > 0) {
    setTimeout(() => {
      dismissToast(id);
    }, durationMs);
  }
  return id;
}

export function dismissToast(id: string) {
  const idx = toasts.findIndex((t) => t.id === id);
  if (idx === -1) return;
  toasts.splice(idx, 1);
  notify();
}

export function subscribeToast(listener: Subscriber): () => void {
  listeners.push(listener);
  listener([...toasts]);
  return () => {
    const i = listeners.indexOf(listener);
    if (i !== -1) listeners.splice(i, 1);
  };
}

// Shorthand helpers
export const toast = {
  success: (msg: string, ms?: number) => addToast(msg, 'success', ms),
  error: (msg: string, ms?: number) => addToast(msg, 'error', ms ?? 8000),
  warning: (msg: string, ms?: number) => addToast(msg, 'warning', ms),
  info: (msg: string, ms?: number) => addToast(msg, 'info', ms),
};
