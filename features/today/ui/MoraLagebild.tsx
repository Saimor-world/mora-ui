'use client';
import React from 'react';
import { Crosshair } from 'lucide-react';
import { Button, MoraStone, SampleTag, Stack, Surface, Text } from '@/components/os-kit';
import { DEMO_DEPARTMENTS, DEMO_MINDLOOP } from '@/lib/os-prototype/demoPack';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';

const CATEGORY: Record<string, string> = { risk: 'Risiko', opportunity: 'Chance', trend: 'Trend', hint: 'Hinweis' };

/** Die drei wichtigsten MÔRA-Beobachtungen: Risiko vor Chance vor Trend, dann Schwere. */
export function lagebildPriorities(limit = 3) {
  const rank: Record<string, number> = { risk: 0, opportunity: 1, trend: 2, hint: 3 };
  return [...DEMO_MINDLOOP].sort((a, b) => rank[a.category] - rank[b.category] || b.severity - a.severity).slice(0, limit);
}

/**
 * V1.4 – MÔRA-Lagebild auf Heute. Drei Prioritäten aus den Beobachtungen des
 * Demo-Pakets (Mindloop), je mit einem Klick auf den Planeten im Universe.
 * Nur in der lokalen Vorschau; mit Sitzung erscheint es erst, wenn CORE
 * echte Beobachtungen liefert (kein Platzhalter mit erfundenen Werten).
 */
export function MoraLagebild({ navigate }: { navigate: (id: string) => void }) {
  const items = lagebildPriorities();
  const focus = (id: string) => { useOsShellStore.getState().setUniverseFocus(id); navigate('universe'); };
  const ask = (text: string) => { const st = useOsShellStore.getState(); st.setMoraDraft(`Erklär mir: ${text}`); st.setMoraOpen(true); };
  return (
    <Surface padding={5} className="os-lagebild" data-testid="mora-lagebild" aria-label="MÔRA-Lagebild">
      <Stack direction="row" align="center" justify="space-between" className="mb-3">
        <Stack direction="row" gap={2} align="center"><MoraStone size={20} halo={false} /><Text variant="eyebrow">MÔRA-Lagebild · 3 Prioritäten</Text></Stack>
        <SampleTag />
      </Stack>
      <ol className="os-lagebild__list">
        {items.map((m, i) => {
          const dept = DEMO_DEPARTMENTS.find((d) => d.id === m.targetId);
          return (
            <li key={m.id} className="os-lagebild__item" data-category={m.category}>
              <span className="os-lagebild__rank" aria-hidden>{i + 1}</span>
              <Stack gap={0} className="min-w-0 flex-1">
                <Text variant="meta">{CATEGORY[m.category]} · {dept?.name} · vor {m.hoursAgo} h</Text>
                <Text tone="default">{m.title.replace(/^Môra:\s*/, '')}</Text>
                <Text variant="meta">{m.message}</Text>
              </Stack>
              <Stack direction="row" gap={2} wrap className="os-lagebild__actions">
                <Button size="sm" icon={<Crosshair size={14} />} onClick={() => focus(m.targetId)} data-testid={`lagebild-focus-${m.targetId}`}>Im Universe</Button>
                <Button size="sm" variant="ghost" onClick={() => ask(m.title)}>MÔRA fragen</Button>
              </Stack>
            </li>
          );
        })}
      </ol>
    </Surface>
  );
}
