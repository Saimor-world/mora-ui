'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, CornerDownRight, ShieldCheck, X } from 'lucide-react';
import { Button, Dialog, Input, Stack, Status, Surface, Text, MoraStone, cx } from '@/components/os-kit';
import { getFeature } from '@/features/registry';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import { useCoreHealth } from '@/lib/os-prototype/useCoreHealth';
import { openLegacyApp } from '@/lib/os-prototype/legacyApps';
import { useMoraConversation } from '../data/conversationStore';
import { useMoraSend } from '../data/useMoraSend';
import { proposeActions, type MoraProposal } from '../data/proposals';

export interface MoraConsoleProps {
  variant: 'panel' | 'page';
  navigate: (featureId: string) => void;
  onClose?: () => void;
}

/**
 * MÔRA console — one implementation used by the global panel (desktop side
 * panel / mobile sheet) and by the full MÔRA surface.
 */
export function MoraConsole({ variant, navigate, onClose }: MoraConsoleProps) {
  const activeFeatureId = useOsShellStore((s) => s.activeFeatureId);
  const surfaceContext = useOsShellStore((s) => s.surfaceContext);
  const contextFeature = getFeature(activeFeatureId);
  const contextLabel = contextFeature?.mora.contextLabel || 'SAIMÔR';
  const turns = useMoraConversation((s) => s.turns);
  const send = useMoraSend({ featureId: activeFeatureId, contextLabel, detail: surfaceContext });
  const health = useCoreHealth();
  const [draft, setDraft] = useState('');
  const [confirm, setConfirm] = useState<MoraProposal | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const moraDraft = useOsShellStore((s) => s.moraDraft);
  const setMoraDraft = useOsShellStore((s) => s.setMoraDraft);
  useEffect(() => {
    if (moraDraft) { setDraft(moraDraft); setMoraDraft(null); }
  }, [moraDraft, setMoraDraft]);

  const lastUser = [...turns].reverse().find((t) => t.role === 'user');
  const proposals = useMemo(() => (lastUser ? proposeActions(lastUser.text, activeFeatureId) : []), [lastUser, activeFeatureId]);

  const workState: { tone: 'ai' | 'warning' | 'neutral' | 'safe'; label: string } = send.isPending
    ? { tone: 'ai', label: 'denkt nach' }
    : send.isError
      ? { tone: 'warning', label: 'letzte Anfrage fehlgeschlagen' }
      : { tone: 'neutral', label: 'bereit' };

  const submit = (text: string) => {
    const message = text.trim();
    if (!message || send.isPending) return;
    setDraft('');
    send.mutate(message, { onSettled: () => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }) });
  };

  const run = (p: MoraProposal) => {
    if (!p.reversible) { setConfirm(p); return; }
    if (p.kind === 'navigate') navigate(p.target);
    if (p.kind === 'open-legacy') openLegacyApp(p.target);
    onClose?.();
  };

  return (
    <div className={cx('flex h-full min-h-0 flex-col', variant === 'panel' ? 'p-5' : '')} data-testid={`mora-console-${variant}`}>
      <Stack direction="row" align="center" gap={3}>
        <MoraStone size={34} thinking={send.isPending} />
        <div className="min-w-0 flex-1">
          <Text variant="title" as="h2">MÔRA</Text>
          <Text variant="meta">Kontext: {contextLabel}{surfaceContext ? ` · ${surfaceContext}` : ''}</Text>
        </div>
        {onClose ? <Button variant="ghost" iconOnly aria-label="MÔRA schließen" icon={<X size={16} />} onClick={onClose} /> : null}
      </Stack>

      <Stack direction="row" gap={2} wrap className="mt-4" aria-label="MÔRA Status">
        <Status tone={health.data?.state === 'online' ? 'safe' : 'warning'}>
          CORE {health.isLoading ? 'prüft…' : health.data?.state === 'online' ? 'erreichbar' : 'nicht erreichbar'}
        </Status>
        <Status tone={workState.tone}>Arbeit: {workState.label}</Status>
        <Status tone="info" title="MÔRA führt nichts ohne deine Bestätigung aus">
          <ShieldCheck size={11} /> nur mit Bestätigung
        </Status>
      </Stack>

      <div ref={listRef} className="mt-5 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto" aria-live="polite">
        {turns.length === 0 ? (
          <Stack gap={3}>
            <Text variant="body">
              Frag mich etwas zu {contextLabel === 'MÔRA' ? 'deinem Unternehmen' : contextLabel}. Ich schlage vor – du entscheidest.
            </Text>
            <Stack gap={2}>
              {(contextFeature?.mora.suggestions || []).map((s) => (
                <Surface key={s} interactive padding={3} onClick={() => submit(s)}>
                  <Stack direction="row" gap={2} align="center">
                    <CornerDownRight size={13} className="os-tone-faint" />
                    <Text variant="meta" tone="muted">{s}</Text>
                  </Stack>
                </Surface>
              ))}
            </Stack>
          </Stack>
        ) : (
          turns.map((t) => (
            <div key={t.id} className={cx('os-bubble', t.role === 'user' ? 'os-bubble--user' : 'os-bubble--mora')} data-role={t.role}>
              {t.role === 'system' ? <Text variant="meta" tone="muted">{t.text}</Text> : t.text}
            </div>
          ))
        )}

        {proposals.length > 0 && (
          <Stack gap={2} aria-label="Vorgeschlagene Aktionen" className="mt-2">
            <Text variant="eyebrow">Vorschläge</Text>
            {proposals.map((p) => (
              <Surface key={p.id} padding={3} variant="strong">
                <Stack direction="row" align="center" justify="space-between" gap={3}>
                  <div className="min-w-0">
                    <Text variant="body" tone="default">{p.label}</Text>
                    <Text variant="meta">{p.explanation}</Text>
                  </div>
                  <Button size="sm" variant={p.reversible ? 'default' : 'primary'} onClick={() => run(p)}>
                    {p.reversible ? 'Öffnen' : 'Prüfen'}
                  </Button>
                </Stack>
              </Surface>
            ))}
          </Stack>
        )}
      </div>

      <form className="mt-4 flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); submit(draft); }}>
        <Input label="Nachricht an MÔRA" placeholder="MÔRA fragen…" value={draft} onChange={(e) => setDraft(e.target.value)} />
        <Button type="submit" variant="primary" iconOnly aria-label="Senden" icon={<ArrowUp size={16} />} disabled={!draft.trim() || send.isPending} />
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
    </div>
  );
}
