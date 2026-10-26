'use client';
import { useScopeCompanyId } from '@/lib/demo/demoStore';
import { useDataScopeKey } from '@/lib/store/dataScope';
import { companyPath } from '@/lib/api/companyPath';
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sunrise } from 'lucide-react';
import { Button, MoraStone, SampleTag, Stack, Status, Surface, Text } from '@/components/os-kit';
import { coreGet } from '@/lib/api/http';
import { connectedSources, useSources } from '@/lib/os-prototype/useSources';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import { MailSummaryView } from './MailSummary';

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



export function MoraBriefing({ live, navigate, companyView = true }: { live: boolean; navigate?: (id: string) => void; companyView?: boolean }) {
  const company = useScopeCompanyId();
  const scope = useDataScopeKey();
  // V1.6: gemeinsamer Quellen-Hook; nur status === 'connected' zählt (V1.5 las das entpackte Envelope falsch).
  const conns = useSources(live);
  const connected = connectedSources(conns.data?.connections);
  const ready = live && connected.length > 0;
  const brief = useQuery({ queryKey: ['os', 'briefing', scope], queryFn: () => coreGet(companyPath('/v3/briefing', company)) as Promise<Briefing>, enabled: ready && companyView, staleTime: 60_000, retry: false });
  const real = ready && brief.data && brief.data.status !== 'degraded' && brief.data.text;
  const mailDocked = live && connected.some((c) => c.group === 'mail');

  // Rollen-Vorschau: ohne Firmenblick keine Firmen-Quellen (Post, Feeds) im Briefing.
  if (!companyView) {
    return (
      <Surface padding={5} data-testid="mora-briefing" data-scope="team">
        <Stack direction="row" gap={2} align="center" className="mb-3"><Sunrise size={14} className="os-tone-accent" aria-hidden /><Text variant="eyebrow">MÔRA-Morgenbriefing</Text></Stack>
        <Text data-testid="briefing-team">Dein Briefing umfasst deine Termine und Aufgaben oben.</Text>
        <Text variant="meta" className="mt-1">Firmen-Quellen fasst MÔRA nur in der Gesamtansicht zusammen.</Text>
      </Surface>
    );
  }

  // Ohne Quellen: eine ruhige, kompakte Statuszeile statt Karte mit leeren Chips.
  if (!real && !mailDocked) {
    // Live ohne Quellen: die Nightwatch-Karte trägt die Lage schon, kein zweiter Hinweis.
    if (live) return null;
    return (
      <div className="os-quiet-status" role="status" data-testid="mora-briefing" data-state="pending">
        <Sunrise size={14} className="os-tone-accent" aria-hidden />
        <span className="os-quiet-status__text">
          <b data-testid="briefing-pending">{live ? 'Briefing startet mit der ersten Quelle' : 'MÔRA braucht eine CORE-Sitzung'}</b>
          <span>{live ? 'Nightwatch-Lage, Post und Kosten stehen unten, soweit CORE sie liefert. Für das KI-Briefing ein Postfach oder einen Kalender andocken.' : 'Ohne Sitzung zeigt SAIMÔR nichts Unbelegtes an.'}</span>
        </span>
        {live ? <Button size="sm" variant="ghost" onClick={() => { useOsShellStore.getState().setSettingsSection('sources'); navigate?.('settings'); }} data-testid="briefing-sources">Quellen andocken</Button> : null}
      </div>
    );
  }

  return (
    <Surface padding={5} data-testid="mora-briefing">
      <Stack direction="row" align="center" justify="space-between" className="mb-3">
        <Stack direction="row" gap={2} align="center"><Sunrise size={14} className="os-tone-accent" aria-hidden /><Text variant="eyebrow">MÔRA-Morgenbriefing</Text></Stack>
        {real && connected.length ? <Status tone="safe">aus {connected.length} Quelle{connected.length === 1 ? '' : 'n'}</Status> : null}
      </Stack>
        <Stack gap={3}>
          {real ? <Stack direction="row" gap={3} align="flex-start"><MoraStone size={28} /><Text>{brief.data!.text}</Text></Stack> : null}
          {mailDocked ? (
            <div data-testid="briefing-mail">
              {!real ? <Text variant="meta" className="mb-2">Kurz aus deinem Postfach:</Text> : null}
              <MailSummaryView enabled={mailDocked} variant="full" />
            </div>
          ) : null}
        </Stack>
    </Surface>
  );
}
