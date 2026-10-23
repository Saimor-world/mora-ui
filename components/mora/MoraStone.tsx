'use client';

import React, { useId } from 'react';
import { stylebook } from '@/lib/design/tokens';

/**
 * MÔRA — the one component for her everywhere (stylebook 22.10.2026).
 *
 * A round, matte jade stone (radial gradient, light top left at 38 %/32 %) with two
 * oval dark eyes. She blinks about every 7 s and breathes very calmly (scale 1.03, 6 s);
 * prefers-reduced-motion stops both. Never a crystal, blob, glitter or a mouth.
 *
 * The props are the stable interface: when visual assets arrive (visual-v1), only the
 * drawing inside changes. `thinking` and `halo` keep the os-kit MoraStone contract.
 * This replaces the earlier stone PNG with a light face (rule of 14.09.); the decision
 * of 22.10. gives MÔRA visible eyes.
 */
export interface MoraStoneProps {
  /** Diameter in px, clamped to 24–96. */
  size?: number;
  /** Universe centre only: MÔRA may grow to 160 px so it stays the largest body. */
  centre?: boolean;
  /** MÔRA is working on something: eyes look slightly up. */
  thinking?: boolean;
  /** Selected/open state, drawn as the jade focus ring (no glow). */
  halo?: boolean;
  /** Accessible name. Without it the stone is decorative. */
  label?: string;
  /** No blinking or breathing, e.g. in dense lists. */
  still?: boolean;
  className?: string;
}

const { mora } = stylebook;

export function clampMoraSize(size: number | undefined, centre = false): number {
  const value = typeof size === 'number' && Number.isFinite(size) ? size : 40;
  return Math.min(centre ? 160 : mora.maxSize, Math.max(mora.minSize, Math.round(value)));
}

export function MoraStone({ size, thinking = false, halo = false, label, still = false, className, centre = false }: MoraStoneProps) {
  const px = clampMoraSize(size, centre);
  const gradientId = `sb-mora-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  return (
    <svg
      className={['sb-mora', className].filter(Boolean).join(' ')}
      width={px}
      height={px}
      viewBox="0 0 100 100"
      data-testid="mora-stone"
      data-thinking={thinking ? 'true' : 'false'}
      data-state={thinking ? 'thinking' : 'calm'}
      data-selected={halo ? 'true' : undefined}
      style={still ? { animation: 'none' } : undefined}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <defs>
        <radialGradient id={gradientId} cx="38%" cy="32%" r="70%">
          <stop offset="0" stopColor={mora.light} />
          <stop offset=".55" stopColor={mora.mid} />
          <stop offset="1" stopColor={mora.deep} />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill={`url(#${gradientId})`} />
      <circle cx="50" cy="50" r="46" fill="none" stroke={mora.rim} strokeOpacity=".25" />
      <g className="sb-mora__eyes">
        <ellipse className="sb-mora__eye" cx="38" cy="47" rx="4.2" ry="6" fill={mora.eye} style={still ? { animation: 'none' } : undefined} />
        <ellipse className="sb-mora__eye" cx="62" cy="47" rx="4.2" ry="6" fill={mora.eye} style={still ? { animation: 'none' } : undefined} />
      </g>
    </svg>
  );
}

export default MoraStone;
