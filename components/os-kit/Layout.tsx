import React from 'react';
import type { OsSpace } from '@/lib/design/osTokens';
import { cx } from './cx';

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  gap?: OsSpace;
  direction?: 'row' | 'column';
  align?: React.CSSProperties['alignItems'];
  justify?: React.CSSProperties['justifyContent'];
  wrap?: boolean;
}

/** Spacing primitive: flex stack whose gap is always a token. */
export function Stack({ gap = 3, direction = 'column', align, justify, wrap, style, className, ...rest }: StackProps) {
  return (
    <div
      className={cx('flex', className)}
      style={{ flexDirection: direction, gap: `var(--os-space-${gap})`, alignItems: align, justifyContent: justify, flexWrap: wrap ? 'wrap' : undefined, ...style }}
      {...rest}
    />
  );
}

export interface ResponsiveGridProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: 1 | 2 | 3;
}

/** Responsive layout primitive: n columns on desktop, single column below 900px. */
export function ResponsiveGrid({ columns = 2, className, ...rest }: ResponsiveGridProps) {
  return <div className={cx('os-grid', columns > 1 && `os-grid--${columns}`, className)} {...rest} />;
}

export function Divider() {
  return <hr className="os-divider" />;
}
