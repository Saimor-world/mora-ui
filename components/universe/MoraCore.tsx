'use client';

import React, { useEffect } from 'react';
import { flyMora, moraIsAway, useMoraPresence, type MoraState } from '@/lib/universe/moraPresence';

/**
 * MÔRAs Sitz: nur die leere Spur. Der Körper fliegt in MoraPresenceLayer.
 * Zu Hause: Goldring. Fort: Ring plus Nachglimmen.
 */
export function MoraCore({ planets }: { planets: Array<{ id: string; x: number; y: number; needs: boolean }> }) {
    const presence = useMoraPresence();
    let state: MoraState = presence.state;
    let targetId = presence.target ?? null;
    if (state === 'calm') {
        const waiting = planets.find((p) => p.needs);
        if (waiting) { state = 'needs'; targetId = waiting.id; }
    }
    const target = targetId ? planets.find((p) => p.id === targetId) : undefined;
    const litId = target && state !== 'calm' ? target.id : null;
    const away = moraIsAway(presence);

    useEffect(() => {
        const plane = document.querySelector<HTMLElement>('[data-uv2-plane]');
        document.querySelectorAll<HTMLElement>('[data-mora-lit]').forEach((el) => el.removeAttribute('data-mora-lit'));
        if (plane) plane.dataset.moraFocus = litId ? 'on' : '';
        if (litId) document.querySelector<HTMLElement>(`[data-uv2-planet="${CSS.escape(litId)}"]`)?.setAttribute('data-mora-lit', '');
    }, [litId]);

    const onSeat = () => {
        if (away) {
            flyMora('seat', { state: 'calm', target: null });
            return;
        }
        const ask = document.querySelector<HTMLInputElement>('input[aria-label="MÔRA fragen"]');
        if (ask) { ask.focus(); return; }
        window.dispatchEvent(new CustomEvent('uv2:open-chat'));
    };

    return (
        <div className="uv2-mora" data-mora-state={state} data-mora-seat={away ? 'empty' : 'home'} data-mora-place={presence.place} aria-hidden={false}>
            <span className="uv2-center-halo" />
            <button
                type="button"
                className="uv2-mora-seat"
                data-testid="uv2-mora-seat"
                aria-label={away ? 'MÔRA nach Hause rufen' : 'Mit MÔRA sprechen'}
                onClick={onSeat}
            >
                <span className="uv2-mora-seat-glow" aria-hidden />
                {away ? <span className="uv2-mora-afterglow" data-testid="uv2-mora-empty" /> : null}
            </button>
        </div>
    );
}
