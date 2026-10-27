'use client';
import { useCallback, useEffect, useState } from 'react';
import { useSessionStore } from '@/lib/store/sessionStore';
import { isSaimorInternal } from '@/lib/auth/organization';
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

/** Pure Regel: Gründer-Konto = Inhaber (system_owner oder owner im SAIMÔR-HQ). Nichts Geheimes, nur eine Rolle. */
export function isFounderUser(user: { role?: string | null; tenant_id?: string | null } | null | undefined): boolean {
  return !!user && isSaimorInternal(user) && (user.role === 'owner' || user.role === 'system_owner');
}

/** Gründer-MÔRA (mit Blüte): Inhaber-Konto oder lokale Markierung `mora.founder=1` (zum Ansehen/Testen). */
export function useFounder(): boolean {
  const byRole = useSessionStore((s) => isFounderUser(s.user as { role?: string | null; tenant_id?: string | null } | null));
  const [flag, setFlag] = useState(false);
  useEffect(() => { try { setFlag(window.localStorage.getItem('mora.founder') === '1'); } catch { /* egal */ } }, []);
  return byRole || flag;
}
