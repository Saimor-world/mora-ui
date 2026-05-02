'use client';

/**
 * ExecutionToast — brief notification for off-screen pane executions.
 *
 * Sits in MoraShell. When mora.execution.done fires and no focused pane
 * claims the affected entities, a dismissable toast appears.
 * Auto-dismiss after 5s; click-to-pin stays until user dismisses.
 *
 * Per spec §5.4.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, X } from 'lucide-react';
import { MORA_EXECUTION_EVENT, type MoraExecutionEvent } from '@/lib/hooks/useMoraExecutions';
import { isMoraLiveV1Enabled } from '@/lib/featureFlags';

interface Toast {
  id: string;
  message: string;
  pinned: boolean;
}

export function ExecutionToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev.slice(-4), { id, message, pinned: false }]);
    // Auto-dismiss after 5s unless pinned
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id || t.pinned));
    }, 5000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pin = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, pinned: true } : t));
  }, []);

  useEffect(() => {
    if (!isMoraLiveV1Enabled()) return;

    const handler = (e: Event) => {
      const evt = (e as CustomEvent<MoraExecutionEvent>).detail;
      if (evt?.kind !== 'mora.execution.done') return;
      addToast(`✓ Mora hat die Aktion abgeschlossen. ${evt.change_summary || ''}`.trim());
    };

    window.addEventListener(MORA_EXECUTION_EVENT, handler);
    return () => window.removeEventListener(MORA_EXECUTION_EVENT, handler);
  }, [addToast]);

  return (
    <div className="fixed bottom-20 right-4 z-[8500] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-auto flex items-start gap-2.5 rounded-xl border border-emerald-500/25 bg-black/80 backdrop-blur-md px-3.5 py-2.5 text-xs text-white/85 shadow-lg max-w-[280px]"
          >
            <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 shrink-0" />
            <span
              className="flex-1 leading-relaxed cursor-pointer"
              onClick={() => pin(toast.id)}
              title="Klicken zum Festhalten"
            >
              {toast.message}
            </span>
            <button
              onClick={() => dismiss(toast.id)}
              className="text-white/30 hover:text-white/60 transition-colors shrink-0 mt-0.5"
            >
              <X size={12} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
