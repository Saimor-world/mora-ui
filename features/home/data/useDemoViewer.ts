'use client';
import { useEffect, useState } from 'react';
import { MORGENROT_SEED } from '@/lib/demo/morgenrot/seed';

/** `?firma=morgenrot`: open the demo company Café Morgenrot (FIKTIV). */
export function readFirma(search: string): 'morgenrot' | null {
  return new URLSearchParams(search).get('firma') === 'morgenrot' ? 'morgenrot' : null;
}

export function useFirmaParam(): 'morgenrot' | null {
  const [firma, setFirma] = useState<'morgenrot' | null>(null);
  useEffect(() => { setFirma(readFirma(window.location.search)); }, []);
  return firma;
}

/**
 * Local role switch of the fictional seed (`&als=lena|tarek|jonas|marius`).
 * Only used by the offline fallback, when CORE is not reachable; online the role comes from the session.
 */
export function readDemoViewer(search: string, allowed: boolean): string | null {
  if (!allowed || !readFirma(search)) return null;
  const als = new URLSearchParams(search).get('als') ?? 'marius';
  return MORGENROT_SEED.people.some((p) => p.id === als) ? als : 'marius';
}
