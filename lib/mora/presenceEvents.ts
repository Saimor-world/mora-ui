'use client';

export type MoraPresenceAction =
    | 'idle'
    | 'highlight'
    | 'point'
    | 'navigate'
    | 'activate'
    | 'deactivate'
    | 'return';

export interface MoraPresenceDetail {
    action: MoraPresenceAction;
    targetId?: string;
    targetSelector?: string;
    targetType?: string;
    targetPosition?: { x: number; y: number };
    message?: string | null;
    duration?: number;
    source?: 'agency' | 'ai' | 'resonance' | 'system';
}

export const MORA_PRESENCE_EVENT = 'mora:cursor';

export function dispatchMoraPresence(detail: MoraPresenceDetail): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent<MoraPresenceDetail>(MORA_PRESENCE_EVENT, { detail }));
}

