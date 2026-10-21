'use client';

import React, { useEffect, useState } from 'react';
import { isUniverseV2Enabled } from '@/lib/universe/morgen';
import { useMoraPresence, type MoraPlace } from '@/lib/universe/moraPresence';
import { useNavStore } from '@/lib/store/navStore';
import { MoraLook } from '@/components/universe/MoraLook';

type Anchor = { x: number; y: number; size: number };

const SIZE: Record<MoraPlace, number> = { seat: 96, dock: 44, planet: 48 };

function measure(place: MoraPlace, target?: string | null): Anchor | null {
    if (typeof document === 'undefined') return null;
    if (place === 'seat') {
        const el = document.querySelector<HTMLElement>('[data-testid="uv2-mora-seat"]');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        if (r.width < 8 && r.height < 8) return null;
        // Universe verdeckt (Home, Fenster): Sitz gilt als nicht sichtbar → Dock.
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        if (top && top.closest('[data-testid="uv2-home"], [data-pane-id], [role="dialog"]')) return null;
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 - 4, size: SIZE.seat };
    }
    if (place === 'dock') {
        const el = document.querySelector<HTMLElement>('[data-testid="uv2-mora-dock-slot"]');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        if (r.width < 8 && r.height < 8) return null;
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, size: SIZE.dock };
    }
    const id = target ? CSS.escape(target) : '';
    const el = (id && document.querySelector<HTMLElement>(`[data-uv2-planet="${id}"] .saimor-territory-body`))
        || (id && document.querySelector<HTMLElement>(`[data-uv2-planet="${id}"]`))
        || document.querySelector<HTMLElement>('[data-uv2-planet][aria-pressed="true"] .saimor-territory-body');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width < 8 && r.height < 8) return null;
    return { x: r.left + r.width / 2, y: r.top - 6, size: SIZE.planet };
}

/**
 * Der eine fliegende Körper. Sitz, Dock und Planet zeichnen nur ihre leere Spur.
 * Reduced-motion: Ort wechselt ohne Flug.
 */
export function MoraPresenceLayer() {
    const v2 = isUniverseV2Enabled();
    const presence = useMoraPresence();
    const voiceOpen = useNavStore((s) => s.voiceOverlayOpen);
    const [anchor, setAnchor] = useState<Anchor | null>(null);

    useEffect(() => {
        if (!v2 || voiceOpen) return;
        let cancelled = false;
        const tick = () => {
            if (cancelled) return;
            // Kontext-Regel: Sitz/Planet nur, wenn das Universe sichtbar ist; sonst Dock.
            const next = measure(presence.place, presence.target) ?? (presence.place !== 'dock' ? measure('dock') : null);
            setAnchor((prev) => {
                if (!next) return null;
                if (prev && Math.abs(prev.x - next.x) < 0.5 && Math.abs(prev.y - next.y) < 0.5 && prev.size === next.size) return prev;
                return next;
            });
        };
        tick();
        const id = window.setInterval(tick, 80);
        window.addEventListener('resize', tick);
        return () => {
            cancelled = true;
            window.clearInterval(id);
            window.removeEventListener('resize', tick);
        };
    }, [v2, voiceOpen, presence.place, presence.target]);

    if (!v2 || voiceOpen) return null;

    return (
        <div className="uv2-mora-presence" data-testid="uv2-mora-presence" data-mora-place={presence.place} aria-hidden>
            {anchor && (
                <div
                    className="uv2-mora-figure"
                    data-testid="uv2-mora-figure"
                    data-mora-place={presence.place}
                    data-mora-state={presence.state}
                    style={{
                        ['--mora-x' as string]: String(anchor.x),
                        ['--mora-y' as string]: String(anchor.y),
                        ['--mora-size' as string]: `${anchor.size}px`,
                    }}
                >
                    <MoraLook state={presence.state} size={anchor.size} />
                </div>
            )}
        </div>
    );
}
