'use client';
import './home.css';
import React, { useMemo, useState } from 'react';
import { useScopedToday } from '@/lib/os/useScopedToday';
import { useSessionStore } from '@/lib/store/sessionStore';
import { firstName } from '@/lib/auth/displayName';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import type { FeatureSurfaceProps } from '../types';
import { deriveAttention } from '../today/data/attention';
import type { HomeItem } from './data/homeModel';
import { useFirmaParam } from './data/useDemoViewer';
import { BridgeConsole } from './cockpit/BridgeConsole';
import { CockpitWindow } from './cockpit/Window';
import { MorgenrotHome } from './morgenrot/MorgenrotHome';
import { HomeOverview } from './widgets/HomeOverview';
import { widgetsFromToday } from './widgets/adapters';


function Items({ items, onDone, done }: { items: HomeItem[]; onDone: (id: string) => void; done: Set<string> }) {
  const open = items.filter((i) => !done.has(i.id));
  if (!open.length) {
    return (
      <div className="hm-done" data-testid="home-done">
        <div><b>Keine offenen Hinweise.</b><span>Nur verfügbare Quellen sind berücksichtigt.</span></div>
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

function LiveHome({ navigate }: { navigate: FeatureSurfaceProps['navigate'] }) {
  const user = useSessionStore((s) => s.user);
  const name = firstName(user);
  const { snapshot, loading, loadError } = useScopedToday();
  const items: HomeItem[] = useMemo(() => (snapshot ? deriveAttention(snapshot) : []).slice(0, 3).map((a) => ({ id: a.id, title: a.title, detail: a.reason, action: 'Öffnen', owner: 'me' })), [snapshot]);
  const [q, setQ] = useState('');
  const done = new Set<string>();
  const ask = () => { if (!q.trim()) return; useOsShellStore.getState().setMoraDraft(q); setQ(''); navigate('mora'); };
  const h = new Date().getHours();
  const hello = h < 11 ? 'Guten Morgen' : h < 17 ? 'Guten Tag' : 'Guten Abend';
  return (
    <div className="ck ck-live-home" data-testid="home" data-scope="live">
      <div className="ck-space" aria-hidden/><CockpitWindow/><header className="ck-top"><span>SAIMÔR</span><span>Quellen aus CORE</span></header>
      <div className="ck-live-grid">
        <section className="ck-panel" aria-label="Home">
          <HomeOverview greeting={`${hello}${name ? `, ${name}` : ''}.`} subline={loading ? 'Quellen werden geladen …' : !snapshot || loadError ? 'Quellen sind derzeit nicht verfügbar.' : items.length ? `${items.length === 1 ? 'Ein Ding braucht' : items.length === 2 ? 'Zwei Dinge brauchen' : 'Drei Dinge brauchen'} dich.` : 'Keine offenen Hinweise aus den verfügbaren Quellen.'} titleClass="hm-h1" sublineClass="hm-sub" widgets={widgetsFromToday(snapshot)}>
          {snapshot && !loadError ? <Items items={items} done={done} onDone={(id) => { navigate(id === 'mail-unread' ? 'post' : 'today'); }} /> : null}
          </HomeOverview>
        </section>
        <aside className="hm-side">
          <button type="button" className="hm-firma" onClick={() => navigate('universe')}>Firma ansehen <span>Bereiche &amp; Ordner</span></button>
          <button type="button" className="hm-firma" onClick={() => navigate('today')}>Heute im Detail <span>Termine, Post, Aufgaben</span></button>
        </aside>
      </div>
      <BridgeConsole home onHome={() => navigate('home')} onCompany={() => navigate('universe')} value={q} onChange={setQ} onSubmit={ask} onMic={() => navigate('mora')} micLabel="MÔRA öffnen" needs={items.length} onNeeds={() => navigate('today')} guidance={items[0] ? { text: items[0].title, onOpen: () => navigate(items[0].id === 'mail-unread' ? 'post' : 'today') } : undefined}/>
    </div>
  );
}

export default function HomeSurface({ navigate }: FeatureSurfaceProps) {
  const firma = useFirmaParam();
  // ?firma=morgenrot: the real demo company from CORE; the seed only as a marked offline fallback.
  if (firma === 'morgenrot') return <MorgenrotHome navigate={navigate} />;
  return <LiveHome navigate={navigate} />;
}
