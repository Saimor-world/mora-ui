'use client';
import { useUniverseFocus } from '@/lib/lea/universeFocus';
import { downloadCompanyFile } from '@/lib/api/filesClient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Loading, StateView, Text } from '@/components/os-kit';
import { FOCUS_RESERVE, HORIZON_RESERVE, WorldUniverse } from '@/components/world/WorldUniverse';
import { isNight, type SpiritMood } from '@/components/world/MoraSpirit';
import { MoraAsk, type MoraReply, type MoraState } from '@/components/world/MoraAsk';
import { PlanetFocus } from '@/components/world/PlanetFocus';
import type { DayCommand } from '@/lib/lea/moraCommands';
import { useDayStore } from '@/lib/lea/dayStore';
import { personOf } from '@/lib/lea/day';
import { localISO } from '@/lib/lea/world';
import { useReducedMotion } from 'framer-motion';
import { FinderVerse } from '@/components/finderverse/FinderVerse';
import { visiblePlanetIds, RolePreviewBanner, RolePreviewMenu, useRolePreview } from '@/components/os-shell/RolePreview';
import { useHorizonSources } from '@/lib/lea/useHorizonSources';
import { useFinderActions } from '@/lib/lea/useFinderActions';
import { useDayActions } from '@/lib/lea/useDayActions';
import { TaskHomeRow, TaskHomeSheet } from './TaskHome';
import { COLLECT_PLANET, planetCounts, type Star } from '@/lib/lea/finder';
import type { WorldTask } from '@/lib/lea/world';
import { useWorld } from '@/lib/lea/useWorld';
import { useMoraLive } from '../data/useMoraLive';
import { useSessionStore } from '@/lib/store/sessionStore';
import { planetForTarget } from '@/lib/mora/liveRun';
import { useIsPhone } from '@/lib/hooks/useIsPhone';
import { openLegacyApp } from '@/lib/os-prototype/legacyApps';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';

