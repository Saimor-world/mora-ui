'use client';

import React, { useEffect, useState } from 'react';
import {
  DEFAULT_ENGINE_WORLD_CONTRACT,
  loadEngineWorldContract,
  type EngineSurfaceId,
  type EngineWorldContract,
} from '@/lib/engine/worldContract';

type Props = {
  surface: EngineSurfaceId;
};

type WorldStyle = React.CSSProperties & Record<`--saimor-world-${string}`, string | number>;

export function WorldSurface({ surface }: Props) {
  const [contract, setContract] = useState<EngineWorldContract>(DEFAULT_ENGINE_WORLD_CONTRACT);

  useEffect(() => {
    let active = true;
    loadEngineWorldContract().then((next) => {
      if (active) setContract(next);
    });
    return () => {
      active = false;
    };
  }, []);

  const palette = contract.world.palette;
  const profile = contract.surfaces[surface];
  const intensity = Math.max(0, Math.min(1, profile.ambient_intensity));
  const violetAlpha = (0.28 * intensity).toFixed(3);
  const indigoAlpha = (0.32 * intensity).toFixed(3);
  const cyanAlpha = (0.14 * intensity).toFixed(3);
  const style: WorldStyle = {
    '--saimor-world-base': palette.base,
    '--saimor-world-deep': palette.deep,
    '--saimor-world-void': palette.void,
    '--saimor-world-intensity': intensity,
    background: `
      radial-gradient(ellipse 90% 70% at 18% 28%, rgba(${palette.violet_rgb}, ${violetAlpha}) 0%, transparent 58%),
      radial-gradient(ellipse 70% 55% at 82% 72%, rgba(${palette.indigo_rgb}, ${indigoAlpha}) 0%, transparent 55%),
      radial-gradient(ellipse 55% 50% at 50% 50%, rgba(${palette.cyan_rgb}, ${cyanAlpha}) 0%, transparent 48%),
      linear-gradient(160deg, ${palette.base} 0%, ${palette.deep} 45%, ${palette.void} 100%)
    `,
  };

  return (
    <div
      aria-hidden
      data-saimor-engine={contract.engine.id}
      data-saimor-engine-version={contract.version}
      data-saimor-world={contract.engine.world_id}
      data-saimor-world-profile={contract.world.profile}
      data-saimor-surface={surface}
      data-saimor-surface-role={profile.role}
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={style}
    />
  );
}

export default WorldSurface;
