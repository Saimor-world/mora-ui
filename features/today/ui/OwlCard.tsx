'use client';
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Moon, X } from 'lucide-react';
import { Button, Stack, Surface, Text } from '@/components/os-kit';
import { coreGet } from '@/lib/api/http';

/**
 * Nightwatch-Eule in „Heute“: echte Lage aus GET /v3/nightwatch/owl (nur Owner/Admin HQ).
 * Inline immer sichtbar, sobald CORE Daten liefert. Zusätzlich fliegt die Karte ein:
 * sofort bei „critical“, sonst 5 Minuten nach dem ersten Öffnen am Morgen – einmal pro Tag.
 * Ohne Daten (403/Fehler) erscheint nichts: keine erfundenen Werte.
 */
export interface OwlState {
  level: 'ok' | 'warning' | 'critical';
  fly_in: 'immediate' | 'after_open';
  fly_in_delay_seconds: number;
  open_incidents: { id: string; title: string; severity: string; status: string }[];
  kassensturz?: { text?: string; date?: string } | null;
  uptime?: { available: boolean; down: number; monitors: { name: string; up: boolean }[] };
  crowdsec?: { available: boolean; running?: boolean; active_decisions?: number; alerts_24h?: number };
  hetzner?: { overall?: string; costs?: { servers_monthly_gross_eur?: number | null } } | null;
  mail?: { unread?: number; total?: number; highlights?: { subject: string; from_addr?: string; kind: string }[] };
  calls_enabled?: boolean;
  dreams?: { entries?: { insight: string }[] } | null;
}

const LEVEL_TEXT: Record<OwlState['level'], string> = { ok: 'Alles ruhig', warning: 'Bitte ansehen', critical: 'Kritisch' };

export function owlFlyKey(d = new Date()): string {
  return `saimor.owl.flown.${d.toISOString().slice(0, 10)}`;
}

/** Wann fliegt die Eule? null = heute schon geflogen / nicht am Morgen. */
export function owlFlyDelayMs(state: Pick<OwlState, 'level' | 'fly_in_delay_seconds'>, now = new Date(), alreadyFlown = false): number | null {
  if (state.level === 'critical') return 0;
  if (alreadyFlown || now.getHours() >= 12) return null;
  return Math.max(0, state.fly_in_delay_seconds) * 1000;
}

function OwlBody({ s }: { s: OwlState }) {
  const cost = s.hetzner?.costs?.servers_monthly_gross_eur;
  return (
    <Stack direction="column" gap={1}>
      {s.open_incidents.length ? (
        s.open_incidents.slice(0, 3).map((i) => <Text key={i.id} data-testid="owl-incident">🚨 {i.title} ({i.severity})</Text>)
      ) : (
        <Text variant="meta">Keine offenen Incidents</Text>
      )}
      {s.uptime?.available ? <Text variant="meta">Uptime: {s.uptime.down ? `${s.uptime.down} down` : `${s.uptime.monitors.length} Monitore ok`}</Text> : null}
      {s.crowdsec?.available ? <Text variant="meta">CrowdSec: {s.crowdsec.running ? 'läuft' : 'AUS'} · {s.crowdsec.active_decisions ?? 0} Sperren · {s.crowdsec.alerts_24h ?? 0} Angriffe/24 h</Text> : null}
      {cost != null ? <Text variant="meta" data-testid="owl-hetzner">Hetzner: {s.hetzner?.overall} · {cost.toFixed(2)} €/Monat (Listenpreis)</Text> : null}
      {s.mail?.unread != null ? <Text variant="meta">Post: {s.mail.unread} ungelesen</Text> : null}
      {(s.mail?.highlights || []).slice(0, 4).map((h, i) => (
        <Text key={i} data-testid="owl-mail">{h.kind === 'bill' ? '💶' : '✉️'} {h.subject}{h.from_addr ? ` · ${h.from_addr}` : ''}</Text>
      ))}
    </Stack>
  );
}

export function OwlCard({ live }: { live: boolean }) {
  const q = useQuery({ queryKey: ['os', 'nightwatch-owl'], queryFn: () => coreGet('/v3/nightwatch/owl') as Promise<OwlState>, enabled: live, staleTime: 60_000, retry: false, refetchInterval: 120_000 });
  const [flying, setFlying] = useState(false);
  const s = q.data;

  useEffect(() => {
    if (!s || typeof window === 'undefined') return;
    const key = owlFlyKey();
    const delay = owlFlyDelayMs(s, new Date(), window.localStorage.getItem(key) === '1');
    if (delay == null) return;
    const t = window.setTimeout(() => { setFlying(true); window.localStorage.setItem(key, '1'); }, delay);
    return () => window.clearTimeout(t);
  }, [s]);

  if (!live || !s || !s.level) return null;
  const head = (
    <Stack direction="row" gap={2} align="center" className="mb-2">
      <Moon size={14} className="os-tone-accent" aria-hidden />
      <Text variant="eyebrow">Nightwatch · {LEVEL_TEXT[s.level]}</Text>
    </Stack>
  );
  return (
    <>
      <Surface padding={4} data-testid="owl-card" data-level={s.level}>{head}<OwlBody s={s} /></Surface>
      {flying ? (
        <div role="dialog" aria-label="Nightwatch-Eule" data-testid="owl-flyin" className="os-owl-flyin" style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 60, maxWidth: 380, animation: 'osOwlIn 600ms ease-out' }}>
          <Surface padding={5}>
            <Stack direction="row" justify="space-between" align="center">{head}<Button size="sm" variant="ghost" aria-label="Schließen" onClick={() => setFlying(false)}><X size={14} /></Button></Stack>
            {s.kassensturz?.text ? <Text variant="meta" style={{ whiteSpace: 'pre-line' }} data-testid="owl-kassensturz">{s.kassensturz.text}</Text> : <OwlBody s={s} />}
          </Surface>
        </div>
      ) : null}
    </>
  );
}
