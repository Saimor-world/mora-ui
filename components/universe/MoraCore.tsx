'use client';

import React, { useEffect, useRef, useState } from 'react';
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
    const away = moraIsAway({ ...presence, state, target: targetId });

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
                    <ellipse cx="50" cy="62" rx="34" ry="10" fill="none" stroke="rgba(214,168,72,0.35)" strokeWidth="1.2" />
                    <ellipse cx="50" cy="62" rx="28" ry="7.5" fill="none" stroke="rgba(227,188,99,0.55)" strokeWidth="0.8" />
                    <circle cx="50" cy="46" r="22" fill="none" stroke="url(#uv2GoldRing)" strokeWidth="1.6" />
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
    const ref = useRef<HTMLCanvasElement>(null);
    const [reduce, setReduce] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReduce(mq.matches);
        const f = () => setReduce(mq.matches);
        mq.addEventListener('change', f);
        return () => mq.removeEventListener('change', f);
    }, []);

    useEffect(() => {
        const cv = ref.current; if (!cv) return;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const W = Math.round(68 * dpr);
        cv.width = cv.height = W;
        const c = cv.getContext('2d'); if (!c) return;
        const img = c.createImageData(W, W); const d = img.data;
        const r = W / 2;
        for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
            const u = (x + 0.5 - r) / r, v = (y + 0.5 - r) / r, q = u * u + v * v, i = (y * W + x) * 4;
            const cut = Math.abs(u) * 0.18 + Math.abs(v) * 0.08;
            if (q > 0.92 - cut) { d[i + 3] = 0; continue; }
            const z = Math.sqrt(Math.max(0, 1 - q));
            const facet = Math.abs(Math.sin((u * 5.2 + v * 2.1) * 1.4)) * 0.18 + Math.abs(Math.cos((u * 3.1 - v * 4.4))) * 0.12;
            const ndl = u * -0.15 + v * -0.35 + z * 0.9;
            const k = Math.max(0, Math.min(1, 0.22 + 0.7 * ndl + facet));
            const deep: [number, number, number] = [28, 110, 78];
            const jade: [number, number, number] = [86, 214, 150];
            const lite: [number, number, number] = [220, 255, 232];
            const col = k < 0.55
                ? deep.map((a, n) => Math.round(a + (jade[n] - a) * (k / 0.55)))
                : jade.map((a, n) => Math.round(a + (lite[n] - a) * ((k - 0.55) / 0.45)));
            const fres = Math.pow(1 - z, 2.2);
            const spec = Math.pow(Math.max(0, u * -0.2 + v * -0.5 + z * 0.84), 28) * 0.65;
            const rr = Math.min(255, col[0] + fres * 40 + spec * 180);
            const gg = Math.min(255, col[1] + fres * 55 + spec * 160);
            const bb = Math.min(255, col[2] + fres * 48 + spec * 140);
            const edge = Math.min(1, (0.96 - Math.sqrt(q)) * r * 1.4);
            d[i] = rr; d[i + 1] = gg; d[i + 2] = bb; d[i + 3] = Math.round(255 * edge * 0.96);
        }
        c.putImageData(img, 0, 0);
        c.strokeStyle = 'rgba(214,168,72,0.55)';
        c.lineWidth = dpr * 1.1;
        c.beginPath(); c.arc(r, r, r - dpr, 0, Math.PI * 2); c.stroke();
    }, []);

    return (
        <span className="uv2-mora-crystal" data-testid="uv2-mora-crystal" data-face-state={state}>
            <canvas ref={ref} className="uv2-mora-crystal__body" />
            <span className="uv2-mora-eyes" data-reduce={reduce ? '' : undefined} aria-hidden>
                <i /><i />
            </span>
        </span>
    );
}
