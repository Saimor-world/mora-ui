'use client';

import React, { useEffect } from 'react';
import { MORA_STATE_LABEL, useMoraPresence, type MoraState } from '@/lib/universe/moraPresence';

/**
 * MÔRA als Licht in der Mitte (Gastgeberin §2): Kreis + Halo + ein goldener Faden,
 * darüber der Zirkumflex des Ô als Lichtbogen. Zustände sind Bewegung, kein Fenster.
 * Faden/Glanz zeigen nur auf einen echten Planeten (target); ohne Ziel gibt es keinen Faden.
 */
export function MoraCore({ planets }: { planets: Array<{ id: string; x: number; y: number; needs: boolean }> }) {
    const presence = useMoraPresence();
    let state: MoraState = presence.state;
    let targetId = presence.target ?? null;
    // Ruhig, aber ein Planet wartet wirklich auf dich → sanftes Leuchten in deine Richtung.
    if (state === 'calm') {
        const waiting = planets.find((p) => p.needs);
        if (waiting) { state = 'needs'; targetId = waiting.id; }
    }
    const target = targetId ? planets.find((p) => p.id === targetId) : undefined;
    // Fokus = Licht: der Planet, über den sie spricht oder an dem sie arbeitet, wird hell, der Rest tritt zurück.
    const litId = target && state !== 'calm' ? target.id : null;
    useEffect(() => {
        const plane = document.querySelector<HTMLElement>('[data-uv2-plane]');
        document.querySelectorAll<HTMLElement>('[data-mora-lit]').forEach((el) => delete el.dataset.moraLit);
        if (plane) plane.dataset.moraFocus = litId ? 'on' : '';
        if (litId) document.querySelector<HTMLElement>(`[data-uv2-planet="${CSS.escape(litId)}"]`)?.setAttribute('data-mora-lit', '');
    }, [litId]);

    return (
        <div className="uv2-mora" data-mora-state={state} aria-live="polite">
            {target && (state === 'working' || state === 'done') && (
                <svg className="uv2-mora__thread" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    <line x1="50" y1="50" x2={target.x} y2={target.y} />
                    {state === 'done' && <circle cx={target.x} cy={target.y} r="2.2" />}
                </svg>
            )}
            <button
                type="button"
                className="uv2-mora__core"
                title={'MÔRA · ' + MORA_STATE_LABEL[state] + ' – klicken, um zu fragen (/)'}
                onClick={() => document.querySelector<HTMLInputElement>('input[aria-label="MÔRA fragen"]')?.focus()}
            >
                <span className="uv2-mora__halo" />
                <span className="uv2-mora__light" />
                <svg className="uv2-mora__arc" viewBox="0 0 40 14" aria-hidden="true"><path d="M6 12 L20 3 L34 12" /></svg>
                <span className="sr-only">MÔRA {MORA_STATE_LABEL[state]}</span>
            </button>
            {state !== 'calm' && <span className="uv2-mora__caption">{MORA_STATE_LABEL[state]}</span>}
        </div>
    );
}
