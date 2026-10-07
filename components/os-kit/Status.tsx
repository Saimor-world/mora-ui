import React from 'react';
import type { OsTone } from '@/lib/design/osTokens';
import { cx } from './cx';

export interface StatusProps {
  tone?: OsTone;
  children: React.ReactNode;
  title?: string;
}

/** Small status pill. Colour carries meaning (safe/warning/critical/ai/info/neutral). */
export function Status({ tone = 'neutral', children, title }: StatusProps) {
  return <span title={title} className={cx('os-status', tone !== 'neutral' && `os-status--${tone}`)} data-tone={tone}>{children}</span>;
}
