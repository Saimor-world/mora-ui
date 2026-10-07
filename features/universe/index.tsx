'use client';
import React, { useState } from 'react';
import { Button, SampleTag, Stack, Surface, Text } from '@/components/os-kit';
import UniverseView from '@/components/home/UniverseView';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import type { FeatureSurfaceProps } from '../types';
import { useLandscape } from './data/useLandscape';
import { UniverseLandscape } from './ui/UniverseLandscape';
import { DemoOrganizationUniverse } from './ui/DemoOrganizationUniverse';

type Lens = 'landscape' | 'organization';

/**
 * Universe place (V1.3: am Original orientiert). Two lenses:
 *  - Organisationsfeld (Standard): die ORIGINAL-Planeten aus UniverseView –
 *    Abteilungen als Planeten, Ordner als Monde, Observatorium. Mit Sitzung
 *    die echte UniverseView; in der lokalen Vorschau dieselben Komponenten mit
 *    dem Demo-Paket „Simple Coffee Group“ und dem MÔRA-Kern in der Mitte.
 *  - OS-Bereiche: die V1.2-Landschaft der OS-Bereiche um MÔRA.
 */
export default function UniverseSurface({ navigate, preview }: FeatureSurfaceProps) {
  const [lens, setLens] = useState<Lens>('organization');
  const landscape = useLandscape(preview);
  const askMora = (text: string) => { useOsShellStore.getState().setMoraDraft(text); useOsShellStore.getState().setMoraOpen(true); };
  const hasSession = useSessionStore((st) => Boolean(st.user?.tenant_id));
  const demo = preview && !hasSession;
  const openArea = (target: string) => (target === 'universe:organization' ? setLens('organization') : navigate(target));

  return (
    <div className="os-universe" data-testid="feature-universe" data-lens={lens}>
      <Surface padding={4} className="os-universe__intro" aria-label="Universe">
        <Stack direction="row" align="center" justify="space-between" gap={3} wrap>
          <Stack gap={1} className="min-w-0">
            <Stack direction="row" gap={2} align="center"><Text variant="eyebrow">Universe</Text>{landscape.sample ? <SampleTag /> : null}</Stack>
            <Text variant="title" as="h1">{lens === 'organization' ? (demo ? 'Simple Coffee Group – deine Abteilungen' : 'Deine Abteilungen') : 'Deine Arbeitsbereiche'}</Text>
            <Text variant="meta">
              {lens === 'organization'
                ? 'Jede Kugel ist eine Abteilung. Klicke eine an, um Dokumente, Aufgaben und Hinweise zu sehen. Linien zeigen Zusammenhänge, die MÔRA gefunden hat.'
                : landscape.sample
                  ? 'Lokale Vorschau: die OS-Bereiche um MÔRA, gespeist aus dem Demo-Paket.'
                  : 'Deine OS-Bereiche als Planeten um MÔRA. Wähle einen Planeten, um hineinzuzoomen.'}
            </Text>
          </Stack>
          <Stack direction="row" gap={2} wrap>
            <div className="os-tabs os-universe__lens" role="tablist" aria-label="Ansicht">
              <button type="button" role="tab" className="os-tab" aria-selected={lens === 'organization'} onClick={() => setLens('organization')} data-testid="universe-lens-organization">Abteilungen</button>
              <button type="button" role="tab" className="os-tab" aria-selected={lens === 'landscape'} onClick={() => setLens('landscape')} data-testid="universe-lens-landscape">Arbeitsbereiche</button>
            </div>
            <Button size="sm" variant="ghost" onClick={() => navigate('today')}>Zurück zu Heute</Button>
          </Stack>
        </Stack>
      </Surface>
      <div className="os-universe__field" data-testid="universe-field">
        {lens === 'landscape'
          ? <UniverseLandscape landscape={landscape} sample={landscape.sample} onOpenArea={openArea} onAskMora={askMora} />
          : demo ? <DemoOrganizationUniverse onOpenArea={openArea} onAskMora={askMora} /> : <UniverseView />}
      </div>
    </div>
  );
}
