"use client";

import { useLayoutEffect, useRef, useState } from 'react';
import { Activity, Building2, CalendarDays, Mail, Rss, TrendingUp } from 'lucide-react';
import type { TickerItem } from '@/lib/universe/ticker';

/**
 * Das Datenband - der Ausgleich zu den ruhigen Planeten.
 *
 * Marius, vor der laufenden Vorschau: "viel zu wenig info, ich weiss gar
 * nicht wo ich hinschauen soll". Sein eigener Vergleich war ein Bloomberg-
 * Terminal: voll, nicht leer. Dieses Band zeigt fortlaufend echte Werte, die
 * im Feld ohnehin schon stehen - nichts Neues erfunden, nur dichter gezeigt.
 *
 * Zwei Kopien der Liste hintereinander, um die Breite EINER Kopie verschoben:
 * das ist die uebliche Technik fuer einen nahtlosen CSS-Marquee, ohne bei
 * jedem Frame in JS nachzurechnen. Die Breite wird einmal nach dem Rendern
 * gemessen, die Geschwindigkeit haengt von ihr ab - mehr Eintraege heisst
 * laenger unterwegs, nicht hektischer.
 */

const TONE: Record<string, { color: string; icon: React.ReactNode }> = {
    territory: { color: '#67e8f9', icon: <Building2 size={11} /> },
    nightwatch: { color: '#fcd34d', icon: <Activity size={11} /> },
    business: { color: '#6ee7b7', icon: <TrendingUp size={11} /> },
    mail: { color: '#7dd3fc', icon: <Mail size={11} /> },
    calendar: { color: '#6ee7b7', icon: <CalendarDays size={11} /> },
    feed: { color: '#c4b5fd', icon: <Rss size={11} /> },
};

function toneFor(id: string) {
    const category = id.split(':')[0];
    return TONE[category] ?? TONE.territory;
}

export function UniverseTicker({ items }: { items: TickerItem[] }) {
    const trackRef = useRef<HTMLDivElement | null>(null);
    const [style, setStyle] = useState<{ distance: string; duration: string } | null>(null);

    useLayoutEffect(() => {
        const node = trackRef.current;
        if (!node) return;
        // Eine Kopie ist exakt die Haelfte der Spur (zwei Kopien hintereinander).
        const width = node.scrollWidth / 2;
        if (width <= 0) return;
        // Konstante gefuehlte Geschwindigkeit statt konstanter Dauer: 70px/s,
        // damit ein dichtes Band nicht hektischer wirkt als ein schmales.
        setStyle({ distance: width + 'px', duration: Math.max(18, width / 70) + 's' });
    }, [items]);

    if (items.length === 0) return null;

    return (
        <div
            className="pointer-events-none absolute inset-x-0 top-[176px] z-[25] overflow-hidden border-y border-white/[0.06] bg-[#050c16]/58 py-1.5 backdrop-blur-sm"
            aria-hidden="true"
        >
            <div
                ref={trackRef}
                className="saimor-ticker-track flex w-max items-center gap-8 whitespace-nowrap"
                style={style ? ({ '--ticker-distance': style.distance, '--ticker-duration': style.duration } as React.CSSProperties) : undefined}
            >
                {[0, 1].map((copy) => (
                    <div key={copy} className="flex items-center gap-8" aria-hidden={copy === 1}>
                        {items.map((item) => {
                            const tone = toneFor(item.id);
                            return (
                                <span key={copy + ':' + item.id} className="flex items-center gap-2 text-[10px] font-medium tracking-[0.08em] text-white/56">
                                    <span style={{ color: tone.color }}>{tone.icon}</span>
                                    {item.text}
                                    <span className="ml-6 h-1 w-1 rounded-full bg-white/20" />
                                </span>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}
