'use client';
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { MORGENROT_SEED } from '@/lib/demo/morgenrot/seed';
import type { DemoPlanet } from '@/lib/demo/morgenrot/structure';
import type { DemoAction, DemoDay } from '../data/demoDay';
import { canDecideHead, type HeadChoice } from './demoHead';

const suggestions: Record<string, { id: string; title: string; text: string }> = {
  service: { id: 'service-response', title: 'Antwortvorlage prüfen', text: 'Ein vorbereiteter Demo-Vorschlag für eine Gästebewertung.' },
  kueche: { id: 'kitchen-stock', title: 'Bestand vor Bestellung prüfen', text: 'Die Demo-Bestandsliste zeigt Kaffee unter dem Mindestbestand.' },
  aushilfe: { id: 'counter-plan', title: 'Schließliste prüfen', text: 'Die vorbereitete Checkliste mit dem Team durchgehen.' },
  verwaltung: { id: 'admin-shift', title: 'Schichtplan prüfen', text: 'Den vorbereiteten Tausch für Donnerstag ansehen.' },
};

export function HeadSheet({ planet, viewer, day, dispatch, onClose }: { planet: DemoPlanet; viewer: string; day: DemoDay; dispatch: (action: DemoAction) => void; onClose: () => void }) {
  const [researchQuery, setResearchQuery] = useState('Finde 3 Hafermilch-Lieferanten');
  const [researchResult, setResearchResult] = useState<'none' | 'example' | 'missing'>('none');
  const suggestion = suggestions[planet.id];
  if (!suggestion) return null;
  const records = day.headRecords ?? [];
  const last = [...records].reverse().find(r => r.departmentId === planet.id && r.itemId === suggestion.id);
  const visible = last?.choice !== 'accepted' && last?.choice !== 'declined';
  const manager = canDecideHead(viewer, planet.id, 'accepted');
  const admin = canDecideHead(viewer, planet.id, 'code-draft');
  const team = MORGENROT_SEED.people.filter(p => planet.jobRoles.includes(p.jobRole));
  const choose = (itemId: string, choice: HeadChoice) => dispatch({ type: 'head', record: { departmentId: planet.id, itemId, actorId: viewer, choice, at: new Date().toISOString() } });
  return <div className="ck-sheet ck-head-sheet" role="dialog" aria-label={`Abteilung ${planet.title}`} data-testid="head-sheet">
    <div className="ck-sheet__head"><div><h2>{planet.title}</h2><p>Head-MÔRA · Fiktive Demo</p></div><button type="button" className="ck-icon" onClick={onClose} aria-label="Schließen"><X size={18} /></button></div>
    <div className="ck-sheet__body">
      <div className="ck-card"><div className="ck-card__t">Team &amp; Ordner</div><p className="ck-card__p">{team.map(p => p.name.split(' ')[0]).join(', ') || 'Keine Teamzuordnung'} · {planet.moons.length} Ordner</p></div>
      <div className="ck-card"><div className="ck-card__t">Head-MÔRA heute · Beispiel</div><p className="ck-card__p">Vorbereitetes Demo-Briefing für {planet.title}. Es wurde keine echte Agentenarbeit ausgeführt.</p></div>
      {visible ? <div className="ck-card" data-testid="head-suggestion"><div className="ck-card__t">{suggestion.title}</div><p className="ck-card__p">{suggestion.text}</p>{manager ? <div className="ck-row2"><button type="button" className="ck-btn" onClick={() => choose(suggestion.id, 'declined')}>Ablehnen</button><button type="button" className="ck-btn ck-btn--p" onClick={() => choose(suggestion.id, 'accepted')}>Annehmen</button><button type="button" className="ck-btn" onClick={() => choose(suggestion.id, 'later')}>Später</button></div> : <p className="ck-note">Nur die zuständige Leitung kann entscheiden.</p>}</div> : <div className="ck-ok">Vorschlag {last?.choice === 'accepted' ? 'angenommen' : 'abgelehnt'} · Demo</div>}
      <div className="ck-card"><div className="ck-card__t">Recherche · Demo</div><p className="ck-card__p">Beispielauftrag: Drei Hafermilch-Lieferanten suchen. Die Ergebnisse sind frei erfunden; es findet keine echte Recherche statt.</p><label className="ck-field head-query"><span>Demo-Auftrag</span><input value={researchQuery} onChange={e => { setResearchQuery(e.target.value); setResearchResult('none'); }} /></label><button type="button" className="ck-btn" onClick={() => setResearchResult(/hafermilch/i.test(researchQuery) ? 'example' : 'missing')}>Demo-Ergebnisse anzeigen</button>{researchResult === 'missing' ? <p className="ck-note">Für diesen Auftrag ist kein Demo-Beispiel vorbereitet.</p> : null}{researchResult === 'example' ? <ul className="head-results" data-testid="head-demo-research"><li>Haferhof Nord · Quelle: fiktiver Demo-Katalog A</li><li>Pflanzenmilch West · Quelle: fiktiver Demo-Katalog B</li><li>Getreidewerk Süd · Quelle: fiktiver Demo-Katalog C</li></ul> : null}</div>
      <div className="ck-card"><div className="ck-card__t">Code-Vorschlag · Beispiel</div><p className="ck-card__p">Eine fiktive Änderung kann erst nach Prüfung freigegeben werden. In dieser Demo wird kein Branch und kein Pull Request erstellt.</p><pre className="head-diff">− Hinweis ausblenden{'\n'}+ Hinweis anzeigen</pre><div className="head-preview" aria-label="Fiktive Vorher-nachher-Vorschau"><div><small>Vorher</small><p>Hinweis ausgeblendet</p></div><div><small>Nachher</small><p>Hinweis sichtbar</p></div></div>{admin ? <button type="button" className="ck-btn" onClick={() => choose('code-example', 'code-draft')}>Demo-Freigabe vormerken</button> : <p className="ck-note">Administrator fragen</p>}</div>
      {records.filter(r => r.departmentId === planet.id).length ? <div className="ck-card"><div className="ck-card__t">Demo-Protokoll · nur dieser Browser</div>{records.filter(r => r.departmentId === planet.id).map((r, i) => <p className="ck-note" key={`${r.at}-${i}`}>{r.actorId} · {r.choice} · {new Date(r.at).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}</p>)}</div> : null}
    </div>
  </div>;
}
