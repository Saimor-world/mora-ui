'use client';

import { useEffect, useRef } from 'react';
import usePrefersReducedMotion from '@/lib/hooks/usePrefersReducedMotion';

interface SideDrawerProps {
  open: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
}

export default function SideDrawer({ open, title, description, onClose, children }: SideDrawerProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const drawer = drawerRef.current;
    if (!drawer) return;

    const focusable = drawer.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    first?.focus();

    const handleTrap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || focusable.length === 0) return;
      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    drawer.addEventListener('keydown', handleTrap);
    return () => drawer.removeEventListener('keydown', handleTrap);
  }, [open]);

  if (!open) return null;

  const motionClass = prefersReducedMotion ? 'duration-150' : 'duration-300';

  return (
    <>
      <div
        className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`fixed right-0 top-0 bottom-0 w-full max-w-md bg-card border-l border-border z-50 shadow-2xl transform transition-all ${motionClass} ease-out`}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            {title && <h2 className="text-lg font-semibold">{title}</h2>}
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary mora-transition"
            aria-label="Drawer schließen"
          >
            ×
          </button>
        </div>
        <div className="h-full overflow-y-auto p-4">{children}</div>
      </aside>
    </>
  );
}
