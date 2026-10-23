'use client';
import React from 'react';
import { ArrowUpRight, Check, MessageCircle, UserCheck, X } from 'lucide-react';
import { liveHints } from '@/components/finderverse/FinderVerse';
import { planetCounts, type FPlanet } from '@/lib/lea/finder';
import { personOf } from '@/lib/lea/day';
import type { LiveDay } from '@/lib/lea/live';
import { localISO, type WorldTask } from '@/lib/lea/world';

/**
 * Fokus im Universe, sobald ein Planet gewählt ist (Klick, Pfeiltasten oder @Bereich):
 * echte Zahlen, die eine Aktion, die jetzt passt, und MÔRAs Live-Hinweise. Enter/„Hineinzoomen“ öffnet.
 */
export function PlanetFocus({ planet, day, phone, readOnly, onZoom, onClose, onAsk, onTaskDone, onArrived, onFinish }: {
  onFinish?: () => void;
  planet: FPlanet;
  day: LiveDay;
  phone: boolean;
  readOnly: boolean;
  onZoom: () => void;
  onClose: () => void;
  onAsk: (q: string) => void;
  onTaskDone: (t: WorldTask) => void;
  onArrived: () => void;
}) {
  const c = planetCounts(planet);
  const tiles: Array<[string, number, string]> = planet.kind === 'tasks'
    ? [['Offen', c.open, c.open === 1 ? 'Aufgabe' : 'Aufgaben'], ['Überfällig', c.overdue, c.overdue ? 'braucht dich' : 'nichts drängt']]
    : [['Ordner', c.folders, c.folders === 1 ? 'kreist als Mond' : 'kreisen als Monde'], [c.events ? 'Termine' : 'Einträge', c.events || c.items, c.events ? 'im Kalender' : 'in den Ordnern']];
  const hasEvents = c.events > 0;
  const firstOpen = planet.kind === 'tasks' ? day.open[0]?.task ?? null : null;
  const arrivable = hasEvents && !day.running && day.next && day.next.date === localISO() ? day.next : null;
  return (
    <aside className="fv-focus wd-focus" data-phone={phone ? 'true' : 'false'} aria-label={`Fokus: ${planet.name}`} data-testid="world-focus">
      <div className="wd-focus__head">
        <p className="fv-eyebrow">Fokus</p>
        <button type="button" className="wd-focus__close" onClick={onClose} aria-label="Fokus schließen" data-testid="world-focus-close"><X size={18} /></button>
      </div>
      <h2 className="fv-focus__title">{planet.name}</h2>
      <div className="fv-tiles">
        {tiles.map(([label, n, sub]) => (
          <div key={label} className="fv-tile" data-testid={`world-focus-tile-${label.toLowerCase()}`}><span className="fv-eyebrow" style={{ margin: 0 }}>{label}</span><strong>{n}</strong><span>{sub}</span></div>
        ))}
      </div>
      <div className="fv-actions">
        <button type="button" className="fv-action wd-focus__primary" onClick={onZoom} data-testid="world-focus-zoom">
          <ArrowUpRight size={18} aria-hidden /><span><b>Hineinzoomen</b><small>{c.folders ? 'Monde und Einträge ansehen' : planet.kind === 'tasks' ? 'alle Aufgaben' : 'Bereich öffnen'}</small></span>
          {!phone ? <kbd>↵</kbd> : null}
        </button>
        {!readOnly && firstOpen ? (
          <button type="button" className="fv-action" onClick={() => onTaskDone(firstOpen)} data-testid="world-focus-done">
            <Check size={18} aria-hidden /><span><b>Abhaken: {firstOpen.title}</b><small>{day.open[0]?.meta}</small></span>
          </button>
        ) : null}
        {!readOnly && arrivable ? (
          <button type="button" className="fv-action" onClick={onArrived} data-testid="world-focus-arrived">
            <UserCheck size={18} aria-hidden /><span><b>{personOf(arrivable.title)} ist da</b><small>Termin {arrivable.time ?? ''} beginnt</small></span>
          </button>
        ) : null}
        {!readOnly && hasEvents && (day.running ?? day.stale) && onFinish ? (
          <button type="button" className="fv-action" onClick={onFinish} data-testid="world-focus-finish">
            <Check size={18} aria-hidden /><span><b>Termin mit {personOf((day.running ?? day.stale)!.title)} abschließen</b><small>{day.running ? 'läuft gerade' : 'noch offen'}</small></span>
          </button>
        ) : null}
        <button type="button" className="fv-action" onClick={() => onAsk(`Was ist in ${planet.name} gerade wichtig?`)} data-testid="world-focus-ask">
          <MessageCircle size={18} aria-hidden /><span><b>MÔRA fragen</b><small>Was ist hier gerade wichtig?</small></span>
        </button>
      </div>
      <p className="fv-eyebrow">Live-Hinweise</p>
      <ul className="fv-hints" data-testid="world-focus-hints">{liveHints(planet, day).map((h) => <li key={h}>{h}</li>)}</ul>
    </aside>
  );
}
