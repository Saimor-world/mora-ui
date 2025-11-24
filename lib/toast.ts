import { toast as sonnerToast } from 'sonner';

/**
 * Môra-styled toast notifications
 * Wrapper around sonner with consistent styling
 */

export const toast = {
  success: (message: string) => {
    sonnerToast.success(message, {
      duration: 3000,
      position: 'bottom-right',
      style: {
        background: 'rgba(16, 185, 129, 0.1)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        color: '#10b981',
        backdropFilter: 'blur(12px)',
      },
    });
  },

  error: (message: string) => {
    sonnerToast.error(message, {
      duration: 4000,
      position: 'bottom-right',
      style: {
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        color: '#ef4444',
        backdropFilter: 'blur(12px)',
      },
    });
  },

  info: (message: string) => {
    sonnerToast.info(message, {
      duration: 3000,
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
