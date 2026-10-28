'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowUp, Monitor } from 'lucide-react';
import { coreGet } from '@/lib/api/http';
import { useSessionStore } from '@/lib/store/sessionStore';
import { firstName } from '@/lib/auth/displayName';
import { NeedsYou, StatusChip, type OwlState } from '@/features/today/ui/OwlCard';
import { importantMails, owlChips, owlHeadline, relTime, senderLabel, type OwlMail } from '@/features/today/ui/owlModel';
import { usePostInbox } from '@/features/post/data/usePost';
import { plainText } from '@/features/post/mailView';
import { useMoraSend } from '@/features/mora/data/useMoraSend';
import { useMoraConversation } from '@/features/mora/data/conversationStore';
import { renderBold } from '@/features/mora/ui/MoraConsole';

/**
 * Phone-Begleiter (Marius, 26.10.2026: „am Handy nur ein Companion, nicht das ganze OS“).
 * Drei Teile, alles echte Daten: Eule (Lage + Chips), „Braucht dich“ (max. 4, Mail-Leser),
 * ruhige MÔRA-Eingabe an den bestehenden CORE-Chat. Kein Dock, keine Planeten.
 */
export function PhoneCompanion({ onOpenUniverse }: { onOpenUniverse?: () => void } = {}) {
  const user = useSessionStore((s) => s.user);
  const live = Boolean(user?.tenant_id);
  const first = firstName(user) || '';
  const owl = useQuery({ queryKey: ['os', 'nightwatch-owl'], queryFn: () => coreGet('/v3/nightwatch/owl') as Promise<OwlState>, enabled: live, staleTime: 60_000, retry: false, refetchInterval: 120_000 });
  const inbox = usePostInbox();
  const [reading, setReading] = useState<OwlMail | null>(null);
  const s = owl.data?.level ? owl.data : null;
  const h = new Date().getHours();
  const hello = h < 11 ? 'Guten Morgen' : h < 18 ? 'Hallo' : 'Guten Abend';

  if (reading) return <MailReader mail={reading} full={(inbox.data ?? []).find((m) => m.id === reading.id)} onBack={() => setReading(null)} />;

  return (
    <div className="pc" data-testid="phone-companion">
      <header className="pc-head">
        <span className="pc-brand">SAIMÔR</span>
        <span className="pc-date">{new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
      </header>
      <h1 className="pc-hello">{hello}{first ? `, ${first}` : ''}.</h1>

      {s ? (
        <section className="pc-card" aria-label="Nightwatch" data-testid="pc-owl">
          <div className="pc-owl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/nightwatch/eule.png" alt="" width={40} height={40} />
            <p className="pc-owl__line" data-testid="pc-owl-line">{owlHeadline(s)}</p>
          </div>
          <div className="os-owl-chips pc-chips">{owlChips(s).slice(0, 4).map((c) => <StatusChip key={c.key} c={c} />)}</div>
        </section>
      ) : owl.isLoading && live ? <section className="pc-card pc-card--ghost" aria-busy="true" /> : null}

      {s && importantMails(s).length ? (
        <section className="pc-card pc-needs" data-testid="pc-needs">
          <NeedsYou mails={importantMails(s).slice(0, 4)} onOpen={setReading} onAll={() => undefined} />
        </section>
      ) : null}

      <CompanionAsk />

      {onOpenUniverse ? <button type="button" className="pc-universe" onClick={onOpenUniverse} data-testid="pc-universe-link">Universe ansehen</button> : null}
      <p className="pc-desk" data-testid="pc-desktop-hint"><Monitor size={13} aria-hidden /> Post und alles Weitere: am Desktop öffnen.</p>
    </div>
  );
}

function MailReader({ mail, full, onBack }: { mail: OwlMail; full?: { snippet?: string; body_text?: string; from_addr?: string }; onBack: () => void }) {
  const body = plainText(full?.body_text) || plainText(full?.snippet);
  useEffect(() => { window.scrollTo?.(0, 0); }, []);
  return (
    <div className="pc pc-reader" data-testid="pc-reader">
      <button type="button" className="pc-back" onClick={onBack}><ArrowLeft size={15} aria-hidden /> Zurück</button>
      <p className="pc-reader__from">{senderLabel(mail.from_addr)} · {relTime(mail.date)}</p>
      <h1 className="pc-reader__subject">{plainText(mail.subject)}</h1>
      <div className="pc-reader__body">{body || 'Für diese Mail liegt hier nur der Betreff vor.'}</div>
      {!plainText(full?.body_text) ? <p className="pc-reader__note">Nur die Vorschau. Die ganze Mail liegt im Postfach am Desktop.</p> : null}
    </div>
  );
}

function CompanionAsk() {
  const [text, setText] = useState('');
  const turns = useMoraConversation((s) => s.turns);
  const send = useMoraSend({ featureId: 'companion', contextLabel: 'Begleiter' });
  const endRef = useRef<HTMLDivElement>(null);
  const last = turns.slice(-4);
  useEffect(() => { endRef.current?.scrollIntoView?.({ block: 'nearest' }); }, [turns.length]);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const m = text.trim();
    if (!m || send.isPending) return;
    setText('');
    send.mutate(m);
  };
  return (
    <section className="pc-ask" aria-label="MÔRA" data-testid="pc-ask">
      {last.length ? (
        <div className="pc-turns" aria-live="polite">
          {last.map((t) => <div key={t.id} className={`pc-turn pc-turn--${t.role}`}>{t.role === 'mora' ? renderBold(t.text) : t.text}</div>)}
          {send.isPending ? <div className="pc-turn pc-turn--mora pc-turn--pending">MÔRA denkt …</div> : null}
          <div ref={endRef} />
        </div>
      ) : null}
      <form className="pc-input" onSubmit={submit}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="MÔRA fragen …" aria-label="MÔRA fragen" enterKeyHint="send" />
        <button type="submit" aria-label="Senden" disabled={!text.trim() || send.isPending}><ArrowUp size={16} aria-hidden /></button>
      </form>
    </section>
  );
}
