'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, CornerDownRight, ShieldCheck, X } from 'lucide-react';
import { Button, Dialog, Text, cx } from '@/components/os-kit';
import { PixelMoraMark } from '@/components/world/PixelMora';
import { getFeature } from '@/features/registry';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import { useCoreHealth } from '@/lib/os-prototype/useCoreHealth';
import { useIsSaimorInternal } from '@/lib/hooks/useIsSaimorInternal';
import { useSessionStore } from '@/lib/store/sessionStore';
import { openLegacyApp } from '@/lib/os-prototype/legacyApps';
import { useMoraPresence } from '@/lib/mora/moraPresence';
import { useMoraConversation } from '../data/conversationStore';
import { useMoraSend } from '../data/useMoraSend';
import { proposeActions, type MoraProposal } from '../data/proposals';
import { renderBold } from './MoraConsole';
import './mora-stage.css';

export const STAGE_ANCHOR = '.mora-stage__anchor';

/** Eine Antwort als Lichtkarten: je Absatz eine Karte, höchstens drei. */
export function answerCards(text: string): string[] {
  const parts = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 3) return parts;
  return [...parts.slice(0, 2), parts.slice(2).join('\n\n')];
}

/**
 * Mit MÔRA sprechen, mitten in der Welt: Die eine MÔRA fliegt aus dem Dock über den See,
 * die Antwort erscheint als Lichtkarten neben ihr, Vorschläge schweben links, der Verlauf bleibt leise oben.
 * Gleiche Daten und gleicher Sendeweg wie die MÔRA-Seite (POST /v3/chat), nichts wird ohne Bestätigung ausgeführt.
 */
