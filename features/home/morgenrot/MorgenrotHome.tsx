'use client';
import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import { loadMorgenrot, MORGENROT, type MorgenrotState } from '@/lib/demo/morgenrot/online';
import type { FeatureSurfaceProps } from '../../types';
import { readDemoViewer } from '../data/useDemoViewer';
import { Cockpit } from '../cockpit/Cockpit';
import { CockpitWindow } from '../cockpit/Window';
import { ConnectedCockpit } from '../cockpit/ConnectedCockpit';

const COMPANY = 'Café Morgenrot';

function Shell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="ck ck-live-home mr" data-testid="home" data-scope="morgenrot">
      <div className="ck-space" aria-hidden /><CockpitWindow />
      <header className="ck-top"><span>{COMPANY}</span><span>{label} <span className="ck-fict fiktiv-badge">Fiktive Demo</span></span></header>
      <div className="ck-live-grid"><section className="ck-panel" aria-label={COMPANY}>{children}</section></div>
    </div>
  );
}

/** Signed in as a Morgenrot user: Today and the real departments, both from CORE. */
function Online({ state, navigate, initialView }: { state: Extract<MorgenrotState, { kind: 'online' }>; navigate: FeatureSurfaceProps['navigate']; initialView?: 'home' | 'universe' }) {
  return (
    <ConnectedCockpit
      navigate={navigate}
      initialView={initialView}
      companyName={COMPANY}
      snapshot={state.snapshot}
      viewerName={state.viewer.name}
      isDemo={true}
    />
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
function Offline({ initialView }: { initialView?: 'home' | 'universe' }) {
  const viewer = useMemo(() => (typeof window === 'undefined' ? 'marius' : readDemoViewer(window.location.search, true) ?? 'marius'), []);
  return (
    <div className="mr-offline" data-testid="morgenrot-offline">
      <div className="mr-banner fiktiv-badge" role="status">Offline-Beispiel, fiktiv · CORE ist gerade nicht erreichbar, nichts hiervon ist gespeichert.</div>
      <Cockpit initialViewer={viewer} initialView={initialView} />
    </div>
  );
}

export function MorgenrotHome({ navigate, initialView, preview = false }: { navigate: FeatureSurfaceProps['navigate']; initialView?: 'home' | 'universe'; preview?: boolean }) {
  const [state, setState] = useState<MorgenrotState | null>(null);
  useEffect(() => {
    let alive = true;
    void loadMorgenrot().then((next) => { if (alive) setState(next); });
    return () => { alive = false; };
  }, []);

  if (!state) return <Shell label="wird geladen"><Notice title={COMPANY} text="Wird aus CORE geladen …" /></Shell>;
  if (state.kind === 'online') return <Online state={state} navigate={navigate} initialView={initialView} />;
  if (state.kind === 'offline') return <Offline initialView={initialView} />;
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
