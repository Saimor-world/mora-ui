'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownToLine, Orbit, ShieldCheck } from 'lucide-react';
import { Button, FailureState, Input, MoraStone, SampleTag, Text, cx } from '@/components/os-kit';
import { coreGet, corePost } from '@/lib/api/http';
import { classifyCoreFailure } from '@/lib/os-prototype/coreFailure';
import { DEMO_DEPARTMENTS } from '@/lib/os-prototype/demoPack';
import { readLocalOrg } from '@/lib/os-prototype/onboarding';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import { isLocalCore, useSources, type SourceEntry } from '@/lib/os-prototype/useSources';
import {
  CONSENT_IN, PLANET_COLORS, SAMPLE_STATIONS, SCENE, STATION_WHY, dockPoint, dockTarget, isPrimaryStation,
  orbitPositions, orbits, planetPositions, recommendStation, sortStations, translateCoreError,
  type DockPlanet, type DockStation, type Point,
} from '@/lib/os-prototype/sourceDock';
import { useDepartments } from '@/lib/queries/useDepartments';
import { useSessionStore } from '@/lib/store/sessionStore';

/**
 * V1.7 Andockstation (Einstellungen › Quellen und Onboarding-Schritt „Erste Station“).
 * Quellen sind Stationen, die an die Abteilungs-Planeten andocken, die sie speisen.
 * Eine fokussierte Aktion, ein Satz von MÔRA, Freigabe-Schleuse vor dem Andocken,
 * danach das erste echte Signal. Status 1:1 aus `GET /v3/connections`; Andocken über
 * `POST /v3/connections/{provider}/connect` – im Prototyp nur gegen einen lokalen CORE.
 * Zugangsdaten werden nie im Browser gespeichert; Felder werden nach dem Senden geleert.
 */
type Focus =
  | { kind: 'idle' }
  | { kind: 'consent' | 'form' | 'busy' | 'docked' | 'admin' | 'info'; id: string }
  | { kind: 'error'; id: string; raw: string };

interface Briefing { status?: string; text?: string }

const STARS: Point[] = Array.from({ length: 34 }, (_, i) => ({ x: (i * 211 + 37) % SCENE.w, y: (i * 97 + 53) % SCENE.h }));

function usePlanets(live: boolean, sample: boolean): DockPlanet[] {
  const companyId = useSessionStore((s) => s.user?.active_company_id ?? null);
  const depts = useDepartments(live && !sample ? companyId : null);
  return useMemo(() => {
    // Eigene Abteilungen aus dem Onboarding (nur lokal) haben Vorrang vor dem Demo-Paket.
    const own = readLocalOrg().departments.slice(0, 6).map((n, i) => ({ id: `local-${i}`, name: n, color: PLANET_COLORS[i % PLANET_COLORS.length] }));
    const real = !sample && Array.isArray(depts.data) ? depts.data : [];
    if (real.length) return real.slice(0, 6).map((d, i) => ({ id: d.id, name: d.name, color: d.color || PLANET_COLORS[i % PLANET_COLORS.length] }));
    if (own.length) return own;
    return sample ? DEMO_DEPARTMENTS.slice(0, 6).map((d) => ({ id: d.id, name: d.name, color: d.color })) : [];
  }, [sample, depts.data]);
}

function ConnectFields({ entry, busy, onSubmit }: { entry: SourceEntry; busy: boolean; onSubmit: (values: Record<string, string>) => void }) {
  const fields = entry.action?.field_schema || [];
  const initial = () => Object.fromEntries(fields.map((f) => [f.name, f.default || '']));
  const [values, setValues] = useState<Record<string, string>>(initial);
  return (
    <form className="os-station-form" data-testid={`dock-form-${entry.id}`}
      onSubmit={(e) => { e.preventDefault(); const v = values; setValues(initial()); onSubmit(v); }}>
      {fields.map((f) => f.type === 'select' ? (
        <label key={f.name} className="os-station-field"><span>{f.label}</span>
          <select className="os-input" value={values[f.name]} onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}>
            {(f.options || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      ) : (
        <Input key={f.name} label={f.label} hideLabel={false} type={f.type === 'password' ? 'password' : f.type === 'url' ? 'url' : f.type === 'email' ? 'email' : 'text'}
          required={f.required} placeholder={f.placeholder} autoComplete={f.autocomplete || 'off'} value={values[f.name] || ''}
          onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))} />
      ))}
      {entry.action?.note ? <details className="os-station-details"><summary>Hinweis</summary><p>{entry.action.note}</p></details> : null}
      <Button variant="primary" size="sm" type="submit" disabled={busy} data-testid="dock-submit">{busy ? 'Dockt an …' : 'Andocken'}</Button>
    </form>
  );
}

