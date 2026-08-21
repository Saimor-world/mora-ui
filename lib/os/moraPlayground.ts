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

/**
 * Handlungsverben, die am Ende eines aria-labels stehen.
 *
 * aria-label wird fuer Screenreader als AUFFORDERUNG geschrieben ("Growth
 * auswaehlen"). Als Zielbezeichnung ist das falsch: ein Ziel heisst "Growth".
 * Zwei Kritik-Durchlaeufe meldeten den Chip deshalb als Fehler - er zeigte
 * "GROWTH AUSWAEHLEN", obwohl Growth bereits ausgewaehlt war.
 */
const TRAILING_ACTION = /\s+(auswählen|abwählen|öffnen|schließen|anzeigen|bearbeiten|entfernen|löschen|starten|wechseln|aufklappen|zuklappen)$/i;

function asTargetName(raw: string): string {
  const trimmed = raw.replace(/\s+/g, ' ').trim();
  const stripped = trimmed.replace(TRAILING_ACTION, '').trim();
  // Ist das Verb der ganze Name, bleibt es stehen - sonst waere der Chip leer.
  return stripped.length > 0 ? stripped : trimmed;
}

export function describeMoraPlaygroundTarget(element: Element): MoraPlaygroundTarget {
  const el = element.closest('button,a,[role="button"],input,textarea,select,[data-mora-element]') ?? element;
  const html = el as HTMLElement;
  const id = el.getAttribute('data-mora-element') || el.getAttribute('data-testid') || el.id || null;
  // Text content is only a trustworthy label for compact elements; a large
  // container would smear half the page into the focus label.
  const text = (html.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();

  // data-mora-label zuerst: eine Komponente, die ihren eigenen Namen kennt,
  // muss ihn nicht aus einem Screenreader-Text zurueckgewinnen lassen.
  const explicit = el.getAttribute('data-mora-label');
  if (explicit && explicit.trim()) {
    return {
      id,
      kind: el.tagName.toLowerCase(),
      label: explicit.replace(/\s+/g, ' ').trim().slice(0, 120),
      selector: id ? `[data-testid="${id}"]` : null,
    };
  }

  const label = asTargetName(
    el.getAttribute('aria-label') ||
    el.getAttribute('title') ||
    (el instanceof HTMLInputElement ? el.placeholder : '') ||
    (text.length > 0 && text.length <= 160 ? text : '') ||
    el.tagName.toLowerCase()
  ).slice(0, 120);

  return {
    id,
    kind: el.tagName.toLowerCase(),
    label: label || el.tagName.toLowerCase(),
    selector: id ? `[data-testid="${id}"]` : null,
  };
}
