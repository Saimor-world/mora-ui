'use client';
import React from 'react';
import { Surface, Text } from '@/components/os-kit';
import type { FeatureSurfaceProps } from '../types';
import { MoraConsole } from './ui/MoraConsole';
import { openLegacyApp } from '@/lib/os-prototype/legacyApps';
import { Button } from '@/components/os-kit';

export default function MoraSurface({ navigate }: FeatureSurfaceProps) {
  return (
    <div className="flex flex-col gap-6" data-testid="feature-mora">
      <header>
        <Text variant="eyebrow">MÔRA</Text>
        <Text variant="display" className="mt-2">Die Bedienung von SAIMÔR.</Text>
        <Text className="mt-2 max-w-2xl">
          MÔRA kennt den Bereich, in dem du gerade bist, zeigt, woran sie arbeitet, und schlägt Schritte vor.
          Nichts mit Außenwirkung passiert ohne deine Bestätigung. Überall erreichbar mit <span className="os-kbd">⌘ J</span>.
        </Text>
      </header>
      <Surface padding={5} style={{ minHeight: 520, display: 'flex', flexDirection: 'column' }}>
        <MoraConsole variant="page" navigate={navigate} />
      </Surface>
      <div className="flex flex-wrap items-center gap-3">
        <Text variant="meta">Ausführliche Verläufe, Werkzeug-Spuren und Provider-Auswahl bleiben in der klassischen Chat-App.</Text>
        <Button size="sm" onClick={() => openLegacyApp('chat')}>Chat (klassisch) öffnen</Button>
      </div>
    </div>
  );
}
