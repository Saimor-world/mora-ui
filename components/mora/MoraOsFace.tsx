'use client';

import React, { useEffect, useState } from 'react';
import styles from './MoraOsFace.module.css';

/**
 * Faithful website adapter of Saimor-world/mora-ui:
 * components/mora/MoraFace.tsx (MÔRA A4, approved Oct 14).
 * The brand stone image is NEVER repainted. This is transparent light inside
 * the same jade stone, with exactly the OS eye and smile geometry.
 * No OS store dependency is introduced into the public website.
 */
type FaceState = 'greet' | 'rest' | 'think' | 'work' | 'done' | 'need' | 'listen';
const RY: Record<FaceState, number> = {
  rest: .205, greet: .2, listen: .225, think: .17, work: .11, done: .2, need: .21,
};
const SMILE: Record<FaceState, boolean> = {
  rest: true, greet: true, listen: true, think: false, work: false, done: true, need: true,
};
const R = 43;
const C = 50;

export default function MoraOsFace({ size = 290, state: forced }: { size?: number; state?: FaceState }) {
  const [greeting, setGreeting] = useState(true);
  useEffect(() => {
    const id = window.setTimeout(() => setGreeting(false), 2600);
    return () => window.clearTimeout(id);
  }, []);

  const state: FaceState = forced ?? (greeting ? 'greet' : 'rest');
  const arcs = (state === 'greet' || state === 'done') && size >= 64;
  const tiny = size < 64;
  const ex = .34 * R;
  const ey = C + .16 * R + (state === 'work' ? .05 * R : state === 'think' ? -.03 * R : 0);
  const rx = .165 * R;
  const ry = RY[state] * R;
  const warm = state === 'need' ? '255,219,140' : '204,255,224';
  const jade = state === 'need' ? '255,196,110' : '64,242,140';
  const id = React.useId().replace(/:/g, '');
  // Every optical layer, including highlights, lives in the same blink group.
  // Unfiltered gradients avoid SVG filter-buffer edges when Safari scales a blink.
  const eye = (sx: number, key: string) => {
    const x = C + sx * ex;
    const arc = `M ${x - rx} ${ey + ry * .25} Q ${x} ${ey - ry * 1.15} ${x + rx} ${ey + ry * .25}`;
    return <g key={key}>
      <g className={styles.eye} style={{ transformOrigin: `${x}px ${ey}px` }}>
        {arcs ? <>
          <path d={arc} stroke={`rgb(${jade})`} strokeWidth={rx * 1.8} opacity=".06" />
          <path d={arc} stroke={`rgb(${jade})`} strokeWidth={rx * .95} opacity=".18" />
          <path d={arc} stroke={`rgb(${warm})`} strokeWidth={rx * .54} opacity=".9" />
        </> : <>
          <ellipse cx={x} cy={ey} rx={rx * 2.3} ry={ry * 2.1} fill={`url(#halo${id})`} />
          <ellipse cx={x} cy={ey} rx={rx * 1.12} ry={ry * 1.1} fill={`url(#eye${id})`} />
          <ellipse cx={x} cy={ey} rx={rx * .92} ry={ry * .96} fill={`url(#jade${id})`} opacity=".18" style={{ mixBlendMode: 'multiply' }} />
          <ellipse cx={x - rx * .27} cy={ey - ry * .39} rx={rx * .14} ry={ry * .105} fill="#fff5df" opacity=".68" />
          <circle cx={x + rx * .24} cy={ey + ry * .32} r={rx * .055} fill="#e7ffe8" opacity=".32" />
        </>}
      </g>
      {!arcs && <path className={styles.lid} d={`M ${x - rx * .72} ${ey} Q ${x} ${ey + ry * .22} ${x + rx * .72} ${ey}`} stroke={`rgb(${warm})`} strokeWidth={rx * .15} fill="none" />}
    </g>;
  };
  const smileY = C + .44 * R - .1 * R;
  const smile = `M ${C - .11 * R} ${smileY} Q ${C} ${smileY + .13 * R} ${C + .11 * R} ${smileY}`;

  return (
    <span className={styles.face} data-face-state={state} aria-hidden="true">
      <svg className={styles.svg} viewBox="0 0 100 100" focusable="false">
        <defs>
          <radialGradient id={`halo${id}`}><stop stopColor={`rgb(${jade})`} stopOpacity=".28" /><stop offset=".45" stopColor={`rgb(${jade})`} stopOpacity=".09" /><stop offset="1" stopColor={`rgb(${jade})`} stopOpacity="0" /></radialGradient>
          <radialGradient id={`eye${id}`} cx="43%" cy="40%" r="60%" fx="35%" fy="28%"><stop stopColor="#f1ffe8" stopOpacity=".93" /><stop offset=".36" stopColor={`rgb(${warm})`} stopOpacity=".88" /><stop offset=".7" stopColor="#8cddb0" stopOpacity=".65" /><stop offset="1" stopColor={`rgb(${jade})`} stopOpacity="0" /></radialGradient>
          <pattern id={`jade${id}`} patternUnits="userSpaceOnUse" width="100" height="100"><image href="/brand/mora-stone-v1.png" width="100" height="100" /></pattern>
          <clipPath id={`j${id}`}><circle cx={C} cy={C} r={R} /></clipPath>
        </defs>
        <g clipPath={`url(#j${id})`}>
          <g className={styles.gaze} fill="none" strokeLinecap="round">
            {eye(-1, 'left')}{eye(1, 'right')}
          </g>
          {SMILE[state] && !tiny && <path d={smile} fill="none" stroke={`rgba(${warm},.8)`} strokeWidth={.032 * R} strokeLinecap="round" />}
        </g>
      </svg>
      <span className={styles.leak} />
    </span>
  );
}

