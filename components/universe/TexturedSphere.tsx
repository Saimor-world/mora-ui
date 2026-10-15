'use client';

import React, { useEffect, useRef, useState } from 'react';
import { loadPlanetSurface, planetSurfaceKind } from '@/lib/universe/planetSurfaceClient';

/** A static texture with real relief lighting; the shared worker keeps generation off the UI thread. */
export function TexturedSphere({ name, archetype, size, lit, hue, seed, quiet }: {
  name: string; archetype?: string | null; size: number; lit: number;
  hue: [number, number, number]; seed: number; quiet: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const kind = planetSurfaceKind(name, archetype);
  const [red, green, blue] = hue;
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    const width = Math.max(64, Math.min(256, Math.round(size * Math.min(2, window.devicePixelRatio || 1))));
    void loadPlanetSurface({ width, kind, hue: [red, green, blue], seed, lit, quiet }).then(result => {
      if (cancelled || !canvas.current) return;
      const node = canvas.current, context = node.getContext('2d'); if (!context) return;
      node.width = node.height = result.width;
      const image = context.createImageData(result.width, result.width);
      image.data.set(result.rgba); context.putImageData(image, 0, 0);
      setReady(true);
    });
    return () => { cancelled = true; };
  }, [size, kind, red, green, blue, seed, lit, quiet]);
  return <span className="absolute inset-0 rounded-full" style={{
    background: `radial-gradient(circle at 36% 30%, rgb(${red},${green},${blue}), #17272b)`,
    boxShadow: `0 ${size * .12}px ${size * .26}px rgba(0,0,0,.28)`,
  }}>
    <canvas ref={canvas} className="absolute inset-0 h-full w-full rounded-full" data-pstyle="M" data-surface-kind={kind} data-surface-ready={ready ? 'true' : 'false'} />
  </span>;
}
