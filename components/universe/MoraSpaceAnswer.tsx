'use client';

/**
 * Universe v2 – MÔRA ohne Fenster.
 * Antworten steigen als ruhige Typografie aus MÔRAs Licht in den Raum.
 * Antworten mit Quellen werden zu kleinen Sternbildern, die zu den passenden
 * echten Planeten führen. Vorschläge erscheinen als Freigabekarte.
 * Das klassische Chat-Fenster bleibt über „Im Fenster weiter“ erreichbar.
 */
import React, { useCallback, useState } from 'react';
import { corePost } from '@/lib/api/coreClient';
import { buildChatContext } from '@/lib/api/moraAgentClient';
import { hasVerifiedExecutionPath, MORA_MODES, sendModeMessage, describeFlag, type MoraMode } from '@/lib/mora/moraModes';
import { calmExcerpt, demoAnswer, planetForSource, type SpaceAnswer } from '@/lib/universe/spaceAnswer';
import { MOTION } from '@/lib/universe/motion';
import { approveLabel, type ApproveOutcome } from '@/lib/universe/approve';
import { answerBox } from '@/lib/universe/answerLayout';
import { UV, TYPE } from '@/lib/universe/tokens';

type Anchor = { name: string; x: number; y: number; r: number };
export type SpaceState = { status: 'idle' } | { status: 'thinking'; question: string; mode: MoraMode } | { status: 'answer'; answer: SpaceAnswer } | { status: 'error'; question: string; mode: MoraMode };

export function useMoraSpace(demo: boolean) {
  const [state, setState] = useState<SpaceState>({ status: 'idle' });
  const [history, setHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const ask = useCallback(async (question: string, mode: MoraMode) => {
    setState({ status: 'thinking', question, mode });
    try {
      let answer: SpaceAnswer;
      if (demo) {
        await new Promise((r) => setTimeout(r, 900));
        answer = demoAnswer(mode, question);
      } else if (mode === 'denken') {
        const r = (await corePost('/v3/chat', { message: question, history, context: buildChatContext({ session_id: 'universe_space' }) })) as { reply?: string; response?: string };
        answer = { mode, question, text: r?.reply || r?.response || '', sources: [], proposals: [], flags: [] };
      } else {
        const r = await sendModeMessage(mode, question, history);
        answer = { mode, question, text: r.text, sources: r.sources, proposals: r.proposals, flags: r.flags };
      }
      if (!answer.text) throw new Error('leer');
      setHistory((h) => [...h, { role: 'user' as const, content: question }, { role: 'assistant' as const, content: answer.text }].slice(-20));
      // v2: Instrumente zum Thema der Antwort pulsieren kurz (UniverseLinks).
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('uv2:mora-answer', { detail: { text: question + ' ' + answer.text } }));
      setState({ status: 'answer', answer });
    } catch {
      setState({ status: 'error', question, mode });
    }
  }, [demo, history]);
  const close = useCallback(() => setState({ status: 'idle' }), []);
  return { state, ask, close, history };
}

export function ModePicker({ mode, onChange, compact = false }: { mode: MoraMode; onChange: (m: MoraMode) => void; compact?: boolean }) {
  return (
    <div role="radiogroup" aria-label="Modus" className={`flex w-max shrink-0 gap-4 ${compact ? '' : 'mx-auto'}`} data-testid="uv2-modes">
      {MORA_MODES.map((m) => (
        <button key={m.id} type="button" role="radio" aria-checked={mode === m.id} title={m.hint} onClick={() => onChange(m.id)}
          className="h-7 transition-colors" style={{ ...TYPE.meta, fontSize: 10, color: mode === m.id ? UV.gold : UV.c(0.4) }}>
          {m.label}
        </button>
      ))}
    </div>
  );
}

const ease = MOTION.ease.out;

