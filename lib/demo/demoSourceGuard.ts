'use client';
import { useDemoStore } from '@/lib/demo/demoStore';
import { useSessionStore } from '@/lib/store/sessionStore';

/**
 * Demo-Bühne (fiktive Firma im HQ-Login): persönliche Quellen der Sitzung (Gmail/Kalender über
 * /v3/mail, /v3/calendar, /v3/briefing) hängen am echten Nutzer, nicht an der company_id.
 * Solange eine Demo-Firma gewählt ist, werden sie gar nicht abgefragt – die Demo zeigt nur
 * ihren eigenen Datensatz oder nichts, nie echte Mails.
 */
export function isDemoScopeActive(): boolean {
  return Boolean(useDemoStore.getState().demoCompanyId);
}
export function useDemoScopeActive(): boolean {
  return useDemoStore((s) => Boolean(s.demoCompanyId));
}

/** Cache partition only; CORE remains responsible for authorization. */
export function usePersonalSourceKey(): string {
  const scope = useDemoStore((s) => s.scopeGeneration);
  const identity = useSessionStore((s) => JSON.stringify([s.user?.tenant_id, s.user?.id, s.sessionGeneration]));
  return JSON.stringify([identity, scope]);
}

export function personalSourceKey(): string {
  const s = useSessionStore.getState();
  return JSON.stringify([JSON.stringify([s.user?.tenant_id, s.user?.id, s.sessionGeneration]), useDemoStore.getState().scopeGeneration]);
}

/** Reject old callbacks/results even after a quick own → demo → own round trip. */
export function capturePersonalSourceScope(expectedKey = personalSourceKey()): () => boolean {
  const demoState = useDemoStore.getState();
  const session = useSessionStore.getState();
  return () => {
    const current = useSessionStore.getState();
    const demo = useDemoStore.getState();
    return !demoState.demoCompanyId && !demo.demoCompanyId && demo.scopeGeneration === demoState.scopeGeneration
      && personalSourceKey() === expectedKey
      && current.sessionGeneration === session.sessionGeneration
      && current.user?.tenant_id === session.user?.tenant_id
      && current.user?.id === session.user?.id;
  };
}
