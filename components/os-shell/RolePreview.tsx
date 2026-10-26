'use client';
import React from 'react';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import { useIsSaimorInternal } from '@/lib/hooks/useIsSaimorInternal';

export type RolePreview = 'owner' | 'department' | 'member';
const OWNER_ROLES = ['owner', 'admin', 'superadmin', 'inhaber'];
/** Sichtbare Planeten je Vorschau-Rolle: null = alles; sonst eine Abteilung (aktive, sonst erste) + Aufgaben. */
export function visiblePlanetIds(role: RolePreview, planets: { id: string; kind?: string }[], activeId?: string | null, tasksPlanetId?: string | null): Set<string> | null {
  if (role === 'owner') return null;
  const depts = planets.filter((p) => p.kind === 'department');
  const mine = depts.find((p) => p.id === activeId) ?? depts[0];
  return new Set([mine?.id, tasksPlanetId].filter(Boolean) as string[]);
}

/** Echte Rolle → darf umschalten? */
export function canPreviewRole(userRole: string): boolean { return OWNER_ROLES.includes(userRole.toLowerCase()); }

export const ROLE_LABEL: Record<RolePreview, string> = { owner: 'Gesamtansicht', department: 'Abteilung', member: 'Mitglied' };

/**
 * Rollen-Vorschau: nur wer selbst Inhaber:in ist, kann umschalten; alle anderen sehen immer
 * ihre echte Sicht. Wirkt auf Heute, Universe und Finder (nur Anzeige, keine Rechte).
 */
export function useRolePreview(): { role: RolePreview; canPreview: boolean } {
  const userRole = useSessionStore((s) => String((s.user as { role?: string } | null)?.role ?? '').toLowerCase());
  const preview = useOsShellStore((s) => s.rolePreview);
  // Nur intern (wie „Lokale Instanz“): Kund:innen sehen immer ihre echte Sicht.
  const internal = useIsSaimorInternal();
  const canPreview = internal && canPreviewRole(userRole);
  return { role: canPreview ? preview : 'owner', canPreview };
}

export function RolePreviewToggle({ className }: { className?: string }) {
  const { role, canPreview } = useRolePreview();
  if (!canPreview) return null;
  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`} data-testid="role-preview">
      <span className="text-[12px] text-[rgba(235,231,222,.6)]">Vorschau (intern)</span>
      <div className="wd-roles" role="group" aria-label="Rollen-Vorschau">
        {(Object.keys(ROLE_LABEL) as RolePreview[]).map((r) => (
          <button key={r} type="button" aria-pressed={role === r} onClick={() => useOsShellStore.getState().setRolePreview(r)} data-testid={`role-${r}`}>{ROLE_LABEL[r]}</button>
        ))}
      </div>
    </div>
  );
}

/** Hinweis, solange eine andere Rolle angesehen wird. */
export function RolePreviewBanner() {
  const { role, canPreview } = useRolePreview();
  if (!canPreview || role === 'owner') return null;
  return (
    <div className="wd-role-banner" role="status" data-testid="role-banner">
      Vorschau als {ROLE_LABEL[role]}: {role === 'member' ? 'nur lesen, nur eigene Abteilung, keine Firmen-Quellen.' : 'nur die eigene Abteilung, keine Firmen-Quellen.'}
      <button type="button" onClick={() => useOsShellStore.getState().setRolePreview('owner')} data-testid="role-banner-reset">Zurück zur Gesamtansicht</button>
    </div>
  );
}

/** Universe (Desktop): dieselbe Rollen-Vorschau als kleines Menü statt einer dritten Kopfzeile. */
export function RolePreviewMenu({ className }: { className?: string }) {
  const { role, canPreview } = useRolePreview();
  if (!canPreview) return null;
  return (
    <details className={`wd-viewmenu ${className ?? ''}`} data-testid="role-preview-menu">
      <summary aria-label="Ansicht wählen">{ROLE_LABEL[role]} <span aria-hidden>▾</span></summary>
      <RolePreviewToggle />
    </details>
  );
}
