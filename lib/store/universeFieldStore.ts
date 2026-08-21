import { create } from 'zustand';
import type { FieldAnchor, FieldRect } from '@/lib/universe/anchors';

/**
 * Wo das Organisationsfeld gerade steht und welche Bereiche darin liegen.
 *
 * Das Feld selbst schreibt hier hinein (es misst sich per getBoundingClientRect
 * und kennt seine eigenen Anker), alle Schichten darueber lesen nur. Damit kann
 * die Topologie nicht mehr auseinanderlaufen: genau das war der Fehler im
 * Mycelium-Netz, das eine eigene Kopie der Positionen trug und irgendwann
 * neben den Planeten haing, ohne dass es jemand merkte.
 *
 * Ist das Feld nicht sichtbar (andere Ansicht, Handy-Raster), stehen hier
 * keine Anker - und jede Schicht darueber zeichnet folgerichtig nichts.
 */
interface UniverseFieldState {
    anchors: FieldAnchor[];
    rect: FieldRect | null;
    setField: (anchors: FieldAnchor[], rect: FieldRect | null) => void;
    clearField: () => void;
}

export const useUniverseFieldStore = create<UniverseFieldState>((set) => ({
    anchors: [],
    rect: null,
    setField: (anchors, rect) => set({ anchors, rect }),
    clearField: () => set({ anchors: [], rect: null }),
}));
