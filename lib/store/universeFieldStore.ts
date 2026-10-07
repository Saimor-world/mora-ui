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
    // Nur bei echter Aenderung schreiben: OrganizationField misst sich in
    // jedem Layout-Durchlauf neu. Ein neues Array/Objekt mit gleichem Inhalt
    // weckte alle Leser auf und konnte zusammen mit UniverseView eine
    // Render-Schleife ausloesen (React #185 auf /#universe ohne Sitzung).
    setField: (anchors, rect) => set((state) => (
        sameAnchors(state.anchors, anchors) && sameRect(state.rect, rect) ? state : { anchors, rect }
    )),
    clearField: () => set((state) => (state.anchors.length === 0 && state.rect === null ? state : { anchors: [], rect: null })),
}));

function sameRect(a: FieldRect | null, b: FieldRect | null): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    return a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height;
}

function sameAnchors(a: FieldAnchor[], b: FieldAnchor[]): boolean {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    return a.every((anchor, i) => JSON.stringify(anchor) === JSON.stringify(b[i]));
}
