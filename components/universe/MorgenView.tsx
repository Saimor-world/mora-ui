'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MoraLivingBackground } from '@/components/mora/MoraLivingBackground';
import { coreGet, corePost } from '@/lib/api/http';
import { ringBell, isBellMuted, setBellMuted, routeIntent } from '@/lib/universe/morgen';

type Rhythm = { phase: string; greeting: string; local_time: string; evening?: { state: string; text: string | null } | null };
type Vitals = { state: string; reasons: string[]; vitals: Record<string, number | null>; watch: string; open_incidents: number; measured_at: string };
type Item = { title: string; source: string };
type Proposal = { id: string; label: string; reason: string; sources: string[]; undo: string; status: string; result?: any };
type Today = { text: string; items: Item[]; proposal: Proposal | null; nebel?: string[] };

const unwrap = (r: any) => (r && typeof r === 'object' && 'data' in r && Object.keys(r).length <= 2 ? r.data : r);
const PHASE_LABEL: Record<string, string> = { flow: 'Morgen', build: 'Tag', lounge: 'Abend', night: 'Nacht' };
const STATE_LABEL: Record<string, string> = { ruhig: 'atmet ruhig', warm: 'ist warm', fieber: 'hat Fieber', nebel: 'liegt im Nebel' };

const Nebel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm italic text-white/45" data-testid="nebel">{children}</p>
);

