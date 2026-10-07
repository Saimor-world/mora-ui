import React from 'react';
import { cx } from './cx';

type Variant = 'display' | 'title' | 'body' | 'meta' | 'eyebrow';
type Tone = 'default' | 'muted' | 'faint' | 'accent';

const TAGS: Record<Variant, keyof JSX.IntrinsicElements> = {
  display: 'h1', title: 'h2', body: 'p', meta: 'p', eyebrow: 'div',
};

export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  variant?: Variant;
  tone?: Tone;
  as?: keyof JSX.IntrinsicElements;
}

export function Text({ variant = 'body', tone, as, className, ...rest }: TextProps) {
  const Tag = (as || TAGS[variant]) as React.ElementType;
  const resolvedTone = tone || (variant === 'meta' || variant === 'eyebrow' ? 'faint' : variant === 'body' ? 'muted' : 'default');
  return <Tag className={cx(`os-text-${variant}`, `os-tone-${resolvedTone}`, 'm-0', className)} {...rest} />;
}
