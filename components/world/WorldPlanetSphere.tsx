import React from 'react';
import type { MatteTone } from '@/lib/universe/matteTone';

/** Matte Kugel aus visual-v1: Klasse und Variablen kommen aus matteTone(name). */
export function WorldPlanetSphere({ tone, size, className, children }: { tone: MatteTone; size: number; className?: string; children?: React.ReactNode }) {
  return (
    <span
      className={`wd-sphere ${tone.className}${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size, ...(tone.vars as React.CSSProperties) }}
      aria-hidden
    >
      {children}
    </span>
  );
}
