'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import MoraWaterGuide from './MoraWaterGuide';

/** One body, the existing dock chat action, and autonomous visual movement only. */
export function MoraCompanion({ onActivate }: { onActivate: () => void }) {
  const button = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const [still, setStill] = useState(false);
  useEffect(() => {
    setMounted(true);
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setStill(media.matches);
    sync(); media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);
  return mounted ? createPortal(<div data-mora-orb><MoraWaterGuide chapter={-1} still={still}
    label="MÔRA öffnen" onActivate={onActivate} buttonRef={button} /></div>, document.body) : null;
}
