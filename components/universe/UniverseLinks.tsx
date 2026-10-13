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

    // Parallaxe: das Feld folgt dem Zeiger um wenige Pixel – Tiefe, kein Effekt.
    useEffect(() => {
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
        let raf = 0;
        const move = (e: MouseEvent) => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                const x = (e.clientX / window.innerWidth - 0.5) * 2; const y = (e.clientY / window.innerHeight - 0.5) * 2;
                const r = document.documentElement.style;
                r.setProperty('--uv2-px', x.toFixed(3)); r.setProperty('--uv2-py', y.toFixed(3));
            });
        };
        window.addEventListener('mousemove', move, { passive: true });
        return () => { window.removeEventListener('mousemove', move); cancelAnimationFrame(raf); };
    }, []);

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
                // Start im Steg links neben der Instrumentenspalte – so kreuzt die Linie
                // nie Zahlen oder Text der Spalte; Ende am Planetenrand statt in der Mitte.
                const col = from.closest('[data-uv2-col]')?.getBoundingClientRect();
                const x1 = (col ? col.left : a.left) - 12; const y1 = a.top + a.height / 2;
                const cx = b.left + b.width / 2; const cy = b.top + b.height / 2; const r = b.width / 2 + 6;
                const ang = Math.atan2(y1 - cy, x1 - cx);
                setLine({ x1, y1, x2: cx + Math.cos(ang) * r, y2: cy + Math.sin(ang) * r });
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
        // MÔRA hat geantwortet: Thema erkennen, passende Instrumente und Bereiche pulsieren.
        const answered = (e: Event) => {
            const text = String((e as CustomEvent).detail?.text || '').toLowerCase();
            const hits = new Set<string>();
            if (/mail|post|nachricht/.test(text)) hits.add('horizont');
            if (/termin|kalender|meeting|gespräch/.test(text)) hits.add('horizont');
            if (/vorfall|zertifikat|wache|nightwatch|ausfall/.test(text)) hits.add('wache');
            if (/umsatz|abo|paddle|einnahme/.test(text)) hits.add('wirtschaft');
            document.querySelectorAll('[data-uv2-link][data-mora-label]').forEach((el) => {
                const name = (el.getAttribute('data-mora-label') || '').toLowerCase().split(/[ &]+/)[0];
                if (name && name.length > 3 && text.includes(name)) hits.add(el.getAttribute('data-uv2-link')!);
            });
            if (/rechnung|zahlung|bank|liquidit/.test(text)) {
                document.querySelectorAll('[data-uv2-link][data-mora-label^="Finanz"]').forEach((el) => hits.add(el.getAttribute('data-uv2-link')!));
            }
            hits.forEach((k) => pulse(new CustomEvent('mora:highlight', { detail: { targetId: k, duration: 2400 } })));
        };
        window.addEventListener('uv2:mora-answer', answered);
        document.addEventListener('mouseover', over);
        window.addEventListener('mora:highlight', pulse);
        return () => { window.removeEventListener('uv2:mora-answer', answered); document.removeEventListener('mouseover', over); window.removeEventListener('mora:highlight', pulse); clear(); };
    }, []);

    if (!line) return null;
    const len = Math.hypot(line.x2 - line.x1, line.y2 - line.y1);
    return (
        <svg className="pointer-events-none fixed inset-0 z-[31] h-full w-full" aria-hidden data-testid="uv2-link-line">
            <defs>
                <linearGradient id="uv2-link-grad" gradientUnits="userSpaceOnUse" x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}>
                    <stop offset="0" stopColor="#D6A848" stopOpacity="0.85" />
                    <stop offset="1" stopColor="#D6A848" stopOpacity="0.15" />
                </linearGradient>
            </defs>
            <line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke="url(#uv2-link-grad)" strokeWidth="1"
                strokeDasharray={len} strokeDashoffset={len} className="uv2-link-draw" style={{ ['--uv2-len' as string]: len }} />
            <circle cx={line.x1} cy={line.y1} r="1.6" fill="#D6A848" />
            <circle cx={line.x2} cy={line.y2} r="1.2" fill="#D6A848" opacity="0.5" />
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
