'use client';

import React, { useEffect, useState } from 'react';
import { useMoraPresence, type MoraState } from '@/lib/universe/moraPresence';
import { MoraStone } from '@/components/mora/MoraStone';

/**
 * MÔRA in der Mitte des Systems (Stylebook 22.10.2026): der eine Jadestein, matt, ohne Halo.
 * Die Logik bleibt: Von ihr läuft der Faden zum Planeten, an dem sie arbeitet, und dieser
 * Planet wird hervorgehoben (data-mora-lit).
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
    const threadOn = !!target && (state === 'working' || state === 'done');

    useEffect(() => {
        const plane = document.querySelector<HTMLElement>('[data-uv2-plane]');
        document.querySelectorAll<HTMLElement>('[data-mora-lit]').forEach((el) => el.removeAttribute('data-mora-lit'));
        if (plane) plane.dataset.moraFocus = litId ? 'on' : '';
        if (litId) document.querySelector<HTMLElement>(`[data-uv2-planet="${CSS.escape(litId)}"]`)?.setAttribute('data-mora-lit', '');
    }, [litId]);

    // Startpunkt des Fadens: der Jadestein im Dock, in Prozent der Planetenebene.
    const [from, setFrom] = useState<{ x: number; y: number } | null>(null);
    useEffect(() => {
        if (!threadOn) { setFrom(null); return; }
        const measure = () => {
            const plane = document.querySelector<HTMLElement>('[data-uv2-plane]');
            const stone = document.querySelector<HTMLElement>('[data-mora-orb] button, [data-mora-orb]');
            if (!plane || !stone) { setFrom(null); return; }
            const p = plane.getBoundingClientRect(); const s = stone.getBoundingClientRect();
            if (!p.width || !p.height) { setFrom(null); return; }
            setFrom({ x: ((s.left + s.width / 2 - p.left) / p.width) * 100, y: ((s.top + s.height / 2 - p.top) / p.height) * 100 });
        };
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, [threadOn]);

    return (
        <div className="uv2-mora" data-mora-state="calm" aria-hidden="true">
            {threadOn && target && from && (
                <svg className="uv2-mora__thread" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {state === 'done' && <circle cx={target.x} cy={target.y} r="2.2" />}
                </svg>
            )}
            <span className="uv2-mora__core flex items-center justify-center">
                <MoraStone size={56} thinking={state === 'thinking'} />
            </span>
        </div>
    );
}
