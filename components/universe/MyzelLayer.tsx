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

export function MyzelLayer({ planets, focusId = null }: { planets: Array<{ id: string; x: number; y: number }>; focusId?: string | null }) {
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
            const originSel = presence.place === 'seat'
                ? '[data-testid="uv2-mora-seat"]'
                : presence.place === 'planet' && presence.target
                    ? `[data-uv2-planet="${CSS.escape(presence.target)}"] .saimor-territory-body, [data-uv2-planet="${CSS.escape(presence.target)}"]`
                    : '[data-testid="uv2-mora-dock-slot"], [data-mora-orb] button, [data-mora-orb]';
            const stoneEl = document.querySelector<HTMLElement>(originSel);
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
            c.shadowColor = `rgba(${J},0.6)`; c.shadowBlur = 5;
            void hypha; void R;
            // Ruhe: kein Faden. Bei Zeigen/Fokus: Stein → Mitte → Planet, um andere Planeten herum geführt.
            const fp = focusId && !targetId ? planets.find((p) => p.id === focusId) : undefined;
            const obstacles: Array<[number, number, number]> = [];
            plane.querySelectorAll<HTMLElement>('[data-uv2-planet]').forEach((el) => {
                const id = el.getAttribute('data-uv2-planet'); const pl = planets.find((q) => q.id === id); if (!pl) return;
                const sz = parseFloat(el.style.getPropertyValue('--territory-size')) || 60; const pp = P(pl);
                obstacles.push([pp[0], pp[1] + sz * 0.2, sz / 2 + 10]); // Kugel + Name darunter
            });
            const routed = (a: Pt, b: Pt, skip: Pt | null): Pt[] => {
                const n = 48; let pts: Pt[] = Array.from({ length: n }, (_, i) => [a[0] + (b[0] - a[0]) * i / (n - 1), a[1] + (b[1] - a[1]) * i / (n - 1)] as Pt);
                const obs = obstacles.filter((o) => !skip || Math.hypot(o[0] - skip[0], o[1] - skip[1]) > 4);
                for (let it = 0; it < 60; it++) {
                    for (let i = 1; i < n - 1; i++) for (const [ox, oy, orr] of obs) {
                        const dx = pts[i][0] - ox, dy = pts[i][1] - oy; const d = Math.hypot(dx, dy) || 0.01;
                        if (d < orr) { pts[i] = [ox + dx / d * orr, oy + dy / d * orr]; }
                    }
                    pts = pts.map((q, i) => (i === 0 || i === n - 1) ? q : [(pts[i - 1][0] + q[0] * 2 + pts[i + 1][0]) / 4, (pts[i - 1][1] + q[1] * 2 + pts[i + 1][1]) / 4] as Pt);
                }
                return pts;
            };
            const strokeRouted = (pts: Pt[], al: number) => {
                const n = pts.length;
                for (let i = 1; i < n - 1; i++) {
                    const t = i / n; const fade = Math.min(1, Math.sin(Math.PI * t) * 1.8 + 0.2);
                    c.strokeStyle = `rgba(${J},${al * fade})`; c.lineWidth = 1;
                    const m0: Pt = [(pts[i - 1][0] + pts[i][0]) / 2, (pts[i - 1][1] + pts[i][1]) / 2];
                    const m1: Pt = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2];
                    c.beginPath(); c.moveTo(m0[0], m0[1]); c.quadraticCurveTo(pts[i][0], pts[i][1], m1[0], m1[1]); c.stroke();
                }
            };
            if (fp) {
                const T = P(fp);
                if (stone && targetId) strokeRouted(routed([stone[0], stone[1] - 18], sun, null), 0.32);
                strokeRouted(routed(sun, T, T), 0.55);
            }
            c.shadowBlur = 0;
            // Staub: Punkte um die Mitte, wenige warme dazwischen.
            const g = () => (R() + R() + R() - 1.5) / 1.5;
            dust = [];
            const n = Math.round(Math.min(240, W * H / 3200));
            for (let i = 0; i < n; i++) dust.push([sun[0] + g() * W * 0.42, sun[1] + g() * H * 0.48, R() < 0.85 ? 0.7 : 1.3, 0.3 + R() * 0.7, R() < 0.22]);
            // Marius dislikes the gold connecting line from stone to planet.
            // Instead, the target planet gets a gentle glow via CSS [data-mora-lit] attribute.
            // The glow is handled in universe-room.css and universe-orbits.css
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
                c.fillStyle = `rgba(${warm ? GOLD : J},${(warm ? 0.32 : 0.34) * a * tw * dimNow})`;
                c.beginPath(); c.arc(x + ox, y + oy, r, 0, 6.3); c.fill();
            }
            if (reduce) cancelAnimationFrame(raf);
        };

        build();
        raf = requestAnimationFrame(draw);
        let rt = 0;
        const onResize = () => { window.clearTimeout(rt); rt = window.setTimeout(build, 200); };
        window.addEventListener('resize', onResize);
        const t2 = focusId ? 0 : window.setTimeout(build, 900); // nach dem Einschweben neu messen
        return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); window.clearTimeout(rt); window.clearTimeout(t2); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, targetId, focusId, presence.place, presence.target]);

    return <canvas ref={ref} className="uv2-myzel" data-working={working && targetId ? '' : undefined} aria-hidden="true" />;
}
