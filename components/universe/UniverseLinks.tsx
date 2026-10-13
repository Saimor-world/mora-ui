'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Lebende Instrumente (v2): verbindet Widget-Zeilen mit ihren Planeten.
 * - Zeile [data-uv2-link=id] unter dem Zeiger -> Planet [data-uv2-planet=id]
 *   leuchtet, eine feine, auslaufende Linie zeigt die Verbindung.
 * - Planet unter dem Zeiger -> zugehörige Zeilen leuchten mit.
 * - MÔRA (`mora:highlight`) -> passendes Instrument pulsiert kurz.
 * Reine Darstellung, keine Daten, keine Seiteneffekte.
 */
type Line = { x1: number; y1: number; x2: number; y2: number } | null;

const TYPE_TO_INSTRUMENT: Record<string, string> = {
    mail: 'horizont', calendar: 'horizont', rss: 'horizont', feed: 'horizont',
    incident: 'wache', nightwatch: 'wache', business: 'wirtschaft', revenue: 'wirtschaft',
};

export function UniverseLinks() {
    const [line, setLine] = useState<Line>(null);
    const current = useRef<string | null>(null);

    // Licht nach Tageszeit: Sonnenstand dreht den Terminator, Tönung folgt dem Tag.
    useEffect(() => {
        const apply = () => {
            const d = new Date(); const h = d.getHours() + d.getMinutes() / 60;
            const rot = Math.max(-70, Math.min(70, (h - 13) * 10));
            const tint = h < 6 || h >= 21 ? 'rgba(110,130,190,0.16)' : h < 10 ? 'rgba(255,214,150,0.10)' : h < 17 ? 'rgba(255,250,235,0)' : 'rgba(240,150,100,0.13)';
            const night = h < 6 || h >= 21 ? '0.18' : '0';
            const r = document.documentElement.style;
            r.setProperty('--uv2-sun-rot', rot.toFixed(1) + 'deg'); r.setProperty('--uv2-sun-tint', tint); r.setProperty('--uv2-sun-night', night);
        };
        apply(); const t = window.setInterval(apply, 5 * 60_000);
        return () => window.clearInterval(t);
    }, []);

    useEffect(() => {
        const clear = () => {
            document.querySelectorAll('.uv2-lit').forEach((el) => el.classList.remove('uv2-lit'));
            current.current = null;
            setLine(null);
        };
        const light = (id: string, from: Element | null) => {
            if (current.current === id) return;
            clear();
            current.current = id;
            document.querySelectorAll(`[data-uv2-link="${CSS.escape(id)}"], [data-uv2-planet="${CSS.escape(id)}"]`)
                .forEach((el) => el.classList.add('uv2-lit'));
            const planet = document.querySelector(`[data-uv2-planet="${CSS.escape(id)}"] .uv2-planet`)
                || document.querySelector(`[data-uv2-planet="${CSS.escape(id)}"]`);
            if (from && from.hasAttribute('data-uv2-link') && planet) {
                const a = from.getBoundingClientRect();
                const b = planet.getBoundingClientRect();
                const toLeft = b.left + b.width / 2 < a.left;
                setLine({ x1: toLeft ? a.left - 6 : a.right + 6, y1: a.top + a.height / 2, x2: b.left + b.width / 2, y2: b.top + b.height / 2 });
            }
        };
        const over = (e: MouseEvent) => {
            const t = e.target as Element | null;
            const row = t?.closest?.('[data-uv2-link]');
            if (row) return light(row.getAttribute('data-uv2-link')!, row);
            const planet = t?.closest?.('[data-uv2-planet]');
            if (planet) return light(planet.getAttribute('data-uv2-planet')!, planet);
            if (current.current) clear();
        };
        const pulse = (e: Event) => {
            const d = (e as CustomEvent).detail || {};
            const keys = [d.targetId, TYPE_TO_INSTRUMENT[String(d.targetType || '').toLowerCase()]].filter(Boolean).map(String);
            keys.forEach((k) => document.querySelectorAll(`[data-uv2-instrument="${CSS.escape(k)}"], [data-uv2-link="${CSS.escape(k)}"], [data-uv2-planet="${CSS.escape(k)}"]`).forEach((el) => {
                el.classList.remove('uv2-pulse');
                void (el as HTMLElement).offsetWidth;
                el.classList.add('uv2-pulse');
                window.setTimeout(() => el.classList.remove('uv2-pulse'), Math.max(1200, Number(d.duration) || 2000));
            }));
        };
        document.addEventListener('mouseover', over);
        window.addEventListener('mora:highlight', pulse);
        return () => { document.removeEventListener('mouseover', over); window.removeEventListener('mora:highlight', pulse); clear(); };
    }, []);

    if (!line) return null;
    const len = Math.hypot(line.x2 - line.x1, line.y2 - line.y1);
    return (
        <svg className="pointer-events-none fixed inset-0 z-[31] h-full w-full" aria-hidden data-testid="uv2-link-line">
            <defs>
                <linearGradient id="uv2-link-grad" gradientUnits="userSpaceOnUse" x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}>
                    <stop offset="0" stopColor="#D6A848" stopOpacity="0.9" />
                    <stop offset="1" stopColor="#D6A848" stopOpacity="0" />
                </linearGradient>
            </defs>
            <line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke="url(#uv2-link-grad)" strokeWidth="1"
                strokeDasharray={len} strokeDashoffset={len} className="uv2-link-draw" style={{ ['--uv2-len' as string]: len }} />
            <circle cx={line.x1} cy={line.y1} r="1.6" fill="#D6A848" />
        </svg>
    );
}

/** Zählt sanft auf den Zielwert (Site-Kurve), respektiert reduced-motion. */
export function useCountUp(target: number, ms = 900): number {
    const [v, setV] = useState(target);
    const from = useRef(0);
    useEffect(() => {
        if (typeof window === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setV(target); return; }
        const start = performance.now(); const a = from.current; let raf = 0;
        const ease = (t: number) => 1 - Math.pow(1 - t, 4);
        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / ms);
            setV(Math.round(a + (target - a) * ease(t)));
            if (t < 1) raf = requestAnimationFrame(tick); else from.current = target;
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [target, ms]);
    return v;
}

export function CountUp({ value }: { value: number }) {
    return <>{useCountUp(value)}</>;
}