export function MoraSpaceAnswer({ state, anchors, cx, cy, demo, onClose, onWindow, onApprove }: {
  state: SpaceState; anchors: Anchor[]; cx: number; cy: number; demo: boolean;
  onClose: () => void; onWindow: (question: string) => void; onApprove?: (p: SpaceAnswer['proposals'][number]) => Promise<ApproveOutcome>;
}) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [outcome, setOutcome] = useState<Record<string, ApproveOutcome | 'running'>>({});
  if (state.status === 'idle') return null;
  const box = answerBox(typeof window !== 'undefined' ? window.innerWidth : 1440, cx, cy);
  const W = box.width;
  const top = box.top;

  const wide = (typeof window !== 'undefined' ? window.innerWidth : 1440) >= 1100;
  const col: React.CSSProperties = wide ? { left: 96, top: '17vh', width: 520 } : { left: 24, right: 24, top: 80 };
  void W; void top;

  if (state.status === 'thinking' || state.status === 'error') {
    return (
      <div className="absolute" style={col} data-testid="uv2-space-thinking">
        <p style={{ ...TYPE.meta, color: UV.gold }}>{MORA_MODES.find((m) => m.id === state.mode)?.label ?? 'MÔRA'}</p>
        <p className="mt-6" style={{ ...TYPE.statement, color: UV.c(0.6) }}>„{state.question}“</p>
        {state.status === 'thinking'
          ? <p className="mt-6" style={{ ...TYPE.text, color: UV.c(0.6), animation: 'uv2pulse 2.4s ease-in-out infinite' }}>MÔRA denkt nach …</p>
          : <p className="pointer-events-auto mt-6" style={{ ...TYPE.text, color: UV.c(0.6) }}>Gerade antwortet niemand.
              <button type="button" onClick={() => onWindow(state.question)} className="ml-3" style={{ color: UV.gold }}>Im Fenster versuchen</button></p>}
        <style>{'@keyframes uv2pulse{0%,100%{opacity:.45}50%{opacity:.9}}'}</style>
      </div>
    );
  }

  const a = state.answer;
  const { excerpt, truncated } = calmExcerpt(a.text);
  const names = anchors.map((x) => x.name);
  const sources = a.sources.slice(0, 3).map((s, i) => ({ s, i, p: planetForSource(s, names) }));
  const proposals = a.proposals.filter((p) => !dismissed.includes(p.id)).slice(0, 1);
  const modeLabel = MORA_MODES.find((m) => m.id === a.mode)?.label ?? '';

  return (
    <section className="pointer-events-auto absolute" style={col} data-testid="uv2-space-answer" aria-live="polite">
      <p style={{ ...TYPE.meta, color: UV.gold, animation: `uv2in .5s ${ease} both` }}>{modeLabel} · {a.question.length > 48 ? a.question.slice(0, 46) + ' …' : a.question}</p>
      <p className="mt-6" style={{ ...TYPE.statement, color: UV.cream, animation: `uv2in .6s ${ease} .1s both` }}>{excerpt}</p>

      {sources.length > 0 && (
        <ol className="mt-8" style={{ borderTop: `0.5px solid ${UV.hair}` }} data-testid="uv2-space-links">
          {sources.map(({ s, i, p }) => (
            <li key={i} className="flex items-baseline gap-4 py-3" data-testid="uv2-space-source" style={{ borderBottom: `0.5px solid ${UV.hair}`, animation: `uv2in .5s ${ease} ${0.3 + i * 0.08}s both` }}>
              <span style={{ ...TYPE.meta, color: UV.c(0.35) }}>{String(i + 1).padStart(2, '0')}</span>
              <span className="min-w-0 flex-1 truncate" style={{ ...TYPE.text, color: UV.c(0.75) }}>{s.title || s.url || 'Quelle'}</span>
              {p !== null && <span style={{ ...TYPE.meta, color: UV.gold }}>{names[p]}</span>}
            </li>
          ))}
        </ol>
      )}
      {a.flags.length > 0 && <p className="mt-4" style={{ ...TYPE.meta, color: UV.c(0.45), letterSpacing: '0.12em' }}>{describeFlag(a.flags[0])}</p>}

      {proposals.map((p) => {
        const ok = hasVerifiedExecutionPath(p);
        const o = outcome[p.id];
        return (
          <div key={p.id} className="mt-8" data-testid="uv2-space-proposal" style={{ animation: `uv2in .6s ${ease} .5s both` }}>
            <p style={{ ...TYPE.meta, color: UV.c(0.35) }}>Vorschlag</p>
            <p className="mt-2" style={{ ...TYPE.text, fontWeight: 400, color: UV.cream }}>{p.label}</p>
            <div className="mt-4 flex items-center gap-6">
              <button type="button" disabled={!ok || demo || !onApprove || !!o} data-testid="uv2-space-approve"
                onClick={async () => { if (!onApprove) return; setOutcome((x) => ({ ...x, [p.id]: 'running' })); const r = await onApprove(p); setOutcome((x) => ({ ...x, [p.id]: r })); }}
                className="h-10 rounded-full px-6 transition-transform active:scale-[0.97] disabled:opacity-45" style={{ background: UV.goldGrad, color: UV.ink, fontSize: 15, fontWeight: 500 }}>
                {o === 'running' ? 'Wird ausgeführt …' : 'Freigeben'}
              </button>
              <button type="button" onClick={() => setDismissed((d) => [...d, p.id])} style={{ ...TYPE.text, color: UV.c(0.6) }}>Später</button>
            </div>
            <p className="mt-3" style={{ ...TYPE.meta, color: UV.c(0.35), letterSpacing: '0.12em' }}>
              {o && o !== 'running' ? approveLabel(o as ApproveOutcome) : demo ? 'Entwurf · ohne Wirkung' : ok ? 'Erst nach Freigabe' : 'Noch nicht ausführbar · kein geprüfter Weg'}
            </p>
          </div>
        );
      })}

      <div className="mt-8 flex items-center gap-6" style={{ animation: `uv2in .5s ${ease} .6s both` }}>
        <button type="button" onClick={() => onWindow(a.question)} data-testid="uv2-space-window" style={{ ...TYPE.text, color: UV.c(0.6) }} className="hover:text-white">
          {truncated ? 'Ganz lesen' : 'Im Fenster weiter'}
        </button>
        <button type="button" onClick={onClose} style={{ ...TYPE.text, color: UV.c(0.6) }} className="hover:text-white">Schließen</button>
      </div>
    </section>
  );
}
