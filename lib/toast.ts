export type ToastVariant = 'info' | 'warning' | 'error';

export interface ToastPayload {
  id: string;
  message: string;
  variant: ToastVariant;
  timeout: number;
}

type ToastListener = (toast: ToastPayload) => void;

const listeners = new Set<ToastListener>();

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function showToast({
  message,
  variant = 'info',
  timeout = 4000,
}: {
  message: string;
  variant?: ToastVariant;
  timeout?: number;
}) {
  if (typeof window === 'undefined') {
    return;
  }

  const toast: ToastPayload = {
    id: generateId(),
    message,
    variant,
    timeout,
  };

  listeners.forEach((listener) => listener(toast));
}

export function subscribeToToasts(listener: ToastListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