/** Universe mit Sitzung: die Abteilungen des Betriebs aus CORE, nichts aus Vorlagen. */
export function LiveWorld({ onAskMora, onAddDepartment, navigate }: { onAskMora: (text: string) => void; onAddDepartment?: () => void; navigate?: (target: string) => void }) {
  const world = useWorld();
  const phone = useIsPhone();
  const [openId, setOpenId] = useState<string | null>(null);
  const [taskSheet, setTaskSheet] = React.useState(false);
  const [initial, setInitial] = useState<{ moonId?: string | null; starId?: string | null } | null>(null);
  const takeTarget = useUniverseFocus((s) => s.take);
  const pendingTarget = useUniverseFocus((s) => s.target);
  useEffect(() => {
    if (!pendingTarget) return;
    const t = takeTarget();
    if (!t) return;
    // Der alte Aufgaben-Planet ist kein Ort mehr: Aufgaben öffnen das Blatt „Aufgaben zuordnen“.
    if (t.planetId === world.tasksPlanetId) { setTaskSheet(true); return; }
    setInitial({ moonId: t.moonId, starId: t.starId }); setOpenId(t.planetId);
  }, [pendingTarget, takeTarget, world.tasksPlanetId]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const { role } = useRolePreview();
  const companyView = role === 'owner';
  const horizon = useHorizonSources(world.companyId, world.enabled && companyView);
  const finder = useFinderActions(world.companyId);
  const dayActions = useDayActions(world.companyId);
  // Rollen-Vorschau: Abteilung/Mitglied sehen nur eine Abteilung (die aktive, sonst die erste) und die Aufgaben.
  const visibleIds = useMemo(() => visiblePlanetIds(role, world.finder, activeId, world.tasksPlanetId), [role, world.finder, world.tasksPlanetId, activeId]);
  // Nur Orte (echte Abteilungen, nie „Ohne Abteilung“) zählen als Bereiche – dieselbe Menge wie die Planeten im Bild.
  const placeIds = useMemo(() => new Set(world.planets.filter((p) => p.id !== COLLECT_PLANET && !/^ohne[\s-]*abteilung$/i.test(p.name.trim())).map((p) => p.id)), [world.planets]);
  const finderPlanets = useMemo(() => world.finder.filter((p) => p.kind === 'department' && placeIds.has(p.id) && (!visibleIds || visibleIds.has(p.id))), [visibleIds, world.finder, placeIds]);
  const worldPlanets = useMemo(() => world.planets.filter((p) => placeIds.has(p.id) && (!visibleIds || visibleIds.has(p.id))), [visibleIds, world.planets, placeIds]);
  const open = finderPlanets.find((p) => p.id === openId) ?? null;
  const reduced = !!useReducedMotion();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoomTo, setZoomTo] = useState<string | null>(null);
  const [moraState, setMoraState] = useState<MoraState>('idle');
  const [pulseIds, setPulseIds] = useState<string[]>([]);
  // MÔRA lebt nur aus echten Ereignissen: Eingabefokus, laufende Anfrage, Ergebnis, Aktivität, neue Mail, Uhrzeit.
  const [listening, setListening] = useState(false);
  const [outcome, setOutcome] = useState<'done' | 'error' | null>(null);
  const [flyTo, setFlyTo] = useState<string | null>(null);
  const [night, setNight] = useState(() => isNight());
  useEffect(() => { const t = setInterval(() => setNight(isNight()), 60_000); return () => clearInterval(t); }, []);
  const outcomeTimer = useRef<ReturnType<typeof setTimeout>>();
  const flyTimer = useRef<ReturnType<typeof setTimeout>>();
  const onOutcome = useCallback((ok: boolean) => { clearTimeout(outcomeTimer.current); setOutcome(ok ? 'done' : 'error'); outcomeTimer.current = setTimeout(() => setOutcome(null), ok ? 2400 : 6000); }, []);
  const fly = useCallback((id: string) => { clearTimeout(flyTimer.current); setFlyTo(id); flyTimer.current = setTimeout(() => setFlyTo(null), 2200); }, []);
  useEffect(() => () => { clearTimeout(outcomeTimer.current); clearTimeout(flyTimer.current); }, []);
  // Neue Mail (erste Mail-ID wechselt, nicht beim ersten Laden): kurz zum Kometen fliegen.
  const mailId = horizon.mail?.status === 'ok' ? horizon.mail.items[0]?.id ?? null : null;
  const seenMail = useRef<string | null | undefined>(undefined);
  useEffect(() => { if (seenMail.current !== undefined && mailId && mailId !== seenMail.current) fly('mail'); seenMail.current = mailId; }, [mailId, fly]);
  // Live MÔRA: real run steps from CORE (owner SSE). Desktop only; phone is the companion.
  const hasSession = useSessionStore((s) => Boolean(s.user?.tenant_id));
  const live = useMoraLive(!phone && hasSession && companyView);
  const livePlanet = live.active || live.done ? planetForTarget(live.target, worldPlanets) : null;
  const liveCaption = live.active || live.done ? live.label : null;
  const spiritMood: SpiritMood = live.active ? (livePlanet ? 'flying' : 'thinking') : live.done ? 'done' : outcome === 'error' ? 'error' : moraState === 'thinking' ? 'thinking' : moraState === 'speaking' ? 'speaking'
    : flyTo ? 'flying' : outcome === 'done' ? 'done' : listening ? 'listening' : night ? 'night' : 'idle';
  const zoomTimer = useRef<ReturnType<typeof setTimeout>>();
  const selected = !open ? finderPlanets.find((p) => p.id === selectedId) ?? null : null;
  const close = useCallback(() => { setOpenId(null); setInitial(null); setZoomTo(null); }, []);
  /** Kamerafahrt: erst kurz auf den Planeten zoomen, dann den Finder öffnen. */
  const openPlanet = useCallback((id: string) => {
    clearTimeout(zoomTimer.current);
    if (id === world.tasksPlanetId) { setSelectedId(null); setTaskSheet(true); return; }
    setActiveId(id); setSelectedId(id);
    if (reduced) { setOpenId(id); return; }
    setZoomTo(id);
    zoomTimer.current = setTimeout(() => { setOpenId(id); setZoomTo(null); }, 180);
  }, [reduced, world.tasksPlanetId]);
  useEffect(() => () => clearTimeout(zoomTimer.current), []);
  /** Erster Klick wählt (Fokus-Panel), zweiter Klick auf denselben Planeten zoomt hinein. */
  const selectPlanet = useCallback((id: string) => { if (id === world.tasksPlanetId || selectedId === id) openPlanet(id); else setSelectedId(id); }, [selectedId, openPlanet, world.tasksPlanetId]);
  const pulse = useCallback((id: string | null | undefined) => {
    if (!id) return;
    setPulseIds((l) => [...l.filter((x) => x !== id), id]);
    fly(id);
    setTimeout(() => setPulseIds((l) => l.filter((x) => x !== id)), 1800);
  }, [fly]);
  // Ändert sich etwas an Aufgaben oder Terminstatus (auch von „Heute“ aus), pulsiert die Linie dorthin.
  const phases = useDayStore((st) => st.phases);
  const setPhase = useDayStore((st) => st.setPhase);
  const phasePending = useDayStore(st => st.pending);
  const [calendarNotice, setCalendarNotice] = useState<string | null>(null);
  const calendarPlanetId = useMemo(() => world.finder.find((p) => p.moons.some((m) => m.stars.some((x) => x.kind === 'event')))?.id ?? null, [world.finder]);
  const taskSig = world.tasks.map((t) => `${t.id}:${t.status}`).join('|');
  const phaseSig = JSON.stringify(phases);
  const seen = useRef<{ t: string; p: string } | null>(null);
  useEffect(() => {
    if (seen.current) {
      if (seen.current.t !== taskSig) pulse(world.tasksPlanetId);
      if (seen.current.p !== phaseSig) pulse(calendarPlanetId);
    }
    seen.current = { t: taskSig, p: phaseSig };
  }, [taskSig, phaseSig, pulse, world.tasksPlanetId, calendarPlanetId]);
  const focusId = useOsShellStore((s) => s.universeFocus);
  useEffect(() => {
    if (focusId && world.finder.some((p) => p.id === focusId)) { openPlanet(focusId); useOsShellStore.getState().setUniverseFocus(null); }
  }, [focusId, world.finder, openPlanet]);
  // Big-Picture-Tastatur: Pfeile wandern zwischen den Planeten, Enter zoomt, Esc geht zurück.
  const order = useMemo(() => worldPlanets.map((p) => p.id), [worldPlanets]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (open) { if (e.key === 'Escape' && !el?.closest('.fv-list, .fv-orbit')) { /* FinderVerse hat eigenes Esc */ } return; }
      if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key) && order.length) {
        e.preventDefault();
        const i = selectedId ? order.indexOf(selectedId) : -1;
        const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
        const next = order[(i + step + order.length) % order.length] ?? order[0];
        setSelectedId(next);
        (document.querySelector(`[data-testid="world-planet-${next}"]`) as HTMLElement | null)?.focus({ preventScroll: true });
      } else if (e.key === 'Enter' && selectedId && !el?.closest('button')) {
        e.preventDefault(); openPlanet(selectedId);
      } else if (e.key === 'Escape' && selectedId) {
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, order, selectedId, openPlanet]);

  // MÔRAs Tages-Sätze ausführen – über dieselben Aktionen wie „Heute“, immer mit Rückgängig.
  const runCommand = useCallback(async (cmd: DayCommand): Promise<MoraReply> => {
    switch (cmd.kind) {
      case 'jump': openPlanet(cmd.planetId); return { text: cmd.planetId === world.tasksPlanetId ? 'Hier sind deine Aufgaben zum Zuordnen.' : `Ich bringe dich zu ${cmd.name}.`, tone: 'action' };
      case 'done': {
        if (role === 'member') return { text: 'In der Mitglied-Vorschau kann ich nichts ändern.', tone: 'note' };
        const ok = await dayActions.setDone(cmd.task, true);
        return ok ? { text: `Erledigt: ${cmd.task.title}.`, tone: 'action', undo: () => dayActions.setDone(cmd.task, false) } : { text: 'Konnte nicht gespeichert werden. Bitte noch einmal.', tone: 'note' };
      }
      case 'reopen': {
        const ok = await dayActions.setDone(cmd.task, false);
        return ok ? { text: `Wieder offen: ${cmd.task.title}.`, tone: 'action' } : { text: 'Konnte nicht gespeichert werden.', tone: 'note' };
      }
      case 'arrived':
      case 'finish': {
        if (role === 'member') return { text: 'In der Mitglied-Vorschau kann ich nichts ändern.', tone: 'note' };
        const prev = phases[cmd.event.id] ?? 'geplant';
        const result = await setPhase(cmd.event.id, cmd.kind === 'arrived' ? 'laeuft' : 'erledigt');
        if (result.conflict) return { text: 'Inzwischen auf einem anderen Gerät geändert. Der aktuelle Stand ist geladen.', tone: 'note' };
        if (!result.saved) return { text: 'Terminstatus nicht gespeichert. Bitte erneut versuchen.', tone: 'note' };
        return { text: cmd.kind === 'arrived' ? `${personOf(cmd.event.title)} ist da. Termin läuft.` : `Termin mit ${personOf(cmd.event.title)} abgeschlossen.`, tone: 'action', undo: async () => (await setPhase(cmd.event.id, prev, result.version, result.scope)).saved };
      }
      case 'ambiguous': return { text: `Welche ${cmd.what} meinst du: ${cmd.options.slice(0, 3).join(' oder ')}?`, tone: 'note' };
      case 'unknown-target': return { text: `„${cmd.what}“ finde ich in deinen Daten nicht.`, tone: 'note' };
    }
  }, [dayActions, openPlanet, phases, setPhase, role, world.tasksPlanetId]);
  const todayEvents = useMemo(() => world.events.filter((e) => e.date === localISO(new Date(), world.calendar?.window.timezone)).sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '')), [world.events, world.calendar?.window.timezone]);
  const askCtx = useMemo(() => ({ tasks: world.tasks, todayEvents, planets: finderPlanets.map((p) => ({ id: p.id, name: p.name })), running: world.day.running, stale: world.day.stale }), [world.tasks, todayEvents, finderPlanets, world.day.running, world.day.stale]);
  const dayContext = useMemo(() => ({
    company_id: world.companyId,
    surface: 'universe',
    calendar: world.calendar ? { status: world.calendar.status, complete: world.calendar.complete,
      source: world.calendar.source, window: world.calendar.window, last_synced_at: world.calendar.last_synced_at } : { status: 'unavailable', complete: false },
    today: localISO(new Date(), world.calendar?.window.timezone),
    selected_area: selected?.name ?? null,
    day_sentence: world.day.sentence,
    next_event: world.day.next ? { time: world.day.next.time, title: world.day.next.title, date: world.day.next.date } : null,
    running_event: world.day.running?.title ?? null,
    open_tasks: world.day.open.map((o) => ({ title: o.task.title, overdue: o.overdue })),
    task_line: world.day.taskLine,
    areas: finderPlanets.map((p) => p.name),
  }), [selected, world.day, world.companyId, world.calendar, finderPlanets]);

  const counts = useMemo(() => {
    const moons = finderPlanets.reduce((n, p) => n + p.moons.length, 0);
    const stars = finderPlanets.reduce((n, p) => n + p.stars.length + p.moons.reduce((m, x) => m + x.stars.length, 0), 0);
    const planets = finderPlanets.length;
    return { nodes: 1 + planets + moons + stars, edges: planets + moons + stars };
  }, [finderPlanets]);
  const openStar = useCallback((star: Star) => {
    const meta = (star.raw as { metadata?: Record<string, unknown> } | undefined)?.metadata;
    if (meta?.companyFile) void downloadCompanyFile(star.id, star.name).catch(() => undefined);
    else if (star.kind === 'document' || star.kind === 'note' || star.kind === 'file') openLegacyApp('document', { nodeId: star.id });
    else if (star.kind === 'event') { setOpenId(null); navigate?.('post'); }
  }, [navigate]);

  if (world.loading) {
    return (
      <div className="wd-universe grid place-items-center" data-testid="world-loading">
        <div className="flex flex-col items-center gap-4">
          <Text variant="meta">MÔRA liest deine Abteilungen …</Text>
          <div className="w-48"><Loading lines={2} label="Abteilungen werden geladen" /></div>
        </div>
      </div>
    );
  }
  if (world.failed) {
    return <div className="p-6"><StateView kind="offline" title="Abteilungen gerade nicht lesbar" copy="CORE hat die Abteilungen nicht geliefert. Angezeigt wird nichts, was nicht belegt ist." /></div>;
  }
  if (!world.planets.length) {
    return (
      <div className="wd-universe grid place-items-center" data-testid="world-empty">
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <Text tone="default">Noch keine Abteilungen angelegt. Jede Abteilung wird hier ein Planet.</Text>
          {onAddDepartment ? <Button size="sm" onClick={onAddDepartment}>Abteilung hinzufügen</Button> : null}
        </div>
      </div>
    );
  }

  return (
    <>
      <WorldUniverse
        planets={worldPlanets}
        phone={phone}
        moraInScene={false}
        sources={companyView && !phone ? horizon.sources : null}
        onOpenSource={() => openLegacyApp('settings')}
        hidden={Boolean(open)}
        onOpenPlanet={selectPlanet}
        onZoomPlanet={openPlanet}
        selectedId={selectedId}
        pulseIds={pulseIds}
        moraState={moraState}
        spiritMood={spiritMood}
        spiritTarget={livePlanet ?? flyTo}
        spiritCaption={liveCaption}
        zoomTo={zoomTo}
        reserveRight={phone || open ? 0 : selected ? FOCUS_RESERVE : HORIZON_RESERVE}
        activeId={activeId}
        counts={counts}
        comet={horizon.mail?.status === 'ok' && horizon.mail.items[0] ? { id: horizon.mail.items[0].id, label: horizon.mail.items[0].subject } : null}
        onMora={() => useOsShellStore.getState().setMoraOpen(true)}
      />
      {calendarNotice ? <p role="status">{calendarNotice}</p> : null}
      {!open ? <MoraAsk key={`${world.companyId}:${world.sessionGeneration}`} ctx={askCtx} dayContext={dayContext} fallback={world.day.sentence} onCommand={runCommand} onState={setMoraState} onListen={setListening} onOutcome={onOutcome} phone={phone} /> : null}
      {selected ? (
        <PlanetFocus
          planet={selected}
          day={world.day}
          timeZone={world.calendar?.window.timezone}
          phone={phone}
          readOnly={role === 'member' || Object.values(phasePending).some(Boolean)}
          onZoom={() => openPlanet(selected.id)}
          onClose={() => setSelectedId(null)}
          onAsk={onAskMora}
          onTaskDone={(t) => { void dayActions.setDone(t, true); }}
          onArrived={() => { if (world.day.next) void runCommand({ kind: 'arrived', event: world.day.next }).then(r => setCalendarNotice(r.text)); }}
          onFinish={() => { const ev = world.day.running ?? world.day.stale; if (ev) void runCommand({ kind: 'finish', event: ev }).then(r => setCalendarNotice(r.text)); }}
        />
      ) : null}
      {!phone && !open && !selected ? (
        <aside className="wd-horizon" aria-label="Dein Horizont" data-testid="world-horizon">
          <p className="fv-eyebrow">Dein Horizont</p>
          <button type="button" className="wd-horizon__row" onClick={() => navigate?.('post')} data-testid="horizon-calendar">
            <span>Kalender</span>
            <b>{world.calendarUnavailable ? 'Kalenderstand nicht vollständig lesbar' : world.day.running ? `läuft: ${world.day.running.title}` : world.day.next ? `${world.day.next.time ?? ''} ${world.day.next.title}`.trim() : 'heute keine weiteren Termine'}</b>
          </button>
          <button type="button" className="wd-horizon__row" onClick={() => setTaskSheet(true)} data-testid="horizon-tasks">
            <span>Aufgaben</span>
            <b>{world.day.taskLine}</b>
          </button>
          <TaskHomeRow tasks={world.tasks} onOpen={() => setTaskSheet(true)} />
          {companyView ? (
            <>
              <button type="button" className="wd-horizon__row" onClick={() => (horizon.mail?.status === 'unavailable' ? openLegacyApp('settings') : navigate?.('post'))} data-testid="horizon-mail">
                <span>Mail</span>
                <b>{!horizon.mail ? '…' : horizon.mail.status === 'unavailable' ? 'nicht lesbar · Quelle prüfen' : horizon.mail.items[0] ? horizon.mail.items[0].subject : horizon.mail.hidden ? 'nur automatische Benachrichtigungen' : 'Posteingang ruhig'}</b>
              </button>
              {/* Feed-Zeile entfernt (24.10.2026): allgemeine RSS-Einträge waren Rauschen; der Feed bleibt unter Post. */}
            </>
          ) : null}
          <p className="fv-eyebrow" style={{ marginTop: 12 }}>Wo die Arbeit liegt</p>
          <p className="wd-horizon__hint">Einträge in den Ordnern je Abteilung, gleiche Zahl wie am Planeten.</p>
          {finderPlanets.map((p) => {
            const n = planetCounts(p).items;
            const max = Math.max(1, ...finderPlanets.map((q) => planetCounts(q).items));
            return (
              <button key={p.id} type="button" className="wd-horizon__bar" onClick={() => setSelectedId(p.id)} data-testid={`horizon-bar-${p.id}`}>
                <span>{p.name}</span><i style={{ width: `${Math.round((n / max) * 100)}%` }} /><b title={`${n} Einträge in ${p.moons.length} Ordnern`}>{n}</b>
              </button>
            );
          })}
          <p className="wd-horizon__foot">{finderPlanets.length} Abteilungen · {finderPlanets.reduce((n, p) => n + p.moons.length, 0)} Ordner · {finderPlanets.reduce((n, p) => n + planetCounts(p).items, 0)} Einträge</p>
        </aside>
      ) : null}
      {phone && !open && !selected ? <TaskHomeRow variant="chip" tasks={world.tasks} onOpen={() => setTaskSheet(true)} /> : null}
      {taskSheet ? <TaskHomeSheet tasks={world.tasks} planets={finderPlanets} actions={dayActions} readOnly={role === 'member'} phone={phone} onClose={() => setTaskSheet(false)} /> : null}
      {!open && !phone ? <RolePreviewMenu className="absolute z-[900]" /> : null}
      {!open ? <div className="absolute left-1/2 top-4 z-[900] -translate-x-1/2"><RolePreviewBanner /></div> : null}
      {open ? (
        <FinderVerse
          key={open.id}
          planet={open}
          initialMoonId={initial?.moonId}
          initialStarId={initial?.starId}
          phone={phone}
          day={world.day}
          role={role}
          onClose={close}
          onAskMora={(q) => { close(); onAskMora(q); }}
          onOpenStar={openStar}
          onToggleTask={(star) => { void dayActions.setDone(star.raw as WorldTask, !star.done); }}
          onCreateFolder={(name) => finder.createFolder(open, name)}
          onCreateNote={(moonId, title) => finder.createNote(moonId, title)}
          onUpload={(moonId, file) => finder.upload(moonId, file)}
        />
      ) : null}
    </>
  );
}


/** Im Universum nur MÔRAs erster Satz, höchstens ~56 Zeichen – der Rest steht in „Heute“. */
export function shortLine(s: string): string {
  // Erster Satz ohne Lookbehind (iOS < 16.4 bricht sonst beim Laden ab): bis zum ersten Satzzeichen vor Leerraum oder Ende.
  const text = (s || '').trim();
  const end = text.search(/[.!?](\s|$)/);
  const first = end < 0 ? text : text.slice(0, end + 1);
  return first.length <= 56 ? first : `${first.slice(0, 54).replace(/[\s,·:]+\S*$/, '')} …`;
}
