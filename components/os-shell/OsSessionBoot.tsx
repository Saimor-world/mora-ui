'use client';
import { useEffect, useLayoutEffect } from 'react';
import { useUserProfile } from '@/lib/queries/useUserProfile';
import { mapProfileToUser } from '@/lib/hooks/useAuthBootstrapper';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useNavStore } from '@/lib/store/navStore';
import { readCookie } from '@/lib/auth/cookies';

/**
 * V1.6: /os lädt die CORE-Sitzung jetzt selbst (vorher nur über die klassische
 * Oberfläche „/“ – direkt geöffnet blieb /os ohne Nutzer). Liest nur das Profil,
 * keine Weiterleitungen, kein Logout – das bleibt Sache der klassischen Shell.
 */
export function OsSessionBoot() {
  const { data: profile } = useUserProfile();
  const setUser = useSessionStore((s) => s.setUser);
  const hasUser = useSessionStore((s) => Boolean(s.user));
  const activeCompanyId = useNavStore((s) => s.activeCompanyId);
  const setActiveCompany = useNavStore((s) => s.setActiveCompany);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    const isLocalFallback =
      readCookie('mora_session') === 'local_demo_fallback' ||
      readCookie('mora_auth_token') === 'local_demo_fallback';
    if (isLocalFallback && !useSessionStore.getState().user) {
      setUser({
        id: 'user-demo-local',
        name: 'Marius',
        email: 'marius@saimor.world',
        role: 'owner',
        tenant_id: 'tenant-demo',
        is_demo: false,
        operational_state: 'operational',
        setup_required: false,
        active_company_id: 'company-local-demo',
        active_company_name: 'SAIMÔR HQ',
        company_count: 1,
        scope_source: 'persisted',
      });
      if (!useNavStore.getState().activeCompanyId) {
        setActiveCompany('company-local-demo');
      }
    }
  }, [setUser, setActiveCompany]);

  useEffect(() => {
    if (profile && !hasUser) setUser(mapProfileToUser(profile));
    if (profile?.active_company_id && !activeCompanyId) {
      setActiveCompany(profile.active_company_id);
    }
  }, [profile, hasUser, setUser, activeCompanyId, setActiveCompany]);
  return null;
}
