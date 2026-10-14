'use client';

import React, { useEffect, useState } from 'react';
import { useOrbStore } from '@/lib/store/orbStore';

/**
 * MÔRA A4 – das Gesicht ist Licht IM Jadestein (freigegeben 14.10.).
 * Regel 14.09. bleibt: das Steinbild wird nie verändert. Dies ist eine Lichtschicht darüber:
 * Augen als inneres Leuchten (mehrere weichgezeichnete Lagen, Mischmodus „screen“),
 * die weiten Lagen sind mit dem Stein selbst maskiert, so dass das Licht in den Adern
 * stärker durchscheint. Geometrie wie in den A4-Renders (Jade-Radius = 43 % des Steins).
 */
export type FaceState = 'rest' | 'greet' | 'listen' | 'think' | 'work' | 'done' | 'need';

const PRESENCE_TO_FACE: Record<string, FaceState> = {
    calm: 'rest', listening: 'listen', thinking: 'think', working: 'work', done: 'done', needs: 'need',
};

// Augenhöhe (ry) je Zustand, in Einheiten des Jade-Radius R – aus den A4-Renders.
const RY: Record<FaceState, number> = { rest: 0.205, greet: 0.2, listen: 0.225, think: 0.17, work: 0.11, done: 0.2, need: 0.21 };
const SMILE: Record<FaceState, boolean> = { rest: true, greet: true, listen: true, think: false, work: false, done: true, need: true };

const R = 43; // Jade-Radius in viewBox-Einheiten (Stein = 100)
const C = 50;

export function MoraFace({ size, arcsOnGreet = true, state: forced }: { size: number; arcsOnGreet?: boolean; state?: FaceState }) {
    const presence = useOrbStore((s) => s.moraPresence?.state ?? 'calm');
    // Kurzes Begrüßen beim ersten Erscheinen.
    const [greeting, setGreeting] = useState(true);
    useEffect(() => { const t = window.setTimeout(() => setGreeting(false), 2600); return () => window.clearTimeout(t); }, []);
    const state: FaceState = forced ?? (greeting && presence === 'calm' ? 'greet' : PRESENCE_TO_FACE[presence] ?? 'rest');
    const arcs = (state === 'greet' && arcsOnGreet && size >= 64) || (state === 'done' && size >= 64);
    const tiny = size < 64;

    const ex = 0.34 * R, ey = C + 0.16 * R + (state === 'work' ? 0.05 * R : state === 'think' ? -0.03 * R : 0), rx = 0.165 * R;
    const ry = RY[state] * R;
    const warm = state === 'need' ? '255,219,140' : '204,255,224';
    const jade = state === 'need' ? '255,196,110' : '64,242,140';
    const id = React.useId().replace(/:/g, '');

    const eye = (sx: number, key: string, extra?: React.SVGProps<SVGEllipseElement>) => arcs
        ? <path key={key} d={`M ${C + sx * ex - rx} ${ey + ry * 0.25} Q ${C + sx * ex} ${ey - ry * 1.15} ${C + sx * ex + rx} ${ey + ry * 0.25}`} fill="none" strokeLinecap="round" strokeWidth={rx * 0.62} {...(extra as React.SVGProps<SVGPathElement>)} />
        : <ellipse key={key} cx={C + sx * ex} cy={ey} rx={rx} ry={ry} {...extra} />;
    const eyes = (paint: string, strokeOnly = false) => (
        <g className="mora-face__eyes" fill={strokeOnly ? 'none' : paint} stroke={arcs ? paint : 'none'}>
            {eye(-1, 'l')}{eye(1, 'r')}
        </g>
    );
    const smileY = C + 0.44 * R - 0.1 * R;
    const smile = `M ${C - 0.11 * R} ${smileY} Q ${C} ${smileY + 0.13 * R} ${C + 0.11 * R} ${smileY}`;
    // Bei 40 px ist alles unter 1 px Rauschen: weniger Lagen, kräftigere Kerne.
    const b = (u: number) => Math.max(u, tiny ? 0.6 : 0.3);

    return (
        <span className="mora-face" data-face-state={state} aria-hidden="true">
            <svg viewBox="0 0 100 100" className="mora-face__svg">
                <defs>
                    <filter id={`w${id}`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={b(0.16 * R * 0.45)} /></filter>
                    <filter id={`m${id}`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={b(0.05 * R * 0.6)} /></filter>
                    <filter id={`c${id}`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={b(tiny ? 0.9 : 0.011 * R * 1.4)} /></filter>
                    <clipPath id={`j${id}`}><circle cx={C} cy={C} r={R} /></clipPath>
                </defs>
                <g clipPath={`url(#j${id})`}>
                    {/* weite + mittlere Lage: färben die Adern ein (maskiert mit dem Stein, s. CSS) */}
                    <g className="mora-face__veins">
                        <g filter={`url(#w${id})`} opacity={tiny ? 0.55 : 0.75}>{eyes(`rgb(${jade})`)}</g>
                        <g filter={`url(#m${id})`} opacity={0.8}>{eyes(`rgb(${jade})`)}</g>
                        {!tiny && <g className="mora-face__cheeks" filter={`url(#w${id})`} opacity={state === 'work' ? 0.1 : 0.22} fill="rgb(255,120,110)">
                            <ellipse cx={C - 0.52 * R} cy={C + 0.38 * R} rx={0.15 * R} ry={0.1 * R} />
                            <ellipse cx={C + 0.52 * R} cy={C + 0.38 * R} rx={0.15 * R} ry={0.1 * R} />
                        </g>}
                    </g>
                    {/* Kern: warmes Licht */}
                    <g filter={`url(#c${id})`} opacity={0.95}>{eyes(`rgb(${warm})`)}</g>
                    {!arcs && (
                        <g className="mora-face__catch" fill="rgb(255,236,200)" filter={`url(#c${id})`}>
                            <circle cx={C - ex - 0.05 * R} cy={ey - 0.08 * R} r={tiny ? 0.07 * R : 0.045 * R} />
                            <circle cx={C + ex - 0.05 * R} cy={ey - 0.08 * R} r={tiny ? 0.07 * R : 0.045 * R} />
                        </g>
                    )}
                    {SMILE[state] && !tiny && (
                        <path d={smile} fill="none" stroke={`rgba(${warm},.85)`} strokeWidth={0.032 * R} strokeLinecap="round" filter={`url(#c${id})`} />
                    )}
                </g>
            </svg>
            {/* Licht, das aus dem Stein auf den Goldring und nach außen fällt */}
            <span className="mora-face__leak" />
        </span>
    );
}
