'use client';
import { useEffect, useLayoutEffect } from 'react';
import { useUserProfile } from '@/lib/queries/useUserProfile';
import { mapProfileToUser } from '@/lib/hooks/useAuthBootstrapper';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useNavStore } from '@/lib/store/navStore';
import { useDemoStore } from '@/lib/demo/demoStore';
import { isLocalDemoFallback, readCookie } from '@/lib/api/http';
import { finishOnboarding } from '@/lib/os-prototype/onboarding';

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
    const isLocalhost =
      process.env.NODE_ENV !== 'test' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (
      isLocalhost &&
      useDemoStore.getState().demoCompanyId &&
      !new URLSearchParams(window.location.search).get('firma')
    ) {
      useDemoStore.getState().setDemoCompany(null);
    }
    const authCookie = readCookie('mora_auth_token');
    const sessionCookie = readCookie('mora_session');
    const hasRealSessionCookie =
      (Boolean(authCookie) && authCookie !== 'local_demo_fallback') ||
      (Boolean(sessionCookie) && sessionCookie !== 'local_demo_fallback');
    const isLocalFallback =
      (!hasRealSessionCookie && isLocalhost) ||
      isLocalDemoFallback() ||
      sessionCookie === 'local_demo_fallback' ||
      authCookie === 'local_demo_fallback';
    const currentUser = useSessionStore.getState().user;
    if (isLocalFallback && (!currentUser || !currentUser.active_company_id || isLocalDemoFallback())) {
      if (isLocalhost) {
        finishOnboarding();
        if (!readCookie('mora_auth_token')) {
          document.cookie = 'mora_session=local_demo_fallback; path=/; max-age=2592000; SameSite=Lax';
          document.cookie = 'mora_auth_token=local_demo_fallback; path=/; max-age=2592000; SameSite=Lax';
        }
      }
      setUser({
        id: 'user-demo-local',
        name: 'Lokale Vorschau',
        email: 'preview@example.test',
        role: 'demo',
        tenant_id: 'tenant-demo',
        is_demo: true,
        operational_state: 'operational',
        setup_required: false,
        active_company_id: 'company-local-demo',
        active_company_name: 'Lokale Vorschau',
        company_count: 1,
        scope_source: 'local_demo_fallback',
      });
      setActiveCompany('company-local-demo');
    }
  }, [setUser, setActiveCompany]);

  useEffect(() => {
    if (!profile) return;
    if (!hasUser || profile.user_id !== 'local-demo-user') {
      setUser(mapProfileToUser(profile));
    }
    if (profile.active_company_id && (!activeCompanyId || activeCompanyId === 'company-local-demo' || profile.user_id === 'local-demo-user')) {
      setActiveCompany(profile.active_company_id);
    }
  }, [profile, hasUser, setUser, activeCompanyId, setActiveCompany]);
  return null;
}
