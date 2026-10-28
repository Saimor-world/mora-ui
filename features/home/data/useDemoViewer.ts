'use client';
import { useEffect, useState } from 'react';
import { MORGENROT_SEED } from '@/lib/demo/morgenrot/seed';

/**
 * Fiktive Demo-Firma (Café Morgenrot) im echten OS: ?firma=morgenrot[&als=lena|tarek|jonas|marius].
 * Nur Anzeige, keine Rechte und kein Login – darum nur in der lokalen Vorschau oder intern erlaubt.
 */
export function readDemoViewer(search: string, allowed: boolean): string | null {
  if (!allowed) return null;
  const q = new URLSearchParams(search);
  if (q.get('firma') !== 'morgenrot') return null;
  const als = q.get('als') ?? 'marius';
  return MORGENROT_SEED.people.some((p) => p.id === als) ? als : 'marius';
}

export function useDemoViewer(allowed: boolean): string | null {
  const [v, setV] = useState<string | null>(null);
  useEffect(() => { setV(readDemoViewer(window.location.search, allowed)); }, [allowed]);
  return v;
}
