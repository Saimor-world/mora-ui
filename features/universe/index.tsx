'use client';
import React from 'react';
import { Button, Stack, Surface, Text } from '@/components/os-kit';
import UniverseView from '@/components/home/UniverseView';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import type { FeatureSurfaceProps } from '../types';

export default function UniverseSurface({ navigate, preview }: FeatureSurfaceProps) {
  return (
    <div className="os-universe" data-testid="feature-universe">
      <Surface padding={4} className="os-universe__intro" aria-label="Universe">
        <Stack direction="row" align="center" justify="space-between" gap={3} wrap>
          <Stack gap={1} className="min-w-0">
            <Text variant="eyebrow">Universe</Text>
            <Text variant="title" as="h1">Der Raum deines Unternehmens.</Text>
            <Text variant="meta">
              {preview
                ? 'Lokale Vorschau: ohne CORE-Sitzung bleibt der Raum leer – Atmosphäre und Aufbau sind echt, Bereiche erscheinen mit deinem Unternehmen.'
                : 'Bereiche, Spaces und Zusammenhänge – als Landschaft statt als Liste.'}
            </Text>
          </Stack>
          <Stack direction="row" gap={2}>
            <Button size="sm" onClick={() => navigate('today')}>Zurück zu Heute</Button>
            <Button size="sm" variant="ghost" onClick={() => { useOsShellStore.getState().setMoraDraft('Was zeigt mir das Universe gerade?'); useOsShellStore.getState().setMoraOpen(true); }}>MÔRA fragen</Button>
          </Stack>
        </Stack>
      </Surface>
      <div className="os-universe__field" data-testid="universe-field">
        <UniverseView />
      </div>
    </div>
  );
}
