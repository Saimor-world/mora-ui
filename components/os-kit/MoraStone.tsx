import React from 'react';
import { MoraFace } from '@/components/mora/MoraFace';
import { cx } from './cx';

export interface MoraStoneProps {
  size?: number;
  thinking?: boolean;
  /** Halo glow around the stone. */
  halo?: boolean;
  /** Marius' A4 face (light in the stone). Default: from 24 px on; below that it is noise. */
  face?: boolean;
  className?: string;
  label?: string;
}

/**
 * MÔRA presence — the real stone asset (public/brand/mora-stone-v1.png) with the
 * approved A4 face (components/mora/MoraFace, 14.10.), halo and thinking state.
 * The stone image itself is never redrawn; the eyes are a light layer on top.
 */
export function MoraStone({ size = 30, thinking = false, halo = true, face, className, label }: MoraStoneProps) {
  const withFace = face ?? size >= 24;
  return (
    <span
      className={cx('os-mora-stone', halo && 'os-mora-stone--halo', thinking && 'os-mora-stone--thinking', className)}
      style={{ width: size, height: size }}
      data-testid="mora-stone"
      data-thinking={thinking ? 'true' : 'false'}
      data-face={withFace ? 'true' : 'false'}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/mora-stone-v1.png" alt="" width={size} height={size} draggable={false} />
      {withFace ? <MoraFace size={size} arcsOnGreet={size >= 64} state={thinking ? 'think' : undefined} /> : null}
    </span>
  );
}
