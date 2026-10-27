'use client';
import './home.css';
import React, { useMemo, useState } from 'react';
import { PixelMoraMark } from '@/components/world/PixelMora';
import { MORGENROT_SEED, FICTIONAL_NOTICE } from '@/lib/demo/morgenrot/seed';
import { MORGENROT_EVENTS, MORGENROT_STRUCTURE } from '@/lib/demo/morgenrot/structure';
import { useIsSaimorInternal } from '@/lib/hooks/useIsSaimorInternal';
import { useScopedToday } from '@/lib/os/useScopedToday';
import { useSessionStore } from '@/lib/store/sessionStore';
import { firstName } from '@/lib/auth/displayName';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import type { FeatureSurfaceProps } from '../types';
import { deriveAttention } from '../today/data/attention';
import { buildHomeModel, landingFor, visiblePlanets, type HomeItem } from './data/homeModel';
import { useDemoViewer } from './data/useDemoViewer';
import { MicButton } from './ui/MicIcon';
import { CompanyUniverse } from './ui/CompanyUniverse';

const DEMO_DATE = '2026-10-28';
const fmtEur = (n: number) => `${n.toLocaleString('de-DE')} €`;

function Items({ items, onDone, done }: { items: HomeItem[]; onDone: (id: string) => void; done: Set<string> }) {
  const open = items.filter((i) => !done.has(i.id));
  if (!open.length) {
    return (
      <div className="hm-done" data-testid="home-done">
        <PixelMoraMark size={56} />
        <div><b>Alles erledigt.</b><span>MÔRA kümmert sich um den Rest.</span></div>
      </div>
    );
  }
  return (
    <ol className="hm-list">
      {open.map((it, i) => (
        <li key={it.id} className="hm-item">
          <span className="hm-n">{String(i + 1).padStart(2, '0')}</span>
          <div className="hm-txt"><div className="hm-t">{it.title}</div><div className="hm-d">{it.detail}</div></div>
          <button type="button" className={it.primary ? 'hm-btn hm-btn--p' : 'hm-btn'} onClick={() => onDone(it.id)}>{it.action}</button>
        </li>
      ))}
    </ol>
  );
}

function DemoHome({ viewer }: { viewer: string }) {
  const model = useMemo(() => buildHomeModel(MORGENROT_SEED, MORGENROT_EVENTS, DEMO_DATE, viewer), [viewer]);
  const planets = useMemo(() => visiblePlanets(MORGENROT_STRUCTURE, MORGENROT_SEED, viewer), [viewer]);
  const landing = landingFor(MORGENROT_SEED, viewer);
  const [view, setView] = useState<'home' | 'firma'>('home');
  const [done, setDone] = useState<Set<string>>(new Set());
  const markDone = (id: string) => setDone((s) => new Set(s).add(id));
  const company = 'Café Morgenrot';

  if (view === 'firma') return <div className="hm"><div className="hm-sky" aria-hidden /><CompanyUniverse planets={planets} initial={null} onBack={() => setView('home')} company={company} /></div>;
  return (
    <div className="hm" data-testid="home" data-scope={model.scope}>
      <div className="hm-sky" aria-hidden />
      <div className="hm-top">
        <div className="hm-mark"><PixelMoraMark size={28} /><span>MÔRA</span></div>
        <div className="hm-meta">{company} · Mittwoch, 28. Oktober · 07:00</div>
      </div>
      <div className={model.scope === 'owner' ? 'hm-grid' : 'hm-grid hm-grid--staff'}>
        <section>
          <h1 className="hm-h1">{model.greeting}</h1>
          <p className="hm-sub">{model.subline}</p>
          <Items items={model.needsYou} onDone={markDone} done={done} />
  <MicButton onClick={() => useOsShellStore.getState().setMoraOpen(true)} />
        </section>
        <aside className="hm-side">
          {model.yesterday ? (
            <>
              <h3 className="hm-eb">Gestern</h3>
              <div className="hm-k">{fmtEur(model.yesterday.revenue)}</div>
              <div className="hm-ks"><span className="hm-up">+{Math.round(model.yesterday.vsLastWeek * 100)} %</span> zur Vorwoche{model.yesterday.tillOk ? ' · Kasse stimmt' : ''}</div>
            </>
          ) : null}
          {model.team.length ? (
            <>
              <h3 className="hm-eb">Team heute</h3>
              {model.team.map((t) => <div key={t.personId} className="hm-row"><span>{t.name} · {t.role}</span><span>{t.shift}</span></div>)}
              <button type="button" className="hm-firma" onClick={() => setView('firma')} data-testid="open-firma">Firma ansehen <span>{planets.length} Bereiche</span></button>
            </>
          ) : landing.planet ? (
            <>
              <h3 className="hm-eb">Dein Bereich</h3>
              <CompanyUniverse planets={planets} initial={landing.planet} company={company} />
            </>
          ) : null}
        </aside>
      </div>
      <div className="hm-foot"><span>{FICTIONAL_NOTICE}</span>{model.scope === 'owner' ? <span>„Sag Lena, sie soll heute die Terrasse zumachen.“</span> : null}</div>
    </div>
  );
}

function LiveHome({ navigate }: { navigate: FeatureSurfaceProps['navigate'] }) {
  const user = useSessionStore((s) => s.user);
  const name = firstName(user);
  const { snapshot } = useScopedToday();
  const items: HomeItem[] = useMemo(() => (snapshot ? deriveAttention(snapshot) : []).slice(0, 3).map((a) => ({ id: a.id, title: a.title, detail: a.reason, action: 'Öffnen', owner: 'me' })), [snapshot]);
  const [done, setDone] = useState<Set<string>>(new Set());
  const h = new Date().getHours();
  const hello = h < 11 ? 'Guten Morgen' : h < 17 ? 'Guten Tag' : 'Guten Abend';
  return (
    <div className="hm" data-testid="home" data-scope="live">
      <div className="hm-sky" aria-hidden />
      <div className="hm-top"><div className="hm-mark"><PixelMoraMark size={28} /><span>MÔRA</span></div></div>
      <div className="hm-grid hm-grid--staff">
        <section>
          <h1 className="hm-h1">{hello}{name ? `, ${name}` : ''}.</h1>
          <p className="hm-sub">{items.length ? `${items.length === 1 ? 'Ein Ding braucht' : items.length === 2 ? 'Zwei Dinge brauchen' : 'Drei Dinge brauchen'} dich. Alles andere läuft.` : 'Gerade braucht dich nichts.'}</p>
          <Items items={items} done={done} onDone={(id) => { setDone((s) => new Set(s).add(id)); navigate(id === 'mail-unread' ? 'post' : 'today'); }} />
          <MicButton onClick={() => useOsShellStore.getState().setMoraOpen(true)} />
        </section>
        <aside className="hm-side">
          <button type="button" className="hm-firma" onClick={() => navigate('universe')}>Firma ansehen <span>Bereiche &amp; Ordner</span></button>
          <button type="button" className="hm-firma" onClick={() => navigate('today')}>Heute im Detail <span>Termine, Post, Aufgaben</span></button>
        </aside>
      </div>
    </div>
  );
}

export default function HomeSurface({ navigate, preview }: FeatureSurfaceProps) {
  const internal = useIsSaimorInternal();
  const viewer = useDemoViewer(preview || internal === true);
  if (viewer) return <DemoHome viewer={viewer} />;
  return <LiveHome navigate={navigate} />;
}
