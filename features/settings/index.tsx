'use client';
import React, { useState } from 'react';
import { Button, FailureState, Loading, Stack, StateView, Status, Surface, Text } from '@/components/os-kit';
import { classifyCoreFailure } from '@/lib/os-prototype/coreFailure';
import { enabledFeatureFlags, isOsPrototypeEnabled } from '@/lib/os-prototype/flags';
import { openLegacyApp } from '@/lib/os-prototype/legacyApps';
import { useCoreHealth } from '@/lib/os-prototype/useCoreHealth';
import { useSessionStore } from '@/lib/store/sessionStore';
import type { FeatureSurfaceProps } from '../types';
import { LookSettings } from './ui/LookSettings';
import { connectionRows, useConnectionsOverview } from './data/useConnections';

export const SETTINGS_SECTIONS = [
  { id: 'account', label: 'Konto' },
  { id: 'identity', label: 'Identität' },
  { id: 'connections', label: 'Verbindungen' },
  { id: 'permissions', label: 'Berechtigungen' },
  { id: 'system', label: 'System' },
] as const;
type SectionId = typeof SETTINGS_SECTIONS[number]['id'];

const PERMISSION_LABEL: Record<string, string> = {
  canCreate: 'Inhalte anlegen', canDelete: 'Inhalte löschen', canAdmin: 'Verwaltung', canEditSettings: 'Einstellungen ändern', canViewAnalytics: 'Auswertungen sehen',
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="os-list-row"><Text variant="meta">{label}</Text><Text tone="default" as="div">{value}</Text></div>;
}

export default function SettingsSurface({ preview }: FeatureSurfaceProps) {
  const [section, setSection] = useState<SectionId>('account');
  const user = useSessionStore((s) => s.user);
  const permissions = useSessionStore((s) => s.permissions);
  const connections = useConnectionsOverview();
  const health = useCoreHealth();
  const flags = Array.from(enabledFeatureFlags());

  return (
    <div className="flex flex-col gap-6" data-testid="feature-settings">
      <header>
        <Text variant="eyebrow">Einstellungen</Text>
        <Text variant="display" className="mt-2">Wenige Schalter, klar benannt.</Text>
      </header>
      <LookSettings />
      <div className="os-tabs" role="tablist" aria-label="Einstellungen">
        {SETTINGS_SECTIONS.map((s) => (
          <button key={s.id} type="button" role="tab" aria-selected={section === s.id} className="os-tab" onClick={() => setSection(s.id)}>{s.label}</button>
        ))}
      </div>

      <Surface padding={5}>
        {section === 'account' && (user ? (
          <div className="os-list"><Row label="Name" value={user.name} /><Row label="E-Mail" value={user.email || '—'} /><Row label="Rolle" value={user.role} /></div>
        ) : <FailureState kind="unauthenticated" compact />)}

        {section === 'identity' && (user ? (
          <div className="os-list">
            <Row label="Mandant" value={user.tenant_id ? 'zugeordnet (CORE)' : 'unbekannt'} />
            <Row label="Aktives Unternehmen" value={user.active_company_name || '—'} />
            <Row label="Unternehmen gesamt" value={user.company_count ?? '—'} />
            <Row label="Scope-Quelle" value={user.scope_source || '—'} />
          </div>
        ) : <FailureState kind="unauthenticated" compact />)}

        {section === 'connections' && (
          <Stack gap={4}>
            {!user ? <FailureState kind="unauthenticated" compact subject="/v3/integrations/overview" />
              : connections.isLoading ? <Loading />
              : connections.isError ? <FailureState kind={classifyCoreFailure(connections.error)} compact />
              : connections.data === null ? <StateView kind="offline" compact detail="/v3/integrations/overview" />
              : (
                <div className="os-list">
                  {connectionRows(connections.data).map((r) => (
                    <div key={r.id} className="os-list-row">
                      <Stack gap={0}><Text tone="default">{r.label}</Text>{r.detail ? <Text variant="meta">{r.detail}</Text> : null}</Stack>
                      <Status tone={r.state === 'configured' ? 'safe' : r.state === 'not_configured' ? 'neutral' : 'warning'}>
                        {r.state === 'configured' ? 'eingerichtet (laut CORE)' : r.state === 'not_configured' ? 'nicht eingerichtet' : 'unbekannt'}
                      </Status>
                    </div>
                  ))}
                </div>
              )}
            <div><Button size="sm" onClick={() => openLegacyApp('integrations')}>Verbindungen verwalten</Button></div>
          </Stack>
        )}

        {section === 'permissions' && (
          <Stack gap={3}>
            {!user ? <Text variant="meta">Ohne Sitzung gelten die Rechte der Demo-Rolle (nur lesen).</Text> : null}
            <div className="os-list">
              {Object.entries(permissions).map(([k, v]) => (
                <div key={k} className="os-list-row"><Text>{PERMISSION_LABEL[k] || k}</Text><Status tone={v ? 'safe' : 'neutral'}>{v ? 'erlaubt' : 'nicht erlaubt'}</Status></div>
              ))}
            </div>
            <Text variant="meta">Rechte kommen aus der Rolle in CORE. Rollenverwaltung: Labs & System › Benutzer / Team.</Text>
          </Stack>
        )}

        {section === 'system' && (
          <div className="os-list">
            <Row label="CORE" value={<Status tone={health.data?.state === 'online' ? 'safe' : 'warning'}>{health.data?.state === 'online' ? 'erreichbar' : 'nicht erreichbar'}</Status>} />
            <Row label="CORE-Build" value={health.data?.build || '—'} />
            <Row label="Umgebung" value={health.data?.environment || '—'} />
            <Row label="OS-Prototyp" value={isOsPrototypeEnabled() ? 'aktiv' : 'aus'} />
            <Row label="Lokale Vorschau" value={preview ? 'aktiv (nur localhost)' : 'aus'} />
            <Row label="Feature-Flags" value={flags.length ? flags.join(', ') : 'keine'} />
          </div>
        )}
      </Surface>

      <Stack direction="row" gap={3} align="center" wrap>
        <Text variant="meta">Alle bisherigen Einstellungen (Darstellung, Audio, SMTP, …) bleiben in der klassischen Ansicht.</Text>
        <Button size="sm" variant="ghost" onClick={() => openLegacyApp('settings')}>Alle Einstellungen (klassisch)</Button>
      </Stack>
    </div>
  );
}
