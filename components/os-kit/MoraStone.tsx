import React from 'react';
import { cx } from './cx';

export interface MoraStoneProps {
  size?: number;
  thinking?: boolean;
  /** Halo glow around the stone. */
  halo?: boolean;
  className?: string;
  label?: string;
}

/** MÔRA presence — the real stone asset (public/brand/mora-stone-v1.png) with halo and thinking state. */
export function MoraStone({ size = 30, thinking = false, halo = true, className, label }: MoraStoneProps) {
  return (
    <span
      className={cx('os-mora-stone', halo && 'os-mora-stone--halo', thinking && 'os-mora-stone--thinking', className)}
      style={{ width: size, height: size }}
      data-testid="mora-stone"
      data-thinking={thinking ? 'true' : 'false'}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/mora-stone-v1.png" alt="" width={size} height={size} draggable={false} />
    </span>
  );
}
