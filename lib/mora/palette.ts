'use client';
import { useEffect, useState } from 'react';

/** Farbwelt: ?palette=2 „Polarlicht-Dämmerung“ (Standard), ?palette=1 „Klare Nacht“, ?palette=0 alte warme Welt. Wahl bleibt lokal gemerkt. Die Farben selbst stehen als Token in app/world.css (html[data-palette]). */
export type Palette = '0' | '1' | '2';
export const DEFAULT_PALETTE: Palette = '2';
const KEY = 'mora.palette';
const ok = (v: string | null): v is Palette => v === '0' || v === '1' || v === '2';
export function usePalette(): Palette {
  const [v, setV] = useState<Palette>(DEFAULT_PALETTE);
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search).get('palette');
      if (ok(q)) { window.localStorage.setItem(KEY, q); setV(q); return; }
      const s = window.localStorage.getItem(KEY); if (ok(s)) setV(s);
    } catch { /* egal */ }
  }, []);
  useEffect(() => { document.documentElement.dataset.palette = v; }, [v]);
  return v;
}
