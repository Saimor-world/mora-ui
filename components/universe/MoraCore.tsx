'use client';

import React, { useEffect, useState } from 'react';
import { getMoraPresence, moraIsAway, setMoraPresence, useMoraPresence, type MoraState } from '@/lib/universe/moraPresence';

/**
 * MÔRAs Sitz in der Mitte des Systems: goldener Ring (SAIMÔR-Logo),
 * Jadestein wenn sie zu Hause ist, leiser Nachglimmen wenn sie weg ist.
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

    useEffect(() => {
        const onDock = (e: MouseEvent) => {
            const el = (e.target as HTMLElement | null)?.closest?.('[data-mora-home], [data-mora-orb]');
            if (!el) return;
            setMoraPresence({ state: getMoraPresence().state, target: getMoraPresence().target, seat: 'away' });
        };
        document.addEventListener('click', onDock, true);
        return () => document.removeEventListener('click', onDock, true);
    }, []);

    const onSeat = () => {
        if (away) {
            setMoraPresence({ state: 'calm', target: null, seat: 'home' });
            return;
        }
        const ask = document.querySelector<HTMLInputElement>('input[aria-label="MÔRA fragen"]');
        if (ask) { ask.focus(); return; }
        window.dispatchEvent(new CustomEvent('uv2:open-chat'));
    };

    return (
        <div className="uv2-mora" data-mora-state={state} data-mora-seat={away ? 'empty' : 'home'} aria-hidden={false}>
            <span className="uv2-center-halo" />
            <button
                type="button"
                className="uv2-mora-seat"
                data-testid="uv2-mora-seat"
                aria-label={away ? 'MÔRA nach Hause rufen' : 'Mit MÔRA sprechen'}
                onClick={onSeat}
            >
                <span className="uv2-mora-dais" aria-hidden />
                <svg className="uv2-mora-ring" viewBox="0 0 100 100" aria-hidden>
                    <ellipse cx="50" cy="70" rx="38" ry="11" fill="none" stroke="rgba(214,168,72,0.38)" strokeWidth="1.2" />
                    <ellipse cx="50" cy="70" rx="30" ry="8" fill="none" stroke="rgba(227,188,99,0.58)" strokeWidth="0.85" />
                    <circle cx="50" cy="44" r="32" fill="none" stroke="url(#uv2GoldRing)" strokeWidth="2" />
                    <defs>
                        <linearGradient id="uv2GoldRing" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0" stopColor="#F3DFB0" />
                            <stop offset="0.45" stopColor="#D6A848" />
                            <stop offset="1" stopColor="#B8892E" />
                        </linearGradient>
                    </defs>
                </svg>
                {away ? (
                    <span className="uv2-mora-afterglow" data-testid="uv2-mora-empty" />
                ) : (
                    <JadeCrystal state={state} />
                )}
            </button>
        </div>
    );
}

function JadeCrystal({ state }: { state: MoraState }) {
    const [reduce, setReduce] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReduce(mq.matches);
        const f = () => setReduce(mq.matches);
        mq.addEventListener('change', f);
        return () => mq.removeEventListener('change', f);
    }, []);

    return (
        <span className="uv2-mora-crystal" data-testid="uv2-mora-crystal" data-face-state={state}>
            <svg className="uv2-mora-crystal__body" viewBox="0 0 100 100" aria-hidden>
                <defs>
                    <linearGradient id="uv2JadeDeep" x1="0.18" y1="0" x2="0.86" y2="1">
                        <stop offset="0" stopColor="#F2FFF4" />
                        <stop offset="0.22" stopColor="#9BEBC0" />
                        <stop offset="0.52" stopColor="#3CB07A" />
                        <stop offset="1" stopColor="#0F4A32" />
                    </linearGradient>
                    <linearGradient id="uv2JadeTable" x1="0.3" y1="0" x2="0.7" y2="1">
                        <stop offset="0" stopColor="#F7FFF8" />
                        <stop offset="1" stopColor="#6ED6A4" />
                    </linearGradient>
                    <linearGradient id="uv2JadeGold" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="#F3DFB0" />
                        <stop offset="0.5" stopColor="#D6A848" />
                        <stop offset="1" stopColor="#B8892E" />
                    </linearGradient>
                </defs>
                <polygon points="50,6 84,28 72,78 28,78 16,28" fill="url(#uv2JadeDeep)" stroke="rgba(16,64,48,0.35)" strokeWidth="0.6" />
                <polygon points="50,6 84,28 50,38 16,28" fill="url(#uv2JadeTable)" opacity="0.92" />
                <polygon points="50,6 50,38 16,28" fill="#D8FFE8" opacity="0.38" />
                <polygon points="50,38 84,28 72,78" fill="#146046" opacity="0.28" />
                <polygon points="50,38 72,78 28,78" fill="#0E3C28" opacity="0.22" />
                <polygon points="50,38 28,78 16,28" fill="#8FE8B8" opacity="0.22" />
                <polygon points="38,20 50,10 58,22 50,34" fill="#FFFFFF" opacity="0.42" />
                <circle cx="50" cy="48" r="44" fill="none" stroke="url(#uv2JadeGold)" strokeWidth="2.1" />
            </svg>
            <span className="uv2-mora-eyes" data-reduce={reduce ? '' : undefined} aria-hidden>
                <i /><i />
            </span>
        </span>
    );
}
