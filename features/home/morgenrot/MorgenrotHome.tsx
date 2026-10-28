'use client';
import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import { loadMorgenrot, MORGENROT, type MorgenrotState } from '@/lib/demo/morgenrot/online';
import type { FeatureSurfaceProps } from '../../types';
import { deriveAttention } from '../../today/data/attention';
import { readDemoViewer } from '../data/useDemoViewer';
import { Cockpit } from '../cockpit/Cockpit';
import { CockpitWindow } from '../cockpit/Window';
import { HomeOverview } from '../widgets/HomeOverview';
import { widgetsFromToday } from '../widgets/adapters';

const COMPANY = 'Café Morgenrot (FIKTIV)';

function Shell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="ck ck-live-home mr" data-testid="home" data-scope="morgenrot">
      <div className="ck-space" aria-hidden /><CockpitWindow />
      <header className="ck-top"><span>{COMPANY}</span><span>{label}</span></header>
      <div className="ck-live-grid"><section className="ck-panel" aria-label={COMPANY}>{children}</section></div>
    </div>
  );
}

/** Signed in as a Morgenrot user: Today and the real departments, both from CORE. */
function Online({ state, navigate }: { state: Extract<MorgenrotState, { kind: 'online' }>; navigate: FeatureSurfaceProps['navigate'] }) {
  const { snapshot, departments, viewer } = state;
  const items = useMemo(() => deriveAttention(snapshot).slice(0, 3), [snapshot]);
  const first = viewer.name?.split(/\s+/)[0];
  const h = new Date().getHours();
  const hello = h < 11 ? 'Guten Morgen' : h < 17 ? 'Guten Tag' : 'Guten Abend';
  return (
    <Shell label="aus CORE">
      <div data-testid="morgenrot-online">
        <HomeOverview
          greeting={`${hello}${first ? `, ${first}` : ''}.`}
          subline={items.length ? `${items.length === 1 ? 'Ein Ding braucht' : items.length === 2 ? 'Zwei Dinge brauchen' : 'Drei Dinge brauchen'} dich.` : 'Keine offenen Hinweise aus den verfügbaren Quellen.'}
          titleClass="hm-h1" sublineClass="hm-sub" widgets={widgetsFromToday(snapshot)}
        >
          {items.length ? (
            <ol className="hm-list">
              {items.map((it, i) => (
                <li key={it.id} className="hm-item">
                  <span className="hm-n">{String(i + 1).padStart(2, '0')}</span>
                  <div className="hm-txt"><div className="hm-t">{it.title}</div><div className="hm-d">{it.reason}</div></div>
                  <button type="button" className="hm-btn" onClick={() => navigate(it.id === 'mail-unread' ? 'post' : 'today')}>Öffnen</button>
                </li>
              ))}
            </ol>
          ) : null}
        </HomeOverview>
        <div className="mr-depts" aria-label="Abteilungen">
          {departments.length
            ? departments.map((d) => <span key={d.id} className="mr-dept" data-testid="morgenrot-department">{d.name}</span>)
            : <span className="mr-note">Noch keine Abteilungen in CORE.</span>}
        </div>
      </div>
    </Shell>
  );
}

/** Honest states instead of the seed: sign in, no rights, or still loading. */
function Notice({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="mr-state" data-testid="morgenrot-state">
      <h1 className="hm-h1">{title}</h1>
      <p className="hm-sub">{text}</p>
      {action}
    </div>
  );
}

/** Only when CORE did not answer: the fictional example, clearly marked; role switching only here. */
function Offline() {
  const viewer = useMemo(() => (typeof window === 'undefined' ? 'marius' : readDemoViewer(window.location.search, true) ?? 'marius'), []);
  return (
    <div className="mr-offline" data-testid="morgenrot-offline">
      <div className="mr-banner" role="status">Offline-Beispiel, fiktiv · CORE ist gerade nicht erreichbar, nichts hiervon ist gespeichert.</div>
      <Cockpit initialViewer={viewer} />
    </div>
  );
}

export function MorgenrotHome({ navigate }: { navigate: FeatureSurfaceProps['navigate'] }) {
  const [state, setState] = useState<MorgenrotState | null>(null);
  useEffect(() => {
    let alive = true;
    void loadMorgenrot().then((next) => { if (alive) setState(next); });
    return () => { alive = false; };
  }, []);

  if (!state) return <Shell label="wird geladen"><Notice title={COMPANY} text="Wird aus CORE geladen …" /></Shell>;
  if (state.kind === 'online') return <Online state={state} navigate={navigate} />;
  if (state.kind === 'offline') return <Offline />;
  if (state.kind === 'forbidden') {
    return (
      <Shell label="keine Rechte">
        <Notice title="Kein Zugriff" text={`Dein Zugang darf ${COMPANY} in CORE nicht lesen. Es wird kein Beispiel an seiner Stelle gezeigt.`} />
      </Shell>
    );
  }
  return (
    <Shell label="Anmeldung nötig">
      <Notice
        title="Bitte mit dem Demo-Zugang anmelden"
        text={state.signedInElsewhere
          ? `Du bist gerade bei einer anderen Firma angemeldet. ${COMPANY} liegt in CORE unter ${MORGENROT.companyId} und braucht den eigenen Demo-Zugang.`
          : `${COMPANY} liegt in CORE. Melde dich mit dem Demo-Zugang an, dann siehst du den echten Stand.`}
        action={<Link className="hm-btn hm-btn--p" href="/" data-testid="morgenrot-login">Zur Anmeldung</Link>}
      />
    </Shell>
  );
}
