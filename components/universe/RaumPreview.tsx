'use client';

/**
 * Raum-Vorschau (Einstellungen · Universe V2): das echte Universe im Kleinen.
 * Gleiche Bereiche (useDepartments), gleiche Autonomie (capPlanets, max. 7 Planeten
 * + "Weitere"), gleiche Lage (buildOrganicUniverseLayout + normalizeUniverseLayout),
 * gleiche Körper (PlanetSphere mit Bereichszeichen), gleicher Himmel je Szene
 * (UNIVERSE_BASE/NEBULA) und gleiches Licht (sunLight → Terminator + Tönung).
 * Die Stunde kommt von der ziehbaren Sonne – die Vorschau reagiert sofort.
 */

import React, { useMemo } from 'react';
import { useNavStore } from '@/lib/store/navStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useDepartments } from '@/lib/queries/useDepartments';
import { isAdmin } from '@/lib/auth/roles';
import { capPlanets, OVERFLOW_ID } from '@/lib/universe/autonomy';
import { buildOrganicUniverseLayout, normalizeUniverseLayout } from '@/lib/universe/layout';
import { UNIVERSE_BASE, UNIVERSE_NEBULA, ACCENT_STARS } from '@/lib/universe/backdrop';
import { sunLightVars } from '@/lib/universe/sunLight';
import { PlanetSphere } from '@/components/universe/PlanetSphere';
import { planetGlyph } from '@/components/universe/OrganizationField';
import type { RitualSceneId } from '@/lib/os/ritualMode';

export function RaumPreview({ scene, hour }: { scene: RitualSceneId; hour: number }) {
  const companyId = useNavStore((s) => s.activeCompanyId);
  const user = useSessionStore((s) => s.user);
  const { data } = useDepartments(companyId);

  const planets = useMemo(() => {
    const all = (Array.isArray(data) ? data : [])
      .filter((d) => !user || isAdmin(user.role) || d.visibility !== 'private')
      .map((d) => ({ id: String(d.id), name: String(d.name || '') }));
    const { planets: kept, overflow } = capPlanets(all, {});
    const list = overflow.length ? [...kept, { id: OVERFLOW_ID, name: 'Weitere' }] : kept;
    const sorted = [...list].sort((a, b) => (a.id + ':' + a.name).localeCompare(b.id + ':' + b.name));
    return normalizeUniverseLayout(buildOrganicUniverseLayout(sorted, {}) as Array<{ id: string; name: string; x: number; y: number }>);
  }, [data, user]);

  const size = planets.length > 5 ? 50 : planets.length > 3 ? 58 : 68;
  return (
    <div className="uv2-raum__universe" data-testid="raum-preview" data-planets={planets.length} style={sunLightVars(hour) as React.CSSProperties}>
      <div className="absolute inset-0" style={{ background: UNIVERSE_BASE[scene], transition: 'background .6s' }} />
      <div className="absolute inset-0" style={{ background: UNIVERSE_NEBULA[scene], mixBlendMode: 'screen', transition: 'background .6s' }} />
      {ACCENT_STARS.map((s, i) => (
        <span key={i} className="absolute rounded-full" style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size * 0.8, height: s.size * 0.8, background: s.color, opacity: 0.7 }} />
      ))}
      {planets.length === 0 ? (
        <span className="uv2-raum__core" aria-label="MÔRA">M</span>
      ) : planets.map((p, i) => (
        <span key={p.id} className="uv2-raum__pl" style={{ left: `${10 + p.x * 0.8}%`, top: `${8 + p.y * 0.74}%`, width: size, height: size }}>
          <PlanetSphere name={p.name} size={size} seed={i + 3} glyph={planetGlyph(p.name)} />
          <span className="uv2-raum__bodyname">{p.name}</span>
        </span>
      ))}
    </div>
  );
}
