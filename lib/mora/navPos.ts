import { create } from 'zustand';

/** Wo man im Firmen-Universe gerade ist: Universe › Planet (Anflug/Orbit) › Mond/Ordner (gelandet). Wird vom Universe gemeldet, das Cockpit zeigt es als Positionskarte. */
export interface NavPlace { id: string; name: string }
export type NavStage = 'universe' | 'approach' | 'orbit' | 'landed';
interface S {
  planet: NavPlace | null; open: boolean; moon: NavPlace | null;
  toUniverse?: () => void; toPlanet?: () => void;
  set: (p: Partial<Omit<S, 'set'>>) => void;
}
export const useNavPos = create<S>((set) => ({ planet: null, open: false, moon: null, set: (p) => set(p) }));
export function navStage(s: Pick<S, 'planet' | 'open' | 'moon'>): NavStage {
  if (!s.planet) return 'universe';
  if (!s.open) return 'approach';
  return s.moon ? 'landed' : 'orbit';
}
