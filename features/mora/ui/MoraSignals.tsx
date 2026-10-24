'use client';
import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { approveMemoryItem, getMemoryPending, learnInsight, rejectMemoryItem } from '@/lib/api/memoryClient';
import { guessCategory } from '@/lib/memory';
import { useNavStore } from '@/lib/store/navStore';
import { Activity, ArrowRight, Sparkles } from 'lucide-react';
import { Button, SampleTag, Stack, StateView, Text } from '@/components/os-kit';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';

const CAT: Record<string, string> = { risk: 'Risiko', opportunity: 'Chance', trend: 'Trend', hint: 'Wahrnehmung' };

/**
 * Aus dem Legacy-MÔRA-Fenster (Tab „Signale“): Kennzahlen-Kacheln und
 * Live-Signale mit „Erklären“ / „Navigieren“. Verbessert: Navigieren landet
 * direkt auf dem Planeten (Fokus + Detail-Panel), Erklären füllt nur den
 * Entwurf – gesendet wird erst nach deinem Klick.
 */
export function MoraSignals(_props: { navigate: (id: string) => void; demo: boolean }) {
  return <StateView kind="not_configured" title="Signale kommen aus CORE" copy="Mit CORE-Sitzung erscheinen hier MÔRAs Live-Signale aus dem Mindloop." />;
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
