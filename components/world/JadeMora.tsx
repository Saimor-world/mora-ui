import React from 'react';
import type { SpiritMood } from './MoraSpirit';

export const JADE_MORA_SRC = '/mora/jade-01.png';

/** MÔRA als runde Jade (Variante 01). Trägt weiter `px-mora`: genau eine MÔRA-Figur im OS. */
export function JadeMora({ size, mood = 'idle' }: { size: number; mood?: SpiritMood }) {
  const w = Math.round(size * (276 / 360));
  return (
    <span className="px-mora jade-mora" data-mood={mood} style={{ width: w, height: size }} aria-hidden>
      <span className="jade-mora__glow" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={JADE_MORA_SRC} alt="" width={w} height={size} draggable={false} />
    </span>
  );
}
