'use client';
import React from 'react';
import { GlassOrb, glassVariantFor } from '@/components/world/GlassOrb';
import type { Rect, World } from '../model/stage';

export interface SkyPlanet { id: string; title: string }

/**
 * Das Universum hinter dem Fenster: derselbe See und dieselben Abteilungs-Planeten wie draußen,
 * sehr langsam vorbeiziehend (keine Blinker). Liegt UNTER dem Raumbild; die Scheiben sind dort durchsichtig.
 */
export function WindowUniverse({ rect, world, planets, focusId }: { rect: Rect; world: World; planets: SkyPlanet[]; focusId?: string | null }) {
  const list = planets.slice(0, 6);
  const focusIdx = Math.max(0, list.findIndex((p) => p.id === focusId));
  // Feste, ruhige Plätze: die eigene Abteilung groß und nah, die anderen klein und fern.
  const spots = [
    { x: 0.70, y: 0.30, s: 0.30 }, { x: 0.22, y: 0.22, s: 0.11 }, { x: 0.42, y: 0.12, s: 0.07 },
    { x: 0.88, y: 0.62, s: 0.08 }, { x: 0.10, y: 0.55, s: 0.06 }, { x: 0.55, y: 0.48, s: 0.05 },
  ];
  const order = list.length ? [list[focusIdx], ...list.filter((_, i) => i !== focusIdx)] : [];
  return (
    <div className="wk-sky" data-world={world} data-testid="wk-window-universe" aria-hidden
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}>
      <div className="wk-sky__drift">
        <div className="wk-sky__lake" />
        {order.map((p, i) => {
          const s = spots[i];
          const size = Math.round(Math.min(rect.w, rect.h) * s.s * (i === 0 ? 1.4 : 1));
          return (
            <span key={p.id} className="wk-sky__planet" data-own={i === 0 ? '1' : undefined}
              style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%`, width: size, height: size, ['--i' as string]: i }}>
              <GlassOrb size={size} variant={glassVariantFor(p.title)} className="ck-opal ck-opal--true" />
            </span>
          );
        })}
      </div>
    </div>
  );
}
