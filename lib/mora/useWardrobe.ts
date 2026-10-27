'use client';
import { useCallback, useEffect, useState } from 'react';
import { useSessionStore } from '@/lib/store/sessionStore';
import { DEFAULT_WARDROBE, loadOutfits, loadWardrobe, normalizeOutfits, saveOutfits, saveWardrobe, WARDROBE_EVENT, type Outfits, type Wardrobe } from './traits';

function useMoraUser(): string {
  return useSessionStore((s) => (s.user as { user_id?: string; id?: string } | null)?.user_id ?? (s.user as { id?: string } | null)?.id ?? 'me');
}

export function useWardrobe(): [Wardrobe, (w: Wardrobe) => void] {
  const user = useMoraUser();
  const [w, setW] = useState<Wardrobe>(DEFAULT_WARDROBE);
  useEffect(() => {
    const read = () => setW(loadWardrobe(user)); read();
    window.addEventListener(WARDROBE_EVENT, read); window.addEventListener('storage', read);
    return () => { window.removeEventListener(WARDROBE_EVENT, read); window.removeEventListener('storage', read); };
  }, [user]);
  return [w, useCallback((n: Wardrobe) => saveWardrobe(n, user), [user])];
}

/** Gespeicherte Outfit-Plätze (lokal pro Nutzer). */
export function useOutfits(): [Outfits, (i: number, w: Wardrobe | null) => void] {
  const user = useMoraUser();
  const [o, setO] = useState<Outfits>(() => normalizeOutfits(null));
  useEffect(() => { setO(loadOutfits(user)); }, [user]);
  const set = useCallback((i: number, w: Wardrobe | null) => {
    setO((prev) => { const n = prev.slice(); n[i] = w; saveOutfits(n, user); return n; });
  }, [user]);
  return [o, set];
}
