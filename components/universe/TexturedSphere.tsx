'use client';

import React, { useEffect, useRef, useState } from 'react';
import { loadPlanetSurface, planetSurfaceKind } from '@/lib/universe/planetSurfaceClient';
import { useAmbientEnvironment } from '@/lib/universe/ambientEnvironment';

/** Quiet translucent mineral glass, cached and generated outside the UI thread. */
export function TexturedSphere({ name, archetype, size, lit, hue, seed, quiet }: {
  name: string; archetype?: string | null; size: number; lit: number;
  hue: [number, number, number]; seed: number; quiet: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const environment = useAmbientEnvironment(state => state.environment);
  const kind = planetSurfaceKind(name, archetype);
  const [red, green, blue] = hue;
  useEffect(() => {
    let cancelled = false;
    if (!environment || !canvas.current) return;
    const width = Math.max(64, Math.min(256, Math.round(size * Math.min(2, window.devicePixelRatio || 1))));
    const rect = canvas.current.getBoundingClientRect();
    const quantize = (n: number) => Math.round(n * 1024) / 1024;
    void loadPlanetSurface({ width, kind, hue: [red, green, blue], seed, lit, quiet, environment,
      center: [quantize((rect.left + rect.width / 2) / innerWidth), quantize((rect.top + rect.height / 2) / innerHeight)],
      radius: [quantize(rect.width / 2 / innerWidth), quantize(rect.height / 2 / innerHeight)],
    }).then(result => {
      if (cancelled || !canvas.current) return;
      const node = canvas.current, context = node.getContext('2d'); if (!context) return;
      node.width = node.height = result.width;
      const image = context.createImageData(result.width, result.width);
      image.data.set(result.rgba); context.putImageData(image, 0, 0);
      node.dataset.environmentKey = environment.key;
      setReady(true);
    });
    return () => { cancelled = true; };
  }, [size, kind, red, green, blue, seed, lit, quiet, environment]);
  return <span className="absolute inset-0 rounded-full" style={{
    background: ready ? undefined : `radial-gradient(circle at 36% 30%, rgba(${red},${green},${blue},.32), rgba(${red},${green},${blue},.12))`,
  }}>
    <canvas ref={canvas} className="absolute inset-0 h-full w-full rounded-full" data-pstyle="M" data-surface-finish="mineral-glass" data-surface-kind={kind} data-surface-ready={ready ? 'true' : 'false'} />
  </span>;
}
