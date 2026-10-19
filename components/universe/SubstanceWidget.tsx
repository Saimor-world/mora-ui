"use client";
import { planetMaterial } from './PlanetSphere';
import { CountUp } from './UniverseLinks';
import { isUniverseV2Enabled } from '@/lib/universe/morgen';

import React from 'react';
import { Layers } from 'lucide-react';
import type { SubstanceBar } from '@/lib/universe/substanceChart';

/**
 * Wo die Arbeit wirklich steckt.
 *
 * Marius wollte "mehr visuelle Ansprechpunkte, gerne mit einem neuen
 * Graphen". Bewusst KEINE Zeitreihe: CORE speichert keine Bestandsverlaeufe,
 * eine Kurve "Wachstum ueber Zeit" waere frei erfunden. Ein Vergleich der
 * Gegenwart ist dagegen vollstaendig belegt - und beantwortet die Frage, die
 * man vor dem Feld tatsaechlich hat.
 *
 * Die Balken tragen die Farbe ihres Planeten, damit Kachel und Feld
 * dieselbe Sprache sprechen.
 */
export function SubstanceWidget({ bars, onSelect }: {
    bars: SubstanceBar[];
    onSelect: (id: string) => void;
}) {
    if (bars.length === 0) return null;

    const v2 = isUniverseV2Enabled();
    const populated = bars.filter((bar) => bar.documents > 0 || bar.folders > 0);
    const documents = bars.reduce((n, bar) => n + bar.documents, 0);
    const leer = v2 ? populated.length === 0 : bars.every((bar) => bar.ratio === 0);
    const visible = v2 ? populated : bars;

    return (
        <section data-uv2-instrument="verteilung" className="relative overflow-hidden rounded-[24px] border border-white/[0.09] bg-[#071522]/92 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.32)]">
            <div className="absolute inset-y-5 left-0 w-px bg-violet-300/50" />
            <p className="text-[8px] font-semibold uppercase tracking-[0.25em] text-white/30">Verteilung</p>
            <h2 className="mt-1 flex items-center gap-2 text-sm font-medium tracking-[-0.01em] text-white/82">
                <Layers size={13} className="text-violet-200/70" />
                Wo die Arbeit liegt
            </h2>

            {leer ? (
                <div className="uv2-substance-empty mt-3" data-testid="uv2-substance-empty">
                    <span aria-hidden className="uv2-empty-orbit" />
                    <p className="uv2-inst-text">Raum für deine Arbeit.</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-white/65">Deine Dokumente erscheinen hier, sobald du sie ablegst.</p>
                </div>
            ) : (
                <div className="mt-3 space-y-2.5">
                    {v2 && documents > 0 && (
                        <div data-testid="uv2-verteilung-summe" className="pb-1">
                            <p className="flex items-baseline gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#F7F4E9]/45">
                                <span className="font-serif text-[22px] normal-case tracking-normal text-[#F7F4E9]"><CountUp value={documents} /></span>
                                Dokumente gesamt
                            </p>
                            {/* Zusammensetzung: ein Strang, jeder Bereich in seiner Planetenfarbe */}
                            <span className="mt-2 flex h-[5px] w-full overflow-hidden rounded-full bg-white/[0.05]">
                                {bars.filter((b) => b.documents > 0).map((b) => (
                                    <span key={b.id} data-uv2-link={b.id} className="uv2-strand h-full" style={{ flexGrow: b.documents, background: planetMaterial(b.name).day }} />
                                ))}
                            </span>
                        </div>
                    )}
                    {visible.map((bar) => (
                        <button
                            key={bar.id}
                            type="button"
                            onClick={() => onSelect(bar.id)}
                            data-mora-label={bar.name}
                            data-uv2-link={bar.id}
                            className="group block w-full text-left"
                        >
                            <span className="flex items-baseline justify-between gap-2">
                                <span className="truncate text-[11px] text-white/72 transition group-hover:text-white/95">{bar.name}</span>
                                <span className="shrink-0 text-[9px] tabular-nums text-white/38">
                                    {bar.documents > 0 && <><CountUp value={bar.documents} /> {bar.documents === 1 ? 'Dokument' : 'Dokumente'}</>}
                                    {bar.documents > 0 && bar.folders > 0 && ' · '}
                                    {bar.folders > 0 && <><CountUp value={bar.folders} /> Ordner</>}
                                </span>
                            </span>
                            <span className="mt-1 block h-[3px] w-full overflow-hidden rounded-full bg-white/[0.07]">
                                <span
                                    className="block h-full rounded-full transition-all duration-700"
                                    style={{
                                        // Mindestbreite fuer alles, was nicht null
                                        // ist: ein Bereich mit einem Dokument darf
                                        // nicht wie einer mit keinem aussehen.
                                        width: (bar.ratio === 0 || (isUniverseV2Enabled() && bar.documents === 0) ? 0 : Math.max(4, bar.ratio * 100)) + '%',
                                        background: isUniverseV2Enabled() ? 'linear-gradient(90deg,'+planetMaterial(bar.name).mid+','+planetMaterial(bar.name).day+')' : bar.color,
                                        boxShadow: isUniverseV2Enabled() ? 'none' : '0 0 8px ' + bar.color + '77',
                                    }}
                                />
                            </span>
                        </button>
                    ))}
                </div>
            )}
            {v2 && bars.some((bar) => bar.documents === 0 && bar.folders === 0) && (
                <details className="uv2-empty-areas mt-3">
                    <summary>Weitere Bereiche</summary>
                    {bars.filter((bar) => bar.documents === 0 && bar.folders === 0).map((bar) => (
                        <button key={bar.id} type="button" onClick={() => onSelect(bar.id)} className="uv2-inst-row">
                            <span className="uv2-inst-text">{bar.name}</span><span className="uv2-inst-aside">Noch keine Inhalte</span>
                        </button>
                    ))}
                </details>
            )}
        </section>
    );
}
