"use client";
import { planetMaterial } from './PlanetSphere';
import { CountUp } from './UniverseLinks';
import { isUniverseV2Enabled } from '@/lib/universe/morgen';

import React from 'react';
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
 * dieselbe Sprache sprechen. Die Zahl ist immer in Dokumenten (Dok)
 * beschriftet, damit sie nicht mit Aktionszahlen am Planeten kollidiert.
 */
export function SubstanceWidget({ bars, onSelect }: {
    bars: SubstanceBar[];
    onSelect: (id: string) => void;
}) {
    if (bars.length === 0) return null;

    const totalDocs = bars.reduce((n, b) => n + b.documents, 0);
    const leer = bars.every((bar) => bar.ratio === 0) || totalDocs === 0;

    return (
        <section data-uv2-instrument="verteilung" className="uv2-inst">
            <header className="flex items-baseline justify-between gap-3">
                <p className="uv2-inst-label">Verteilung</p>
                {totalDocs > 0 && (
                    <span className="uv2-inst-aside">
                        <CountUp value={totalDocs} /> Dok
                    </span>
                )}
            </header>
            <h2 className="uv2-inst-title">Wo die Arbeit liegt</h2>

            {leer ? (
                <p className="uv2-inst-text mt-2">
                    Bereit für Inhalte. Sobald Dokumente entstehen, zeigt sich hier ihre Verteilung.
                </p>
            ) : (
                <div className="mt-3 space-y-2.5">
                    {isUniverseV2Enabled() && (
                        <div data-testid="uv2-verteilung-summe" className="pb-1">
                            <span className="mt-2 flex h-[5px] w-full overflow-hidden rounded-full bg-white/[0.08]">
                                {bars.filter((b) => b.documents > 0).map((b) => (
                                    <span key={b.id} data-uv2-link={b.id} className="uv2-strand h-full" style={{ flexGrow: b.documents, background: planetMaterial(b.name).day }} />
                                ))}
                            </span>
                        </div>
                    )}
                    {bars.map((bar) => (
                        <button
                            key={bar.id}
                            type="button"
                            onClick={() => onSelect(bar.id)}
                            data-mora-label={bar.name}
                            data-uv2-link={bar.id}
                            className="group block w-full text-left"
                        >
                            <span className="uv2-inst-row-body">
                                <span className="uv2-inst-text truncate">{bar.name}</span>
                                {bar.documents > 0 && (
                                    <span className="uv2-inst-aside shrink-0 tabular-nums">
                                        <CountUp value={bar.documents} /> Dok
                                    </span>
                                )}
                            </span>
                            <span className="mt-1 block h-[3px] w-full overflow-hidden rounded-full bg-white/[0.08]">
                                <span
                                    className="block h-full rounded-full transition-all duration-700"
                                    style={{
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
        </section>
    );
}
