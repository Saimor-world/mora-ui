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
                <svg className="uv2-mora-ring" viewBox="0 0 120 110" aria-hidden>
                    <ellipse className="uv2-mora-oval" cx="60" cy="58" rx="57" ry="52" fill="none" stroke="#e1bd62" strokeWidth="3.5" />
                    <ellipse className="uv2-mora-oval" cx="60" cy="58" rx="57" ry="52" fill="none" stroke="#fff3c4" strokeWidth="1" opacity="0.8" />
                    <ellipse cx="60" cy="96" rx="40" ry="10" fill="none" stroke="rgba(225,189,98,0.45)" strokeWidth="1.2" />
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
        <span className="uv2-mora-crystal" data-testid="uv2-mora-crystal" data-face-state={state} data-reduce={reduce ? '' : undefined}>
            <svg className="uv2-mora-crystal__body" viewBox="0 0 120 110" aria-hidden>
                <ellipse cx="60" cy="58" rx="57" ry="52" fill="none" stroke="#e1bd62" strokeWidth="3.5" />
                <ellipse cx="60" cy="58" rx="57" ry="52" fill="none" stroke="#fff3c4" strokeWidth="1" opacity="0.8" />
                <g opacity="0.93" stroke="rgba(255,255,255,.55)" strokeWidth="0.8">
                    <polygon points="60,10 92,24 60,34" fill="#9fe6c8" />
                    <polygon points="60,10 28,24 60,34" fill="#d4f8e8" />
                    <polygon points="28,24 14,56 40,52 60,34" fill="#7fd6b1" />
                    <polygon points="92,24 106,56 80,52 60,34" fill="#4fb98f" />
                    <polygon points="60,34 40,52 80,52" fill="#b5efd6" />
                    <polygon points="14,56 40,52 34,86" fill="#45a882" />
                    <polygon points="106,56 80,52 86,86" fill="#2e8a67" />
                    <polygon points="40,52 80,52 86,86 34,86" fill="#62c49c" />
                    <polygon points="34,86 86,86 60,102" fill="#257a5a" />
                </g>
                <polygon points="34,20 52,14 44,30" fill="#fff" opacity="0.7" />
                <ellipse className="uv2-mora-eye" cx="48" cy="64" rx="5" ry="6.5" fill="#0f3d2e" />
                <ellipse className="uv2-mora-eye" cx="72" cy="64" rx="5" ry="6.5" fill="#0f3d2e" />
                <circle cx="49.6" cy="61.6" r="1.8" fill="#fff" />
                <circle cx="73.6" cy="61.6" r="1.8" fill="#fff" />
                <ellipse cx="40" cy="74" rx="5" ry="2.5" fill="#ffb4c0" opacity="0.35" />
                <ellipse cx="80" cy="74" rx="5" ry="2.5" fill="#ffb4c0" opacity="0.35" />
            </svg>
        </span>
    );
}
