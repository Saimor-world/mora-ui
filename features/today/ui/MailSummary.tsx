'use client';
import React from 'react';
import { MoraStone, Stack, Status, Text } from '@/components/os-kit';
import { newestRef, senderName, useMailSummary, type MailRef } from '@/lib/os-prototype/mailSummary';

/**
 * V1.8 MÔRA-Zusammenfassung des angedockten Postfachs – ausdrücklich „regelbasiert“.
 * Ehrliche Zustände: lädt · Fehler (nie als „leer“) · leer · Inhalt mit Quellverweisen.
 * `variant="signal"` zeigt nur das erste echte Signal (Andockstation), `full` alles (Heute).
 */
function when(iso?: string | null): string {
  const t = iso ? Date.parse(iso) : NaN;
  if (Number.isNaN(t)) return '';
  return new Date(t).toLocaleString('de-DE', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
}

function Ref({ r }: { r: MailRef }) {
  return (
    <li className="os-mail-ref" data-testid="mail-ref" data-message-id={r.message_id}>
      <span className="os-mail-ref__subject">{r.subject || '(ohne Betreff)'}</span>
      <span className="os-mail-ref__meta">{senderName(r.from)}{when(r.date) ? ` · ${when(r.date)}` : ''}</span>
    </li>
  );
}

export function MailSummaryView({ enabled, variant = 'full' }: { enabled: boolean; variant?: 'full' | 'signal' }) {
  const q = useMailSummary(enabled);
  if (!enabled) return null;
  if (q.isLoading) {
    return <p className="os-station-line" data-testid="mail-summary-loading"><MoraStone size={20} thinking /> MÔRA liest die gespeicherten Nachrichten …</p>;
  }
  if (q.isError || !q.data) {
    const notVerified = (q.error as { status?: number } | null)?.status === 409;
    return (
      <div className="os-mail-summary" data-testid="mail-summary-error" data-state="error">
        <Text tone="default">{notVerified ? 'Kein verifiziert verbundenes Postfach.' : 'Die Zusammenfassung konnte gerade nicht geladen werden.'}</Text>
        <Text variant="meta">{notVerified ? 'Erst ein erfolgreicher Abruf dockt das Postfach an.' : 'Das ist ein Fehler – kein leeres Postfach.'}</Text>
      </div>
    );
  }
  const s = q.data;
  const tags = (
    <Stack direction="row" gap={2} wrap>
      <span data-testid="mail-summary-method"><Status tone="info">{s.method}</Status></span>
      {s.source?.dev_only ? <Status tone="warning">Test-Server · nur Entwicklung</Status> : null}
    </Stack>
  );
  if (s.status === 'empty' || s.total === 0) {
    return (
      <div className="os-mail-summary" data-testid="mail-summary-empty" data-state="empty">
        {tags}
        <Text tone="default" className="mt-2">{s.headline}</Text>
        <Text variant="meta">Der Abruf hat geklappt; der Posteingang ist wirklich leer.</Text>
      </div>
    );
  }
  if (variant === 'signal') {
    const first = newestRef(s);
    return (
      <div className="os-mail-summary" data-testid="mail-summary-signal" data-state="ok">
        {first ? <ul className="os-mail-refs"><Ref r={first} /></ul> : null}
        <Text variant="meta" className="mt-1">{s.headline}</Text>
        <div className="mt-2">{tags}</div>
      </div>
    );
  }
  return (
    <div className="os-mail-summary" data-testid="mail-summary" data-state="ok">
      <Stack direction="row" gap={3} align="flex-start"><MoraStone size={28} /><Text tone="default">{s.headline}</Text></Stack>
      <div className="os-mail-groups">
        {s.groups.map((g) => (
          <section key={g.key} className="os-mail-group" data-testid={`mail-group-${g.key}`}>
            <Text variant="eyebrow">{g.label} · {g.count}</Text>
            <ul className="os-mail-refs">{g.refs.map((r) => <Ref key={r.message_id || r.uid} r={r} />)}</ul>
          </section>
        ))}
        {s.other?.count ? (
          <section className="os-mail-group" data-testid="mail-group-other">
            <Text variant="eyebrow">Ohne Regel · {s.other.count}</Text>
            <ul className="os-mail-refs">{s.other.refs.map((r) => <Ref key={r.message_id || r.uid} r={r} />)}</ul>
          </section>
        ) : null}
      </div>
      <Stack direction="row" gap={3} align="center" wrap className="mt-3">
        {tags}
        <Text variant="meta">Aus {s.total} gespeicherten Nachrichten{s.verified_at ? ` · geprüft ${when(s.verified_at)}` : ''} · ohne KI, nach festen Stichwort-Regeln.</Text>
      </Stack>
    </div>
  );
}
