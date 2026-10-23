'use client';
import { downloadCompanyFile } from '@/lib/api/filesClient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Mic, Send } from 'lucide-react';
import { Button, Loading, MoraStone, StateView, Text } from '@/components/os-kit';
import { WorldUniverse } from '@/components/world/WorldUniverse';
import { FinderVerse } from '@/components/finderverse/FinderVerse';
import { visiblePlanetIds, RolePreviewBanner, RolePreviewToggle, useRolePreview } from '@/components/os-shell/RolePreview';
import { useHorizonSources } from '@/lib/lea/useHorizonSources';
import { useFinderActions } from '@/lib/lea/useFinderActions';
import { useDayActions } from '@/lib/lea/useDayActions';
import type { Star } from '@/lib/lea/finder';
import type { WorldTask } from '@/lib/lea/world';
import { useWorld } from '@/lib/lea/useWorld';
import { useIsPhone } from '@/lib/hooks/useIsPhone';
import { openLegacyApp } from '@/lib/os-prototype/legacyApps';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';

/** Universe mit Sitzung: die Abteilungen des Betriebs aus CORE, nichts aus Vorlagen. */
export function LiveWorld({ onAskMora, onAddDepartment, navigate }: { onAskMora: (text: string) => void; onAddDepartment?: () => void; navigate?: (target: string) => void }) {
  const world = useWorld();
  const phone = useIsPhone();
  const [openId, setOpenId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const { role } = useRolePreview();
  const companyView = role === 'owner';
  const horizon = useHorizonSources(world.companyId, world.enabled && companyView);
  const finder = useFinderActions(world.companyId);
  const dayActions = useDayActions(world.companyId);
  // Rollen-Vorschau: Abteilung/Mitglied sehen nur eine Abteilung (die aktive, sonst die erste) und die Aufgaben.
  const visibleIds = useMemo(() => visiblePlanetIds(role, world.finder, activeId, world.tasksPlanetId), [role, world.finder, world.tasksPlanetId, activeId]);
  const finderPlanets = useMemo(() => (visibleIds ? world.finder.filter((p) => visibleIds.has(p.id)) : world.finder), [visibleIds, world.finder]);
  const worldPlanets = useMemo(() => (visibleIds ? world.planets.filter((p) => visibleIds.has(p.id)) : world.planets), [visibleIds, world.planets]);
  const open = finderPlanets.find((p) => p.id === openId) ?? null;
  const close = useCallback(() => setOpenId(null), []);
  const openPlanet = useCallback((id: string) => { setOpenId(id); setActiveId(id); }, []);
  const focusId = useOsShellStore((s) => s.universeFocus);
  useEffect(() => {
    if (focusId && world.finder.some((p) => p.id === focusId)) { openPlanet(focusId); useOsShellStore.getState().setUniverseFocus(null); }
  }, [focusId, world.finder, openPlanet]);
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
          <MoraStone size={phone ? 88 : 120} thinking />
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
          <MoraStone size={phone ? 88 : 120} halo />
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
        sources={companyView && !phone ? horizon.sources : null}
        onOpenSource={() => openLegacyApp('settings')}
        hidden={Boolean(open)}
        onOpenPlanet={openPlanet}
        activeId={activeId}
        counts={counts}
        onMora={() => useOsShellStore.getState().setMoraOpen(true)}
        moraLine={world.day.sentence}
      />
      {!phone && !open ? <AskBar planets={finderPlanets.map((p) => ({ id: p.id, name: p.name }))} onAsk={onAskMora} onOpenPlanet={openPlanet} /> : null}
      {!phone && !open ? (
        <aside className="wd-horizon" aria-label="Dein Horizont" data-testid="world-horizon">
          <p className="fv-eyebrow">Dein Horizont</p>
          <button type="button" className="wd-horizon__row" onClick={() => navigate?.('post')} data-testid="horizon-calendar">
            <span>Kalender</span>
            <b>{world.day.running ? `läuft: ${world.day.running.title}` : world.day.next ? `${world.day.next.time ?? ''} ${world.day.next.title}`.trim() : 'heute keine weiteren Termine'}</b>
          </button>
          <button type="button" className="wd-horizon__row" onClick={() => { const t = world.finder.find((p) => p.id === world.tasksPlanetId); if (t) openPlanet(t.id); }} data-testid="horizon-tasks">
            <span>Aufgaben</span>
            <b>{world.day.open.length ? `${world.day.open.length} offen${world.day.open.some((t) => t.overdue) ? ` · ${world.day.open.filter((t) => t.overdue).length} überfällig` : ''}` : 'alles erledigt'}</b>
          </button>
          {companyView ? (
            <>
              <button type="button" className="wd-horizon__row" onClick={() => (horizon.mail?.status === 'unavailable' ? openLegacyApp('settings') : navigate?.('post'))} data-testid="horizon-mail">
                <span>Mail</span>
                <b>{!horizon.mail ? '…' : horizon.mail.status === 'unavailable' ? 'nicht lesbar · Quelle prüfen' : horizon.mail.items[0] ? horizon.mail.items[0].subject : 'Posteingang ruhig'}</b>
              </button>
              <button type="button" className="wd-horizon__row" onClick={() => navigate?.('post')} data-testid="horizon-feed">
                <span>Feed</span>
                <b>{!horizon.feed ? '…' : horizon.feed.status === 'unavailable' ? 'nicht lesbar' : horizon.feed.items[0] ? horizon.feed.items[0].title : 'keine neuen Feed-Signale'}</b>
              </button>
            </>
          ) : null}
          <p className="fv-eyebrow" style={{ marginTop: 12 }}>Wo die Arbeit liegt</p>
          {finderPlanets.map((p) => {
            const n = p.stars.length + p.moons.reduce((m, x) => m + x.stars.length, 0);
            const max = Math.max(1, ...finderPlanets.map((q) => q.stars.length + q.moons.reduce((m, x) => m + x.stars.length, 0)));
            return (
              <button key={p.id} type="button" className="wd-horizon__bar" onClick={() => openPlanet(p.id)} data-testid={`horizon-bar-${p.id}`}>
                <span>{p.name}</span><i style={{ width: `${Math.round((n / max) * 100)}%` }} /><b>{n}</b>
              </button>
            );
          })}
          <p className="wd-horizon__foot">{finderPlanets.length} Bereiche · {counts.nodes - 1 - finderPlanets.length} Ordner und Einträge</p>
        </aside>
      ) : null}
      {!open && !phone ? <RolePreviewToggle className="absolute right-5 top-4 z-[900]" /> : null}
      {!open ? <div className="absolute left-1/2 top-4 z-[900] -translate-x-1/2"><RolePreviewBanner /></div> : null}
      {open ? (
        <FinderVerse
          key={open.id}
          planet={open}
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

type SpeechCtor = new () => { lang: string; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; start: () => void; stop: () => void };

/** Frag-Leiste unten im Universe: Text geht an MÔRA, „@“ schlägt Planeten vor, Mikro nur wenn der Browser Sprache kann. */
function AskBar({ planets, onAsk, onOpenPlanet }: { planets: { id: string; name: string }[]; onAsk: (t: string) => void; onOpenPlanet: (id: string) => void }) {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const Speech: SpeechCtor | null = typeof window === 'undefined' ? null
    : ((window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor }).SpeechRecognition
      ?? (window as unknown as { webkitSpeechRecognition?: SpeechCtor }).webkitSpeechRecognition ?? null);
  const at = /@([^\s@]*)$/.exec(text);
  const matches = at ? planets.filter((p) => p.name.toLowerCase().includes(at[1].toLowerCase())).slice(0, 5) : [];
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setText('');
    onAsk(t);
  };
  const listen = () => {
    if (!Speech) return;
    const rec = new Speech();
    rec.lang = 'de-DE';
    rec.onresult = (e) => setText((prev) => `${prev} ${e.results[0][0].transcript}`.trim());
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  };
  return (
    <div className="wd-ask" data-testid="world-ask">
      {matches.length ? (
        <ul className="wd-ask__list" role="listbox" aria-label="Planeten">
          {matches.map((p) => (
            <li key={p.id}><button type="button" role="option" aria-selected={false} onClick={() => { setText(''); onOpenPlanet(p.id); }}>@{p.name}</button></li>
          ))}
        </ul>
      ) : null}
      <form onSubmit={submit}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Frag MÔRA oder tippe @ für einen Bereich" aria-label="Frag MÔRA" data-testid="world-ask-input" />
        {Speech ? <button type="button" onClick={listen} aria-pressed={listening} aria-label="Sprechen" data-testid="world-ask-mic"><Mic size={18} /></button> : null}
        <button type="submit" aria-label="Senden" data-testid="world-ask-send"><Send size={18} /></button>
      </form>
    </div>
  );
}
