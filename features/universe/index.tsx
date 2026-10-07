'use client';
import React, { useState } from 'react';
import { Button, SampleTag, Stack, Surface, Text } from '@/components/os-kit';
import UniverseView from '@/components/home/UniverseView';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import type { FeatureSurfaceProps } from '../types';
import { useLandscape } from './data/useLandscape';
import { UniverseLandscape } from './ui/UniverseLandscape';

type Lens = 'landscape' | 'organization';

/**
 * Universe place. Two lenses on the same space:
 *  - Landschaft: the OS areas as planets around MÔRA (new, V1.2)
 *  - Organisationsfeld: the real legacy UniverseView (departments as planets,
 *    folder moons, fall-capture filing, CursorAgent, observatory) — unchanged.
 */
export default function UniverseSurface({ navigate, preview }: FeatureSurfaceProps) {
  const [lens, setLens] = useState<Lens>('landscape');
  const landscape = useLandscape(preview);
  const askMora = (text: string) => { useOsShellStore.getState().setMoraDraft(text); useOsShellStore.getState().setMoraOpen(true); };
  const openArea = (target: string) => (target === 'universe:organization' ? setLens('organization') : navigate(target));

  return (
    <div className="os-universe" data-testid="feature-universe" data-lens={lens}>
      <Surface padding={4} className="os-universe__intro" aria-label="Universe">
        <Stack direction="row" align="center" justify="space-between" gap={3} wrap>
          <Stack gap={1} className="min-w-0">
            <Stack direction="row" gap={2} align="center"><Text variant="eyebrow">Universe</Text>{landscape.sample && lens === 'landscape' ? <SampleTag /> : null}</Stack>
            <Text variant="title" as="h1">Der Raum deines Unternehmens.</Text>
            <Text variant="meta">
              {lens === 'organization'
                ? 'Organisationsfeld: deine Abteilungen als Planeten, Ordner als Monde – erscheint mit CORE-Sitzung.'
                : landscape.sample
                  ? 'Lokale Vorschau: Beispieldaten zeigen, wie der Raum lebt. Mit CORE-Sitzung tragen echte Signale die Planeten.'
                  : 'Deine Bereiche als Planeten um MÔRA. Wähle einen Planeten, um hineinzuzoomen.'}
            </Text>
          </Stack>
          <Stack direction="row" gap={2} wrap>
            <div className="os-tabs os-universe__lens" role="tablist" aria-label="Ansicht">
              <button type="button" role="tab" className="os-tab" aria-selected={lens === 'landscape'} onClick={() => setLens('landscape')}>Landschaft</button>
              <button type="button" role="tab" className="os-tab" aria-selected={lens === 'organization'} onClick={() => setLens('organization')} data-testid="universe-lens-organization">Organisationsfeld</button>
            </div>
            <Button size="sm" variant="ghost" onClick={() => navigate('today')}>Zurück zu Heute</Button>
          </Stack>
        </Stack>
      </Surface>
      <div className="os-universe__field" data-testid="universe-field">
        {lens === 'landscape'
          ? <UniverseLandscape landscape={landscape} sample={landscape.sample} onOpenArea={openArea} onAskMora={askMora} />
          : <UniverseView />}
      </div>
    </div>
  );
}