export function MoraStage({ navigate, onClose }: { navigate: (featureId: string) => void; onClose: () => void }) {
  const activeFeatureId = useOsShellStore((s) => s.activeFeatureId);
  const surfaceContext = useOsShellStore((s) => s.surfaceContext);
  const contextFeature = getFeature(activeFeatureId);
  const contextLabel = contextFeature?.mora.contextLabel || 'SAIMÔR';
  const turns = useMoraConversation((s) => s.turns);
  const send = useMoraSend({ featureId: activeFeatureId, contextLabel, detail: surfaceContext });
  const health = useCoreHealth();
  const internal = useIsSaimorInternal();
  const hasSession = useSessionStore((st) => Boolean(st.user?.tenant_id));
  const nightwatchAvailable = internal && hasSession;
  const [draft, setDraft] = useState('');
  const [confirm, setConfirm] = useState<MoraProposal | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const moraDraft = useOsShellStore((s) => s.moraDraft);
  const setMoraDraft = useOsShellStore((s) => s.setMoraDraft);

  const submit = (text: string) => {
    const message = text.trim();
    if (!message || send.isPending) return;
    setDraft('');
    send.mutate(message);
  };
  // Vorschlag aus Dock oder Befehlspalette: sofort fragen.
  useEffect(() => {
    if (!moraDraft) return;
    setMoraDraft(null);
    submit(moraDraft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moraDraft]);

  // Die eine MÔRA fliegt in die Mitte und beim Schließen zurück ins Dock.
  useEffect(() => {
    const { goTo, goHome } = useMoraPresence.getState();
    goTo(STAGE_ANCHOR, 'stage');
    document.documentElement.dataset.moraStage = 'open';
    inputRef.current?.focus({ preventScroll: true });
    return () => { goHome(); delete document.documentElement.dataset.moraStage; };
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !confirm) { e.preventDefault(); onClose(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirm, onClose]);

  const lastUserIndex = turns.map((t) => t.role).lastIndexOf('user');
  const lastUser = lastUserIndex >= 0 ? turns[lastUserIndex] : null;
  const current = lastUserIndex >= 0 ? turns.slice(lastUserIndex + 1) : turns;
  const history = lastUserIndex > 0 ? turns.slice(0, lastUserIndex).filter((t) => t.role !== 'system').slice(-6) : [];
  const answer = [...current].reverse().find((t) => t.role === 'mora') ?? null;
  const problem = [...current].reverse().find((t) => t.role === 'system') ?? null;
  const proposals = useMemo(() => (lastUser ? proposeActions(lastUser.text, activeFeatureId) : []), [lastUser, activeFeatureId]);
  const suggestions = contextFeature?.mora.suggestions || [];
  const offline = !health.isLoading && health.data?.state !== 'online';

  const run = (p: MoraProposal) => {
    if (!p.reversible) { setConfirm(p); return; }
    if (p.kind === 'navigate') navigate(p.target);
    if (p.kind === 'open-legacy') openLegacyApp(p.target);
    onClose();
  };

  return (
    <section className="mora-stage" role="dialog" aria-modal="false" aria-label="Mit MÔRA sprechen" data-testid="mora-stage" data-thinking={send.isPending ? 'true' : undefined}>
      <div className="mora-stage__veil" onClick={onClose} aria-hidden="true" />

      <header className="mora-stage__top">
        <span className="mora-stage__tag">{contextLabel === 'MÔRA' ? 'Dein Tag' : `Bei: ${contextLabel}`}{surfaceContext ? ` · ${surfaceContext}` : ''}</span>
        <span className="mora-stage__tag" title="MÔRA führt nichts ohne deine Bestätigung aus"><ShieldCheck size={12} aria-hidden="true" /> nur mit Bestätigung</span>
        {offline ? <span className="mora-stage__tag" data-tone="warning">gerade nicht erreichbar</span> : null}
        <button type="button" className="mora-stage__close" onClick={onClose} aria-label="MÔRA schließen"><span>Zurück ins OS</span><kbd>Esc</kbd><X size={14} aria-hidden="true" /></button>
      </header>

      {history.length ? (
        <ol className="mora-stage__history" aria-label="Verlauf">
          {history.map((t) => <li key={t.id} data-role={t.role}>{t.role === 'user' ? t.text : renderBold(t.text)}</li>)}
        </ol>
      ) : null}

      <div className="mora-stage__center">
        <p className="mora-stage__question" data-empty={lastUser ? undefined : 'true'}>{lastUser ? `„${lastUser.text}“` : `Frag mich etwas zu ${contextLabel === 'MÔRA' || contextLabel === 'SAIMÔR' ? 'deinem Tag' : contextLabel}.`}</p>
        <div className="mora-stage__rings" aria-hidden="true"><i /><i /><i />
          <span className="mora-stage__anchor" data-testid="mora-stage-anchor"><span className="mora-stage__fallback"><PixelMoraMark size={96} active /></span></span>
        </div>
        <p className="mora-stage__state" aria-live="polite">{send.isPending ? 'MÔRA denkt nach …' : lastUser ? '' : 'Ich schlage vor – du entscheidest.'}</p>
      </div>

      <div className="mora-stage__suggest" role="list" aria-label="Vorschläge">
        {suggestions.map((s, i) => (
          <button key={s} type="button" role="listitem" onClick={() => submit(s)} style={{ '--i': i } as React.CSSProperties} disabled={send.isPending}>
            <CornerDownRight size={13} aria-hidden="true" /><span>{s}</span>
          </button>
        ))}
        {nightwatchAvailable ? (
          <button type="button" role="listitem" onClick={() => useOsShellStore.getState().setNightwatchOpen(true)} data-testid="mora-ask-nightwatch" style={{ '--i': suggestions.length } as React.CSSProperties}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/nightwatch/eule.png" alt="" width={13} height={16} style={{ imageRendering: 'pixelated' }} />
            <span>Frag Nightwatch: Was war heute Nacht?</span>
          </button>
        ) : null}
      </div>

      <div className="mora-stage__answers" aria-live="polite">
        {send.isPending ? <article className="mora-stage__card" data-kind="pending"><span className="mora-stage__shimmer" /><span className="mora-stage__shimmer" /></article> : null}
        {!send.isPending && answer ? answerCards(answer.text).map((part, i) => (
          <article key={`${answer.id}:${i}`} className="mora-stage__card" style={{ '--i': i } as React.CSSProperties}>
            {i === 0 ? <small>MÔRA · {contextLabel}</small> : null}
            <p>{renderBold(part)}</p>
          </article>
        )) : null}
        {!send.isPending && problem ? <article className="mora-stage__card" data-kind="problem"><small>Hinweis</small><p>{problem.text}</p></article> : null}
        {proposals.map((p, i) => (
          <article key={p.id} className="mora-stage__card" data-kind="action" style={{ '--i': i + 1 } as React.CSSProperties}>
            <small>Vorschlag</small>
            <p><strong>{p.label}</strong> <span>{p.explanation}</span></p>
            <button type="button" onClick={() => run(p)} data-primary={p.reversible ? undefined : 'true'}>{p.reversible ? 'Öffnen' : 'Prüfen'}</button>
          </article>
        ))}
      </div>

      <form className="mora-stage__input" onSubmit={(e) => { e.preventDefault(); submit(draft); }}>
        <input ref={inputRef} aria-label="Nachricht an MÔRA" placeholder={lastUser ? 'Frag weiter …' : 'Frag MÔRA …'} value={draft} onChange={(e) => setDraft(e.target.value)} autoComplete="off" />
        <button type="submit" aria-label="Senden" disabled={!draft.trim() || send.isPending} className={cx(draft.trim() ? 'is-ready' : '')}><ArrowUp size={16} aria-hidden="true" /></button>
      </form>

      <Dialog
        open={Boolean(confirm)}
        title="Bestätigung erforderlich"
        description={confirm?.explanation}
        onClose={() => setConfirm(null)}
        footer={(
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>Abbrechen</Button>
            <Button variant="primary" onClick={() => setConfirm(null)}>Verstanden</Button>
          </>
        )}
      >
        <Text variant="meta" tone="muted">
          Im Prototyp werden Aktionen mit Außenwirkung (Senden, Löschen, Zahlungen, Signaturen) nicht an CORE übergeben.
          Die spätere Ausführung läuft über den bestehenden Bestätigungsweg (ConfirmationCard / CORE-Receipts).
        </Text>
      </Dialog>
    </section>
  );
}
