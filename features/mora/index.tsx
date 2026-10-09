'use client';
import React, { useState } from 'react';
import { useSessionStore } from '@/lib/store/sessionStore';
import { MoraMemories, MoraSignals } from './ui/MoraSignals';
import { Surface, Text } from '@/components/os-kit';
import type { FeatureSurfaceProps } from '../types';
import { MoraConsole } from './ui/MoraConsole';
import { AgentFeed } from './ui/AgentFeed';
import { openLegacyApp } from '@/lib/os-prototype/legacyApps';
import { Button } from '@/components/os-kit';

export default function MoraSurface({ navigate, preview }: FeatureSurfaceProps) {
  const [tab, setTab] = useState<'chat' | 'memories' | 'signals' | 'agents'>('chat');
  const hasSession = useSessionStore((s) => Boolean(s.user));
  const demo = Boolean(preview) && !hasSession;
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
      <div className="os-tabs" role="tablist" aria-label="MÔRA">
        {([['chat', 'Chat'], ['memories', 'Erinnerungen'], ['signals', 'Signale'], ['agents', 'Agenten']] as const).map(([id, l]) => (
          <button key={id} type="button" className="os-tab" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} data-testid={`mora-tab-${id}`}>{l}</button>
        ))}
      </div>
      <Surface padding={5} style={{ minHeight: 520, display: 'flex', flexDirection: 'column' }}>
        {tab === 'chat' ? <MoraConsole variant="page" navigate={navigate} /> : tab === 'agents' ? <AgentFeed live={!demo && hasSession} demo={demo} limit={20} /> : tab === 'signals' ? <MoraSignals navigate={navigate} demo={demo} /> : <MoraMemories live={!demo && hasSession} />}
      </Surface>
      <div className="flex flex-wrap items-center gap-3">
        <Text variant="meta">Ausführliche Verläufe, Werkzeug-Spuren und Provider-Auswahl bleiben in der klassischen Chat-App.</Text>
        <Button size="sm" onClick={() => openLegacyApp('chat')}>Chat (klassisch) öffnen</Button>
      </div>
    </div>
  );
}
