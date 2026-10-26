'use client';
import { useCallback, useEffect, useState } from 'react';
import { useSessionStore } from '@/lib/store/sessionStore';
import { DEFAULT_WARDROBE, loadWardrobe, saveWardrobe, WARDROBE_EVENT, type Wardrobe } from './traits';

export function useWardrobe(): [Wardrobe, (w: Wardrobe) => void] {
  const user = useSessionStore((s) => (s.user as { user_id?: string; id?: string } | null)?.user_id ?? (s.user as { id?: string } | null)?.id ?? 'me');
  const [w, setW] = useState<Wardrobe>(DEFAULT_WARDROBE);
  useEffect(() => {
    const read = () => setW(loadWardrobe(user)); read();
    window.addEventListener(WARDROBE_EVENT, read); window.addEventListener('storage', read);
    return () => { window.removeEventListener(WARDROBE_EVENT, read); window.removeEventListener('storage', read); };
  }, [user]);
  return [w, useCallback((n: Wardrobe) => saveWardrobe(n, user), [user])];
}
