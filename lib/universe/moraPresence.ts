/**
 * MÔRA-Präsenz — ein Körper, drei Orte.
 *
 * place:
 *   seat   – zu Hause im Goldring der Mitte
 *   dock   – unten in der Leiste, bereit zu sprechen (Default)
 *   planet – zu einem Planeten oder Dokument geflogen, um ihn zu zeigen
 *
 * Nur der aktuelle Ort trägt sie. Die anderen zeigen die leere Spur:
 * Sitz = Goldring (kein Text darunter), Dock = stilles Feld „Frag MÔRA“.
 * needs/glow bewegen sie nicht. Ein Flug = dasselbe Element, reduced-motion
 * springt. Lichtmodus = Jadkristall. Dunkelmodus = Stein mit Augen.
 * Proaktive Flüge nur über moraProactivity (klare Auslöser), nie stilles Senden.
 */
import { useSyncExternalStore } from 'react';
import { useOrbStore } from '@/lib/store/orbStore';

/** MÔRAs sichtbarer Zustand als Licht (Gastgeberin §2). */
export type MoraState = 'calm' | 'listening' | 'thinking' | 'working' | 'done' | 'needs';
/** Wo der eine Körper steht. Niemals zwei Orte zugleich. */
export type MoraPlace = 'seat' | 'dock' | 'planet';
/** @deprecated mapped from place — seat=home, else away */
export type MoraSeat = 'home' | 'away';

export const MORA_STATE_LABEL: Record<MoraState, string> = {
    calm: 'ruhig', listening: 'hört zu', thinking: 'denkt', working: 'arbeitet', done: 'fertig', needs: 'braucht dich',
};

export interface MoraPresence {
    state: MoraState;
    place: MoraPlace;
    target?: string | null;
    /** derived; kept so ältere Leser und mora:presence-Events weiterlaufen */
    seat?: MoraSeat;
}

const DEFAULT_PRESENCE: MoraPresence = { state: 'calm', place: 'dock', target: null, seat: 'away' };

let current: MoraPresence = { ...DEFAULT_PRESENCE };
const subs = new Set<() => void>();
let doneTimer: ReturnType<typeof setTimeout> | null = null;

export function seatOf(place: MoraPlace): MoraSeat {
    return place === 'seat' ? 'home' : 'away';
}

export function moraIsAway(p: MoraPresence = current): boolean {
    return (p.place ?? 'dock') !== 'seat';
}

function resolvePlace(next: Partial<MoraPresence> & { seat?: MoraSeat }): MoraPlace {
    if (next.place === 'seat' || next.place === 'dock' || next.place === 'planet') return next.place;
    if (next.seat === 'home') return 'seat';
    if (next.seat === 'away') return 'dock';
    return current.place ?? 'dock';
}

function writeHtmlPlace(place: MoraPlace) {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.moraPlace = place;
}

function publish(merged: MoraPresence) {
    current = merged;
    writeHtmlPlace(merged.place);
    useOrbStore.getState().setMoraPresence?.(merged);
    subs.forEach((f) => f());
}

export function setMoraPresence(next: Partial<MoraPresence> & { state: MoraState }) {
    const place = resolvePlace(next);
    const target = place === 'planet'
        ? (next.target !== undefined ? next.target : current.target) ?? null
        : (next.target !== undefined ? next.target : null);
    const merged: MoraPresence = { state: next.state, place, target, seat: seatOf(place) };
    if (merged.state === current.state && merged.target === current.target && merged.place === current.place) return;
    if (doneTimer) { clearTimeout(doneTimer); doneTimer = null; }
    publish(merged);
    if (merged.state === 'done') {
        doneTimer = setTimeout(() => setMoraPresence({ state: 'calm', place: merged.place, target: merged.target }), 2400);
    }
}

/** Ein Flug: derselbe Körper wechselt den Ort. needs/glow fliegen nie von allein. */
export function flyMora(place: MoraPlace, patch: Partial<Omit<MoraPresence, 'place'>> = {}) {
    const cur = getMoraPresence();
    setMoraPresence({
        state: patch.state ?? cur.state,
        place,
        target: place === 'planet' ? (patch.target ?? cur.target ?? null) : (patch.target !== undefined ? patch.target : null),
    });
}

export function getMoraPresence() { return current; }

export function resetMoraPresence() {
    if (doneTimer) { clearTimeout(doneTimer); doneTimer = null; }
    publish({ ...DEFAULT_PRESENCE });
}

export function useMoraPresence(): MoraPresence {
    return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, getMoraPresence, getMoraPresence);
}

if (typeof window !== 'undefined') {
    writeHtmlPlace(current.place);
    // Andere Teile (Aktionen, Agenten) melden sich per Ereignis, ohne Import-Kopplung.
    window.addEventListener('mora:presence', (e) => {
        const d = (e as CustomEvent<Partial<MoraPresence> & { seat?: MoraSeat }>).detail;
        if (!d) return;
        if (d.state || d.place || d.seat) {
            setMoraPresence({
                state: d.state || current.state,
                target: d.target !== undefined ? d.target : current.target,
                place: d.place,
                seat: d.seat,
            });
        }
    });
}
