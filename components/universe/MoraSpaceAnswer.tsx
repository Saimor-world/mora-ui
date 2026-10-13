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
      setState({ status: 'answer', answer });
    } catch {
      setState({ status: 'error', question, mode });
    }
  }, [demo, history]);
  const close = useCallback(() => setState({ status: 'idle' }), []);
  return { state, ask, close };
}

export function ModePicker({ mode, onChange, compact = false }: { mode: MoraMode; onChange: (m: MoraMode) => void; compact?: boolean }) {
  return (
    <div role="radiogroup" aria-label="Modus" className="mx-auto flex w-max shrink-0 gap-0.5 rounded-full p-0.5" data-testid="uv2-modes"
      style={compact ? { background: 'rgba(255,255,255,0.06)' } : { background: 'rgba(18,22,30,0.46)', backdropFilter: 'blur(30px) saturate(160%)', WebkitBackdropFilter: 'blur(30px) saturate(160%)', boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,0.12)' }}>
      {MORA_MODES.map((m) => (
        <button key={m.id} type="button" role="radio" aria-checked={mode === m.id} title={m.hint} onClick={() => onChange(m.id)}
          className={`${compact ? 'h-7 px-2.5' : 'h-7 px-3'} rounded-full font-medium transition-colors ${mode === m.id ? 'bg-white/[0.16] text-white' : 'text-white/55 hover:text-white/80'}`} style={{ fontSize: 12 }}>
          {m.label}
        </button>
      ))}
    </div>
  );
}

const ease = MOTION.ease.out;

export function MoraSpaceAnswer({ state, anchors, cx, cy, demo, onClose, onWindow }: {
  state: SpaceState; anchors: Anchor[]; cx: number; cy: number; demo: boolean;
  onClose: () => void; onWindow: (question: string) => void;
}) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  if (state.status === 'idle') return null;
  const W = 420;
  const top = cy - 70;

  if (state.status === 'thinking' || state.status === 'error') {
    return (
      <div className="absolute text-center" style={{ left: cx - W / 2, top: top + 20, width: W }} data-testid="uv2-space-thinking">
        <p className="text-white/50" style={{ fontSize: 13, textShadow: '0 1px 10px rgba(0,0,0,0.7)' }}>„{state.question}“</p>
        {state.status === 'thinking'
          ? <p className="mt-3 text-white/70" style={{ fontSize: 15, animation: 'uv2pulse 2.4s ease-in-out infinite' }}>MÔRA denkt nach …</p>
          : <div className="mt-3 text-white/70" style={{ fontSize: 15 }}>Ich erreiche gerade niemanden, der antworten kann.
              <button type="button" onClick={() => onWindow(state.question)} className="pointer-events-auto ml-2 text-amber-100/80 underline-offset-4 hover:underline">Im Fenster versuchen</button></div>}
      </div>
    );
  }

  const a = state.answer;
  const { excerpt, truncated } = calmExcerpt(a.text);
  const names = anchors.map((x) => x.name);
  // Sternbilder: nur Quellen, die eindeutig zu einem Planeten gehören.
  const links = a.sources.slice(0, 3).map((s, i) => ({ s, i, p: planetForSource(s, names) }));
  const linked = links.filter((l) => l.p !== null) as { s: typeof a.sources[number]; i: number; p: number }[];
  const unlinked = links.filter((l) => l.p === null);
  const proposals = a.proposals.filter((p) => !dismissed.includes(p.id)).slice(0, 1);
  const modeLabel = MORA_MODES.find((m) => m.id === a.mode)?.label ?? '';
  const startY = top + 40;

  return (
    <>
      {/* Feine Linien vom Licht zu den Planeten der Quellen */}
      <svg className="absolute inset-0 h-full w-full" aria-hidden data-testid="uv2-space-links">
        {linked.map(({ p, i }) => {
          const t = anchors[p];
          const dx = t.x - cx, dy = t.y - startY; const len = Math.hypot(dx, dy) || 1;
          const ex = t.x - (dx / len) * (t.r + 10), ey = t.y - (dy / len) * (t.r + 10);
          const sx = cx + (dx / len) * 130, sy = startY + (dy / len) * 60;
          const mx = (sx + ex) / 2 + dy * 0.12, my = (sy + ey) / 2 - dx * 0.06;
          return (
            <g key={i} style={{ animation: `uv2fade 1.6s ${ease} ${1 + i * 0.3}s both` }}>
              <path d={`M${sx},${sy} Q${mx},${my} ${ex},${ey}`} fill="none" stroke="rgba(255,232,196,0.32)" strokeWidth="0.75" strokeDasharray="2 5" />
              {[0.25, 0.55, 0.8].map((k, j) => {
                const bx = (1 - k) * (1 - k) * sx + 2 * (1 - k) * k * mx + k * k * ex;
                const by = (1 - k) * (1 - k) * sy + 2 * (1 - k) * k * my + k * k * ey;
                return <circle key={j} cx={bx} cy={by} r={j === 1 ? 1.6 : 1.1} fill="rgba(255,240,214,0.9)" />;
              })}
              <circle cx={ex} cy={ey} r={2.2} fill="rgba(255,240,214,1)" style={{ filter: 'drop-shadow(0 0 4px rgba(255,214,160,0.9))' }} />
            </g>
          );
        })}
      </svg>
      {linked.map(({ p, s, i }) => {
        const t = anchors[p];
        const right = t.x >= cx;
        return (
          <p key={i} className="absolute text-white/70" data-testid="uv2-space-source"
            style={{ left: right ? t.x + t.r + 14 : undefined, right: right ? undefined : `calc(100% - ${t.x - t.r - 14}px)`, top: t.y + t.r + 2, maxWidth: 180, textAlign: right ? 'left' : 'right',
              fontSize: 11, lineHeight: '14px', textShadow: '0 1px 8px rgba(0,0,0,0.8)', animation: `uv2in 1.2s ${ease} ${1.3 + i * 0.3}s both` }}>
            <span className="text-amber-100/75">[{i + 1}]</span> {s.title || s.url || 'Quelle'}
          </p>
        );
      })}

      {/* Die Antwort selbst: steigt aus dem Licht auf */}
      <section className="pointer-events-auto absolute text-center" style={{ left: cx - W / 2, top, width: W }} data-testid="uv2-space-answer" aria-live="polite">
        <p className="text-white/45" style={{ fontSize: 12, lineHeight: '16px', textShadow: '0 1px 10px rgba(0,0,0,0.7)', animation: `uv2in 0.8s ${ease} both` }}>
          {modeLabel} · „{a.question}“
        </p>
        <p className="mt-3 text-white/[0.92]" style={{ fontSize: 19, lineHeight: '28px', letterSpacing: '-0.012em', textShadow: '0 2px 18px rgba(0,0,0,0.75)', animation: `uv2rise 1.4s ${ease} 0.15s both` }}>
          {excerpt}
          {a.sources.length > 0 && <span className="text-amber-100/70" style={{ fontSize: 13 }}> {a.sources.slice(0, 3).map((_, i) => `[${i + 1}]`).join('')}</span>}
        </p>
        {unlinked.length > 0 && (
          <p className="mt-3 text-white/50" style={{ fontSize: 11, lineHeight: '15px', animation: `uv2in 1.2s ${ease} 1.2s both` }}>
            {unlinked.map(({ s, i }) => `[${i + 1}] ${s.title || s.url || 'Quelle'}`).join(' · ')}
          </p>
        )}
        {a.flags.length > 0 && <p className="mt-2 text-amber-100/60" style={{ fontSize: 11 }}>{describeFlag(a.flags[0])}</p>}
        <div className="mt-4 flex items-center justify-center gap-4 text-white/55" style={{ fontSize: 12, animation: `uv2in 1s ${ease} 1.4s both` }}>
          <button type="button" onClick={() => onWindow(a.question)} className="transition-colors hover:text-white" data-testid="uv2-space-window">
            {truncated ? 'Ganz lesen im Fenster' : 'Im Fenster weiter'}
          </button>
          <span className="h-3 w-px bg-white/15" />
          <button type="button" onClick={onClose} className="transition-colors hover:text-white">Schließen</button>
        </div>
      </section>

      {/* Freigabe: dieselbe Karte wie der Morgen-Vorschlag */}
      {proposals.map((p) => {
        const ok = hasVerifiedExecutionPath(p);
        return (
          <aside key={p.id} className="pointer-events-auto absolute right-6 top-[200px] w-[296px] rounded-[20px] p-5" data-testid="uv2-space-proposal"
            style={{ background: 'rgba(22,24,30,0.58)', backdropFilter: 'blur(40px) saturate(160%)', WebkitBackdropFilter: 'blur(40px) saturate(160%)', boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,0.14), 0 20px 50px rgba(0,0,0,0.45)', animation: `uv2in 1.2s ${ease} 1.2s both` }}>
            <p className="font-medium text-amber-100/70" style={{ fontSize: 12 }}>MÔRA schlägt vor</p>
            <p className="mt-2 font-semibold text-white" style={{ fontSize: 17, lineHeight: '22px', letterSpacing: '-0.015em' }}>{p.label}</p>
            <p className="mt-2 text-white/55" style={{ fontSize: 13, lineHeight: '18px' }}>
              {ok ? 'Wird erst nach deiner Freigabe ausgeführt.' : 'Noch nicht ausführbar – es gibt keinen geprüften Weg dafür. Nichts passiert von selbst.'}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" disabled={!ok || demo} onClick={() => onWindow(a.question)} title={ok ? 'Freigeben' : 'Kein verifizierter Ausführungsweg'}
                className="h-9 rounded-full bg-white font-semibold text-black transition-transform active:scale-[0.97] disabled:opacity-40" style={{ fontSize: 13 }}>Freigeben</button>
              <button type="button" onClick={() => setDismissed((d) => [...d, p.id])} className="h-9 rounded-full font-medium text-white/80 transition-colors hover:bg-white/15" style={{ fontSize: 13, background: 'rgba(255,255,255,0.08)' }}>Später</button>
            </div>
          </aside>
        );
      })}
    </>
  );
}
