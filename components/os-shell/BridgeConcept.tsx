'use client';
import React, { useMemo } from 'react';
import { useScopedToday } from '@/lib/os/useScopedToday';
import { openLegacyApp } from '@/lib/os-prototype/legacyApps';
import type { TodaySnapshot } from '@/lib/api/todayClient';
import './bridge-concept.css';

type Light = { id: string; label: string; date: string; kind: 'Termin' | 'Aufgabe'; target: 'calendar' | 'today' };

/** Only timestamps and titles actually supplied by the active company scope. */
export function bridgeLights(snapshot: TodaySnapshot | null): Light[] {
  if (!snapshot) return [];
  const lights: Light[] = [];
  if (snapshot.calendar.status === 'ok' && snapshot.calendar.complete) {
    for (const event of snapshot.calendar.events) if (event.id && event.title && event.date)
      lights.push({ id: event.id, label: event.title, date: `${event.date}${event.time ? ` ${event.time}` : ''}`, kind: 'Termin', target: 'calendar' });
  }
  if (snapshot.tasks.status === 'ok' && snapshot.tasks.complete) {
    for (const task of snapshot.tasks.items) if (task.id && task.title && task.due_date && task.status !== 'done')
      lights.push({ id: task.id, label: task.title, date: task.due_date, kind: 'Aufgabe', target: 'today' });
  }
  return lights.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 12);
}

export function BridgeConcept({ onNavigate }: { onNavigate: (target: string) => void }) {
  const { snapshot, loading, loadError } = useScopedToday({ backgroundRefresh: true });
  const lights = useMemo(() => bridgeLights(snapshot), [snapshot]);
  const sourcesIncomplete = snapshot && [snapshot.calendar, snapshot.tasks].some(
    source => !source.complete || !['ok', 'empty'].includes(source.status),
  );
  return (
    <section className="bridge-concept" aria-label="Was jetzt zählt">
      <div className="bridge-concept__arc" aria-hidden="true" />
      <div className="bridge-concept__heading"><span>DEIN RAUM</span><span>WAS JETZT ZÄHLT</span><span>SAIMÔR OS</span></div>
      <div className="bridge-concept__lights">
        {loading ? <span className="bridge-concept__state">Quellen werden geladen …</span> : loadError || !snapshot ? <span className="bridge-concept__state">Informationen gerade nicht verfügbar</span> : !lights.length ? <span className="bridge-concept__state">{sourcesIncomplete ? 'Einige Quellen sind nicht verfügbar' : 'Keine datierten Einträge verfügbar'}</span> : lights.map((light) => (
          <button key={`${light.kind}:${light.id}`} type="button" className="bridge-concept__light" onClick={() => {
            if (light.target === 'calendar') openLegacyApp('calendar');
            else onNavigate(light.target);
          }} title={`${light.kind}: ${light.label} · ${light.date}`}>
            <span className="bridge-concept__dot" aria-hidden="true" /><small>{light.kind} · {light.date.slice(0, 16)}</small><b>{light.label}</b>
          </button>
        ))}
        {!loading && !loadError && lights.length > 0 && sourcesIncomplete ? <span className="bridge-concept__state">Einige Quellen sind nicht verfügbar</span> : null}
      </div>
    </section>
  );
}
