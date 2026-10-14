'use client';

import React, { useEffect, useRef } from 'react';
import { useMoraPresence } from '@/lib/universe/moraPresence';

/**
 * Myzel (freigegeben 14.10.): feine organische Jade-Fäden + Sternenstaub vom Stein zur Mitte
 * und von dort zu den Planeten. Liegt hinter den Planeten. Günstig: das Netz wird nur bei
 * Größen-/Planetenänderung neu gezeichnet; nur der Staub flimmert (≈12 fps), pausiert wenn
 * der Tab verborgen ist oder Bewegung reduziert werden soll.
 * Arbeitet MÔRA, tritt das Netz zurück und ein weicher Goldfaden läuft vom Stein bis an den
 * Planetenrand über dessen Namen.
 */
type Pt = [number, number];
const J = '130,215,180';
const GOLD = '235,205,150';

function rng(seed: number) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

function hypha(ctx: CanvasRenderingContext2D, R: () => number, x: number, y: number, ang: number, len: number, w: number, a: number, target: Pt | null, depth: number) {
    const pts: Pt[] = [[x, y]]; const step = 6;
    for (let i = 0; i < len / step; i++) {
        if (target) {
            const ta = Math.atan2(target[1] - y, target[0] - x); let d = ta - ang; d = Math.atan2(Math.sin(d), Math.cos(d));
            const dd = Math.hypot(target[0] - x, target[1] - y); ang += d * (dd < 90 ? 0.45 : 0.12);
        }
        ang += (R() - 0.5) * 0.35; x += Math.cos(ang) * step; y += Math.sin(ang) * step; pts.push([x, y]);
        if (target && Math.hypot(target[0] - x, target[1] - y) < 14) break;
        if (depth < 3 && R() < 0.06) hypha(ctx, R, x, y, ang + (R() < 0.5 ? -1 : 1) * (0.5 + R() * 0.7), len * (0.18 + R() * 0.25), w * 0.6, a * 0.6, null, depth + 1);
    }
    const n = pts.length;
    for (let i = 1; i < n - 1; i++) {
        const t = i / n; const fade = target ? Math.min(1, Math.sin(Math.PI * t) * 1.6 + 0.25) : 1 - t;
        ctx.strokeStyle = `rgba(${J},${a * fade})`; ctx.lineWidth = w * (target ? 1 : 1 - t * 0.7);
        const m0: Pt = [(pts[i - 1][0] + pts[i][0]) / 2, (pts[i - 1][1] + pts[i][1]) / 2];
        const m1: Pt = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2];
        ctx.beginPath(); ctx.moveTo(m0[0], m0[1]); ctx.quadraticCurveTo(pts[i][0], pts[i][1], m1[0], m1[1]); ctx.stroke();
    }
}

