'use client';

import React, { useEffect, useRef, useState } from 'react';
import { startAmbientEnvironment } from '@/lib/universe/ambientEnvironment';
import { useActiveRitualScene } from '@/lib/hooks/useActiveRitualScene';

/** Shared cached nebula/ambient image; small light fields carry the room's motion. */
export function CosmosBackdrop() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const scene = useActiveRitualScene();
  useEffect(() => {
    const stop = startAmbientEnvironment(source => {
      const node = canvas.current, context = node?.getContext('2d');
      if (!node || !context) return;
      node.width = source.width; node.height = source.height;
      context.drawImage(source, 0, 0);
      document.documentElement.dataset.uv2ComposedCosmos = 'on';
      setReady(true);
    });
    return () => { stop(); delete document.documentElement.dataset.uv2ComposedCosmos; };
  }, []);
  return (
    <div className="uv2-cosmos-backdrop pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="uv2-cosmos-nebula absolute -inset-[3%]" data-testid="uv2-nebula">
        <div className="uv2-cosmos-image absolute inset-0 bg-cover bg-center" />
      </div>
      <div data-cosmos-light-layer className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 48%, rgba(174,205,192,.09), rgba(224,207,178,.04) 55%, rgba(3,6,10,.12))' }} />
      <canvas ref={canvas} className="uv2-cosmos-composite absolute" data-testid="uv2-composed-cosmos" data-ready={ready ? 'true' : 'false'} style={{ visibility: ready ? 'visible' : 'hidden' }} />
      {/* Ruhe: leichte Vignette, damit die Planeten führen; Nebel bleibt. */}
      <div className="uv2-cosmos-calm absolute inset-0" data-testid="uv2-cosmos-calm" />
      <div className="uv2-cosmos-breath uv2-cosmos-breath--near absolute" style={{ background: `radial-gradient(ellipse, ${scene.accent}, transparent 68%)` }} />
      <div className="uv2-cosmos-breath uv2-cosmos-breath--far absolute" style={{ background: `radial-gradient(ellipse, ${scene.aura}, transparent 68%)` }} />
    </div>
  );
}
