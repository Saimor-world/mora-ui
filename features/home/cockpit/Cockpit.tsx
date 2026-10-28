'use client';
import '../cockpit.css';
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Home, Mic, Orbit } from 'lucide-react';
import { PixelMoraMark } from '@/components/world/PixelMora';
import { MORGENROT_SEED } from '@/lib/demo/morgenrot/seed';
import { MORGENROT_EVENTS, MORGENROT_STRUCTURE } from '@/lib/demo/morgenrot/structure';
import { buildHomeModel, landingFor, visiblePlanets, type HomeItem } from '../data/homeModel';
import { askMora, type MoraReply } from '../data/moraDemo';
import { useDemoDay } from '../data/useDemoDay';
import { CockpitWindow } from './Window';
import { OpenPlanet, PlanetSystem } from './Scene';
import { ActionSheet, FolderSheet, type SheetKind } from './Sheets';

const DATE = '2026-10-28';
const COMPANY = 'Café Morgenrot';
const VIEWERS = [['marius', 'Marius · Inhaber'], ['lena', 'Lena · Service'], ['tarek', 'Tarek · Küche'], ['jonas', 'Jonas · Theke']] as const;

function usePhone() {
  const [p, setP] = useState(false);
  useEffect(() => { const q = window.matchMedia('(max-width: 820px)'); const f = () => setP(q.matches); f(); q.addEventListener('change', f); return () => q.removeEventListener('change', f); }, []);
  return p;
}

