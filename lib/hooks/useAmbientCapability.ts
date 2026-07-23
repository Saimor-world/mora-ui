'use client';

import { useEffect, useState } from 'react';

export type AmbientDensity = 'off' | 'low' | 'medium';

export interface AmbientCapability {
  /** Canvas / particle ambient is allowed on this device */
  enableHeavy: boolean;
  /** Idle gate passed — mount heavy layers only after this is true */
  heavyReady: boolean;
  density: AmbientDensity;
}

type NavigatorWithHints = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

function detectAmbientProfile(): Pick<AmbientCapability, 'enableHeavy' | 'density'> {
  if (typeof window === 'undefined') {
    return { enableHeavy: false, density: 'off' };
  }

  const nav = navigator as NavigatorWithHints;
  const mq = typeof window.matchMedia === 'function'
    ? (query: string) => window.matchMedia(query).matches
    : () => false;

  const reducedMotion = mq('(prefers-reduced-motion: reduce)');
  if (reducedMotion) {
    return { enableHeavy: false, density: 'off' };
  }

  const saveData = Boolean(nav.connection?.saveData);
  const coarsePointer = mq('(pointer: coarse)');
  const lowMemory = typeof nav.deviceMemory === 'number' && nav.deviceMemory > 0 && nav.deviceMemory <= 4;
  const lowCpu = typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency > 0 && nav.hardwareConcurrency <= 4;
  const constrained = saveData || coarsePointer || lowMemory || lowCpu;

  if (saveData) {
    // Explicit data-saver: keep CSS backdrop only.
    return { enableHeavy: false, density: 'off' };
  }

  return {
    enableHeavy: true,
    density: constrained ? 'low' : 'medium',
  };
}

/**
 * Progressive ambient profile for MoraShell.
 *
 * First paint stays on a static/CSS backdrop. Heavy canvas (StarField, Mycelium,
 * NeuralGrid, AmbientDust) mounts only after an idle callback — and never when
 * the user prefers reduced motion or Save-Data is on.
 */
export function useAmbientCapability(idleTimeoutMs = 1800): AmbientCapability {
  const [profile, setProfile] = useState<Pick<AmbientCapability, 'enableHeavy' | 'density'>>({
    enableHeavy: false,
    density: 'off',
  });
  const [heavyReady, setHeavyReady] = useState(false);

  useEffect(() => {
    const next = detectAmbientProfile();
    setProfile(next);

    if (!next.enableHeavy) {
      setHeavyReady(false);
      return;
    }

    let cancelled = false;
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const markReady = () => {
      if (!cancelled) setHeavyReady(true);
    };

    const ric = window.requestIdleCallback?.bind(window);
    if (typeof ric === 'function') {
      idleId = ric(markReady, { timeout: idleTimeoutMs });
    } else {
      timeoutId = setTimeout(markReady, Math.min(900, idleTimeoutMs));
    }

    const onChange = () => {
      const updated = detectAmbientProfile();
      setProfile(updated);
      if (!updated.enableHeavy) {
        setHeavyReady(false);
      }
    };

    const motionMq = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
    const pointerMq = typeof window.matchMedia === 'function'
      ? window.matchMedia('(pointer: coarse)')
      : null;
    motionMq?.addEventListener('change', onChange);
    pointerMq?.addEventListener('change', onChange);

    return () => {
      cancelled = true;
      if (idleId !== undefined && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      motionMq?.removeEventListener('change', onChange);
      pointerMq?.removeEventListener('change', onChange);
    };
  }, [idleTimeoutMs]);

  return {
    enableHeavy: profile.enableHeavy,
    heavyReady,
    density: profile.density,
  };
}
