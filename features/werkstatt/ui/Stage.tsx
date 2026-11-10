'use client';
import React, { useEffect, useState } from 'react';
import { coverStage, STAGE_H, STAGE_W, type Stage as StageBox } from '../model/stage';

/** Fenstergröße → Bühne (cover). Alle Kinder liegen in Bühnen-Einheiten (1920×1080). */
export function useStage(): StageBox {
  const get = () => (typeof window === 'undefined' ? coverStage(1440, 900) : coverStage(window.innerWidth || 1440, window.innerHeight || 900));
  const [s, setS] = useState<StageBox>(get);
  useEffect(() => {
    const on = () => setS(get());
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
   
  }, []);
  return s;
}

export function StageLayer({ stage, img, label, under, children, className, testId, ext }: {
  stage: StageBox; img: string; label?: string; under?: React.ReactNode; children?: React.ReactNode; className?: string; testId?: string;
  /** Gespiegelter Bildrand oben/unten (für schmale Fenster), Pfad ohne -top/-bottom.webp. */
  ext?: string;
}) {
  return (
    <div className={`wk-stage${className ? ` ${className}` : ''}`} data-testid={testId}
      style={{ width: STAGE_W, height: STAGE_H, transform: `translate(${stage.x}px, ${stage.y}px) scale(${stage.k})` }}>
      {under}
      {ext ? <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="wk-stage__ext wk-stage__ext--top" src={`${ext}-top.webp`} alt="" draggable={false} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="wk-stage__ext wk-stage__ext--bottom" src={`${ext}-bottom.webp`} alt="" draggable={false} />
      </> : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="wk-stage__img" src={img} alt={label ?? ''} width={STAGE_W} height={STAGE_H} draggable={false} decoding="async" />
      {children}
    </div>
  );
}
