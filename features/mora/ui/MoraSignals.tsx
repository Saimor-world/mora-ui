'use client';
import React from 'react';
import { Activity, ArrowRight, Sparkles } from 'lucide-react';
import { Button, SampleTag, Stack, StateView, Text } from '@/components/os-kit';
import { DEMO_DEPARTMENTS, DEMO_MINDLOOP } from '@/lib/os-prototype/demoPack';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';

const CAT: Record<string, string> = { risk: 'Risiko', opportunity: 'Chance', trend: 'Trend', hint: 'Wahrnehmung' };

/**
 * Aus dem Legacy-MÔRA-Fenster (Tab „Signale“): Kennzahlen-Kacheln und
 * Live-Signale mit „Erklären“ / „Navigieren“. Verbessert: Navigieren landet
 * direkt auf dem Planeten (Fokus + Detail-Panel), Erklären füllt nur den
 * Entwurf – gesendet wird erst nach deinem Klick.
 */
export function MoraSignals({ navigate, demo }: { navigate: (id: string) => void; demo: boolean }) {
  if (!demo) return <StateView kind="not_configured" title="Signale kommen aus CORE" copy="Mit CORE-Sitzung erscheinen hier MÔRAs Live-Signale aus dem Mindloop." />;
  const recent = DEMO_MINDLOOP.filter((m) => m.hoursAgo <= 24 * 7).length;
  const stats: Array<[string, number | string]> = [['Erinnerungen', 0], ['Fakten', 0], ['Offen', DEMO_MINDLOOP.filter((m) => m.category === 'risk').length], ['Neu (7 T)', recent]];
  return (
    <Stack gap={4} data-testid="mora-signals">
      <div className="os-mora-stats">{stats.map(([l, v]) => <div key={l}><b>{v}</b><span>{l}</span></div>)}</div>
      <Stack direction="row" gap={2} align="center"><Activity size={14} className="os-tone-accent" aria-hidden /><Text variant="eyebrow">Live-Signale · {DEMO_MINDLOOP.length}</Text><SampleTag /></Stack>
      <div className="os-list">
        {DEMO_MINDLOOP.map((m) => {
          const dep = DEMO_DEPARTMENTS.find((d) => d.id === m.targetId);
          return (
            <div key={m.id} className="os-list-row" data-testid={`mora-signal-${m.id}`}>
              <Stack gap={0} className="min-w-0">
                <Text variant="meta">{CAT[m.category]} · {dep?.name} · vor {m.hoursAgo} h</Text>
                <Text tone="default">{m.title}</Text>
                <Text variant="meta">{m.message}</Text>
              </Stack>
              <Stack direction="row" gap={1}>
                <Button size="sm" variant="ghost" icon={<Sparkles size={13} />} onClick={() => { useOsShellStore.getState().setMoraDraft(`Erkläre: ${m.title}`); useOsShellStore.getState().setMoraOpen(true); }}>Erklären</Button>
                <Button size="sm" icon={<ArrowRight size={13} />} onClick={() => { useOsShellStore.getState().setUniverseFocus(m.targetId); navigate('universe'); }}>Navigieren</Button>
              </Stack>
            </div>
          );
        })}
      </div>
    </Stack>
  );
}

export function MoraMemories() {
  return <StateView kind="empty" title="Noch keine Erinnerungen" copy="Sag MÔRA „Merke dir …“ – belastbare Fakten erscheinen dann hier, mit Quelle. Nichts wird ohne dich gespeichert." />;
}
