import React from 'react';
import { PixelMoraMark } from '@/components/world/PixelMora';
import { cx } from './cx';

export interface MoraStoneProps {
  size?: number;
  thinking?: boolean;
  /** Halo glow behind MÔRA. */
  halo?: boolean;
  /** Kept for callers; the pixel figure always shows her face. */
  face?: boolean;
  className?: string;
  label?: string;
}

/**
 * MÔRA presence in small places (chat, sources, status lines): the current pixel MÔRA from the final set,
 * with her worn wardrobe, a halo and the thinking state. The old jade stone is retired everywhere.
 */
export function MoraStone({ size = 30, thinking = false, halo = true, className, label }: MoraStoneProps) {
  return (
    <span
      className={cx('os-mora-stone', halo && 'os-mora-stone--halo', thinking && 'os-mora-stone--thinking', className)}
      style={{ width: size, height: size }}
      data-testid="mora-stone"
      data-thinking={thinking ? 'true' : 'false'}
      data-face="true"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <PixelMoraMark size={size} />
    </span>
  );
}
