'use client';
import React, { useMemo } from 'react';

export interface CrewRelicSpec {
  /** Human-facing instance 001..111 */
  instance: string;
  /** Deterministic generation seed 1001..1111 (SAIMÔR // ORIGIN convention) */
  seed: number;
  mineralName: string;
  /** Core quartz refraction colors */
  quartzCore: string;
  quartzEdge: string;
  caustic: string;
  /** Metal bezel colors (brass/gold for Captain, titanium/ruthenium for Crew) */
  bezelLight: string;
  bezelDark: string;
  /** Asymmetric architectural geometry (Ma — spatial restraint) */
  cleftX: number;
  cleftWidth: number;
  cleftTilt: number;
  ringRadius: number;
  ringOffsetX: number;
  ringOffsetY: number;
  barY: number;
  facetAngle: number;
}

const MINERALS = [
  { name: 'Jade-Quarz', core: '#5eb897', edge: '#183c32', caustic: '#c8f4e2' },
  { name: 'Rauch-Citrin', core: '#d49b4b', edge: '#3d2a12', caustic: '#fae3be' },
  { name: 'Seladon-Chalcedon', core: '#7aaea2', edge: '#1e3533', caustic: '#d9f0ea' },
  { name: 'Schiefer-Obsidian', core: '#7a8ea3', edge: '#1b2530', caustic: '#d6e3f0' },
  { name: 'Ruthenium-Quarz', core: '#949ba1', edge: '#25292e', caustic: '#e6eaed' },
  { name: 'Bernstein-Kalzit', core: '#c97f43', edge: '#382010', caustic: '#f7d8bc' },
] as const;

