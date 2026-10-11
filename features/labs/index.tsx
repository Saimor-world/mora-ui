'use client';
import Link from 'next/link';
import React, { useMemo, useState } from 'react';
import { AppWindow, LayoutGrid, Search } from 'lucide-react';
import { Button, ResponsiveGrid, Stack, Status, Surface, Text } from '@/components/os-kit';
import { getAppManifest } from '@/lib/apps/appRegistry';
import { LEGACY_APP_PLACEMENT, legacyAppName, openLegacyApp, type LegacyPlacement } from '@/lib/os-prototype/legacyApps';
import { getFeature } from '@/features/registry';
import { useSessionStore } from '@/lib/store/sessionStore';
import type { FeatureSurfaceProps } from '../types';

/** A single catalog for both existing tools and classic apps, not a second OS. */
export const LABS_GROUPS: Array<{ id: string; title: string; copy: string; placements: LegacyPlacement[] }> = [
  { id: 'placed', title: 'Im neuen OS', copy: 'Werkzeuge, die in den Hauptbereichen aufgegangen sind.', placements: ['mora', 'finance', 'knowledge', 'post', 'settings'] },
  { id: 'work', title: 'Arbeit', copy: 'Aufgaben und Arbeitssitzungen.', placements: ['work'] },
  { id: 'labs', title: 'Werkzeuge & Labor', copy: 'Zusätzliche und experimentelle Werkzeuge. Nicht alles ist produktionsreif.', placements: ['labs'] },
  { id: 'system', title: 'System & Verwaltung', copy: 'Nur mit den passenden Berechtigungen.', placements: ['system'] },
  { id: 'legacy', title: 'Klassische Versionen', copy: 'Ältere Anwendungen bleiben zugänglich, bis ihre Funktionen vollständig übernommen sind.', placements: ['legacy'] },
];

const PLACEMENT_FEATURE: Partial<Record<LegacyPlacement, string>> = { mora: 'mora', finance: 'finance', knowledge: 'knowledge', post: 'post', settings: 'settings' };

export default function LabsSurface({ navigate, preview }: FeatureSurfaceProps) {
  const role = useSessionStore((s) => s.user?.role ?? null);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('all');
  const needle = query.trim().toLocaleLowerCase('de');

  const groups = useMemo(() => LABS_GROUPS.filter((g) => group === 'all' || g.id === group).map((g) => ({
    ...g,
    entries: LEGACY_APP_PLACEMENT.filter((e) => e.appId !== 'apps' && g.placements.includes(e.placement))
      .filter((e) => {
        const m = getAppManifest(e.appId);
        return Boolean(m) && (!m!.requiresRole || (!preview && !!role && m!.requiresRole.includes(role)));
      })
      .filter((e) => !needle || [legacyAppName(e.appId), e.appId, e.note].some((v) => v.toLocaleLowerCase('de').includes(needle))),
  })).filter((g) => g.entries.length > 0), [group, needle, role, preview]);

  return (
    <div className="flex flex-col gap-6" data-testid="feature-labs">
      <header>
        <Text variant="eyebrow">App-Center</Text>
        <Text variant="display" className="mt-2">Deine Werkzeuge. An einem Ort.</Text>
        <Text className="mt-2 max-w-2xl">
          Die täglichen Bereiche gehören ins OS. Zusätzliche Werkzeuge sind hier zu finden.
          Klassische Anwendungen öffnen weiterhin als Fenster — solange ihre Funktionen noch nicht vollständig migriert sind.
        </Text>
        {preview ? <Text variant="meta" className="mt-2">Lokale Vorschau · keine echten Konten oder Daten.</Text> : null}
      </header>

      <label className="flex items-center gap-2 os-list-row" style={{ maxWidth: 460 }}>
        <Search size={17} aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Werkzeuge suchen"
          placeholder="Werkzeuge suchen …"
          className="flex-1 bg-transparent outline-none"
          data-testid="app-center-search"
        />
      </label>

      <div className="flex flex-wrap gap-2" role="group" aria-label="App-Center Bereiche">
        {[{ id: 'all', title: 'Alle' }, ...LABS_GROUPS].map((g) => (
          <Button key={g.id} size="sm" variant={group === g.id ? 'primary' : 'ghost'} onClick={() => setGroup(g.id)}>
            {g.title}
          </Button>
        ))}
      </div>

      {groups.length === 0 ? <Surface padding={4}><Text>Keine passenden Werkzeuge gefunden.</Text></Surface> : null}
      {groups.map((g) => (
        <section key={g.id} aria-label={g.title} data-labs-group={g.id}>
          <Text variant="title" as="h2">{g.title}</Text>
          <Text variant="meta" className="mb-3 mt-1">{g.copy}</Text>
          <ResponsiveGrid columns={3}>
            {g.entries.map((e) => {
              const feature = PLACEMENT_FEATURE[e.placement];
              const featureName = feature ? getFeature(feature)?.title : null;
              return (
                <Surface key={e.appId} padding={4} data-legacy-app={e.appId}>
                  <Stack gap={2}>
                    <Stack direction="row" gap={2} align="center">
                      <AppWindow size={16} className="os-tone-faint" aria-hidden />
                      <Text tone="default">{legacyAppName(e.appId)}</Text>
                    </Stack>
                    <Text variant="meta">{e.note}</Text>
                    <Stack direction="row" gap={2} wrap>
                      {feature ? (
                        <Button size="sm" onClick={() => navigate(feature)}>Zu {featureName}</Button>
                      ) : (
                        <Button size="sm" onClick={() => openLegacyApp(e.appId)}>Klassisch öffnen</Button>
                      )}
                      {feature && e.appId !== 'integrations' && e.appId !== 'finance-v2' ? (
                        <Button size="sm" variant="ghost" onClick={() => openLegacyApp(e.appId)}>Klassische App</Button>
                      ) : null}
                    </Stack>
                  </Stack>
                </Surface>
              );
            })}
          </ResponsiveGrid>
        </section>
      ))}

      <Surface padding={4}>
        <Stack gap={2}>
          <Text variant="title">Nichts verloren.</Text>
          <Text variant="meta">Die klassische Oberfläche bleibt für Übergangsfälle zugänglich. Sie ist kein zweites Produkt.</Text>
          <Link href="/" className="os-button" data-testid="labs-legacy-shell"><LayoutGrid size={14} /> Klassische Oberfläche öffnen</Link>
        </Stack>
      </Surface>
    </div>
  );
}
