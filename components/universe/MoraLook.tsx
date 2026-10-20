'use client';

import React, { useEffect, useId, useState } from 'react';
import type { MoraState } from '@/lib/universe/moraPresence';
import { MoraFace, type FaceState } from '@/components/mora/MoraFace';

export type MoraLookMode = 'light' | 'dark';

const LIGHT = {
    core: ['#f4fffb', '#c8f8e4', '#4ec89a', '#1e8a64', '#0d4f38'] as const,
    caustic: ['#e9fff6', '#7ee0b8', '#1a7a58'] as const,
    rimDark: '#0b3d2c',
    eye: '#0f3d2e',
    blush: '#ffb4c0',
    shadow: 'rgba(16,70,48,0.18)',
};

const STATE_TO_FACE: Record<MoraState, FaceState> = {
    calm: 'rest',
    listening: 'listen',
    thinking: 'think',
    working: 'work',
    done: 'done',
    needs: 'need',
};

function useUv2Look(): MoraLookMode {
    const [look, setLook] = useState<MoraLookMode>('dark');
    useEffect(() => {
        const read = () => setLook(document.documentElement.dataset.uv2Theme === 'light' ? 'light' : 'dark');
        read();
        const mo = new MutationObserver(read);
        mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-uv2-theme'] });
        return () => mo.disconnect();
    }, []);
    return look;
}

/**
 * Ein Körper, zwei Modi: Licht = Jadkristall. Dunkel = der etablierte
 * Stein mit Augen (mora-stone-v1 + MoraFace). Nur MoraPresenceLayer
 * zeichnet sie auf dem Universe-Desktop.
 */
export function MoraLook({
    state = 'calm',
    size = 96,
    look: forced,
    testid = 'uv2-mora-crystal',
}: {
    state?: MoraState;
    size?: number;
    look?: MoraLookMode;
    testid?: string;
}) {
    const uid = useId().replace(/:/g, '');
    const auto = useUv2Look();
    const mode = forced ?? auto;
    const p = LIGHT;
    const [reduce, setReduce] = useState(false);
    useEffect(() => {
        if (typeof window.matchMedia !== 'function') return;
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReduce(mq.matches);
        const f = () => setReduce(mq.matches);
        mq.addEventListener('change', f);
        return () => mq.removeEventListener('change', f);
    }, []);

    if (mode === 'dark') {
        return (
            <span
                className="uv2-mora-crystal uv2-mora-stone"
                data-testid={testid}
                data-mora-look="dark"
                data-face-state={state}
                data-reduce={reduce ? '' : undefined}
                style={{ width: size, height: size }}
            >
                <img
                    src="/brand/mora-stone-v1.png"
                    alt=""
                    width={size}
                    height={size}
                    draggable={false}
                    data-testid="uv2-mora-stone"
                />
                <MoraFace size={size} state={STATE_TO_FACE[state] ?? 'rest'} arcsOnGreet={size >= 72} />
            </span>
        );
    }

    return (
        <span
            className="uv2-mora-crystal"
            data-testid={testid}
            data-mora-look="light"
            data-face-state={state}
            data-reduce={reduce ? '' : undefined}
            style={{ width: size, height: size }}
        >
            <svg className="uv2-mora-crystal__body" viewBox="0 0 120 120" aria-hidden>
                <defs>
                    <radialGradient id={`jadeCore${uid}`} cx="36%" cy="30%" r="72%">
                        <stop offset="0" stopColor={p.core[0]} stopOpacity="0.95" />
                        <stop offset="0.22" stopColor={p.core[1]} />
                        <stop offset="0.52" stopColor={p.core[2]} />
                        <stop offset="0.78" stopColor={p.core[3]} />
                        <stop offset="1" stopColor={p.core[4]} />
                    </radialGradient>
                    <radialGradient id={`jadeCaustic${uid}`} cx="62%" cy="58%" r="42%">
                        <stop offset="0" stopColor={p.caustic[0]} stopOpacity="0.55" />
                        <stop offset="0.45" stopColor={p.caustic[1]} stopOpacity="0.18" />
                        <stop offset="1" stopColor={p.caustic[2]} stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id={`jadeSheen${uid}`} x1="0.15" y1="0" x2="0.85" y2="1">
                        <stop offset="0" stopColor="#fff" stopOpacity="0.7" />
                        <stop offset="0.28" stopColor="#fff" stopOpacity="0.12" />
                        <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
                        <stop offset="1" stopColor={p.rimDark} stopOpacity="0.22" />
                    </linearGradient>
                    <linearGradient id={`jadeRim${uid}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="#fff" stopOpacity="0.85" />
                        <stop offset="0.35" stopColor="#d4f8e8" stopOpacity="0.35" />
                        <stop offset="1" stopColor={p.rimDark} stopOpacity="0.45" />
                    </linearGradient>
                    <filter id={`jadeSoft${uid}`} x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="0.35" />
                    </filter>
                </defs>
                <ellipse cx="60" cy="108" rx="34" ry="7" fill={p.shadow} />
                <path
                    d="M60 10 C78 14 99 34 104 58 C100 86 80 106 60 112 C40 106 20 86 16 58 C21 34 42 14 60 10 Z"
                    fill={`url(#jadeCore${uid})`}
                    opacity="0.96"
                />
                <path
                    d="M60 18 C74 22 92 38 96 58 C93 80 78 98 60 103 C42 98 27 80 24 58 C28 38 46 22 60 18 Z"
                    fill={`url(#jadeCaustic${uid})`}
                />
                <path
                    d="M60 10 C78 14 99 34 104 58 C100 86 80 106 60 112 C40 106 20 86 16 58 C21 34 42 14 60 10 Z"
                    fill={`url(#jadeSheen${uid})`}
                />
                <path
                    d="M60 10 C78 14 99 34 104 58 C100 86 80 106 60 112 C40 106 20 86 16 58 C21 34 42 14 60 10 Z"
                    fill="none"
                    stroke={`url(#jadeRim${uid})`}
                    strokeWidth="1.8"
                />
                <g opacity="0.22" stroke="rgba(255,255,255,.7)" strokeWidth="0.7" fill="none" filter={`url(#jadeSoft${uid})`}>
                    <path d="M60 18 L92 52 L60 104 L28 52 Z" />
                    <path d="M28 52 L60 58 L92 52" />
                    <path d="M60 18 L60 104" />
                </g>
                <ellipse cx="42" cy="36" rx="16" ry="10" fill="#fff" opacity="0.42" transform="rotate(-18 42 36)" />
                <ellipse cx="38" cy="32" rx="7" ry="3.4" fill="#fff" opacity="0.7" transform="rotate(-18 38 32)" />
                <ellipse className="uv2-mora-eye" cx="48" cy="64" rx="5.2" ry="6.8" fill={p.eye} />
                <ellipse className="uv2-mora-eye" cx="72" cy="64" rx="5.2" ry="6.8" fill={p.eye} />
                <circle cx="49.7" cy="61.4" r="1.9" fill="#fff" />
                <circle cx="73.7" cy="61.4" r="1.9" fill="#fff" />
                <ellipse cx="40" cy="76" rx="6" ry="2.8" fill={p.blush} opacity="0.42" />
                <ellipse cx="80" cy="76" rx="6" ry="2.8" fill={p.blush} opacity="0.42" />
            </svg>
        </span>
    );
}
