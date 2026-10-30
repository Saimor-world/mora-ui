'use client';
import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { MORGENROT_EVENTS, MORGENROT_STRUCTURE, orderTotal, type DemoMoon, type DemoPlanet } from '@/lib/demo/morgenrot/structure';
import type { DemoAction, DemoDay } from '../data/demoDay';
import type { IncidentStatusPanel as IncidentStatusPanelData } from '@/lib/panel/types';
import { IncidentStatusPanel } from '@/components/home/IncidentStatusPanel';

const reviewFiles = MORGENROT_STRUCTURE.flatMap((p) => p.moons).flatMap((m) => m.files).filter((f) => MORGENROT_EVENTS.reviews.fileIds.includes(f.id));
export type SheetKind = 'reviews' | 'order' | 'swap' | 'oat' | 'close';

function Shell({ title, sub, onClose, children }: { title: string; sub?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="ck-sheet" role="dialog" aria-label={title} data-testid="ck-sheet">
      <div className="ck-sheet__head"><div><h2>{title}</h2>{sub ? <p>{sub}</p> : null}</div><button type="button" className="ck-icon" onClick={onClose} aria-label="Schließen"><X size={18} /></button></div>
      <div className="ck-sheet__body">{children}</div>
    </div>
  );
}

export function ActionSheet({ kind, day, owner, dispatch, onClose }: { kind: SheetKind; day: DemoDay; owner: boolean; dispatch: (a: DemoAction) => void; onClose: () => void }) {
  const [liters, setLiters] = useState(day.oatCount ?? 9);
  const [cash, setCash] = useState(day.close?.cash ?? 1906);
  const ev = MORGENROT_EVENTS;
  if (kind === 'reviews') return (
    <Shell title="Antworten auf Bewertungen" sub="In deinem Ton entworfen. Nichts geht raus, bevor du freigibst." onClose={onClose}>
      {reviewFiles.map((f) => (
        <div key={f.id} className="ck-card">
          <div className="ck-card__t">{f.name}</div><div className="ck-card__m">{f.meta}</div>
          <p className="ck-card__p">{f.body[0].replace(/^Antwort-Entwurf:\s*/, '')}</p>
          {day.reviews[f.id] === 'approved' ? <div className="ck-ok"><Check size={15} /> Freigegeben</div>
            : owner ? <button type="button" className="ck-btn" onClick={() => dispatch({ type: 'review', id: f.id })}>Freigeben</button> : null}
        </div>
      ))}
      {owner && Object.values(day.reviews).includes('draft') ? <button type="button" className="ck-btn ck-btn--p ck-btn--wide" onClick={() => { dispatch({ type: 'reviewsAll' }); onClose(); }}>Alle freigeben</button> : null}
    </Shell>
  );
  if (kind === 'order') return (
    <Shell title={`Bestellung für ${ev.order.for}`} sub={`Bestellschluss ${ev.order.cutoff} · nach Bestand und Verbrauch vorbereitet`} onClose={onClose}>
      <div className="ck-table">{ev.order.lines.map((l) => <div key={l.item}><span>{l.item}</span><span>{l.qty}</span><span>{l.price} €</span></div>)}
        <div className="ck-table__sum"><span>Summe</span><span /><span>{orderTotal(ev)} €</span></div></div>
      <p className="ck-note">{day.oatCount !== null ? `Tarek hat heute ${day.oatCount} l Hafermilch gezählt.` : 'Tarek zählt die Hafermilch bis 13:00 – du kannst trotzdem schon freigeben.'}</p>
      {day.order === 'approved' ? <div className="ck-ok"><Check size={15} /> Freigegeben, geht an die Rösterei und die Molkerei (Demo)</div>
        : owner ? <button type="button" className="ck-btn ck-btn--p ck-btn--wide" onClick={() => { dispatch({ type: 'order' }); onClose(); }}>Bestellung freigeben · {orderTotal(ev)} €</button> : null}
    </Shell>
  );
  if (kind === 'swap') return (
    <Shell title={`Schichttausch am ${ev.swap.day}`} sub={`Anfrage von Jonas um ${ev.swap.at} · Lena hat zugestimmt`} onClose={onClose}>
      <div className="ck-table"><div><span>Jonas</span><span>übernimmt</span><span>{ev.swap.shift}</span></div><div><span>Lena</span><span>hat</span><span>frei</span></div></div>
      <p className="ck-note">Die Woche bleibt für beide unter 40 Stunden. Die Küche ist am Donnerstag mit Tarek besetzt.</p>
      {day.swap === 'requested' ? <div className="ck-row2"><button type="button" className="ck-btn ck-btn--wide" onClick={() => { dispatch({ type: 'swap', answer: 'declined' }); onClose(); }}>Ablehnen</button><button type="button" className="ck-btn ck-btn--p ck-btn--wide" onClick={() => { dispatch({ type: 'swap', answer: 'approved' }); onClose(); }}>Freigeben</button></div>
        : <div className="ck-ok"><Check size={15} /> {day.swap === 'approved' ? 'Freigegeben' : 'Abgelehnt'} · Jonas und Lena sind informiert</div>}
    </Shell>
  );
  if (kind === 'oat') return (
    <Shell title="Hafermilch zählen" sub="Für die Bestellung am Donnerstag" onClose={onClose}>
      <div className="ck-stepper"><button type="button" className="ck-icon" onClick={() => setLiters(Math.max(0, liters - 1))} aria-label="weniger">−</button><output data-testid="oat-liters">{liters} l</output><button type="button" className="ck-icon" onClick={() => setLiters(liters + 1)} aria-label="mehr">+</button></div>
      <p className="ck-note">Mindestbestand 24 l. MÔRA gibt die Zahl an die Bestellung weiter.</p>
      <button type="button" className="ck-btn ck-btn--p ck-btn--wide" onClick={() => { dispatch({ type: 'oat', liters }); onClose(); }}>Übernehmen</button>
    </Shell>
  );
  return (
    <Shell title="Tagesabschluss" sub="Kasse zählen, MÔRA schickt den Abschluss an Marius" onClose={onClose}>
      <label className="ck-field"><span>Bargeld + Karte laut Zählung (€)</span><input inputMode="numeric" value={cash} onChange={(e) => setCash(Number(e.target.value.replace(/\D/g, '')) || 0)} data-testid="close-cash" /></label>
      <p className="ck-note">Laut Kasse: 1.906 €. {cash === 1906 ? 'Stimmt überein.' : `Abweichung ${(cash - 1906).toLocaleString('de-DE')} €.`}</p>
      <button type="button" className="ck-btn ck-btn--p ck-btn--wide" onClick={() => { dispatch({ type: 'close', cash, by: 'jonas', at: '18:04' }); onClose(); }}>Abschluss senden</button>
    </Shell>
  );
}

