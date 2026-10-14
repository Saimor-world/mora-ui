import { useSyncExternalStore } from 'react';

/** MÔRAs sichtbarer Zustand als Licht im Kern (Gastgeberin §2). */
export type MoraState = 'calm' | 'listening' | 'thinking' | 'working' | 'done' | 'needs';
export const MORA_STATE_LABEL: Record<MoraState, string> = {
    calm: 'ruhig', listening: 'hört zu', thinking: 'denkt', working: 'arbeitet', done: 'fertig', needs: 'braucht dich',
};
export interface MoraPresence { state: MoraState; target?: string | null }

let current: MoraPresence = { state: 'calm' };
const subs = new Set<() => void>();
let doneTimer: ReturnType<typeof setTimeout> | null = null;

export function setMoraPresence(next: MoraPresence) {
    if (next.state === current.state && next.target === current.target) return;
    if (doneTimer) { clearTimeout(doneTimer); doneTimer = null; }
    current = next;
    if (next.state === 'done') doneTimer = setTimeout(() => setMoraPresence({ state: 'calm' }), 2400);
    subs.forEach((f) => f());
}
export function getMoraPresence() { return current; }
export function useMoraPresence(): MoraPresence {
    return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, getMoraPresence, getMoraPresence);
}
if (typeof window !== 'undefined') {
    // Andere Teile (Aktionen, Agenten) melden sich per Ereignis, ohne Import-Kopplung.
    window.addEventListener('mora:presence', (e) => { const d = (e as CustomEvent<MoraPresence>).detail; if (d?.state) setMoraPresence(d); });
}