export function Cockpit({ initialViewer }: { initialViewer: string }) {
  const [viewer, setViewer] = useState(initialViewer);
  const { day, dispatch } = useDemoDay();
  const phone = usePhone();
  const model = useMemo(() => buildHomeModel(MORGENROT_SEED, MORGENROT_EVENTS, DATE, viewer, day), [viewer, day]);
  const planets = useMemo(() => visiblePlanets(MORGENROT_STRUCTURE, MORGENROT_SEED, viewer), [viewer]);
  const own = landingFor(MORGENROT_SEED, viewer).planet;
  const owner = model.scope === 'owner';
  const [view, setView] = useState<'home' | 'universe'>('home');
  const [planetId, setPlanetId] = useState<string | null>(own);
  const [moonId, setMoonId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetKind | null>(null);
  const [q, setQ] = useState('');
  const [reply, setReply] = useState<MoraReply | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => { setPlanetId(own); setMoonId(null); setSheet(null); setReply(null); setView('home'); }, [viewer, own]);
  useEffect(() => { if (!toast) return undefined; const t = setTimeout(() => setToast(null), 2200); return () => clearTimeout(t); }, [toast]);
  useEffect(() => { // Schnelleinstieg per URL für Vorführung und Screenshots: ?ort=firma|<planet>[&ordner=<mond>]
    const s = new URLSearchParams(window.location.search); const ort = s.get('ort');
    if (ort) { setView('universe'); if (ort !== 'firma') setPlanetId(ort); const o = s.get('ordner'); if (o) setMoonId(o); }
  }, []);

  const switchViewer = (id: string) => { const u = new URL(window.location.href); u.searchParams.set('als', id); u.searchParams.delete('ort'); u.searchParams.delete('ordner'); window.history.replaceState(null, '', u); setViewer(id); };
  const planet = planets.find((p) => p.id === planetId) ?? null;
  const moon = planet?.moons.find((m) => m.id === moonId) ?? null;
  const attention = new Set<string>(owner ? model.needsYou.map((i) => (i.kind === 'reviews' ? 'service' : i.kind === 'order' ? 'verwaltung' : i.kind === 'swap' ? 'aushilfe' : '')).filter(Boolean) : []);

  const runItem = (it: HomeItem) => {
    if (it.kind === 'task') { dispatch({ type: 'task', id: it.id }); setToast('Erledigt'); return; }
    if (it.kind === 'note') { dispatch({ type: 'readNote', id: it.id }); return; }
    setSheet(it.kind as SheetKind);
  };
  const openMoon = (id: string) => { const p = planets.find((x) => x.moons.some((m) => m.id === id)); if (!p) return; setView('universe'); setPlanetId(p.id); setMoonId(id); };
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (!q.trim()) return; const r = askMora(q, viewer, MORGENROT_SEED, MORGENROT_EVENTS, DATE, day); setReply(r); setQ(''); if (r.openMoon && !r.action) openMoon(r.openMoon); };
  const confirm = () => { if (reply?.action) { dispatch(reply.action); setToast(reply.action.type === 'note' ? 'Gesendet' : 'Freigegeben'); } setReply(null); };

  const showHome = view === 'home';
  const sceneMode = planet && (!owner || view === 'universe') ? 'planet' : 'system';

  return (
    <div className="ck" data-testid="home" data-scope={model.scope} data-view={view} data-phone={phone ? '1' : '0'} data-folder={moon && !showHome ? '1' : '0'}>
      <div className="ck-space" aria-hidden />
      <div className={`ck-scene ck-scene--${sceneMode}${showHome ? ' ck-scene--behind' : ''}`}>
        {sceneMode === 'planet' && planet
          ? <OpenPlanet planet={planet} showMoons={!showHome} onMoon={(id) => setMoonId(id)} activeMoon={moonId} />
          : !(phone && showHome) ? <PlanetSystem planets={planets} attention={attention} company={COMPANY} compact={showHome} onOpen={(id) => { setView('universe'); setPlanetId(id); setMoonId(null); }} /> : null}
      </div>
      <CockpitWindow />

      {!showHome && !moon ? <div className={`ck-presence${sceneMode === 'system' ? ' ck-presence--system' : ''}`} data-testid="cockpit-presence"><PixelMoraMark size={80} /></div> : null}

      <header className="ck-top">
        <div className="ck-brand"><span>{COMPANY}</span></div>
        <div className="ck-top__r">
          <span className="ck-time">Mi, 28. Okt · 07:00</span>
          <label className="ck-who"><span className="sr-only">Ansicht als</span>
            <select value={viewer} onChange={(e) => switchViewer(e.target.value)} data-testid="viewer-switch">{VIEWERS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select>
          </label>
          <span className="ck-fict" title="Café Morgenrot, Mitarbeitende, Schichten und Zahlen sind erfunden.">Fiktive Demo</span>
        </div>
      </header>

      {!showHome && planet && owner ? <button type="button" className="ck-back" onClick={() => { setPlanetId(null); setMoonId(null); }} data-testid="ck-back"><ArrowLeft size={16} /> {COMPANY}</button> : null}

      {showHome ? (
        <section className="ck-panel" aria-label="Home">
          <h1 className="ck-h1">{model.greeting}</h1>
          <p className="ck-sub">{model.subline}</p>
          {phone && owner ? <div className="ck-home-strip"><PlanetSystem planets={planets} attention={attention} company={COMPANY} compact strip onOpen={(id) => { setView('universe'); setPlanetId(id); setMoonId(null); }} /></div> : null}
          {model.needsYou.length ? (
            <ol className="ck-list">
              {model.needsYou.map((it) => (
                <li key={it.id} className="ck-item">
                  <div className="ck-item__txt"><div className="ck-item__t">{it.title}</div><div className="ck-item__d">{it.detail}</div></div>
                  {it.action ? <button type="button" className={it.primary ? 'ck-btn ck-btn--p' : 'ck-btn'} onClick={() => runItem(it)} data-testid={`act-${it.id}`}>{it.action}</button> : null}
                </li>
              ))}
            </ol>
          ) : (
            <div className="ck-calm" data-testid="home-done"><PixelMoraMark size={40} /><div><b>Alles erledigt.</b><span>Ich melde mich, wenn etwas kommt.</span></div></div>
          )}
          {model.doneToday.length ? <div className="ck-donel">{model.doneToday.map((d) => <span key={d.id}><Check size={13} /> {d.title}{d.id === 'swap' && !owner ? ` · ${d.detail}` : ''}</span>)}</div> : null}
          {owner ? (
            <div className="ck-facts">
              <div className="ck-fact"><small>Gestern</small><b>{model.yesterday!.revenue.toLocaleString('de-DE')} €</b><span><em>+{Math.round(model.yesterday!.vsLastWeek * 100)} %</em> zur Vorwoche · Kasse stimmt</span></div>
              <div className="ck-fact"><small>{model.close ? 'Heute abgeschlossen' : 'Team heute'}</small>{model.close ? <><b>{model.close.cash.toLocaleString('de-DE')} €</b><span>Jonas · {model.close.at} · Kasse stimmt</span></> : <span className="ck-team">{model.team.map((t) => <i key={t.personId}>{t.name} <em>{t.shift.split('–')[0]}</em></i>)}</span>}</div>
            </div>
          ) : null}
        </section>
      ) : null}

      {moon && planet && !showHome ? <FolderSheet key={moon.id} moon={moon} planetTitle={planet.title} onClose={() => setMoonId(null)} /> : null}
      {sheet ? <ActionSheet kind={sheet} day={day} owner={owner} dispatch={(a) => { dispatch(a); setToast(a.type === 'oat' || a.type === 'close' ? 'Gesendet' : 'Freigegeben'); }} onClose={() => setSheet(null)} /> : null}

      {reply ? (
        <div className="ck-reply" role="status" data-testid="mora-reply">
          <PixelMoraMark size={22} />
          <p>{reply.text}</p>
          <div className="ck-reply__a">{reply.action ? <button type="button" className="ck-btn ck-btn--p" onClick={confirm}>{reply.confirm}</button> : null}<button type="button" className="ck-btn" onClick={() => setReply(null)}>{reply.action ? 'Abbrechen' : 'OK'}</button></div>
        </div>
      ) : null}
      {toast ? <div className="ck-toast" role="status"><Check size={14} /> {toast}</div> : null}

      <nav className="ck-dock" aria-label="Kommandozentrale">
        <button type="button" className="ck-dock__b" aria-label="Home" aria-pressed={showHome} onClick={() => setView('home')} data-testid="dock-home"><Home size={18} /><span>Home</span></button>
        <button type="button" className="ck-dock__b" aria-label={owner ? 'Firma' : planets[0]?.title ?? 'Bereich'} aria-pressed={!showHome} onClick={() => { setView('universe'); if (owner && view === 'universe') { setPlanetId(null); setMoonId(null); } }} data-testid="open-firma"><Orbit size={18} /><span>{owner ? 'Firma' : planets[0]?.title ?? 'Bereich'}</span></button>
        <form className="ck-ask" onSubmit={submit}>
          <PixelMoraMark size={20} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={owner ? 'Frag MÔRA – z. B. „Sag Lena, …“' : 'Frag MÔRA …'} aria-label="Frag MÔRA" data-testid="ck-ask" />
          <button type="button" className="ck-mic" aria-label="Sprechen (in der Demo: tippen)" onClick={() => setQ(owner ? 'Sag Lena, sie soll heute die Terrasse zumachen' : 'Was muss ich heute machen?')}><Mic size={17} /></button>
        </form>
        {!showHome && model.needsYou.length ? <button type="button" className="ck-dock__need" onClick={() => setView('home')}>{model.needsYou.length} für dich</button> : null}
      </nav>
      <div className="ck-reset"><button type="button" onClick={() => { dispatch({ type: 'reset' }); setToast('Demo zurückgesetzt'); }}>Demo zurücksetzen</button></div>
    </div>
  );
}