export function MorgenView() {
  const [rhythm, setRhythm] = useState<Rhythm | null | 'nebel'>(null);
  const [today, setToday] = useState<Today | null | 'nebel'>(null);
  const [vitals, setVitals] = useState<Vitals | null | 'nebel'>(null);
  const [view, setView] = useState<'home' | 'body' | 'evening'>('home');
  const [open, setOpen] = useState<Proposal | null>(null);
  const [busy, setBusy] = useState(false);
  const [cmd, setCmd] = useState(false);
  const [q, setQ] = useState('');
  const [muted, setMuted] = useState(false);
  const rang = useRef(false);

  const loadToday = useCallback(async () => {
    try { setToday(unwrap(await coreGet('/v3/mora/today'))); } catch { setToday('nebel'); }
  }, []);

  useEffect(() => {
    setMuted(isBellMuted());
    coreGet('/v3/rhythm/now').then((r) => setRhythm(unwrap(r))).catch(() => setRhythm('nebel'));
    coreGet('/v3/body/vitals').then((r) => setVitals(unwrap(r))).catch(() => setVitals('nebel'));
    loadToday();
  }, [loadToday]);

  useEffect(() => {
    if (!rang.current && rhythm && rhythm !== 'nebel') { rang.current = true; ringBell(); }
  }, [rhythm]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmd((c) => !c); }
      if (e.key === 'Escape') { setCmd(false); setOpen(null); }
    };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, []);

  const travel = (text: string) => {
    const i = routeIntent(text);
    setCmd(false); setQ('');
    if (i === 'body') setView('body');
    else if (i === 'evening') setView('evening');
    else { setView('home'); if (i === 'today') loadToday(); }
  };

  const decide = async (approve: boolean) => {
    if (!open) return;
    setBusy(true);
    try {
      const r = unwrap(await corePost(`/v3/universe/proposals/${open.id}/${approve ? 'approve' : 'reject'}`, {}));
      setOpen(r);
      loadToday();
    } catch { setOpen({ ...open, status: 'failed', result: { error: 'CORE nicht erreichbar' } }); }
    setBusy(false);
  };

  const r = rhythm && rhythm !== 'nebel' ? rhythm : null;
  const t = today && today !== 'nebel' ? today : null;
  const v = vitals && vitals !== 'nebel' ? vitals : null;
  const time = r ? new Date(r.local_time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' }) : '';

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#0d0921] text-white" data-testid="universe-morgen">
      <MoraLivingBackground />
      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-10 py-7 text-[11px] uppercase tracking-[0.32em] text-white/45">
        <span>Saimôr Universe</span>
        <span className="flex items-center gap-6">
          {r && <span>{PHASE_LABEL[r.phase] ?? r.phase} · {time}</span>}
          <button onClick={() => setCmd(true)} className="hover:text-white/80">⌘K</button>
          <button onClick={() => { setBellMuted(!muted); setMuted(!muted); }} aria-label="Glocke stumm schalten" className="hover:text-white/80">
            {muted ? 'Glocke aus' : 'Glocke an'}
          </button>
        </span>
      </header>

      <main className="relative z-10 mx-auto flex h-full max-w-2xl flex-col justify-center px-8">
        {view === 'home' && (
          <section className="space-y-14 motion-safe:animate-[fadeIn_1.2s_ease-out]">
            {rhythm === null ? <div className="h-8" /> : r
              ? <h1 className="font-light leading-snug text-white/90 text-[28px] tracking-[-0.01em]" data-testid="greeting">{r.greeting}</h1>
              : <Nebel>MÔRA kann CORE gerade nicht erreichen. Nichts hier ist erfunden, darum bleibt es still.</Nebel>}

            <div className="space-y-5">
              <p className="text-[11px] uppercase tracking-[0.32em] text-white/40">Heute wichtig</p>
              {today === null ? null : !t ? <Nebel>Die Prioritäten liegen im Nebel.</Nebel> : (
                <>
                  <p className="text-[15px] leading-relaxed text-white/75">{t.text}</p>
                  <ul className="space-y-2.5">
                    {t.items.slice(0, 4).map((it, i) => (
                      <li key={i} className="flex items-baseline justify-between gap-6 border-b border-white/[0.06] pb-2.5 text-sm text-white/70">
                        <span>{it.title}</span>
                        {it.source.startsWith('http')
                          ? <a href={it.source} target="_blank" rel="noreferrer" className="shrink-0 text-[11px] text-white/35 hover:text-white/70">Quelle ↗</a>
                          : <span className="shrink-0 text-[11px] text-white/35">{it.source}</span>}
                      </li>
                    ))}
                  </ul>
                  {t.nebel && t.nebel.length > 0 && <Nebel>Noch im Nebel, weil nicht verbunden: {t.nebel.join(' · ')}</Nebel>}
                </>
              )}
            </div>

            {t?.proposal && t.proposal.status === 'pending' && (
              <button onClick={() => setOpen(t.proposal)} data-testid="star"
                className="group flex items-center gap-4 text-left text-sm text-white/80">
                <span className="relative h-2 w-2 rounded-full bg-amber-100/90 shadow-[0_0_12px_rgba(254,243,199,0.45)] motion-safe:animate-[pulse_4s_ease-in-out_infinite]" />
                <span className="border-b border-transparent group-hover:border-white/30">{t.proposal.label}</span>
                <span className="text-[11px] uppercase tracking-[0.25em] text-white/35">wartet auf dein Ja</span>
              </button>
            )}
          </section>
        )}

        {view === 'body' && (
          <section className="space-y-8" data-testid="body-planet">
            <button onClick={() => setView('home')} className="text-[11px] uppercase tracking-[0.32em] text-white/40 hover:text-white/70">← Kosmos</button>
            <div className="flex items-center gap-8">
              <div className={`h-28 w-28 rounded-full border border-white/10 bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.18),rgba(30,27,75,0.6)_60%)] ${v?.state === 'fieber' ? 'motion-safe:animate-[pulse_3s_ease-in-out_infinite] shadow-[0_0_40px_rgba(251,146,60,0.25)]' : ''}`} />
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-white/40">Wache · Körper</p>
                <h2 className="mt-2 text-[26px] font-light text-white/90">{v ? `Der Körper ${STATE_LABEL[v.state] ?? v.state}.` : 'Der Körper liegt im Nebel.'}</h2>
                {v?.reasons?.length ? <p className="mt-2 text-sm text-white/60">{v.reasons.join(' · ')}</p> : null}
              </div>
            </div>
            {v ? (
              <dl className="grid grid-cols-3 gap-8 text-sm">
                {[['Speicher', v.vitals.disk_pct != null ? `${v.vitals.disk_pct} %` : null, v.vitals.disk_free_gb != null ? `${v.vitals.disk_free_gb} GB frei` : ''],
                  ['Arbeitsspeicher', v.vitals.mem_avail_mb != null ? `${v.vitals.mem_avail_mb} MB` : null, 'verfügbar'],
                  ['Last', v.vitals.load_1m != null ? String(v.vitals.load_1m) : null, `${v.vitals.cpu_count ?? '?'} Kerne`]].map(([k, val, sub]) => (
                  <div key={k as string}>
                    <dt className="text-[11px] uppercase tracking-[0.25em] text-white/40">{k}</dt>
                    <dd className="mt-1 text-xl font-light text-white/85">{val ?? <span className="italic text-white/40">Nebel</span>}</dd>
                    <dd className="text-xs text-white/40">{sub}</dd>
                  </div>
                ))}
              </dl>
            ) : <Nebel>Keine Messwerte aus CORE.</Nebel>}
            {v && <p className="text-xs text-white/35">Gemessen {new Date(v.measured_at).toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' })} · Wache {v.watch === 'nebel' ? 'ohne Daten' : `${v.open_incidents} offene Vorfälle`}</p>}
          </section>
        )}

        {view === 'evening' && (
          <section className="space-y-8" data-testid="evening">
            <button onClick={() => setView('home')} className="text-[11px] uppercase tracking-[0.32em] text-white/40 hover:text-white/70">← Kosmos</button>
            <p className="text-[11px] uppercase tracking-[0.32em] text-white/40">Rückblick</p>
            {r?.evening?.text
              ? <p className="max-w-xl font-light leading-relaxed text-white/85 text-[22px]">{r.evening.text}</p>
              : <Nebel>{r && !r.evening ? 'Der Rückblick kommt am Abend.' : 'Der Tag liegt im Nebel.'}</Nebel>}
          </section>
        )}
      </main>

      {open && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => !busy && setOpen(null)}>
          <div role="dialog" aria-label="Vorschlag" onClick={(e) => e.stopPropagation()} data-testid="proposal-card"
            className="w-full max-w-lg space-y-6 rounded-2xl border border-white/10 bg-[#120e2a]/90 p-9">
            <p className="text-[11px] uppercase tracking-[0.32em] text-white/40">Vorschlag von MÔRA</p>
            <h3 className="text-xl font-light text-white/90">{open.label}</h3>
            <div className="space-y-3 text-sm text-white/65">
              <p><span className="text-white/40">Warum · </span>{open.reason}</p>
              <p><span className="text-white/40">Rückweg · </span>{open.undo}</p>
              <p><span className="text-white/40">Quelle · </span>{open.sources.map((s) => <a key={s} href={s} target="_blank" rel="noreferrer" className="underline decoration-white/20 hover:text-white">Werkstatt-Protokoll ↗</a>)}</p>
            </div>
            {open.status === 'pending' ? (
              <div className="flex gap-3 pt-2">
                <button disabled={busy} onClick={() => decide(true)} className="rounded-full bg-white/90 px-6 py-2 text-sm text-[#120e2a] hover:bg-white disabled:opacity-50">Ja</button>
                <button disabled={busy} onClick={() => decide(false)} className="rounded-full border border-white/15 px-6 py-2 text-sm text-white/70 hover:text-white disabled:opacity-50">Nein</button>
              </div>
            ) : (
              <p className="text-sm text-white/75" data-testid="proposal-result">
                {open.status === 'done' ? `Erledigt${open.result?.verified ? ' und geprüft: der Lauf ist wieder in der Warteschlange.' : ', aber noch nicht bestätigt.'}`
                  : open.status === 'rejected' ? 'Verworfen. Nichts ist passiert.' : `Nicht ausgeführt: ${open.result?.error ?? 'unbekannt'}`}
              </p>
            )}
          </div>
        </div>
      )}

      {cmd && (
        <div className="absolute inset-0 z-30 flex items-start justify-center bg-black/30 pt-[22vh]" onClick={() => setCmd(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); travel(q); }} className="w-full max-w-xl">
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} aria-label="Absicht"
              placeholder="Wohin? – „Wie geht es dem Server?“ · „Was ist heute wichtig?“"
              className="w-full rounded-xl border border-white/10 bg-[#120e2a]/90 px-6 py-4 text-[15px] text-white placeholder:text-white/35 focus:outline-none" />
          </form>
        </div>
      )}
    </div>
  );
}
