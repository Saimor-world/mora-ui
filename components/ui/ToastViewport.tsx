'use client';

import { useEffect, useRef, useState } from 'react';
import { subscribeToToasts, type ToastPayload } from '@/lib/toast';

const VARIANT_STYLES: Record<
  ToastPayload['variant'],
  { container: string; indicator: string }
> = {
  info: {
    container: 'bg-slate-900/90 border border-slate-700 text-slate-100',
    indicator: 'bg-slate-400',
  },
  warning: {
    container: 'bg-amber-950/90 border border-amber-700 text-amber-50',
    indicator: 'bg-amber-400',
  },
  error: {
    container: 'bg-red-950/90 border border-red-800 text-red-100',
    indicator: 'bg-red-400',
  },
};

export default function ToastViewport() {
  const [toasts, setToasts] = useState<ToastPayload[]>([]);
  const timeoutRefs = useRef<Record<string, number>>({});

  useEffect(() => {
    const unsubscribe = subscribeToToasts((toast) => {
      setToasts((current) => [...current, toast]);

      const timeoutId = window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== toast.id));
        delete timeoutRefs.current[toast.id];
      }, toast.timeout);

      timeoutRefs.current[toast.id] = timeoutId;
    });

    return () => {
      Object.values(timeoutRefs.current).forEach((id) => window.clearTimeout(id));
      timeoutRefs.current = {};
      unsubscribe();
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2">
      {toasts.map((toast) => {
        const styles = VARIANT_STYLES[toast.variant] ?? VARIANT_STYLES.info;
        return (
          <div
            key={toast.id}
            className={`${styles.container} w-72 rounded-lg px-4 py-3 shadow-lg shadow-black/40 backdrop-blur-sm`}
          >
            <div className="flex items-start gap-2">
              <span className={`mt-1 h-2 w-2 rounded-full ${styles.indicator}`} />
              <p className="text-sm leading-snug">{toast.message}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
