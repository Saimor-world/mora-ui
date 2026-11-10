import { create } from 'zustand';

/** Ziel, das das Universe beim nächsten Öffnen zeigen soll (z. B. aus Wissen). `from: 'home'` = Anflug vom Home-Himmel. */
export interface UniverseTarget { planetId: string; moonId?: string | null; starId?: string | null; taskId?: string | null; from?: 'home' }
interface S {
  target: UniverseTarget | null;
  show: (t: UniverseTarget) => void;
  take: () => UniverseTarget | null;
  /** Rückflug: Home startet nah an diesem Planeten und fährt hinaus (Umkehr des Anflugs). */
  returning: string | null;
  returnTo: (planetId: string) => void;
  takeReturn: () => string | null;
}
export const useUniverseFocus = create<S>((set, get) => ({
  target: null,
  show: (t) => set({ target: t }),
  take: () => { const t = get().target; if (t) set({ target: null }); return t; },
  returning: null,
  returnTo: (planetId) => set({ returning: planetId }),
  takeReturn: () => { const r = get().returning; if (r) set({ returning: null }); return r; },
}));
