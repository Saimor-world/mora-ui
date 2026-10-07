'use client';
import { useEffect } from 'react';
import { useUserProfile } from '@/lib/queries/useUserProfile';
import { mapProfileToUser } from '@/lib/hooks/useAuthBootstrapper';
import { useSessionStore } from '@/lib/store/sessionStore';

/**
 * V1.6: /os lädt die CORE-Sitzung jetzt selbst (vorher nur über die klassische
 * Oberfläche „/“ – direkt geöffnet blieb /os ohne Nutzer). Liest nur das Profil,
 * keine Weiterleitungen, kein Logout – das bleibt Sache der klassischen Shell.
 */
export function OsSessionBoot() {
  const { data: profile } = useUserProfile();
  const setUser = useSessionStore((s) => s.setUser);
  const hasUser = useSessionStore((s) => Boolean(s.user));
  useEffect(() => {
    if (profile && !hasUser) setUser(mapProfileToUser(profile));
  }, [profile, hasUser, setUser]);
  return null;
}