export function SourceDock({ live, compact = false, navigate }: { live: boolean; compact?: boolean; navigate?: (id: string) => void }) {
  const qc = useQueryClient();
  const look = useOsShellStore((s) => s.look);
  const sources = useSources(live);
  const list = sources.data?.connections || [];
  const boundary = live && sources.isSuccess && !list.length;
  const sample = !live || boundary;
  const planets = usePlanets(live, sample);
  const local = isLocalCore();
  const [focus, setFocus] = useState<Focus>({ kind: 'idle' });
  const [showAll, setShowAll] = useState(false);
  // Schrift bleibt in echten Pixeln gleich groß, egal wie breit die Szene gerendert wird.
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [k, setK] = useState(1);
  useEffect(() => {
    const el = svgRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => { const w = el.getBoundingClientRect().width; if (w > 0) setK(SCENE.w / w); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const stations: DockStation[] = useMemo(() => (sample
    ? SAMPLE_STATIONS
    : sortStations(list).map((e) => ({ id: e.id, label: e.label, group: e.group, status: e.status, entry: e }))), [sample, list]);
  const visible = stations.filter((s) => compact ? isPrimaryStation(s) : showAll || isPrimaryStation(s) || ('id' in focus && focus.id === s.id));
  const hidden = stations.length - stations.filter(isPrimaryStation).length;
  const rec = sample ? null : recommendStation(stations.filter((s) => isPrimaryStation(s)));
  const connectedCount = stations.filter((s) => s.status === 'connected' && !s.sample).length;
  const focusId = 'id' in focus ? focus.id : rec?.id ?? null;
  const current = stations.find((s) => s.id === focusId) ?? null;

  const planetPts = planetPositions(planets.length, compact);
  const planetPos = (p: DockPlanet | null) => (p ? planetPts[planets.indexOf(p)] : null);
  const free = visible.filter((s) => s.status !== 'connected');
  const freePts = orbitPositions(free.length, compact);
  const slots = new Map<string, number>();
  const placed = visible.map((s) => {
    const target = dockTarget(s.group, planets);
    const key = target?.id ?? 'core';
    if (s.status === 'connected') {
      const slot = slots.get(key) ?? 0; slots.set(key, slot + 1);
      const pos = dockPoint(planetPos(target), slot);
      const anchor = planetPos(target) ?? { x: SCENE.cx, y: SCENE.cy };
      return { s, target, pos, side: (pos.x >= anchor.x ? 1 : -1) as 1 | -1 };
    }
    return { s, target, pos: freePts[free.indexOf(s)], side: 0 as const };
  });
  const sel = placed.find((p) => p.s.id === focusId) ?? null;
  const approach = sel && sel.s.status !== 'connected' && sel.s.status !== 'setup_required' && focus.kind !== 'idle'
    ? { from: sel.pos, to: dockPoint(planetPos(sel.target), slots.get(sel.target?.id ?? 'core') ?? 0) } : null;

  const briefing = useQuery({
    queryKey: ['os', 'briefing'], queryFn: () => coreGet('/v3/briefing') as Promise<Briefing>,
    enabled: live && focus.kind === 'docked', staleTime: 30_000, retry: false,
  });

  const select = (s: DockStation) => {
    if (s.sample) return;
    setFocus({ kind: s.status === 'connected' ? 'info' : s.status === 'setup_required' ? 'admin' : 'consent', id: s.id });
  };
  const approve = async (s: DockStation) => {
    if (!local || !s.entry?.action) return;
    if (s.entry.action.kind !== 'oauth') { setFocus({ kind: 'form', id: s.id }); return; }
    setFocus({ kind: 'busy', id: s.id });
    try {
      const res = await corePost(`/v3/connections/${encodeURIComponent(s.id)}/connect`, { return_to: window.location.href });
      const url = res?.authorization_url || res?.auth_url || res?.url;
      if (url && typeof url === 'string') { window.location.assign(url); return; }
      setFocus({ kind: 'error', id: s.id, raw: 'CORE hat keinen Anmelde-Link geliefert.' });
    } catch (err) {
      setFocus({ kind: 'error', id: s.id, raw: err instanceof Error ? err.message : String(err) });
    }
  };
  const submit = async (s: DockStation, values: Record<string, string>) => {
    if (!local) return;
    setFocus({ kind: 'busy', id: s.id });
    try {
      await corePost(`/v3/connections/${encodeURIComponent(s.id)}/connect`, values);
      await qc.invalidateQueries({ queryKey: ['os', 'sources'] });
      qc.invalidateQueries({ queryKey: ['os', 'briefing'] });
      setFocus({ kind: 'docked', id: s.id });
    } catch (err) {
      setFocus({ kind: 'error', id: s.id, raw: err instanceof Error ? err.message : String(err) });
    }
  };

  const targetName = (s: DockStation | null) => dockTarget(s?.group || '', planets)?.name ?? 'Firmenkern';
  const back = () => setFocus({ kind: 'idle' });

  const renderFocus = () => {
    if (live && sources.isLoading) return <p className="os-station-line" data-testid="dock-loading"><MoraStone size={22} thinking /> MÔRA fragt CORE …</p>;
    if (live && sources.isError) return <FailureState kind={classifyCoreFailure(sources.error)} compact subject="/v3/connections" />;
    if (sample) {
      return (
        <div data-testid="dock-sample">
          <Text variant="eyebrow">Andockstation</Text>
          <ul className="os-station-legend" aria-label="Legende">
            <li data-status="connected"><i aria-hidden />angedockt</li>
            <li data-status="available"><i aria-hidden />bereit</li>
          </ul>
          <p className="os-station-line mt-4"><MoraStone size={22} />{boundary ? 'Demo-Konten docken nichts Echtes an.' : 'Echt wird es mit deiner CORE-Sitzung.'}</p>
        </div>
      );
    }
    const s = current;
    switch (focus.kind) {
      case 'consent':
        return s ? (
          <div data-testid="dock-consent">
            <Text variant="eyebrow">Freigabe</Text>
            <Text variant="title" as="h3" className="mt-1">{s.label}</Text>
            <ul className="os-station-consent">
              <li><ArrowDownToLine size={14} aria-hidden /><span>{CONSENT_IN[s.group] || 'Inhalte dieser Quelle'}</span></li>
              <li><Orbit size={14} aria-hidden /><span>dockt an {targetName(s)}</span></li>
              <li><ShieldCheck size={14} aria-hidden /><span>MÔRA handelt nur nach deiner Bestätigung</span></li>
            </ul>
            <div className="os-station-actions">
              <Button variant="primary" size="sm" onClick={() => approve(s)} disabled={!local} data-testid="dock-approve">{s.entry?.action?.kind === 'oauth' ? 'Freigeben und anmelden' : 'Freigeben'}</Button>
              <Button variant="ghost" size="sm" onClick={back}>Zurück</Button>
            </div>
          </div>
        ) : null;
      case 'form':
      case 'busy':
        return s?.entry ? (
          <div>
            <Text variant="eyebrow">Andocken</Text>
            <Text variant="title" as="h3" className="mt-1 mb-3">{s.label}</Text>
            {s.entry.action?.kind === 'oauth'
              ? <p className="os-station-line"><MoraStone size={22} thinking /> Anmeldung wird geöffnet …</p>
              : <ConnectFields entry={s.entry} busy={focus.kind === 'busy'} onSubmit={(v) => submit(s, v)} />}
          </div>
        ) : null;
      case 'docked': {
        const text = briefing.data && briefing.data.status !== 'degraded' && briefing.data.text ? briefing.data.text : null;
        return (
          <div data-testid="dock-docked">
            <Text variant="eyebrow">Angedockt</Text>
            <p className="os-station-line mt-2"><MoraStone size={22} />{s?.label} speist jetzt {targetName(s)}.</p>
            <div className="os-station-signal" data-testid="dock-first-signal">
              <span className="os-station-signal__label">Erstes Signal</span>
              {briefing.isLoading ? <p>MÔRA liest …</p> : text ? <p>{text.length > 220 ? `${text.slice(0, 217)} …` : text}</p> : <p>Kommt mit dem ersten Abgleich.</p>}
            </div>
            <div className="os-station-actions">
              {navigate ? <Button size="sm" onClick={() => navigate('today')} data-testid="dock-to-today">Zu Heute</Button> : null}
              <Button variant="ghost" size="sm" onClick={back}>Fertig</Button>
            </div>
          </div>
        );
      }
      case 'error':
        return (
          <div data-testid="dock-error">
            <Text variant="eyebrow">{s?.label}</Text>
            <p className="os-station-line mt-2"><MoraStone size={22} />{translateCoreError(focus.raw)}</p>
            <details className="os-station-details"><summary>Details von CORE</summary><p data-testid="dock-error-raw">{focus.raw}</p></details>
            <div className="os-station-actions">
              {s && !/Admin/.test(translateCoreError(focus.raw)) ? <Button size="sm" onClick={() => setFocus({ kind: 'consent', id: s.id })} data-testid="dock-retry">Erneut versuchen</Button> : null}
              <Button variant="ghost" size="sm" onClick={back}>Zurück</Button>
            </div>
          </div>
        );
      case 'admin':
        return (
          <div data-testid="dock-admin">
            <Text variant="eyebrow">{s?.label}</Text>
            <p className="os-station-line mt-2"><MoraStone size={22} />Diese Station richtet ein Admin auf dem Server ein.</p>
            <div className="os-station-actions"><Button variant="ghost" size="sm" onClick={back}>Zurück</Button></div>
          </div>
        );
      case 'info':
        return (
          <div data-testid="dock-info">
            <Text variant="eyebrow">Angedockt</Text>
            <p className="os-station-line mt-2"><MoraStone size={22} />{s?.label} speist {targetName(s)}.</p>
            {s?.entry?.account_hint ? <Text variant="meta" className="mt-2">{s.entry.account_hint}</Text> : null}
            <div className="os-station-actions"><Button variant="ghost" size="sm" onClick={back}>Zurück</Button></div>
          </div>
        );
      default:
        return (
          <div data-testid="dock-idle">
            <Text variant="eyebrow">{connectedCount ? `${connectedCount} angedockt` : 'Andockstation'}</Text>
            <p className="os-station-line mt-2"><MoraStone size={22} />{!local ? 'Andocken ist im Prototyp nur lokal freigeschaltet.' : rec ? STATION_WHY[rec.group] || `${rec.label} ist bereit.` : connectedCount ? 'Alles Wichtige ist angedockt.' : 'Gerade ist keine Station bereit.'}</p>
            {rec ? (
              <div className="os-station-actions">
                <Button variant="primary" size="sm" onClick={() => select(rec)} disabled={!local} data-testid="dock-primary">{rec.label} andocken</Button>
              </div>
            ) : null}
          </div>
        );
    }
  };

  const klar = look === 'klar';
  const orb = orbits(compact);
  return (
    <div className={cx('os-station', compact && 'os-station--compact')} data-testid="sources-panel" data-look={look} data-state={sample ? 'sample' : focus.kind}>
      <div className="os-station__grid">
      <div className="os-station-scene">
        <svg ref={svgRef} viewBox={`0 0 ${SCENE.w} ${SCENE.h}`} role="group" aria-label="Andockstation: Quellen und Abteilungen" className="os-station-svg" style={{ ['--station-k' as string]: k.toFixed(3) } as React.CSSProperties}>
          <defs>
            {planets.map((p, i) => (
              <radialGradient key={p.id} id={`dock-pl-${i}`} cx="35%" cy="30%" r="75%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity={klar ? 0.15 : 0.55} />
                <stop offset="38%" stopColor={p.color} stopOpacity={klar ? 0.55 : 0.9} />
                <stop offset="100%" stopColor="#050a12" stopOpacity={klar ? 0.6 : 0.95} />
              </radialGradient>
            ))}
          </defs>
          {!klar ? STARS.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={i % 5 ? 0.8 : 1.3} className="os-station-star" />) : null}
          {klar ? (
            <g className="os-station-grid" aria-hidden>
              <line x1={SCENE.cx} y1={12} x2={SCENE.cx} y2={SCENE.h - 12} /><line x1={30} y1={SCENE.cy} x2={SCENE.w - 30} y2={SCENE.cy} />
            </g>
          ) : null}
          <ellipse cx={SCENE.cx} cy={SCENE.cy} rx={orb.planet.rx} ry={orb.planet.ry} className="os-station-orbit" />
          <ellipse cx={SCENE.cx} cy={SCENE.cy} rx={orb.outer.rx} ry={orb.outer.ry} className="os-station-orbit os-station-orbit--outer" />
          {planetPts.map((pt, i) => <line key={i} x1={SCENE.cx} y1={SCENE.cy} x2={pt.x} y2={pt.y} className="os-station-thread" />)}
          {placed.filter((p) => p.s.status === 'connected').map((p) => {
            const t = planetPos(p.target) ?? { x: SCENE.cx, y: SCENE.cy };
            return <line key={`l-${p.s.id}`} x1={p.pos.x} y1={p.pos.y} x2={t.x} y2={t.y} className="os-station-link" />;
          })}
          {approach ? (
            <path d={`M ${approach.from.x} ${approach.from.y} Q ${(approach.from.x + SCENE.cx) / 2} ${(approach.from.y + SCENE.cy) / 2} ${approach.to.x} ${approach.to.y}`} className="os-station-approach" data-testid="dock-approach" />
          ) : null}
          {planets.map((p, i) => {
            const pt = planetPts[i];
            const below = pt.y >= SCENE.cy - 4;
            return (
              <g key={p.id} className="os-station-planet" data-testid={`dock-planet-${p.id}`}>
                {!klar ? <circle cx={pt.x} cy={pt.y} r={23} fill={p.color} className="os-station-planet__glow" /> : null}
                <circle cx={pt.x} cy={pt.y} r={16} fill={`url(#dock-pl-${i})`} className="os-station-planet__body" stroke={klar ? p.color : 'rgba(255,255,255,0.22)'} />
                <text x={pt.x} y={below ? pt.y + 33 : pt.y - 24} textAnchor="middle" className="os-station-label os-station-label--planet">{p.name}</text>
              </g>
            );
          })}
          <text x={SCENE.cx + 2} y={SCENE.cy + (compact ? 34 : 40)} textAnchor="middle" className="os-station-core-label">MÔRA</text>
          {placed.map(({ s, pos, side }) => {
            const selected = s.id === focusId && focus.kind !== 'idle';
            const recommended = s.id === rec?.id && focus.kind === 'idle';
            const above = pos.y < SCENE.cy - 30;
            return (
              <g key={s.id} className={cx('os-station-st', selected && 'is-selected', recommended && 'is-recommended', s.sample && 'is-sample')}
                data-status={s.status} data-testid={`dock-station-${s.id}`}
                style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
                role={s.sample ? undefined : 'button'} tabIndex={s.sample ? undefined : 0}
                aria-label={s.sample ? `${s.label} (Beispiel)` : `${s.label}: ${s.status === 'connected' ? 'angedockt' : s.status === 'setup_required' ? 'Admin-Einrichtung' : 'bereit'}`}
                onClick={() => select(s)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(s); } }}>
                <circle r={18} className="os-station-st__hit" />
                {selected || recommended ? <circle r={15} className="os-station-st__halo" /> : null}
                <circle r={10} className="os-station-st__ring" />
                <circle r={5} className="os-station-st__core" />
                {side
                  ? <text x={side * 16} y={4.5} textAnchor={side > 0 ? 'start' : 'end'} className="os-station-label">{s.label}</text>
                  : <text y={above ? -17 : 27} textAnchor="middle" className="os-station-label">{s.label}</text>}
              </g>
            );
          })}
        </svg>
        <span className="os-station-core" aria-hidden><MoraStone size={compact ? 34 : 42} thinking={focus.kind === 'busy'} /></span>
        {sample ? <span className="os-station-sample"><SampleTag /></span> : null}
      </div>
      <aside className="os-station-focus" aria-live="polite" data-testid="dock-focus">{renderFocus()}</aside>
      </div>
      {!compact && !sample && hidden > 0 ? (
        <button type="button" className="os-station-more" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll} data-testid="dock-more">
          {showAll ? 'Weniger Stationen' : `Weitere Stationen · ${hidden}`}
        </button>
      ) : null}
    </div>
  );
}
