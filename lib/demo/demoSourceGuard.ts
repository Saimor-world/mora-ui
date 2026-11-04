'use client';
import { useDemoStore } from '@/lib/demo/demoStore';

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
