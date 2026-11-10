'use client';
import React, { useEffect, useRef } from 'react';

/**
 * Ein kleiner Zettel auf dem Papier statt eines App-Menüs: cremefarben, Tinte, eine Ecke Schatten.
 * Schließt bei Klick daneben oder Esc (Esc zuerst hier, nicht in der Kamera).
 */
export function PaperSlip({ x, y, w, label, onClose, children, testId, tilt = -0.6 }: {
  x: number; y: number; w: number; label: string; onClose: () => void; children: React.ReactNode; testId?: string; tilt?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const down = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); } };
    const t = window.setTimeout(() => document.addEventListener('pointerdown', down, true), 0);
    window.addEventListener('keydown', key, true);
    ref.current?.querySelector<HTMLElement>('button, input')?.focus({ preventScroll: true });
    return () => { window.clearTimeout(t); document.removeEventListener('pointerdown', down, true); window.removeEventListener('keydown', key, true); };
  }, [onClose]);
  return (
    <div ref={ref} className="wk-slip" role="dialog" aria-label={label} data-testid={testId} data-ws-pop="1"
      style={{ left: x, top: y, width: w, rotate: `${tilt}deg` }}>
      {children}
    </div>
  );
}
