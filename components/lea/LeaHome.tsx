'use client';
import React from 'react';
import { MoraStone } from '@/components/mora/MoraStone';
import { localISO, plural, shortDate, upcomingEvents, type WorldEvent, type WorldPlanet, type WorldTask } from '@/lib/lea/world';

/*
 * Home nach D4 (Desktop) / V4 (Telefon), nur aus echten Daten:
 * Begrüßung mit dem einen Satz, der zählt · Dein Tag (Zeitleiste) · Als Nächstes ·
 * Nur heute (fällige Aufgaben) · Mini-Universe · Diese Woche.
 */

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

function greeting(now: Date) {
  const h = now.getHours();
  return h < 11 ? 'Guten Morgen' : h < 17 ? 'Guten Tag' : 'Guten Abend';
}

function minutesUntil(e: WorldEvent, now: Date) {
  const [h, m] = (e.time ?? '00:00').split(':').map(Number);
  const [y, mo, d] = e.date.split('-').map(Number);
  return Math.round((new Date(y, mo - 1, d, h, m).getTime() - now.getTime()) / 60000);
}

function inLabel(min: number) {
  if (min < 60) return `in ${Math.max(min, 1)} Min`;
  if (min < 24 * 60) return `in ${Math.round(min / 60)} Std`;
  return `in ${Math.round(min / (24 * 60))} ${Math.round(min / (24 * 60)) === 1 ? 'Tag' : 'Tagen'}`;
}

function split(title: string) {
  const [what, who] = title.split(' – ');
  return who ? { who, what } : { who: title, what: '' };
}

