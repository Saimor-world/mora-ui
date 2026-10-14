/** Raum-Schalter (Gastgeberin §4): Immersiv, Lage, MÔRA-Stufe – pro Nutzer gespeichert. */
export type MoraLevel = 'aktiv' | 'leise' | 'aus';
export interface RoomPrefs { immersive: boolean; lage: boolean; mora: MoraLevel }
export const DEFAULT_ROOM: RoomPrefs = { immersive: false, lage: false, mora: 'aktiv' };
const key = (userId?: string | null) => 'saimor.room.v1.' + (userId || 'anon');

export function loadRoom(userId?: string | null): RoomPrefs {
    if (typeof window === 'undefined') return DEFAULT_ROOM;
    try {
        const raw = JSON.parse(window.localStorage.getItem(key(userId)) || 'null');
        if (!raw || typeof raw !== 'object') return DEFAULT_ROOM;
        return {
            immersive: raw.immersive === true,
            lage: raw.lage === true,
            mora: raw.mora === 'leise' || raw.mora === 'aus' ? raw.mora : 'aktiv',
        };
    } catch { return DEFAULT_ROOM; }
}
export function saveRoom(userId: string | null | undefined, prefs: RoomPrefs) {
    try { window.localStorage.setItem(key(userId), JSON.stringify(prefs)); } catch { /* privat-modus */ }
}
export function applyRoom(prefs: RoomPrefs) {
    const r = document.documentElement.dataset;
    r.uv2Immersive = prefs.immersive ? 'on' : '';
    r.uv2Lage = prefs.lage ? 'open' : '';
    r.uv2Still = '';
    r.uv2Mora = prefs.mora;
}
export const nextMoraLevel = (l: MoraLevel): MoraLevel => (l === 'aktiv' ? 'leise' : l === 'leise' ? 'aus' : 'aktiv');
