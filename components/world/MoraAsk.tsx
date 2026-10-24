'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Mic, Send, X } from 'lucide-react';
import { MoraStone } from '@/components/os-kit';
import { useMoraStream } from '@/lib/hooks/useMoraStream';
import { parseDayCommand, type CommandContext, type DayCommand } from '@/lib/lea/moraCommands';

export type MoraState = 'idle' | 'thinking' | 'speaking';
export interface MoraReply { text: string; tone: 'answer' | 'action' | 'note'; undo?: () => void }

type SpeechCtor = new () => { lang: string; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; start: () => void; stop: () => void };

/**
 * MÔRA in der Mitte: ein Feld für Fragen und Tages-Sätze.
 * 1) Tages-Satz erkannt („hak Herbstrot ab“, „Michelle ist da“, „@Termine“) → sofort ausführen, mit Rückgängig.
 * 2) Sonst: Frage an den bestehenden MÔRA-Stream (/v3/chat/stream) mit Leas Tageskontext.
 *    Liefert CORE keine Antwort, sagt MÔRA das ehrlich und nennt nur, was aus den Daten belegt ist.
 */
export function MoraAsk({ ctx, dayContext, fallback, onCommand, onState, phone = false }: {
  ctx: CommandContext;
  /** Kontext für den Stream: nur echte Daten des Tages. */
  dayContext: Record<string, unknown>;
  /** Belegter Satz aus den Daten, falls der Stream nicht antwortet. */
  fallback: string;
  onCommand: (cmd: DayCommand) => Promise<MoraReply>;
  onState?: (s: MoraState) => void;
  phone?: boolean;
}) {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [reply, setReply] = useState<MoraReply | null>(null);
  const [asked, setAsked] = useState<string | null>(null);
  const stream = useMoraStream();
  const inputRef = useRef<HTMLInputElement>(null);
  const Speech: SpeechCtor | null = typeof window === 'undefined' ? null
    : ((window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor }).SpeechRecognition
      ?? (window as unknown as { webkitSpeechRecognition?: SpeechCtor }).webkitSpeechRecognition ?? null);
  const at = /@([^\s@]*)$/.exec(text);
  const matches = at ? ctx.planets.filter((p) => p.name.toLowerCase().includes(at[1].toLowerCase())).slice(0, 5) : [];

  const state: MoraState = stream.isStreaming ? (stream.streamingText ? 'speaking' : 'thinking') : 'idle';
  useEffect(() => { onState?.(state); }, [state, onState]);

  // „/“ fokussiert das Feld (wie Spotlight), außer man tippt schon irgendwo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.key === '/' && !(el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable))) { e.preventDefault(); inputRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const run = async (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    setText('');
    setAsked(t);
    const cmd = parseDayCommand(t, ctx);
    if (cmd) { setReply(await onCommand(cmd)); return; }
    setReply(null);
    const answer = await stream.sendMessage(t, { context: dayContext, history: stream.messages.slice(-6) });
    const err = stream.getError();
    if (answer && !err) setReply({ text: answer, tone: 'answer' });
    else setReply({ text: `Frei antworten kann ich gerade nicht – CORE erreicht kein Sprachmodell. Aus deinen Daten: ${fallback}`, tone: 'note' });
  };

  const listen = () => {
    if (!Speech) return;
    const rec = new Speech();
    rec.lang = 'de-DE';
    rec.onresult = (e) => { const said = e.results[0][0].transcript; void run(said); };
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  };

  const bubble = state !== 'idle' ? (stream.streamingText || null) : reply?.text ?? null;
  return (
    <div className="wd-ask" data-phone={phone ? 'true' : 'false'} data-testid="world-ask">
      {(bubble || state === 'thinking') ? (
        <div className="wd-reply" data-tone={reply?.tone ?? 'answer'} role="status" aria-live="polite" data-testid="mora-reply">
          <MoraStone size={28} thinking={state === 'thinking'} />
          <div className="wd-reply__body">
            {asked ? <p className="wd-reply__q">„{asked}“</p> : null}
            {state === 'thinking' ? <p className="wd-reply__thinking" data-testid="mora-thinking">MÔRA denkt <i /><i /><i /></p> : <p>{bubble}</p>}
            {reply?.undo && state === 'idle' ? <button type="button" className="wd-reply__undo" onClick={() => { reply.undo?.(); setReply({ text: 'Rückgängig gemacht.', tone: 'action' }); }} data-testid="mora-undo">Rückgängig</button> : null}
          </div>
          {state === 'idle' ? <button type="button" className="wd-reply__close" onClick={() => { setReply(null); setAsked(null); }} aria-label="Antwort schließen"><X size={16} /></button> : null}
        </div>
      ) : null}
      {matches.length ? (
        <ul className="wd-ask__list" role="listbox" aria-label="Bereiche">
          {matches.map((p) => (
            <li key={p.id}><button type="button" role="option" aria-selected={false} onClick={() => { void run(`@${p.name}`); }}>@{p.name}</button></li>
          ))}
        </ul>
      ) : null}
      <form onSubmit={(e) => { e.preventDefault(); void run(text); }}>
        <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') { setText(''); (e.target as HTMLInputElement).blur(); } }}
          placeholder={phone ? 'Frag MÔRA · „Michelle ist da“' : 'Frag MÔRA · „hak Herbstrot ab“ · @Bereich'} aria-label="Frag MÔRA" data-testid="world-ask-input" enterKeyHint="send" />
        {Speech ? <button type="button" onClick={listen} aria-pressed={listening} aria-label="Sprechen" data-testid="world-ask-mic"><Mic size={18} /></button> : null}
        <button type="submit" aria-label="Senden" data-testid="world-ask-send" disabled={state !== 'idle'}><Send size={18} /></button>
      </form>
    </div>
  );
}
