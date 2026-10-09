import React from 'react';
import { cx } from './cx';

export interface SurfaceProps extends React.HTMLAttributes<HTMLElement> {
  variant?: 'default' | 'strong' | 'quiet';
  padding?: 0 | 3 | 4 | 5 | 6;
  as?: 'section' | 'div' | 'article' | 'button';
  interactive?: boolean;
}

export function Surface({ variant = 'default', padding = 5, as = 'section', interactive, className, style, ...rest }: SurfaceProps) {
  const Tag = (interactive ? 'button' : as) as React.ElementType;
  return (
    <Tag
      {...(interactive ? { type: 'button' } : {})}
      className={cx('os-surface', variant !== 'default' && `os-surface--${variant}`, interactive && 'os-surface--interactive', className)}
      style={{ padding: `var(--os-space-${padding})`, ...style }}
      {...rest}
    />
  );
}

export interface PanelProps extends React.HTMLAttributes<HTMLElement> {
  label: string;
}

/** Side/bottom panel container (used by the MÔRA dock). */
export function Panel({ label, className, ...rest }: PanelProps) {
  return <aside aria-label={label} className={cx('os-panel', className)} {...rest} />;
}