export function LeaHome({ firstName, events, tasks, planets, onOpenUniverse, onOpenCalendar, onAsk, now = new Date() }: {
  firstName?: string | null;
  events: WorldEvent[];
  tasks: WorldTask[];
  planets: WorldPlanet[];
  onOpenUniverse: () => void;
  onOpenCalendar: () => void;
  onAsk: (text: string) => void;
  now?: Date;
}) {
  const today = localISO(now);
  const todays = events.filter((e) => e.date === today).sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
  const next = upcomingEvents(events, now)[0] ?? null;
  const open = tasks.filter((t) => t.status !== 'done');
  const due = open.filter((t) => t.due_date && t.due_date <= today);
  const soon = open.filter((t) => !due.includes(t)).slice(0, Math.max(0, 3 - due.length));
  const doneToday = todays.filter((e) => minutesUntil(e, now) + (e.duration ?? 60) <= 0).length;

  const headline = next
    ? next.date === today
      ? `Um ${next.time} kommt ${split(next.title).who}.`
      : todays.length
        ? `Heute ist geschafft.`
        : `Heute ist frei.`
    : todays.length ? 'Heute ist geschafft.' : 'Heute ist ruhig.';
  const sub = [
    todays.length ? `${plural(todays.length, 'Termin', 'Termine')} heute${doneToday === todays.length ? ', alle erledigt' : ''}.` : 'Heute keine Termine.',
    next && next.date !== today ? `Nächster Termin ${shortDate(next.date)} um ${next.time}.` : null,
    due.length ? `${plural(due.length, 'Aufgabe ist', 'Aufgaben sind')} heute dran.` : null,
  ].filter(Boolean).join(' ');

  // Diese Woche: Termine je Tag (Mo–Sa der laufenden Woche)
  const monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const week = Array.from({ length: 6 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); const iso = localISO(d); return { iso, label: WEEKDAYS[d.getDay()], n: events.filter((e) => e.date === iso).length }; });
  const weekMax = Math.max(1, ...week.map((w) => w.n));

  // Zeitleiste
  const hours = todays.map((e) => Number((e.time ?? '9').split(':')[0]));
  const from = Math.min(9, ...hours);
  const to = Math.max(18, ...hours.map((h) => h + 1));
  const span = (to - from) * 60;

  return (
    <div className="lea-home" data-testid="lea-home">
      <section className="lea-home__main">
        <header className="lea-home__hello">
          <p className="lea-eyebrow">{now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="lea-title lea-title--xl">{greeting(now)}{firstName ? `, ${firstName}` : ''}. {headline}</h1>
          <p className="lea-lead">{sub}</p>
          <div className="lea-row">
            <button type="button" className="lea-btn lea-btn--jade" onClick={onOpenCalendar}>Kalender öffnen</button>
            <button type="button" className="lea-btn lea-btn--quiet" onClick={() => onAsk('Was steht als Nächstes an?')}>MÔRA fragen</button>
          </div>
        </header>

        <section aria-label="Dein Tag">
          <p className="lea-eyebrow">Dein Tag · {plural(todays.length, 'Termin', 'Termine')}</p>
          {todays.length ? (
            <div className="lea-day">
              <div className="lea-day__track">
                {todays.map((e) => {
                  const [h, m] = (e.time ?? '09:00').split(':').map(Number);
                  const left = (((h - from) * 60 + m) / span) * 100;
                  const width = Math.max(((e.duration ?? 60) / span) * 100, 9);
                  const past = minutesUntil(e, now) + (e.duration ?? 60) <= 0;
                  const s = split(e.title);
                  return (
                    <div key={e.id} className="lea-slot" data-past={past || undefined} data-next={next?.id === e.id || undefined} style={{ left: `${left}%`, width: `${width}%` }}>
                      <span className="lea-slot__t">{e.time}</span>
                      <span className="lea-slot__n">{s.who}</span>
                    </div>
                  );
                })}
              </div>
              <div className="lea-day__scale" aria-hidden>
                {Array.from({ length: to - from + 1 }, (_, i) => <span key={i} style={{ left: `${(i * 60 / span) * 100}%` }}>{from + i}</span>)}
              </div>
            </div>
          ) : <p className="lea-card lea-meta">Heute ist nichts im Kalender.</p>}
        </section>

        <div className="lea-home__pair">
          <section className="lea-card lea-next" aria-label="Als Nächstes">
            {next ? (
              <>
                <p className="lea-eyebrow">Als Nächstes · {next.date === today ? inLabel(minutesUntil(next, now)) : shortDate(next.date)}</p>
                <p className="lea-next__time">{next.time}</p>
                <p className="lea-next__who">{split(next.title).who}{split(next.title).what ? ` · ${split(next.title).what}` : ''}</p>
                <p className="lea-meta">{next.duration ?? 60} Min{next.date !== today ? ` · ${new Date(next.date).toLocaleDateString('de-DE', { weekday: 'long' })}` : ''}</p>
                <div className="lea-row">
                  <button type="button" className="lea-btn lea-btn--quiet" onClick={() => onAsk(`Erinnere ${split(next.title).who} an den Termin am ${shortDate(next.date)} um ${next.time}.`)}>Kurz erinnern</button>
                  <button type="button" className="lea-btn lea-btn--quiet" onClick={onOpenCalendar}>Im Kalender</button>
                </div>
              </>
            ) : (
              <>
                <p className="lea-eyebrow">Als Nächstes</p>
                <p className="lea-next__who">Kein Termin eingetragen.</p>
              </>
            )}
          </section>

          <section aria-label="Nur heute">
            <p className="lea-eyebrow">{due.length ? 'Nur heute' : 'Als Nächstes zu tun'}</p>
            {[...due, ...soon].length ? (
              <ul className="lea-todo">
                {[...due, ...soon].map((t) => (
                  <li key={t.id} className="lea-card lea-todo__row">
                    <span className="min-w-0">
                      <span className="lea-todo__t">{t.title}</span>
                      <span className="lea-todo__m">{t.due_date ? (t.due_date < today ? `überfällig seit ${shortDate(t.due_date)}` : t.due_date === today ? 'heute fällig' : `fällig ${shortDate(t.due_date)}`) : 'ohne Datum'}</span>
                    </span>
                    <button type="button" className="lea-btn lea-btn--quiet" onClick={() => onAsk(`Hilf mir bei: ${t.title}`)}>Angehen</button>
                  </li>
                ))}
              </ul>
            ) : <p className="lea-card lea-meta">Nichts offen. Schön.</p>}
          </section>
        </div>
      </section>

      <aside className="lea-home__side">
        <button type="button" className="lea-card lea-mini-uni" onClick={onOpenUniverse} aria-label="Universe öffnen">
          <span className="lea-mini-uni__head"><span className="lea-eyebrow">Dein Universe</span><span className="lea-meta">öffnen ›</span></span>
          <span className="lea-mini-uni__field" aria-hidden>
            <span className="lea-mini-uni__orbit lea-mini-uni__orbit--a" />
            <span className="lea-mini-uni__orbit lea-mini-uni__orbit--b" />
            <span className="lea-mini-uni__mora"><MoraStone size={40} still /></span>
            {planets.slice(0, 5).map((p, i, all) => {
              const a = ((200 + (360 / all.length) * i) * Math.PI) / 180;
              const r = i % 2 ? 42 : 30;
              return <span key={p.id} className="lea-mini-uni__p" style={{ left: `${50 + r * Math.cos(a)}%`, top: `${50 + r * 0.62 * Math.sin(a) * 1.4}%`, background: p.tone.background }} />;
            })}
          </span>
          <span className="lea-meta">{planets.length ? planets.map((p) => p.name).join(' · ') : 'Noch leer'}</span>
        </button>

        <section className="lea-card" aria-label="Diese Woche">
          <p className="lea-eyebrow">Diese Woche · Termine</p>
          <ul className="lea-week">
            {week.map((w) => (
              <li key={w.iso} data-today={w.iso === today || undefined}>
                <span className="lea-week__d">{w.label}</span>
                <span className="lea-week__bar"><span style={{ width: `${(w.n / weekMax) * 100}%` }} /></span>
                <span className="lea-week__n">{w.n}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="lea-card lea-mora-note">
          <MoraStone size={32} still />
          <p>{due.length ? `${plural(due.length, 'Aufgabe', 'Aufgaben')} für heute. Sag Bescheid, wenn ich helfen soll.` : 'Alles ruhig. Ich melde mich, wenn etwas abweicht.'}</p>
        </section>
      </aside>
    </div>
  );
}
