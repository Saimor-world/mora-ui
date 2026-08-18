'use client';

/**
 * Was der Dateiindex weiß — und was er nicht weiß.
 *
 * Der Index kennt Dateien nach ihrem Inhalt, nicht nach ihrem Ort.
 * Dieselbe Datei auf dem Laptop, im Drive und im Backup ist ein Eintrag
 * mit drei Orten. Diese Ansicht zeigt, was das ergibt: wie viel da ist,
 * was doppelt liegt, was es kostet.
 *
 * Drei Zustände, die auseinandergehalten werden müssen:
 *
 *   nichts erfasst    — es lief noch kein Durchgang
 *   erfasst, leer     — es lief einer und fand nichts
 *   nicht erreichbar  — CORE antwortet nicht
 *
 * Sie sehen gleich aus, wenn man nicht aufpasst, und bedeuten
 * Verschiedenes. Ein Bildschirm, der „keine Dateien" sagt, obwohl nur
 * niemand nachgesehen hat, ist eine falsche Auskunft.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { HardDrive, Cloud, Layers, RefreshCw, AlertTriangle } from 'lucide-react';
import {
    fetchDateiLage,
    fetchDubletten,
    lesbareGroesse,
    starteCloudDurchgang,
    type DateiEintrag,
    type DateiLage,
} from '@/lib/api/dateienClient';

function QuellenZeichen({ quelle }: { quelle: string }) {
    if (quelle === 'cloud') return <Cloud size={11} className="shrink-0 text-sky-300/60" />;
    if (quelle === 'geraet') return <HardDrive size={11} className="shrink-0 text-emerald-300/60" />;
    return <Layers size={11} className="shrink-0 text-white/40" />;
}

function Kennzahl({ wert, was, betont }: { wert: string; was: string; betont?: boolean }) {
    return (
        <div
            className={`flex-1 rounded-2xl border px-4 py-3 ${
                betont ? 'border-amber-300/22 bg-amber-400/[0.05]' : 'border-white/[0.07] bg-white/[0.02]'
            }`}
        >
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/38">{was}</div>
            <div className="mt-1.5 text-lg font-light tabular-nums text-white/88">{wert}</div>
        </div>
    );
}

export function IndexUebersicht() {
    const [lage, setLage] = useState<DateiLage | null>(null);
    const [dubletten, setDubletten] = useState<DateiEintrag[]>([]);
    const [nichtErreichbar, setNichtErreichbar] = useState(false);
    const [laedt, setLaedt] = useState(true);
    const [durchgangLaeuft, setDurchgangLaeuft] = useState(false);
    const [meldung, setMeldung] = useState<string | null>(null);

    const laden = useCallback(async () => {
        setLaedt(true);
        const [l, d] = await Promise.all([fetchDateiLage(), fetchDubletten(30)]);
        // `null` heißt hier: CORE hat nicht geantwortet. Das ist etwas
        // anderes als „keine Dateien" und wird auch anders gezeigt.
        setNichtErreichbar(l === null);
        setLage(l);
        setDubletten(d?.eintraege ?? []);
        setLaedt(false);
    }, []);

    useEffect(() => {
        void laden();
    }, [laden]);

    const durchgang = async () => {
        setDurchgangLaeuft(true);
        setMeldung(null);
        const ergebnis = await starteCloudDurchgang();
        if (!ergebnis) {
            setMeldung('Der Durchgang ist nicht durchgelaufen. Es wurde nichts verändert.');
        } else {
            const gelesen = ergebnis.gelesen.reduce((s, g) => s + g.dateien, 0);
            const teile = [`${gelesen} Dateien aus ${ergebnis.gelesen.length} Speicher(n)`];
            // Ein Speicher, der ausgefallen ist, gehört genannt — sonst
            // wirkt eine unvollständige Liste wie eine vollständige.
            if (ergebnis.gescheitert.length > 0) {
                teile.push(`${ergebnis.gescheitert.length} nicht erreichbar: ${ergebnis.gescheitert.map(g => g.speicher).join(', ')}`);
            }
            setMeldung(teile.join(' · '));
            await laden();
        }
        setDurchgangLaeuft(false);
    };

    if (laedt && !lage) {
        return <p className="text-sm text-white/34">Index wird gelesen …</p>;
    }

    if (nichtErreichbar) {
        return (
            <div className="rounded-2xl border border-red-300/16 bg-red-500/[0.05] px-5 py-4">
                <p className="text-sm text-red-200/80">Der Dateiindex ist gerade nicht erreichbar.</p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-white/38">
                    Es werden keine Dateien angezeigt, weil keine geladen werden konnten — nicht,
                    weil keine da wären.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-[10px] uppercase tracking-[0.22em] text-white/34">Dateiindex</h3>
                <button
                    type="button"
                    onClick={() => void durchgang()}
                    disabled={durchgangLaeuft}
                    className="flex items-center gap-1.5 rounded-lg border border-white/[0.09] px-3 py-1.5 text-[12px] text-white/58 transition hover:border-emerald-300/25 hover:text-white/85 disabled:opacity-40"
                >
                    <RefreshCw size={12} className={durchgangLaeuft ? 'animate-spin' : ''} />
                    {durchgangLaeuft ? 'Speicher werden gelesen …' : 'Cloud durchgehen'}
                </button>
            </div>

            {meldung && (
                <p className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2 text-[12px] text-white/62">
                    {meldung}
                </p>
            )}

            {!lage?.erfasst ? (
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.015] px-5 py-6">
                    <p className="text-sm text-white/52">Noch kein Durchgang gelaufen.</p>
                    <p className="mt-2 text-[12px] leading-relaxed text-white/32">
                        Der Index ist leer, weil noch niemand nachgesehen hat — nicht, weil keine
                        Dateien da wären. &bdquo;Cloud durchgehen&ldquo; liest die verbundenen
                        Speicher aus; heruntergeladen wird dabei nichts.
                    </p>
                </div>
            ) : (
                <>
                    <div className="flex flex-wrap gap-2">
                        <Kennzahl wert={String(lage.eintraege)} was="Dateien" />
                        <Kennzahl wert={String(lage.orte)} was="Fundorte" />
                        <Kennzahl
                            wert={String(lage.dubletten)}
                            was="mehrfach"
                            betont={lage.dubletten > 0}
                        />
                        <Kennzahl
                            wert={lesbareGroesse(lage.verschwendet_bytes)}
                            was="verschwendet"
                            betont={lage.verschwendet_bytes > 0}
                        />
                    </div>

                    {/* Eine Datei ohne Fingerabdruck kann nicht als Dublette
                        erkannt werden. Wer die Zahl oben liest, soll wissen,
                        wie belastbar sie ist. */}
                    {lage.ohne_inhaltsbeweis > 0 && (
                        <p className="flex items-start gap-2 text-[12px] leading-relaxed text-white/42">
                            <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-300/60" />
                            <span>
                                {lage.ohne_inhaltsbeweis} Dateien ohne Prüfsumme — meist
                                Google&nbsp;Docs und Tabellen, die keine haben. Sie sind im
                                Verzeichnis, können aber nicht als Dublette erkannt werden.
                            </span>
                        </p>
                    )}

                    {dubletten.length > 0 && (
                        <div>
                            <h4 className="mb-2 text-[10px] uppercase tracking-[0.2em] text-white/34">
                                Liegt mehrfach — die größten zuerst
                            </h4>
                            <div className="space-y-1.5">
                                {dubletten.map((e, i) => (
                                    <div
                                        key={`${e.name}-${i}`}
                                        className="rounded-xl border border-white/[0.06] bg-white/[0.015] px-3.5 py-2.5"
                                    >
                                        <div className="flex items-baseline gap-3">
                                            <span className="min-w-0 flex-1 truncate text-sm text-white/82">
                                                {e.name}
                                            </span>
                                            <span className="shrink-0 text-[11px] tabular-nums text-white/34">
                                                {e.orte.length}×
                                            </span>
                                            <span className="shrink-0 text-[12px] tabular-nums text-amber-200/70">
                                                {lesbareGroesse(e.groesse * (e.orte.length - 1))} unnötig
                                            </span>
                                        </div>
                                        <div className="mt-1.5 space-y-0.5">
                                            {e.orte.slice(0, 3).map((o, j) => (
                                                <div key={j} className="flex items-center gap-1.5">
                                                    <QuellenZeichen quelle={o.quelle} />
                                                    <span className="truncate text-[11px] text-white/32">{o.pfad}</span>
                                                </div>
                                            ))}
                                            {e.orte.length > 3 && (
                                                <div className="pl-4 text-[11px] text-white/26">
                                                    … und {e.orte.length - 3} weitere
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="mt-3 text-[11px] leading-relaxed text-white/28">
                                Es wird nichts gelöscht. Was weg soll, entscheidest du — der Index
                                zeigt nur, wo es sich lohnt.
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