export function FolderSheet({ moon, planetTitle, onClose }: { moon: DemoMoon; planetTitle: string; onClose: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const file = moon.files.find((f) => f.id === open);
  return (
    <Shell title={file ? file.name : moon.title} sub={file ? `${planetTitle} › ${moon.title} · ${file.meta}` : `${planetTitle} · ${moon.files.length} Einträge`} onClose={onClose}>
      {file ? (
        <div className="ck-doc" data-testid="ck-doc">{file.body.map((l) => <p key={l}>{l}</p>)}<button type="button" className="ck-link" onClick={() => setOpen(null)}>← {moon.title}</button></div>
      ) : (
        <div className="ck-files">{moon.files.map((f) => (
          <button key={f.id} type="button" className="ck-file" onClick={() => setOpen(f.id)} data-testid={`file-${f.id}`}><b>{f.name}</b><span>{f.meta}</span></button>
        ))}</div>
      )}
    </Shell>
  );
}

export function DepartmentSheet({
  planet,
  tasks,
  incidentPanels,
  onOpenMoon,
  onNewFolder,
  onClose,
}: {
  planet: DemoPlanet;
  tasks?: { id: string; title: string; due?: string | null }[];
  incidentPanels?: IncidentStatusPanelData[];
  onOpenMoon: (moonId: string) => void;
  onNewFolder?: () => void;
  onClose: () => void;
}) {
  return (
    <Shell
      title={planet.title}
      sub={`${planet.moons.length} ${planet.moons.length === 1 ? 'Ordner' : 'Ordner'}${tasks?.length ? ` · ${tasks.length} Aufgaben` : ''}`}
      onClose={onClose}
    >
      <div className="ck-dept-sheet">
        <section className="ck-dept-sec">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Ordner</h3>
            {onNewFolder ? (
              <button
                type="button"
                className="ck-btn ck-btn--p"
                style={{ fontSize: 12, padding: '6px 12px' }}
                onClick={onNewFolder}
              >
                + Ordner anlegen
              </button>
            ) : null}
          </div>
          {planet.moons.length > 0 ? (
            <div className="ck-files">
              {planet.moons.map((m) =>
                m.loadError || m.disabled ? (
                  <div
                    key={m.id}
                    className="ck-file"
                    style={{ opacity: 0.65, cursor: 'not-allowed' }}
                    title={m.hint || 'Ordner gerade nicht ladbar'}
                    data-testid={`dept-moon-${m.id}`}
                  >
                    <b>{m.title}</b>
                    <span style={{ color: 'var(--amber, #f59e0b)' }}>{m.hint || 'Ordner gerade nicht ladbar'}</span>
                  </div>
                ) : (
                  <button
                    key={m.id}
                    type="button"
                    className="ck-file"
                    onClick={() => onOpenMoon(m.id)}
                    data-testid={`dept-moon-${m.id}`}
                  >
                    <b>{m.title}</b>
                    <span>{m.files.length} {m.files.length === 1 ? 'Eintrag' : 'Einträge'}</span>
                  </button>
                )
              )}
            </div>
          ) : (
            <div className="ck-empty-note" style={{ padding: '16px 0', color: 'var(--mute)' }}>
              <p style={{ margin: '0 0 10px' }}>Noch keine Ordner in dieser Abteilung.</p>
              {onNewFolder ? (
                <button type="button" className="ck-btn ck-btn--p" onClick={onNewFolder}>
                  + Ordner anlegen
                </button>
              ) : null}
            </div>
          )}
        </section>

        {incidentPanels && incidentPanels.length > 0 ? (
          <section className="ck-dept-sec" style={{ marginTop: 20 }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 600, color: 'var(--rose, #f87171)' }}>
              Vorfälle ({incidentPanels.length})
            </h3>
            <div className="ck-files">
              {incidentPanels.map((panel) => (
                <IncidentStatusPanel key={panel.id} panel={panel} />
              ))}
            </div>
          </section>
        ) : null}

        {tasks && tasks.length > 0 ? (
          <section className="ck-dept-sec" style={{ marginTop: 20 }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 600 }}>Aufgaben ({tasks.length})</h3>
            <div className="ck-files">
              {tasks.map((t) => (
                <div key={t.id} className="ck-file" style={{ cursor: 'default' }}>
                  <b>{t.title}</b>
                  {t.due ? <span>{t.due}</span> : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </Shell>
  );
}