export function MyzelLayer({ planets }: { planets: Array<{ id: string; x: number; y: number }> }) {
    const ref = useRef<HTMLCanvasElement>(null);
    const presence = useMoraPresence();
    const working = presence.state === 'working' || presence.state === 'done';
    const targetId = working ? presence.target ?? null : null;
    const key = planets.map((p) => p.id + p.x.toFixed(1) + p.y.toFixed(1)).join('|');

    useEffect(() => {
        const cv = ref.current; if (!cv) return;
        const plane = cv.parentElement as HTMLElement | null; if (!plane) return;
        const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        let raf = 0; let last = 0; let net: HTMLCanvasElement | null = null; let dust: Array<[number, number, number, number, boolean]> = [];
        let W = 0, H = 0, dpr = 1, ox = 0, oy = 0; let dimNow = 1;

        const build = () => {
            const pr = plane.getBoundingClientRect();
            // Leinwand reicht nach unten bis zum Dock, damit der Faden am Stein beginnen kann.
            const stoneEl = document.querySelector<HTMLElement>('[data-mora-orb] button, [data-mora-orb]');
            const sr = stoneEl?.getBoundingClientRect();
            const sx = pr.width ? plane.offsetWidth / pr.width : 1; // Ebene kann skaliert sein
            const extraBottom = sr ? Math.max(0, (sr.bottom - pr.bottom) * sx + 24) : 0;
            ox = 0; oy = 0; W = plane.offsetWidth; H = plane.offsetHeight + extraBottom;
            dpr = Math.min(2, window.devicePixelRatio || 1);
            cv.style.height = H + 'px'; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
            const P = (p: { x: number; y: number }): Pt => [p.x / 100 * plane.offsetWidth, p.y / 100 * plane.offsetHeight];
            const sun: Pt = [0.5 * plane.offsetWidth, 0.5 * plane.offsetHeight];
            const stone: Pt | null = sr ? [(sr.left + sr.width / 2 - pr.left) * sx, (sr.top + sr.height / 2 - pr.top) * sx] : null;
            net = document.createElement('canvas'); net.width = cv.width; net.height = cv.height;
            const c = net.getContext('2d')!; c.scale(dpr, dpr); c.lineCap = 'round';
            const R = rng(42);
            const dim = targetId ? 0.45 : 1; dimNow = dim;
            c.shadowColor = `rgba(${J},0.5)`; c.shadowBlur = 6;
            const go = (a: Pt, b: Pt, al: number) => { const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) + (R() - 0.5) * 0.9; hypha(c, R, a[0], a[1], ang, 900, 1.0, al * dim, b, 0); };
            if (stone) go([stone[0], stone[1] - 18], sun, 0.6);
            planets.forEach((p) => go(sun, P(p), 0.46));
            c.shadowBlur = 0;
            // Staub: Punkte um die Mitte, wenige warme dazwischen.
            const g = () => (R() + R() + R() - 1.5) / 1.5;
            dust = [];
            const n = Math.round(Math.min(900, W * H / 900));
            for (let i = 0; i < n; i++) dust.push([sun[0] + g() * W * 0.42, sun[1] + g() * H * 0.48, R() < 0.85 ? 0.7 : 1.3, 0.3 + R() * 0.7, R() < 0.22]);
            if (targetId && stone) {
                const el = plane.querySelector<HTMLElement>(`[data-uv2-planet="${CSS.escape(targetId)}"]`);
                const t = planets.find((p) => p.id === targetId);
                if (el && t) {
                    const size = parseFloat(el.style.getPropertyValue('--territory-size')) || 60;
                    const T = P(t); const S: Pt = [stone[0], stone[1] - 18];
                    // Ende am Planetenrand seitlich über dem Namen (von der Steinseite her), nie durch den Namen.
                    const side = S[0] >= T[0] ? 1 : -1; const r = size / 2 + 2;
                    const end: Pt = [T[0] + side * r * 0.92, T[1] + r * 0.38];
                    const grad = c.createLinearGradient(S[0], S[1], end[0], end[1]);
                    grad.addColorStop(0, 'rgba(255,225,160,0.95)'); grad.addColorStop(1, 'rgba(240,200,120,0.85)');
                    const path = () => { c.beginPath(); c.moveTo(S[0], S[1]); c.bezierCurveTo(S[0] - side * 30, S[1] - 90, end[0] + side * 70, end[1] + Math.min(160, (S[1] - end[1]) * 0.45), end[0], end[1]); };
                    for (const [w, bl, a] of [[10, 18, 0.18], [4, 8, 0.45], [1.4, 2, 1]] as const) { c.save(); c.globalAlpha = a; c.strokeStyle = grad; c.lineWidth = w; c.shadowColor = 'rgba(255,210,130,1)'; c.shadowBlur = bl; path(); c.stroke(); c.restore(); }
                }
            }
        };

        const draw = (tms: number) => {
            raf = requestAnimationFrame(draw);
            if (document.hidden || tms - last < 80) return; last = tms;
            const c = cv.getContext('2d'); if (!c || !net) return;
            c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
            c.globalAlpha = 1; c.drawImage(net, 0, 0);
            c.setTransform(dpr, 0, 0, dpr, 0, 0);
            const tt = tms / 1000;
            for (let i = 0; i < dust.length; i++) {
                const [x, y, r, a, warm] = dust[i];
                const tw = reduce ? 1 : 0.7 + 0.3 * Math.sin(tt * (0.6 + (i % 7) * 0.13) + i);
                c.fillStyle = `rgba(${warm ? GOLD : J},${(warm ? 0.5 : 0.55) * a * tw * dimNow})`;
                c.beginPath(); c.arc(x + ox, y + oy, r, 0, 6.3); c.fill();
            }
            if (reduce) cancelAnimationFrame(raf);
        };

        build();
        raf = requestAnimationFrame(draw);
        let rt = 0;
        const onResize = () => { window.clearTimeout(rt); rt = window.setTimeout(build, 200); };
        window.addEventListener('resize', onResize);
        const t2 = window.setTimeout(build, 900); // nach dem Einschweben neu messen
        return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); window.clearTimeout(rt); window.clearTimeout(t2); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, targetId]);

    return <canvas ref={ref} className="uv2-myzel" data-working={working && targetId ? '' : undefined} aria-hidden="true" />;
}