function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Deterministischer Artefakt-Generator für Mitglieder-Avatare (SAIMÔR // ORIGIN Konvention):
 * Gleicher Name/ID erzeugt immer exakt dasselbe Basalt-/Quarz-Medaillon und denselben Seed (1001–1111).
 */
export function deriveCrewRelic(identity: string, isCaptain = false): CrewRelicSpec {
  const normalized = (identity || 'crew').trim().toLowerCase();
  const h = fnv1a(normalized);
  const idx111 = (h % 111) + 1;
  const instance = String(idx111).padStart(3, '0');
  const seed = 1000 + idx111;

  const mineral = MINERALS[h % MINERALS.length];
  const bezelLight = isCaptain ? '#dfc082' : '#9ca5ab';
  const bezelDark = isCaptain ? '#6e5223' : '#32383d';

  // Asymmetric architectural proportions in a 36x36 coordinate space
  const cleftX = 13 + ((h >>> 4) % 10); // 13..22
  const cleftWidth = 2.4 + (((h >>> 8) % 5) * 0.45); // 2.4..4.2
  const cleftTilt = -12 + ((h >>> 12) % 25); // -12..12 deg
  const ringRadius = 7.5 + (((h >>> 16) % 5) * 0.9); // 7.5..11.1
  const ringOffsetX = -2 + ((h >>> 20) % 5); // -2..2
  const ringOffsetY = -2 + ((h >>> 23) % 5); // -2..2
  const barY = 12 + ((h >>> 26) % 13); // 12..24
  const facetAngle = 25 + ((h >>> 28) % 130);

  return {
    instance,
    seed,
    mineralName: mineral.name,
    quartzCore: mineral.core,
    quartzEdge: mineral.edge,
    caustic: mineral.caustic,
    bezelLight,
    bezelDark,
    cleftX,
    cleftWidth,
    cleftTilt,
    ringRadius,
    ringOffsetX,
    ringOffsetY,
    barY,
    facetAngle,
  };
}

export interface CrewRelicAvatarProps {
  name: string;
  id?: string;
  isCaptain?: boolean;
  status?: 'online' | 'offline';
  size?: number;
  className?: string;
  testId?: string;
}

/**
 * Subtiles, deterministisches Relikt-Medaillon (Basalt, optischer Quarz & Ruthenium/Messing-Fassung).
 * Keine Cartoon-PFPs, keine Initialen-Blasen, kein <title>-Tooltip (stille Materialität).
 */
export function CrewRelicAvatar({
  name,
  id,
  isCaptain = false,
  status,
  size = 22,
  className,
  testId,
}: CrewRelicAvatarProps) {
  const spec = useMemo(() => deriveCrewRelic(id || name, isCaptain), [id, name, isCaptain]);
  const uid = useMemo(() => `relic-${spec.seed}-${fnv1a(`${id ?? ''}:${name}`) % 9999}`, [spec.seed, id, name]);

  return (
    <span
      className={`crew-relic${isCaptain ? ' crew-relic--captain' : ''}${status === 'online' ? ' is-online' : ''}${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size, display: 'inline-flex', position: 'relative', flexShrink: 0 }}
      data-testid={testId ?? 'crew-relic-avatar'}
      data-origin-seed={spec.seed}
      data-origin-instance={spec.instance}
      aria-hidden="true"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block', width: '100%', height: '100%', overflow: 'visible' }}
      >
        <defs>
          <radialGradient id={`${uid}-basalt`} cx="35%" cy="28%" r="75%">
            <stop offset="0%" stopColor="#262c30" />
            <stop offset="55%" stopColor="#121619" />
            <stop offset="100%" stopColor="#080a0c" />
          </radialGradient>
          <linearGradient id={`${uid}-bezel`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={spec.bezelLight} />
            <stop offset="50%" stopColor={spec.bezelDark} />
            <stop offset="100%" stopColor={spec.bezelLight} stopOpacity="0.75" />
          </linearGradient>
          <linearGradient id={`${uid}-quartz`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={spec.caustic} stopOpacity="0.92" />
            <stop offset="45%" stopColor={spec.quartzCore} stopOpacity="0.88" />
            <stop offset="100%" stopColor={spec.quartzEdge} stopOpacity="0.95" />
          </linearGradient>
          <clipPath id={`${uid}-clip`}>
            <circle cx="18" cy="18" r="15.2" />
          </clipPath>
        </defs>

        {/* Äußere Ruthenium-/Messing-Fassung */}
        <circle cx="18" cy="18" r="16.8" fill={`url(#${uid}-basalt)`} stroke={`url(#${uid}-bezel)`} strokeWidth={isCaptain ? '1.6' : '1.15'} />

        {/* Basalt-Relief & optische Quarz-Apertur im Inneren */}
        <g clipPath={`url(#${uid}-clip)`}>
          {/* Subtile tektonische Facette im Basalt */}
          <line
            x1="2"
            y1={spec.barY}
            x2="34"
            y2={36 - spec.barY}
            stroke={spec.bezelLight}
            strokeOpacity="0.16"
            strokeWidth="0.75"
          />

          {/* Präzisionsring (versetzt nach Ma-Prinzip) */}
          <circle
            cx={18 + spec.ringOffsetX}
            cy={18 + spec.ringOffsetY}
            r={spec.ringRadius}
            stroke={spec.quartzCore}
            strokeOpacity="0.42"
            strokeWidth="0.9"
          />

          {/* Optische Quarz-Spalte (Fused Optical Quartz Aperture) */}
          <g transform={`rotate(${spec.cleftTilt} 18 18)`}>
            <rect
              x={spec.cleftX - spec.cleftWidth / 2}
              y="4.5"
              width={spec.cleftWidth}
              height="27"
              rx={spec.cleftWidth / 2}
              fill={`url(#${uid}-quartz)`}
            />
            {/* Kaustische Lichtkante */}
            <line
              x1={spec.cleftX}
              y1="6.5"
              x2={spec.cleftX}
              y2="29.5"
              stroke={spec.caustic}
              strokeOpacity="0.85"
              strokeWidth="0.8"
            />
          </g>

          {/* Horizontale Struktur-Klammer bei Captains */}
          {isCaptain ? (
            <line
              x1="7"
              y1={spec.barY}
              x2="29"
              y2={spec.barY}
              stroke={spec.bezelLight}
              strokeOpacity="0.7"
              strokeWidth="1.1"
            />
          ) : null}
        </g>

        {/* Ruhiger Online-Präsenzpunkt am Fassungsrand */}
        {status === 'online' ? (
          <circle
            cx="30.5"
            cy="29.5"
            r="3.1"
            fill="#6fc7a4"
            stroke="#081014"
            strokeWidth="1.2"
          />
        ) : null}
      </svg>
    </span>
  );
}
