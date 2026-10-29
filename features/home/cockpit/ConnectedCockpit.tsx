'use client';
import React, { useMemo } from 'react';
import { useWorld } from '@/lib/lea/useWorld';
import { LiveCockpit, type LiveCockpitProps } from './LiveCockpit';

/** Home previews exactly the places that the shared Universe can open. */
export function ConnectedCockpit(props: Omit<LiveCockpitProps, 'departments' | 'finderPlanets' | 'finderLoading' | 'finderFailed'>) {
  const world = useWorld();
  const planets = useMemo(() => {
    const visible = new Set(world.planets.map((p) => p.id));
    return world.finder.filter((p) => visible.has(p.id));
  }, [world.planets, world.finder]);
  return <LiveCockpit {...props} finderPlanets={planets} finderLoading={world.loading} finderFailed={world.failed} />;
}
