'use client';
import React from 'react';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';

export type RolePreview = 'owner' | 'department' | 'member';
const OWNER_ROLES = ['owner', 'admin', 'superadmin', 'inhaber'];
export const ROLE_LABEL: Record<RolePreview, string> = { owner: 'Inhaberin', department: 'Abteilung', member: 'Mitglied' };

/**
 * Rollen-Vorschau: nur wer selbst Inhaber:in ist, kann umschalten; alle anderen sehen immer
 * ihre echte Sicht. Wirkt auf Heute, Universe und Finder (nur Anzeige, keine Rechte).
 */
export function useRolePreview(): { role: RolePreview; canPreview: boolean } {
  const userRole = useSessionStore((s) => String((s.user as { role?: string } | null)?.role ?? '').toLowerCase());
  const preview = useOsShellStore((s) => s.rolePreview);
  const canPreview = OWNER_ROLES.includes(userRole);
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
      <button type="button" onClick={() => useOsShellStore.getState().setRolePreview('owner')} data-testid="role-banner-reset">Zurück zur Inhaberin</button>
    </div>
  );
}
