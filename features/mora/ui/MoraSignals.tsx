'use client';
import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { approveMemoryItem, getMemoryPending, learnInsight, rejectMemoryItem } from '@/lib/api/memoryClient';
import { guessCategory } from '@/lib/memory';
import { useNavStore } from '@/lib/store/navStore';
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

/**
 * Erinnerungen – reaktiviert aus dem Legacy-Bestand: QuickMemoryInput (war
 * kaputt: importierte learnInsight aus coreClient, wo es nicht mehr existiert)
 * und die nie angezeigte Freigabe-Schleife /v3/memory/pending → approve/reject.
 * MÔRA schlägt Fakten vor, du bestätigst. Ohne Sitzung: ehrlicher Leerzustand.
 */
export function MoraMemories({ live }: { live: boolean }) {
  const companyId = useNavStore((s) => s.activeCompanyId) || '';
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const pending = useQuery({ queryKey: ['os', 'memory-pending', companyId], queryFn: () => getMemoryPending(companyId), enabled: live && Boolean(companyId), retry: false });
  const learn = useMutation({ mutationFn: (insight: string) => learnInsight({ insight, category: guessCategory(insight), company_id: companyId }), onSuccess: () => { setText(''); qc.invalidateQueries({ queryKey: ['os', 'memory-pending'] }); } });
  const decide = useMutation({ mutationFn: ({ id, ok }: { id: string | number; ok: boolean }) => (ok ? approveMemoryItem(id, companyId) : rejectMemoryItem(id, companyId)), onSuccess: () => qc.invalidateQueries({ queryKey: ['os', 'memory-pending'] }) });
  if (!live) return <StateView kind="not_configured" title="Erinnerungen brauchen eine CORE-Sitzung" copy="Sag MÔRA „Merke dir …“ – sie schlägt Fakten vor, du bestätigst sie hier. Nichts wird ohne dich gespeichert." />;
  const items = (pending.data || []) as Array<{ id: string | number; insight?: string; content?: string; category?: string }>;
  return (
    <Stack gap={4} data-testid="mora-memories">
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) learn.mutate(text.trim()); }}>
        <input className="os-input flex-1" placeholder="Merke dir … (z. B. „Lieferant X liefert dienstags“)" value={text} onChange={(e) => setText(e.target.value)} aria-label="Neue Erinnerung" />
        <Button size="sm" type="submit" disabled={!text.trim() || learn.isPending}>Vorschlagen</Button>
      </form>
      {learn.isError ? <Text variant="meta">Konnte nicht gespeichert werden – CORE hat abgelehnt.</Text> : null}
      <Text variant="eyebrow">Wartet auf deine Freigabe · {items.length}</Text>
      {items.length === 0 ? <Text variant="meta">Nichts offen.</Text> : (
        <div className="os-list">{items.map((m) => (
          <div key={m.id} className="os-list-row"><Text tone="default">{m.insight || m.content}</Text>
            <Stack direction="row" gap={1}><Button size="sm" onClick={() => decide.mutate({ id: m.id, ok: true })}>Übernehmen</Button><Button size="sm" variant="ghost" onClick={() => decide.mutate({ id: m.id, ok: false })}>Verwerfen</Button></Stack>
          </div>))}</div>
      )}
    </Stack>
  );
}
