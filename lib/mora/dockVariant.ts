'use client';
import { useEffect, useState } from 'react';

/** Dock-Varianten zum Vergleichen: ?dock=a (Brücke), ?dock=b (Homebase), ?dock=strip (schmaler Streifen). Wahl bleibt lokal gemerkt. */
export type DockVariant = 'a' | 'b' | 'strip';
const KEY = 'mora.dock';
const ok = (v: string | null): v is DockVariant => v === 'a' || v === 'b' || v === 'strip';
export function useDockVariant(): DockVariant {
  const [v, setV] = useState<DockVariant>('a');
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search).get('dock');
      if (ok(q)) { window.localStorage.setItem(KEY, q); setV(q); return; }
      const s = window.localStorage.getItem(KEY); if (ok(s)) setV(s);
    } catch { /* egal */ }
  }, []);
  useEffect(() => { document.documentElement.dataset.dock = v; }, [v]);
  return v;
}
