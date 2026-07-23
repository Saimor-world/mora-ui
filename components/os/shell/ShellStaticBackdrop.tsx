'use client';

import React from 'react';

/**
 * Instant CSS deep-space plate for first paint.
 * Heavy canvas ambient (StarField / Mycelium / …) layers on top after idle.
 */
export const ShellStaticBackdrop: React.FC = () => (
  <div
    aria-hidden
    className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    style={{
      background: `
        radial-gradient(ellipse 90% 70% at 18% 28%, rgba(110, 38, 160, 0.28) 0%, transparent 58%),
        radial-gradient(ellipse 70% 55% at 82% 72%, rgba(20, 33, 140, 0.32) 0%, transparent 55%),
        radial-gradient(ellipse 55% 50% at 50% 50%, rgba(10, 110, 160, 0.14) 0%, transparent 48%),
        linear-gradient(160deg, #0d0921 0%, #05080e 45%, #03050a 100%)
      `,
    }}
  />
);

export default ShellStaticBackdrop;
