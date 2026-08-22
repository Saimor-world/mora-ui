"use client";

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

    const leer = bars.every((bar) => bar.ratio === 0);

    return (
        <section className="relative overflow-hidden rounded-[24px] border border-white/[0.09] bg-[#071522]/92 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.32)]">
            <div className="absolute inset-y-5 left-0 w-px bg-violet-300/50" />
            <p className="text-[8px] font-semibold uppercase tracking-[0.25em] text-white/30">Verteilung</p>
            <h2 className="mt-1 flex items-center gap-2 text-sm font-medium tracking-[-0.01em] text-white/82">
                <Layers size={13} className="text-violet-200/70" />
                Wo die Arbeit liegt
            </h2>

            {leer ? (
                <p className="mt-3 text-[11px] leading-relaxed text-white/45">
                    Noch nichts abgelegt. Sobald Inhalte entstehen, zeigt sich hier ihre Verteilung.
                </p>
            ) : (
                <div className="mt-3 space-y-2.5">
                    {bars.map((bar) => (
                        <button
                            key={bar.id}
                            type="button"
                            onClick={() => onSelect(bar.id)}
                            data-mora-label={bar.name}
                            className="group block w-full text-left"
                        >
                            <span className="flex items-baseline justify-between gap-2">
                                <span className="truncate text-[11px] text-white/72 transition group-hover:text-white/95">{bar.name}</span>
                                <span className="shrink-0 text-[9px] tabular-nums text-white/38">
                                    {bar.documents} Dok · {bar.folders} Ord
                                </span>
                            </span>
                            <span className="mt-1 block h-[3px] w-full overflow-hidden rounded-full bg-white/[0.07]">
                                <span
                                    className="block h-full rounded-full transition-all duration-700"
                                    style={{
                                        // Mindestbreite fuer alles, was nicht null
                                        // ist: ein Bereich mit einem Dokument darf
                                        // nicht wie einer mit keinem aussehen.
                                        width: (bar.ratio === 0 ? 0 : Math.max(4, bar.ratio * 100)) + '%',
                                        background: bar.color,
                                        boxShadow: '0 0 8px ' + bar.color + '77',
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
