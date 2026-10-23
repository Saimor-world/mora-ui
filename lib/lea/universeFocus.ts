import { create } from 'zustand';

/** Ziel, das das Universe beim nächsten Öffnen zeigen soll (z. B. aus Wissen). */
export interface UniverseTarget { planetId: string; moonId?: string | null; starId?: string | null }
interface S { target: UniverseTarget | null; show: (t: UniverseTarget) => void; take: () => UniverseTarget | null }
export const useUniverseFocus = create<S>((set, get) => ({
  target: null,
  show: (t) => set({ target: t }),
  take: () => { const t = get().target; if (t) set({ target: null }); return t; },
}));
