'use client';
/* Aufgaben brauchen ein Zuhause (Marius, 24.10.2026). Bereich = Ordner (folder_id) einer Abteilung.
 * Eine ruhige Zeile „Noch nicht zugeordnet · N“ öffnet ein Blatt: jede Aufgabe mit eigener Bereichswahl (sofort
 * zugeordnet) und oben EIN Eingabefeld für neue Aufgaben mit eingebauter Bereichswahl. */
import * as React from 'react';
import { createPortal } from 'react-dom';
import { shortDate, type WorldTask } from '@/lib/lea/world';
import type { useDayActions } from '@/lib/lea/useDayActions';
import { stripFiktiv } from '@/lib/demo/morgenrot/stripFiktiv';

export type TaskHomePlanet = { id: string; name: string; moons: { id: string; name: string }[] };
type Actions = ReturnType<typeof useDayActions>;

function PlacePicker({ planets, value, onChange, label, testid }: { planets: TaskHomePlanet[]; value: string; onChange: (v: string) => void; label: string; testid?: string }) {
  return (
    <select className="th-place" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} data-testid={testid}>
      <option value="">Bereich wählen</option>
      {planets.filter((p) => p.moons.length).map((p) => {
        const pName = stripFiktiv(p.name) || p.name;
        return (
          <optgroup key={p.id} label={pName}>
            {p.moons.map((m) => {
              const mName = stripFiktiv(m.name) || m.name;
              return <option key={m.id} value={m.id}>{pName} › {mName}</option>;
            })}
          </optgroup>
        );
      })}
    </select>
  );
}

export function looseTasks(tasks: WorldTask[]) { return tasks.filter((t) => !t.folder_id && t.status !== 'done'); }

export function TaskHomeRow({ tasks, onOpen, variant = 'row' }: { tasks: WorldTask[]; onOpen: () => void; variant?: 'row' | 'chip' }) {
  const n = looseTasks(tasks).length;
  if (variant === 'chip') return <button type="button" className="th-chip" onClick={onOpen} data-testid="taskhome-chip">{n ? <>Noch nicht zugeordnet · {n}</> : '+ Aufgabe'}</button>;
  return (
    <button type="button" className="wd-horizon__row" onClick={onOpen} data-testid="horizon-unassigned">
      <span>{n ? `Noch nicht zugeordnet · ${n}` : 'Alles zugeordnet'}</span>
    </button>
  );
}

export function TaskHomeSheet({ tasks, planets, actions, readOnly, onClose, phone }: { tasks: WorldTask[]; planets: TaskHomePlanet[]; actions: Actions; readOnly: boolean; onClose: () => void; phone: boolean }) {
  const loose = looseTasks(tasks);
  const [title, setTitle] = React.useState('');
  const [place, setPlace] = React.useState('');
  const [note, setNote] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  React.useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  const nameOf = (fid: string) => {
    for (const p of planets) {
      for (const m of p.moons) {
        if (m.id === fid) return `${stripFiktiv(p.name) || p.name} › ${stripFiktiv(m.name) || m.name}`;
      }
    }
    return 'Bereich';
  };
  if (typeof document === 'undefined') return null;
  // Portal: das Blatt liegt über Dock und Kopfzeile, nicht im Stapel des Universums.
  return createPortal(
    <div className="th-scrim" data-phone={phone ? 'true' : 'false'} onClick={onClose}>
      <section className="th-sheet" role="dialog" aria-modal="true" aria-label="Aufgaben zuordnen" onClick={(e) => e.stopPropagation()} data-testid="taskhome-sheet">
        <header className="th-head">
          <h2>Aufgaben zuordnen</h2>
          <button type="button" className="th-close" onClick={onClose} aria-label="Schließen">×</button>
        </header>
        {!readOnly ? (
          <form className="th-new" onSubmit={async (e) => { e.preventDefault(); const t = title.trim(); if (!t) return; setBusy('new'); const ok = await actions.addTask(t, place || null); setBusy(null); setNote(ok ? (place ? `Angelegt in ${nameOf(place)}` : 'Angelegt, noch nicht zugeordnet') : 'Anlegen hat nicht geklappt'); if (ok) setTitle(''); }}>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Neue Aufgabe" aria-label="Neue Aufgabe" data-testid="taskhome-title" />
            <PlacePicker planets={planets} value={place} onChange={setPlace} label="Bereich der neuen Aufgabe" testid="taskhome-place" />
            <button type="submit" className="th-add" disabled={!title.trim() || busy === 'new'} aria-label="Aufgabe anlegen" data-testid="taskhome-add">↵</button>
          </form>
        ) : null}
        {note ? <p className="th-note" role="status">{note}</p> : null}
        <ul className="th-list">
          {loose.length ? loose.map((t) => {
            const cleanTitle = stripFiktiv(t.title) || t.title;
            return (
              <li key={t.id} className="th-item">
                <span className="th-title">{cleanTitle}{t.due_date ? <small> · {shortDate(t.due_date.slice(0, 10))}</small> : null}</span>
                {!readOnly ? (
                  <PlacePicker planets={planets} value="" label={`Bereich für ${cleanTitle}`} testid={`taskhome-assign-${t.id}`}
                    onChange={async (fid) => { if (!fid) return; setBusy(t.id); const ok = await actions.assignFolder(t, fid); setBusy(null); setNote(ok ? `„${cleanTitle}“ liegt jetzt in ${nameOf(fid)}` : 'Zuordnen hat nicht geklappt – CORE nimmt den Bereich noch nicht an.'); }} />
                ) : null}
              </li>
            );
          }) : <li className="th-empty">Alle Aufgaben sind zugeordnet.</li>}
        </ul>
      </section>
    </div>,
    document.body,
  );
}
