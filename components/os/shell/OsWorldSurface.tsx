"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import type { OrbState } from '@/lib/api/awarenessClient';
import type { AmbientDensity } from '@/lib/hooks/useAmbientCapability';
import { ShellStaticBackdrop } from './ShellStaticBackdrop';
import { TemporalAtmosphere } from '@/components/os/TemporalAtmosphere';
import { RitualSceneStyler } from '@/components/os/RitualSceneStyler';
// Background Layers — CSS plate first; heavy canvas/DOM ambient deferred via dynamic()
import { MoraLivingBackground } from '@/components/mora/MoraLivingBackground';

const StarField = dynamic(
    () => import('@/components/visual/StarField').then((m) => ({ default: m.StarField })),
    { ssr: false },
);
const NeuralGrid = dynamic(
    () => import('@/components/visual/NeuralGrid').then((m) => ({ default: m.NeuralGrid })),
    { ssr: false },
);
const ForestLightCanopy = dynamic(
    () => import('@/components/visual/ForestLightCanopy').then((m) => ({ default: m.ForestLightCanopy })),
    { ssr: false },
);
const AmbientDust = dynamic(
    () => import('@/components/organic/AmbientDust').then((m) => ({ default: m.AmbientDust })),
    { ssr: false },
);
const MyceliumOverlay = dynamic(
    () => import('@/components/organic/MyceliumOverlay').then((m) => ({ default: m.MyceliumOverlay })),
    { ssr: false },
);


/** OS adapter for the World Surface. Scene-aware children still depend on OS
 * stores; this is deliberately not advertised as a cross-app package yet.
 * Authentication, panes, commands and audio remain owned by MoraShell.
 */
export interface OsWorldSurfaceProps {
    orbState: OrbState;
    demoMode: boolean;
    explore: boolean;
    paused: boolean;
    heavyReady: boolean;
    density: AmbientDensity;
}

export function OsWorldSurface({ orbState, demoMode, explore, paused, heavyReady, density }: OsWorldSurfaceProps) {
    const mountHeavyAmbient = heavyReady && !paused;
    const universeLightAmbient = explore && !paused;
    const starFieldDensity = density === 'low' || universeLightAmbient ? 'low' : 'medium';
    return <>
            <RitualSceneStyler />
            <ShellStaticBackdrop />
            <MoraLivingBackground />
            <TemporalAtmosphere paused={paused || !mountHeavyAmbient} />

            {mountHeavyAmbient && (
                <>
                    {/* ForestLightCanopy fades to 6% in Universe — shared atmospheric truth */}
                    <div
                        className="transition-opacity duration-[1400ms] ease-in-out"
                        style={{ opacity: explore ? 0.06 : 1 }}
                    >
                        <ForestLightCanopy orbState={orbState} demoMode={demoMode} />
                    </div>
                    <StarField
                        density={starFieldDensity}
                        opacity={universeLightAmbient ? 0.72 : 0.97}
                        paused={paused}
                    />

                    {/* Mycelium — living gravitational web connecting nodes and departments */}
                    <MyceliumOverlay />

                    <NeuralGrid active={!paused} state={orbState} />

                    <AmbientDust
                        count={density === 'low' || universeLightAmbient ? 8 : 32}
                        color="rgba(var(--scene-rgb, 16, 185, 129), 0.07)"
                        sizeRange={[0.8, 2.5]}
                        durationRange={[18, 36]}
                        opacity={universeLightAmbient ? 0.14 : 0.28}
                    />
                </>
            )}

    </>;
}
