'use client';
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sunrise } from 'lucide-react';
import { Button, MoraStone, SampleTag, Stack, Status, Surface, Text } from '@/components/os-kit';
import { coreGet } from '@/lib/api/http';
import { connectedSources, useSources } from '@/lib/os-prototype/useSources';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import { MailSummaryView } from './MailSummary';
import { DEMO_CALENDAR, DEMO_MAIL, DEMO_MINDLOOP, DEMO_TASKS } from '@/lib/os-prototype/demoPack';

/**
 * V1.5 MÔRA-Morgenbriefing.
 * Nutzt zwei CORE-Endpunkte, die das Legacy-OS kaum/nie aufgerufen hat:
 *  - GET /v3/connections  (verbundene Quellen; im Legacy-UI ungenutzt)
 *  - GET /v3/briefing     (Tagesbriefing; Legacy-Hook täuschte bei Fehlern „Normalbetrieb“ vor)
 * Regel: Das Briefing erscheint NUR, wenn mindestens eine Quelle verbunden ist
 * und CORE ein nicht-degradiertes Briefing liefert. Sonst ein ehrlicher Zustand
 * mit den Quellen – und optional eine klar markierte Demo-Vorschau.
 * V1.8: Ist ein Postfach verifiziert angedockt, zeigt MÔRA die regelbasierte
 * Mail-Zusammenfassung mit Quellverweisen – klar als „regelbasiert“ markiert,
 * auch wenn CORE kein KI-Briefing liefern kann.
 */
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

export function MoraBriefing({ live, navigate }: { live: boolean; navigate?: (id: string) => void }) {
  const [preview, setPreview] = useState(false);
  // V1.6: gemeinsamer Quellen-Hook; nur status === 'connected' zählt (V1.5 las das entpackte Envelope falsch).
  const conns = useSources(live);
  const connected = connectedSources(conns.data?.connections);
  const ready = live && connected.length > 0;
  const brief = useQuery({ queryKey: ['os', 'briefing'], queryFn: () => coreGet('/v3/briefing') as Promise<Briefing>, enabled: ready, staleTime: 60_000, retry: false });
  const real = ready && brief.data && brief.data.status !== 'degraded' && brief.data.text;
  const mailDocked = live && connected.some((c) => c.group === 'mail');

  return (
    <Surface padding={5} data-testid="mora-briefing">
      <Stack direction="row" align="center" justify="space-between" className="mb-3">
        <Stack direction="row" gap={2} align="center"><Sunrise size={14} className="os-tone-accent" aria-hidden /><Text variant="eyebrow">MÔRA-Morgenbriefing</Text></Stack>
        {real || mailDocked ? <Status tone="safe">aus {connected.length} Quelle{connected.length === 1 ? '' : 'n'}</Status> : preview ? <SampleTag /> : null}
      </Stack>
      {real || mailDocked ? (
        <Stack gap={3}>
          {real ? <Stack direction="row" gap={3} align="flex-start"><MoraStone size={28} /><Text>{brief.data!.text}</Text></Stack> : null}
          {mailDocked ? (
            <div data-testid="briefing-mail">
              {!real ? <Text variant="meta" className="mb-2">Ein KI-Briefing liefert CORE gerade nicht. Das hier ist die regelbasierte Zusammenfassung deines Postfachs.</Text> : null}
              <MailSummaryView enabled={mailDocked} variant="full" />
            </div>
          ) : null}
        </Stack>
      ) : (
        <>
          <Text tone="default" data-testid="briefing-pending">Briefing startet, sobald Quellen angebunden sind.</Text>
          <Text variant="meta" className="mt-1">MÔRA fasst morgens nur zusammen, was sich in echten Quellen wirklich verändert hat – ohne Quellen gibt es nichts Ehrliches zu berichten.</Text>
          <div className="os-briefing-sources mt-3" aria-label="Quellen">
            {live && conns.data?.connections?.length
              ? conns.data.connections.filter((c) => c.status !== 'setup_required').slice(0, 5).map((c) => <span key={c.id} data-status={c.status}><i aria-hidden /> {c.label} · {c.status === 'available' ? 'nicht angedockt' : c.status}</span>)
              : SOURCES.map((s) => <span key={s}><i aria-hidden /> {s} · {live ? 'nicht verbunden' : 'braucht CORE-Sitzung'}</span>)}
          </div>
          <Stack direction="row" gap={2} className="mt-3">
            {live ? <Button size="sm" onClick={() => { useOsShellStore.getState().setSettingsSection('sources'); navigate?.('settings'); }} data-testid="briefing-sources">Quellen andocken</Button> : null}
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
