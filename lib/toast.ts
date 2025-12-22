import { toast as sonnerToast } from 'sonner';

/**
 * Môra-styled toast notifications
 * Wrapper around sonner with consistent styling
 */

export interface ToastPayload {
  id: string;
  message: string;
  variant: 'info' | 'success' | 'warning' | 'error';
  timeout: number;
}

type ToastListener = (toast: ToastPayload) => void;
const listeners: ToastListener[] = [];

export function subscribeToToasts(listener: ToastListener): () => void {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index > -1) listeners.splice(index, 1);
  };
}

export function showToast(
  options: { message: string; variant?: ToastPayload['variant']; timeout?: number } | string,
  variant?: ToastPayload['variant'],
  timeout = 3000
) {
  let payload: ToastPayload;

  if (typeof options === 'string') {
    // Legacy positional parameters
    payload = {
      id: Math.random().toString(36),
      message: options,
      variant: variant || 'info',
      timeout,
    };
  } else {
    // Object parameter
    payload = {
      id: Math.random().toString(36),
      message: options.message,
      variant: options.variant || 'info',
      timeout: options.timeout || timeout,
    };
  }

  listeners.forEach((listener) => listener(payload));
}

export const toast = {
  success: (message: string, options?: { description?: string; duration?: number }) => {
    sonnerToast.success(message, {
      duration: options?.duration || 3000,
      description: options?.description,
      position: 'bottom-right',
      style: {
        background: 'rgba(16, 185, 129, 0.1)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        color: '#10b981',
        backdropFilter: 'blur(12px)',
      },
    });
  },

  error: (message: string, options?: { description?: string; duration?: number }) => {
    sonnerToast.error(message, {
      duration: options?.duration || 4000,
      description: options?.description,
      position: 'bottom-right',
      style: {
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        color: '#ef4444',
        backdropFilter: 'blur(12px)',
      },
    });
  },

  info: (message: string, options?: { description?: string; duration?: number }) => {
    sonnerToast.info(message, {
      duration: options?.duration || 3000,
      description: options?.description,
      position: 'bottom-right',
      style: {
        background: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        color: '#3b82f6',
        backdropFilter: 'blur(12px)',
      },
    });
  },

  loading: (message: string) => {
    return sonnerToast.loading(message, {
      position: 'bottom-right',
      style: {
        background: 'rgba(206, 182, 118, 0.1)',
        border: '1px solid rgba(206, 182, 118, 0.3)',
        color: '#CEB676',
        backdropFilter: 'blur(12px)',
      },
    });
  },
};
