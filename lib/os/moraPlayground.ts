"use client";

import { useEffect, useState } from 'react';

export interface MoraPlaygroundTarget {
  id: string | null;
  kind: string;
  label: string;
  selector: string | null;
}

export const MORA_PLAYGROUND_TARGET_EVENT = 'mora:playground-target';

let currentTarget: MoraPlaygroundTarget | null = null;

export function getMoraPlaygroundTarget(): MoraPlaygroundTarget | null {
  return currentTarget;
}

export function setMoraPlaygroundTarget(target: MoraPlaygroundTarget | null): void {
  currentTarget = target;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(MORA_PLAYGROUND_TARGET_EVENT, { detail: target }));
  }
}

export function useMoraPlaygroundTarget(): MoraPlaygroundTarget | null {
  const [target, setTarget] = useState<MoraPlaygroundTarget | null>(currentTarget);

  useEffect(() => {
    const handleTarget = (event: Event) => {
      setTarget((event as CustomEvent<MoraPlaygroundTarget | null>).detail ?? null);
    };
    window.addEventListener(MORA_PLAYGROUND_TARGET_EVENT, handleTarget);
    return () => window.removeEventListener(MORA_PLAYGROUND_TARGET_EVENT, handleTarget);
  }, []);

  return target;
}

export function describeMoraPlaygroundTarget(element: Element): MoraPlaygroundTarget {
  const el = element.closest('button,a,[role="button"],input,textarea,select,[data-mora-element]') ?? element;
  const html = el as HTMLElement;
  const id = el.getAttribute('data-mora-element') || el.getAttribute('data-testid') || el.id || null;
  const label = (
    el.getAttribute('aria-label') ||
    el.getAttribute('title') ||
    (el instanceof HTMLInputElement ? el.placeholder : '') ||
    html.innerText ||
    el.textContent ||
    el.tagName.toLowerCase()
  ).replace(/\s+/g, ' ').trim().slice(0, 120);

  return {
    id,
    kind: el.tagName.toLowerCase(),
    label: label || el.tagName.toLowerCase(),
    selector: id ? `[data-testid="${id}"]` : null,
  };
}
