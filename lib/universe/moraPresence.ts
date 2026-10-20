import { useSyncExternalStore } from 'react';
import { useOrbStore } from '@/lib/store/orbStore';

/** MÔRAs sichtbarer Zustand als Licht im Kern (Gastgeberin §2). */
export type MoraState = 'calm' | 'listening' | 'thinking' | 'working' | 'done' | 'needs';
export type MoraSeat = 'home' | 'away';
export const MORA_STATE_LABEL: Record<MoraState, string> = {
    calm: 'ruhig', listening: 'hört zu', thinking: 'denkt', working: 'arbeitet', done: 'fertig', needs: 'braucht dich',
};
export interface MoraPresence { state: MoraState; target?: string | null; seat?: MoraSeat }

let current: MoraPresence = { state: 'calm', seat: 'home' };
const subs = new Set<() => void>();
let doneTimer: ReturnType<typeof setTimeout> | null = null;

export function moraIsAway(p: MoraPresence = current): boolean {
    if (p.seat === 'away') return true;
    if (p.target && (p.state === 'working' || p.state === 'needs' || p.state === 'thinking')) return true;
    return false;
}

export function setMoraPresence(next: MoraPresence) {
    const seat = next.seat ?? current.seat ?? 'home';
    const merged: MoraPresence = { state: next.state, target: next.target ?? null, seat };
    if (merged.state === current.state && merged.target === current.target && merged.seat === current.seat) return;
    if (doneTimer) { clearTimeout(doneTimer); doneTimer = null; }
    current = merged;
    useOrbStore.getState().setMoraPresence?.(merged);
    if (merged.state === 'done') doneTimer = setTimeout(() => setMoraPresence({ state: 'calm', seat: merged.seat }), 2400);
    subs.forEach((f) => f());
}
export function getMoraPresence() { return current; }
export function useMoraPresence(): MoraPresence {
    return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, getMoraPresence, getMoraPresence);
}
if (typeof window !== 'undefined') {
    // Andere Teile (Aktionen, Agenten) melden sich per Ereignis, ohne Import-Kopplung.
    window.addEventListener('mora:presence', (e) => {
        const d = (e as CustomEvent<Partial<MoraPresence>>).detail;
        if (!d) return;
        if (d.state || d.seat) setMoraPresence({ state: d.state || current.state, target: d.target ?? current.target, seat: d.seat ?? current.seat });
    });
}
