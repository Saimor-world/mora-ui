'use client';

import React, { useEffect } from 'react';
import { startAmbientEnvironment } from '@/lib/universe/ambientEnvironment';

/** One shared, compositor-animated nebula for Home, Universe and planet interiors. */
export function CosmosBackdrop() {
  useEffect(startAmbientEnvironment, []);
  return (
    <div className="uv2-cosmos-backdrop pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="uv2-cosmos-nebula absolute -inset-[3%]" data-testid="uv2-nebula">
        <div className="uv2-cosmos-image absolute inset-0 bg-cover bg-center" />
      </div>
      <div data-cosmos-light-layer className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 48%, rgba(174,205,192,.09), rgba(224,207,178,.04) 55%, rgba(3,6,10,.12))' }} />
    </div>
  );
}
