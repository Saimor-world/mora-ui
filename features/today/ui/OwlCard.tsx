'use client';
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, ChevronRight, Mail, Server, ShieldAlert, ShieldCheck, Siren, X, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/os-kit';
import { coreGet } from '@/lib/api/http';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import { importantMails, owlChips, owlHeadline, relTime, senderLabel, type Chip, type OwlLike, type OwlMail } from './owlModel';

/**
 * Nightwatch-Eule in „Heute“: eine Karte aus GET /v3/nightwatch/owl (nur Owner/Admin HQ).
 * Ein Satz zur Lage, ruhige Status-Chips, darunter „Braucht dich“ (Rechnungen, Dienst-Warnungen).
 * Fliegt sofort bei „critical“, sonst 5 Minuten nach dem ersten Öffnen am Morgen – einmal pro Tag.
 * Ohne Daten (403/Fehler) erscheint nichts: keine erfundenen Werte.
 */
export interface OwlState extends OwlLike {
  fly_in: 'immediate' | 'after_open';
  fly_in_delay_seconds: number;
  kassensturz?: { text?: string; date?: string } | null;
  calls_enabled?: boolean;
  as_of?: string;
}

export function owlFlyKey(d = new Date()): string {
  return `saimor.owl.flown.${d.toISOString().slice(0, 10)}`;
}

/** Wann fliegt die Eule? null = heute schon geflogen / nicht am Morgen. */
export function owlFlyDelayMs(state: Pick<OwlState, 'level' | 'fly_in_delay_seconds'>, now = new Date(), alreadyFlown = false): number | null {
  if (state.level === 'critical') return 0;
  if (alreadyFlown || now.getHours() >= 12) return null;
  return Math.max(0, state.fly_in_delay_seconds) * 1000;
}

const CHIP_ICON: Record<string, LucideIcon> = {
  incidents: Siren, uptime: Activity, crowdsec: ShieldCheck, hetzner: Server, mail: Mail,
};

function StatusChip({ c }: { c: Chip }) {
  const Icon = c.key === 'crowdsec' && c.tone === 'crit' ? ShieldAlert : CHIP_ICON[c.key] ?? Activity;
  return (
    <div className="os-owl-chip" data-tone={c.tone} data-testid={`owl-chip-${c.key}`}>
      <span className="os-owl-chip__icon"><Icon size={14} aria-hidden /></span>
      <span className="os-owl-chip__text">
        <span className="os-owl-chip__label">{c.label}</span>
        <span className="os-owl-chip__value">{c.value}</span>
      </span>
    </div>
  );
}

function NeedsYou({ mails, onOpen, onAll }: { mails: OwlMail[]; onOpen: (m: OwlMail) => void; onAll: () => void }) {
  if (!mails.length) return null;
  return (
    <div className="os-owl-needs" data-testid="owl-needs">
      <div className="os-owl-needs__head">
        <span className="os-owl-eyebrow">Braucht dich</span>
        <button type="button" className="os-owl-link" onClick={onAll}>Alle anzeigen</button>
      </div>
      <ul>
        {mails.slice(0, 4).map((m, i) => (
          <li key={m.id ?? i}>
            <button type="button" className="os-owl-row" onClick={() => onOpen(m)} data-testid="owl-mail" data-kind={m.kind}>
              <span className="os-owl-row__dot" data-kind={m.kind} aria-hidden />
              <span className="os-owl-row__main">
                <span className="os-owl-row__from">{senderLabel(m.from_addr)}{m.kind === 'bill' ? <span className="os-owl-tag">Rechnung</span> : null}</span>
                <span className="os-owl-row__subject">{m.subject}</span>
              </span>
              <span className="os-owl-row__time">{relTime(m.date)}</span>
              <ChevronRight size={14} className="os-owl-row__chev" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OwlContent({ s, navigate }: { s: OwlState; navigate?: (id: string) => void }) {
  const open = (m: OwlMail) => { if (m.id) useOsShellStore.getState().setPostOpenId(m.id); navigate?.('post'); };
  return (
    <>
      <div className="os-owl-head">
        <img src="/nightwatch/eule.png" alt="" width={44} height={44} className="os-owl-avatar" />
        <div>
          <span className="os-owl-eyebrow">Nightwatch</span>
          <p className="os-owl-headline" data-testid="owl-headline">{owlHeadline(s)}</p>
        </div>
      </div>
      <div className="os-owl-chips">{owlChips(s).map((c) => <StatusChip key={c.key} c={c} />)}</div>
      <NeedsYou mails={importantMails(s)} onOpen={open} onAll={() => navigate?.('post')} />
    </>
  );
}

export function OwlCard({ live, navigate }: { live: boolean; navigate?: (id: string) => void }) {
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
  return (
    <>
      <section className="os-owl-card" data-testid="owl-card" data-level={s.level} aria-label="Nightwatch">
        <OwlContent s={s} navigate={navigate} />
      </section>
      {flying ? (
        <div role="dialog" aria-label="Nightwatch-Eule" data-testid="owl-flyin" className="os-owl-card os-owl-flyin">
          <Button size="sm" variant="ghost" aria-label="Schließen" className="os-owl-close" onClick={() => setFlying(false)}><X size={14} /></Button>
          <OwlContent s={s} navigate={(id) => { setFlying(false); navigate?.(id); }} />
        </div>
      ) : null}
    </>
  );
}
