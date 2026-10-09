'use client';
import Link from 'next/link';
import React from 'react';
import { AppWindow, LayoutGrid } from 'lucide-react';
import { Button, ResponsiveGrid, Stack, Status, Surface, Text } from '@/components/os-kit';
import { getAppManifest } from '@/lib/apps/appRegistry';
import { LEGACY_APP_PLACEMENT, legacyAppName, openLegacyApp, type LegacyPlacement } from '@/lib/os-prototype/legacyApps';
import { getFeature } from '@/features/registry';
import { useSessionStore } from '@/lib/store/sessionStore';
import type { FeatureSurfaceProps } from '../types';

export const LABS_GROUPS: Array<{ id: string; title: string; copy: string; placements: LegacyPlacement[] }> = [
  { id: 'labs', title: 'Labor', copy: 'Experimentell. Funktioniert, ist aber (noch) kein Kernbereich.', placements: ['labs'] },
  { id: 'work', title: 'Arbeit', copy: 'Aufgaben und Arbeitssitzungen – offene Arbeit erscheint auch in Heute.', placements: ['work'] },
  { id: 'system', title: 'System', copy: 'Systemnah oder rollenbeschränkt.', placements: ['system'] },
  { id: 'legacy', title: 'Legacy', copy: 'Abgelöste Varianten – bleiben bis zur Freigabe erreichbar.', placements: ['legacy'] },
  { id: 'placed', title: 'In neue Bereiche eingeordnet', copy: 'Klassische Apps, die jetzt zu einem Hauptbereich gehören – hier direkt als Fenster.', placements: ['mora', 'finance', 'knowledge', 'post', 'settings'] },
];

const PLACEMENT_FEATURE: Partial<Record<LegacyPlacement, string>> = { mora: 'mora', finance: 'finance', knowledge: 'knowledge', post: 'post', settings: 'settings' };

export default function LabsSurface({ navigate }: FeatureSurfaceProps) {
  const role = useSessionStore((s) => s.user?.role ?? null);
  return (
    <div className="flex flex-col gap-8" data-testid="feature-labs">
      <header>
        <Text variant="eyebrow">Labs & System</Text>
        <Text variant="display" className="mt-2">Alles da. Nur nicht im Weg.</Text>
        <Text className="mt-2 max-w-2xl">
          Jede bisherige App bleibt erreichbar – als Fenster über der neuen Oberfläche. Nichts wurde gelöscht.
          Die klassische Oberfläche mit Universe, Spaces und Dock läuft unverändert weiter.
        </Text>
        <div className="mt-4"><Link href="/" className="os-button" data-testid="labs-legacy-shell"><LayoutGrid size={14} /> Klassische Oberfläche öffnen</Link></div>
      </header>

      {LABS_GROUPS.map((g) => {
        const entries = LEGACY_APP_PLACEMENT.filter((e) => g.placements.includes(e.placement));
        return (
          <section key={g.id} aria-label={g.title} data-labs-group={g.id}>
            <Text variant="title" as="h2">{g.title}</Text>
            <Text variant="meta" className="mb-3 mt-1">{g.copy}</Text>
            <ResponsiveGrid columns={3}>
              {entries.map((e) => {
                const manifest = getAppManifest(e.appId);
                const restricted = Boolean(manifest?.requiresRole && (!role || !manifest.requiresRole.includes(role)));
                const feature = PLACEMENT_FEATURE[e.placement];
                return (
                  <Surface key={e.appId} padding={4} data-legacy-app={e.appId}>
                    <Stack gap={2}>
                      <Stack direction="row" justify="space-between" align="center">
                        <Stack direction="row" gap={2} align="center"><AppWindow size={14} className="os-tone-faint" /><Text tone="default">{legacyAppName(e.appId)}</Text></Stack>
                        {restricted ? <Status tone="warning">Rolle nötig</Status> : null}
                      </Stack>
                      <Text variant="meta">{e.note}</Text>
                      <Stack direction="row" gap={2} wrap>
                        <Button size="sm" onClick={() => openLegacyApp(e.appId)}>Öffnen</Button>
                        {feature ? <Button size="sm" variant="ghost" onClick={() => navigate(feature)}>Zu {getFeature(feature)?.title}</Button> : null}
                      </Stack>
                    </Stack>
                  </Surface>
                );
              })}
            </ResponsiveGrid>
          </section>
        );
      })}
    </div>
  );
}
