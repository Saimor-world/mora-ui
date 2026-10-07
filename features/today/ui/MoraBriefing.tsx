'use client';
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sunrise } from 'lucide-react';
import { Button, MoraStone, SampleTag, Stack, Status, Surface, Text } from '@/components/os-kit';
import { coreGet } from '@/lib/api/http';
import { DEMO_CALENDAR, DEMO_MAIL, DEMO_MINDLOOP, DEMO_TASKS } from '@/lib/os-prototype/demoPack';

/**
 * V1.5 MÔRA-Morgenbriefing.
 * Nutzt zwei CORE-Endpunkte, die das Legacy-OS kaum/nie aufgerufen hat:
 *  - GET /v3/connections  (verbundene Quellen; im Legacy-UI ungenutzt)
 *  - GET /v3/briefing     (Tagesbriefing; Legacy-Hook täuschte bei Fehlern „Normalbetrieb“ vor)
 * Regel: Das Briefing erscheint NUR, wenn mindestens eine Quelle verbunden ist
 * und CORE ein nicht-degradiertes Briefing liefert. Sonst ein ehrlicher Zustand
 * mit den Quellen – und optional eine klar markierte Demo-Vorschau.
 */
interface Connections { data?: { connections?: Array<{ provider?: string; status?: string; label?: string }> } }
interface Briefing { status?: string; text?: string; date?: string }

const SOURCES = ['Mail', 'Kalender', 'Cloud-Dateien', 'Branchen-Feeds'];

function demoBriefing(): string[] {
  const unread = DEMO_MAIL.filter((m) => !m.read).length;
  const risk = DEMO_MINDLOOP.find((m) => m.category === 'risk');
  return [
    `${DEMO_CALENDAR.length} Termine heute, zuerst „${DEMO_CALENDAR[0]?.title}“.`,
    `${unread} ungelesene Nachrichten – wichtigste: „${DEMO_MAIL[0]?.subject}“.`,
    `${DEMO_TASKS.length} offene Aufgaben in der Organisation.`,
    risk ? `Risiko im Blick: ${risk.title}.` : 'Keine Risiken belegt.',
  ];
}

export function MoraBriefing({ live }: { live: boolean }) {
  const [preview, setPreview] = useState(false);
  const conns = useQuery({ queryKey: ['os', 'connections'], queryFn: () => coreGet('/v3/connections') as Promise<Connections>, enabled: live, staleTime: 60_000, retry: false });
  const connected = (conns.data?.data?.connections || []).filter((c) => !c.status || /connected|active|ok/i.test(c.status));
  const ready = live && connected.length > 0;
  const brief = useQuery({ queryKey: ['os', 'briefing'], queryFn: () => coreGet('/v3/briefing') as Promise<Briefing>, enabled: ready, staleTime: 60_000, retry: false });
  const real = ready && brief.data && brief.data.status !== 'degraded' && brief.data.text;

  return (
    <Surface padding={5} data-testid="mora-briefing">
      <Stack direction="row" align="center" justify="space-between" className="mb-3">
        <Stack direction="row" gap={2} align="center"><Sunrise size={14} className="os-tone-accent" aria-hidden /><Text variant="eyebrow">MÔRA-Morgenbriefing</Text></Stack>
        {real ? <Status tone="safe">aus {connected.length} Quelle{connected.length === 1 ? '' : 'n'}</Status> : preview ? <SampleTag /> : null}
      </Stack>
      {real ? (
        <Stack direction="row" gap={3} align="flex-start"><MoraStone size={28} /><Text>{brief.data!.text}</Text></Stack>
      ) : (
        <>
          <Text tone="default" data-testid="briefing-pending">Briefing startet, sobald Quellen angebunden sind.</Text>
          <Text variant="meta" className="mt-1">MÔRA fasst morgens nur zusammen, was sich in echten Quellen wirklich verändert hat – ohne Quellen gibt es nichts Ehrliches zu berichten.</Text>
          <div className="os-briefing-sources mt-3" aria-label="Quellen">
            {SOURCES.map((s) => <span key={s}><i aria-hidden /> {s} · {live ? 'nicht verbunden' : 'braucht CORE-Sitzung'}</span>)}
          </div>
          <Stack direction="row" gap={2} className="mt-3">
            <Button size="sm" variant="ghost" onClick={() => setPreview((v) => !v)} data-testid="briefing-preview-toggle">{preview ? 'Vorschau schließen' : 'So sähe es aus (Beispiel)'}</Button>
          </Stack>
          {preview ? (
            <div className="os-briefing-demo mt-3" data-testid="briefing-demo">
              <Stack direction="row" gap={2} align="center" className="mb-2"><MoraStone size={20} /><Text variant="eyebrow">Beispiel · Simple Coffee Group</Text></Stack>
              <ul>{demoBriefing().map((l) => <li key={l}>{l}</li>)}</ul>
            </div>
          ) : null}
        </>
      )}
    </Surface>
  );
}
