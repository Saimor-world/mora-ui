'use client';

/**
 * Earth — Ortsansicht der Gemeinde.
 *
 * Das ist der bezahlte Teil von Earth, und er sieht anders aus als die
 * öffentliche Karte, weil er etwas anderes ist. Die Karte zeigt, was
 * freigegeben wurde. Diese Ansicht zeigt, was eine Fläche gekostet hat,
 * wann sie gepflegt werden muss und was dort stattfindet — Daten, die der
 * Gemeinde gehören und die Karte nie erreichen.
 *
 * Warum als App im OS und nicht als Seite in EARTH: Hier ist die angemeldete
 * Arbeitsfläche. Anmeldung, Mandant, Fenster und Rollen liegen bereits — eine
 * eigene Seite in EARTH müsste all das ein zweites Mal bauen, und zwei
 * Anmeldewege sind zwei Wege, sich zu vertun.
 *
 * Gegenstelle: core/api/v3/earth_internal.py
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
    ArrowLeft,
    CalendarDays,
    CircleAlert,
    Coins,
    MapPin,
    RefreshCw,
    Scissors,
    UserRound,
} from 'lucide-react';
import type { AppProps } from '@/lib/apps/types';
import {
    centAusEingabe,
    euro,
    fetchAkte,
    fetchFlaechen,
    speichereAkte,
    type Akte,
    type AkteAntwort,
    type FlaecheZusammenfassung,
    type FlaechenListe,
    type Kostenposten,
    type Veranstaltung,
} from '@/lib/api/earthClient';

// ── Bausteine ────────────────────────────────────────────────────────────────

function datum(iso?: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Ein überfälliger Termin ist etwas anderes als ein anstehender. */
function istUeberfaellig(faelligAm: string): boolean {
    const d = new Date(faelligAm);
    if (Number.isNaN(d.getTime())) return false;
    return d.getTime() < Date.now();
}

function Kennzahl({
    icon,
    wert,
    was,
}: {
    icon: React.ReactNode;
    wert: string;
    was: string;
}) {
    return (
        <div className="flex-1 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
            <div className="flex items-center gap-2 text-white/38">
                {icon}
                <span className="text-[10px] uppercase tracking-[0.2em]">{was}</span>
            </div>
            <div className="mt-1.5 text-lg font-light tabular-nums text-white/88">{wert}</div>
        </div>
    );
}

function Abschnitt({
    titel,
    leer,
    children,
}: {
    titel: string;
    leer?: string;
    children?: React.ReactNode;
}) {
    const hatInhalt = React.Children.count(children) > 0;
    return (
        <section className="mt-5">
            <h3 className="text-[10px] uppercase tracking-[0.22em] text-white/34">{titel}</h3>
            {hatInhalt ? (
                <div className="mt-2 space-y-1.5">{children}</div>
            ) : (
                <p className="mt-2 text-sm text-white/32">{leer}</p>
            )}
        </section>
    );
}

// ── Liste ────────────────────────────────────────────────────────────────────

function FlaechenZeile({
    flaeche,
    onOeffnen,
}: {
    flaeche: FlaecheZusammenfassung;
    onOeffnen: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onOeffnen}
            className="group flex w-full items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.015] px-4 py-3 text-left transition hover:border-emerald-300/20 hover:bg-emerald-400/[0.04]"
        >
            <MapPin size={15} className="shrink-0 text-emerald-200/45" />
            <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-white/86">{flaeche.titel}</div>
                <div className="mt-0.5 text-[11px] text-white/32">
                    {flaeche.akte_angelegt ? (
                        <>
                            {euro(flaeche.summe_cent)}
                            {flaeche.aktualisiert_am && ` · Stand ${datum(flaeche.aktualisiert_am)}`}
                        </>
                    ) : (
                        // Keine erfundene Null: Nicht erfasst ist etwas anderes
                        // als erfasst mit dem Wert null.
                        <span className="text-white/28">Noch nichts erfasst</span>
                    )}
                </div>
            </div>
            {flaeche.offene_pflege > 0 && (
                <span className="shrink-0 rounded-full border border-amber-300/20 bg-amber-400/[0.07] px-2.5 py-0.5 text-[10px] text-amber-200/80">
                    {flaeche.offene_pflege} offen
                </span>
            )}
        </button>
    );
}

// ── Akte ─────────────────────────────────────────────────────────────────────

/** Ein leerer Rumpf, damit auch die erste Eintragung einer Fläche gelingt. */
const LEERE_AKTE: Akte = {
    place_id: '',
    kosten: [],
    pflege: [],
    veranstaltungen: [],
    zustaendig: [],
    notiz: null,
    aktualisiert_am: '',
};

function PostenFormular({
    onEintragen,
    onAbbrechen,
}: {
    onEintragen: (posten: Kostenposten) => void;
    onAbbrechen: () => void;
}) {
    const [zweck, setZweck] = useState('');
    const [betrag, setBetrag] = useState('');
    const [jahr, setJahr] = useState(String(new Date().getFullYear()));
    const [art, setArt] = useState<Kostenposten['art']>('material');
    const [hinweis, setHinweis] = useState<string | null>(null);

    const eintragen = () => {
        const cent = centAusEingabe(betrag);
        if (!zweck.trim()) return setHinweis('Ohne Zweck ist ein Posten im Nachweis wertlos.');
        if (cent === null) return setHinweis('Betrag als Zahl, z. B. 120,50');
        setHinweis(null);
        onEintragen({ zweck: zweck.trim(), betrag_cent: cent, jahr: Number(jahr), art });
    };

    return (
        <div className="mt-2 rounded-2xl border border-emerald-300/16 bg-emerald-400/[0.03] px-4 py-3">
            <div className="flex flex-wrap gap-2">
                <label className="min-w-[10rem] flex-1 text-[10px] uppercase tracking-[0.18em] text-white/34">
                    Zweck
                    <input
                        value={zweck}
                        onChange={e => setZweck(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-white/[0.09] bg-black/25 px-2.5 py-1.5 text-sm normal-case tracking-normal text-white/86 outline-none focus:border-emerald-300/35"
                    />
                </label>
                <label className="w-28 text-[10px] uppercase tracking-[0.18em] text-white/34">
                    Betrag €
                    <input
                        value={betrag}
                        onChange={e => setBetrag(e.target.value)}
                        inputMode="decimal"
                        className="mt-1 w-full rounded-lg border border-white/[0.09] bg-black/25 px-2.5 py-1.5 text-sm tabular-nums tracking-normal text-white/86 outline-none focus:border-emerald-300/35"
                    />
                </label>
                <label className="w-20 text-[10px] uppercase tracking-[0.18em] text-white/34">
                    Jahr
                    <input
                        value={jahr}
                        onChange={e => setJahr(e.target.value)}
                        inputMode="numeric"
                        className="mt-1 w-full rounded-lg border border-white/[0.09] bg-black/25 px-2.5 py-1.5 text-sm tabular-nums tracking-normal text-white/86 outline-none focus:border-emerald-300/35"
                    />
                </label>
                <label className="w-28 text-[10px] uppercase tracking-[0.18em] text-white/34">
                    Art
                    <select
                        value={art}
                        onChange={e => setArt(e.target.value as Kostenposten['art'])}
                        className="mt-1 w-full rounded-lg border border-white/[0.09] bg-black/25 px-2 py-1.5 text-sm normal-case tracking-normal text-white/86 outline-none focus:border-emerald-300/35"
                    >
                        <option value="anlage">Anlage</option>
                        <option value="pflege">Pflege</option>
                        <option value="material">Material</option>
                        <option value="planung">Planung</option>
                        <option value="sonstiges">Sonstiges</option>
                    </select>
                </label>
            </div>
            {hinweis && <p className="mt-2 text-[12px] text-amber-200/80">{hinweis}</p>}
            <div className="mt-3 flex gap-2">
                <button
                    type="button"
                    onClick={eintragen}
                    className="rounded-lg border border-emerald-300/25 bg-emerald-400/[0.09] px-3 py-1.5 text-[12px] text-emerald-100/85 transition hover:bg-emerald-400/[0.15]"
                >
                    Eintragen
                </button>
                <button
                    type="button"
                    onClick={onAbbrechen}
                    className="rounded-lg px-3 py-1.5 text-[12px] text-white/42 transition hover:text-white/72"
                >
                    Abbrechen
                </button>
            </div>
        </div>
    );
}

function TerminFormular({
    onAnlegen,
    onAbbrechen,
}: {
    onAnlegen: (v: Veranstaltung) => void;
    onAbbrechen: () => void;
}) {
    const [titel, setTitel] = useState('');
    const [am, setAm] = useState('');
    const [oeffentlich, setOeffentlich] = useState(false);
    const [hinweis, setHinweis] = useState<string | null>(null);

    const anlegen = () => {
        if (!titel.trim()) return setHinweis('Ohne Titel steht der Termin ohne Inhalt im Plan.');
        if (!am) return setHinweis('Ohne Datum ist es kein Termin.');
        setHinweis(null);
        onAnlegen({ titel: titel.trim(), am, oeffentlich });
    };

    return (
        <div className="mt-2 rounded-2xl border border-emerald-300/16 bg-emerald-400/[0.03] px-4 py-3">
            <div className="flex flex-wrap gap-2">
                <label className="min-w-[10rem] flex-1 text-[10px] uppercase tracking-[0.18em] text-white/34">
                    Titel
                    <input
                        value={titel}
                        onChange={e => setTitel(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-white/[0.09] bg-black/25 px-2.5 py-1.5 text-sm normal-case tracking-normal text-white/86 outline-none focus:border-emerald-300/35"
                    />
                </label>
                <label className="w-40 text-[10px] uppercase tracking-[0.18em] text-white/34">
                    Datum
                    <input
                        type="date"
                        value={am}
                        onChange={e => setAm(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-white/[0.09] bg-black/25 px-2.5 py-1.5 text-sm tracking-normal text-white/86 outline-none focus:border-emerald-300/35"
                    />
                </label>
            </div>

            <label className="mt-3 flex items-center gap-2 text-[12px] text-white/58">
                <input
                    type="checkbox"
                    checked={oeffentlich}
                    onChange={e => setOeffentlich(e.target.checked)}
                    className="h-3.5 w-3.5 accent-emerald-400"
                />
                Öffentlich
            </label>

            {/* Ehrlich statt bequem: Es gibt bewusst keinen Weg von der Akte
                in die öffentliche Projektion. Ein Haken, der nichts
                veröffentlicht, wäre ein Versprechen, das die Software
                nicht hält. */}
            {oeffentlich && (
                <p className="mt-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-[11px] leading-relaxed text-white/44">
                    Vorgemerkt, nicht veröffentlicht: Der Termin erscheint dadurch noch nicht auf
                    der öffentlichen Karte. Die Freigabe läuft über die Ortsredaktion.
                </p>
            )}

            {hinweis && <p className="mt-2 text-[12px] text-amber-200/80">{hinweis}</p>}
            <div className="mt-3 flex gap-2">
                <button
                    type="button"
                    onClick={anlegen}
                    className="rounded-lg border border-emerald-300/25 bg-emerald-400/[0.09] px-3 py-1.5 text-[12px] text-emerald-100/85 transition hover:bg-emerald-400/[0.15]"
                >
                    Anlegen
                </button>
                <button
                    type="button"
                    onClick={onAbbrechen}
                    className="rounded-lg px-3 py-1.5 text-[12px] text-white/42 transition hover:text-white/72"
                >
                    Abbrechen
                </button>
            </div>
        </div>
    );
}

function AkteAnsicht({
    antwort,
    onAendern,
    speichert,
    meldung,
}: {
    antwort: AkteAntwort;
    onAendern: (naechste: Akte) => void;
    speichert: boolean;
    meldung: string | null;
}) {
    const [formular, setFormular] = useState(false);
    const [terminFormular, setTerminFormular] = useState(false);
    const basis = antwort.akte ?? LEERE_AKTE;

    const postenAufnehmen = (posten: Kostenposten) => {
        setFormular(false);
        onAendern({ ...basis, kosten: [...basis.kosten, posten] });
    };

    const terminAnlegen = (v: Veranstaltung) => {
        setTerminFormular(false);
        onAendern({ ...basis, veranstaltungen: [...basis.veranstaltungen, v] });
    };

    const abhaken = (index: number) => {
        const heute = new Date().toISOString().slice(0, 10);
        onAendern({
            ...basis,
            // Erledigtes verschwindet aus der offenen Liste, nicht aus der
            // Akte — der Nachweis braucht beides.
            pflege: basis.pflege.map((t, i) => (i === index ? { ...t, erledigt_am: heute } : t)),
        });
    };

    if (!antwort.angelegt || !antwort.akte) {
        return (
            <div className="mt-6">
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.015] px-5 py-6">
                    <p className="text-sm text-white/52">Für diese Fläche ist noch nichts erfasst.</p>
                    <p className="mt-2 text-[12px] leading-relaxed text-white/32">
                        Die Fläche existiert, aber es liegen weder Kosten noch Pflegetermine vor.
                        Das ist kein Fehler — es ist der Zustand vor der ersten Eintragung.
                    </p>
                </div>
                {meldung && <p className="mt-3 text-[12px] text-amber-200/80">{meldung}</p>}
                {/* Der leere Zustand muss der Anfang sein, nicht die Sackgasse:
                    Ohne diesen Weg könnte eine Gemeinde für eine neue Fläche
                    nie den ersten Posten erfassen. */}
                {formular ? (
                    <PostenFormular onEintragen={postenAufnehmen} onAbbrechen={() => setFormular(false)} />
                ) : (
                    <button
                        type="button"
                        onClick={() => setFormular(true)}
                        className="mt-3 rounded-lg border border-white/[0.09] px-3 py-1.5 text-[12px] text-white/58 transition hover:border-emerald-300/25 hover:text-white/85"
                    >
                        Ersten Posten erfassen
                    </button>
                )}
            </div>
        );
    }

    const { akte } = antwort;
    const jahre = Object.entries(antwort.summe_nach_jahr || {}).sort(([a], [b]) => a.localeCompare(b));

    return (
        <>
            <div className="mt-4 flex gap-2">
                <Kennzahl
                    icon={<Coins size={12} />}
                    wert={euro(antwort.summe_cent ?? 0)}
                    was="Gesamt"
                />
                <Kennzahl
                    icon={<Scissors size={12} />}
                    wert={String((antwort.offene_pflege || []).length)}
                    was="Pflege offen"
                />
                <Kennzahl
                    icon={<CalendarDays size={12} />}
                    wert={String(akte.veranstaltungen.length)}
                    was="Termine"
                />
            </div>

            {meldung && (
                <p className="mt-3 rounded-xl border border-amber-300/18 bg-amber-400/[0.05] px-3.5 py-2 text-[12px] text-amber-100/85">
                    {meldung}
                </p>
            )}

            <Abschnitt titel="Haushalt" leer="Keine Kosten erfasst.">
                {akte.kosten.map((posten, i) => (
                    <div
                        key={`${posten.zweck}-${i}`}
                        className="flex items-baseline gap-3 rounded-xl border border-white/[0.05] bg-white/[0.012] px-3.5 py-2"
                    >
                        <span className="min-w-0 flex-1 truncate text-sm text-white/78">{posten.zweck}</span>
                        <span className="shrink-0 text-[10px] uppercase tracking-[0.16em] text-white/28">
                            {posten.art}
                        </span>
                        <span className="shrink-0 text-[11px] tabular-nums text-white/34">{posten.jahr}</span>
                        <span className="shrink-0 tabular-nums text-sm text-white/86">
                            {euro(posten.betrag_cent)}
                        </span>
                    </div>
                ))}
            </Abschnitt>

            {formular ? (
                <PostenFormular onEintragen={postenAufnehmen} onAbbrechen={() => setFormular(false)} />
            ) : (
                <button
                    type="button"
                    onClick={() => setFormular(true)}
                    disabled={speichert}
                    className="mt-2 rounded-lg border border-white/[0.09] px-3 py-1.5 text-[12px] text-white/58 transition hover:border-emerald-300/25 hover:text-white/85 disabled:opacity-40"
                >
                    Posten erfassen
                </button>
            )}

            {jahre.length > 1 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {jahre.map(([jahr, cent]) => (
                        <span
                            key={jahr}
                            className="rounded-full border border-white/[0.07] px-2.5 py-0.5 text-[11px] tabular-nums text-white/48"
                        >
                            {jahr}: {euro(cent)}
                        </span>
                    ))}
                </div>
            )}

            <Abschnitt titel="Pflege" leer="Keine Termine hinterlegt.">
                {akte.pflege.map((termin, i) => {
                    const erledigt = Boolean(termin.erledigt_am);
                    const spaet = !erledigt && istUeberfaellig(termin.faellig_am);
                    return (
                        <div
                            key={`${termin.was}-${i}`}
                            className={`flex items-center gap-3 rounded-xl border px-3.5 py-2 ${
                                spaet
                                    ? 'border-amber-300/18 bg-amber-400/[0.05]'
                                    : 'border-white/[0.05] bg-white/[0.012]'
                            }`}
                        >
                            {spaet && <CircleAlert size={13} className="shrink-0 text-amber-300/75" />}
                            <span
                                className={`min-w-0 flex-1 truncate text-sm ${
                                    erledigt ? 'text-white/38 line-through' : 'text-white/78'
                                }`}
                            >
                                {termin.was}
                            </span>
                            <span className="shrink-0 text-[11px] tabular-nums text-white/34">
                                {erledigt ? `erledigt ${datum(termin.erledigt_am)}` : datum(termin.faellig_am)}
                            </span>
                            {!erledigt && (
                                <button
                                    type="button"
                                    onClick={() => abhaken(i)}
                                    disabled={speichert}
                                    className="shrink-0 rounded-lg border border-white/[0.09] px-2.5 py-1 text-[11px] text-white/52 transition hover:border-emerald-300/25 hover:text-emerald-100/85 disabled:opacity-40"
                                >
                                    Erledigt
                                </button>
                            )}
                        </div>
                    );
                })}
            </Abschnitt>

            <Abschnitt titel="Veranstaltungen" leer="Nichts geplant.">
                {akte.veranstaltungen.map((v, i) => (
                    <div
                        key={`${v.titel}-${i}`}
                        className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.012] px-3.5 py-2"
                    >
                        <span className="min-w-0 flex-1 truncate text-sm text-white/78">{v.titel}</span>
                        {/* Wer nichts entscheidet, veröffentlicht nichts — und
                            liest hier auch, dass es so ist. */}
                        <span
                            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${
                                v.oeffentlich
                                    ? 'border-emerald-300/20 bg-emerald-400/[0.06] text-emerald-200/75'
                                    : 'border-white/[0.09] text-white/38'
                            }`}
                        >
                            {v.oeffentlich ? 'öffentlich' : 'intern'}
                        </span>
                        <span className="shrink-0 text-[11px] tabular-nums text-white/34">{datum(v.am)}</span>
                    </div>
                ))}
            </Abschnitt>

            {terminFormular ? (
                <TerminFormular onAnlegen={terminAnlegen} onAbbrechen={() => setTerminFormular(false)} />
            ) : (
                <button
                    type="button"
                    onClick={() => setTerminFormular(true)}
                    disabled={speichert}
                    className="mt-2 rounded-lg border border-white/[0.09] px-3 py-1.5 text-[12px] text-white/58 transition hover:border-emerald-300/25 hover:text-white/85 disabled:opacity-40"
                >
                    Termin anlegen
                </button>
            )}

            {akte.zustaendig.length > 0 && (
                <Abschnitt titel="Zuständig">
                    {akte.zustaendig.map((z, i) => (
                        <div
                            key={`${z.name}-${i}`}
                            className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.012] px-3.5 py-2"
                        >
                            <UserRound size={13} className="shrink-0 text-white/30" />
                            <span className="min-w-0 flex-1 truncate text-sm text-white/78">{z.name}</span>
                            <span className="shrink-0 text-[11px] text-white/34">{z.rolle}</span>
                        </div>
                    ))}
                </Abschnitt>
            )}

            {akte.notiz && (
                <Abschnitt titel="Notiz">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/62">{akte.notiz}</p>
                </Abschnitt>
            )}
        </>
    );
}

// ── App ──────────────────────────────────────────────────────────────────────

export default function EarthApp(_props: AppProps) {
    const [liste, setListe] = useState<FlaechenListe | null>(null);
    const [fehler, setFehler] = useState(false);
    const [laedt, setLaedt] = useState(true);
    const [offen, setOffen] = useState<FlaecheZusammenfassung | null>(null);
    const [akte, setAkte] = useState<AkteAntwort | null>(null);
    const [akteLaedt, setAkteLaedt] = useState(false);
    const [speichert, setSpeichert] = useState(false);
    const [meldung, setMeldung] = useState<string | null>(null);

    const akteLaden = useCallback(async (placeId: string) => {
        const daten = await fetchAkte(placeId);
        setAkte(daten ?? { angelegt: false, place_id: placeId });
    }, []);

    const laden = useCallback(async () => {
        setLaedt(true);
        const daten = await fetchFlaechen();
        // `coreGet` gibt bei Fehlern null zurück. Eine leere Liste zu zeigen
        // wäre die falsche Auskunft: „keine Flächen" und „nicht erreichbar"
        // sind für eine Verwaltung zwei verschiedene Lagen.
        setFehler(daten === null);
        setListe(daten);
        setLaedt(false);
    }, []);

    const aendern = useCallback(
        async (naechste: Akte) => {
            if (!offen) return;
            setSpeichert(true);
            setMeldung(null);

            const ergebnis = await speichereAkte(offen.place_id, naechste, akte?.akte?.fassung);

            if (ergebnis.ok && ergebnis.antwort) {
                setAkte(ergebnis.antwort);
                // Die Liste trägt Summe und offene Pflege — nach einer Änderung
                // stimmt sie nicht mehr.
                void laden();
            } else if (ergebnis.konflikt) {
                // Nicht schweigen und nicht überschreiben: Der Nutzer sieht,
                // dass jemand anders schneller war, und bekommt den echten
                // Stand — seine Eingabe kann er darauf wiederholen.
                setMeldung('Jemand anders hat diese Akte zwischenzeitlich geändert. Der aktuelle Stand ist geladen.');
                await akteLaden(offen.place_id);
            } else {
                setMeldung('Nicht gespeichert. Die Änderung liegt noch nicht in CORE.');
            }
            setSpeichert(false);
        },
        [offen, akte, laden, akteLaden],
    );

    useEffect(() => {
        void laden();
    }, [laden]);

    useEffect(() => {
        if (!offen) {
            setAkte(null);
            return;
        }
        let abgebrochen = false;
        setAkteLaedt(true);
        setMeldung(null);
        void akteLaden(offen.place_id).then(() => {
            if (!abgebrochen) setAkteLaedt(false);
        });
        return () => {
            abgebrochen = true;
        };
    }, [offen, akteLaden]);

    return (
        <div className="flex h-full w-full flex-col overflow-hidden rounded-[24px] border border-white/[0.06] bg-[linear-gradient(155deg,rgba(4,16,14,0.96),rgba(2,8,9,0.98))]">
            {/* Kopf */}
            <header className="flex items-center gap-3 border-b border-white/[0.05] px-5 py-3.5">
                {offen ? (
                    <button
                        type="button"
                        onClick={() => setOffen(null)}
                        className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] text-white/50 transition hover:bg-white/[0.05] hover:text-white/80"
                    >
                        <ArrowLeft size={14} />
                        Flächen
                    </button>
                ) : (
                    <div className="min-w-0 flex-1">
                        <h2 className="text-sm text-white/88">Ortsansicht</h2>
                        <p className="text-[11px] text-white/32">
                            Haushalt, Pflege und Termine der eigenen Flächen — nicht öffentlich
                        </p>
                    </div>
                )}
                {offen && <div className="min-w-0 flex-1 truncate text-sm text-white/88">{offen.titel}</div>}
                <button
                    type="button"
                    onClick={() => void laden()}
                    aria-label="Neu laden"
                    className="rounded-lg p-1.5 text-white/34 transition hover:bg-white/[0.05] hover:text-white/70"
                >
                    <RefreshCw size={14} className={laedt ? 'animate-spin' : ''} />
                </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4">
                {offen ? (
                    akteLaedt && !akte ? (
                        <p className="text-sm text-white/34">Akte wird geladen …</p>
                    ) : akte ? (
                        <AkteAnsicht
                            antwort={akte}
                            onAendern={aendern}
                            speichert={speichert}
                            meldung={meldung}
                        />
                    ) : null
                ) : fehler ? (
                    <div className="rounded-2xl border border-red-300/16 bg-red-500/[0.05] px-5 py-6">
                        <p className="text-sm text-red-200/80">Die Ortsansicht ist gerade nicht erreichbar.</p>
                        <p className="mt-2 text-[12px] leading-relaxed text-white/38">
                            Es werden keine Flächen angezeigt, weil keine geladen werden konnten — nicht,
                            weil keine da wären.
                        </p>
                    </div>
                ) : laedt ? (
                    <p className="text-sm text-white/34">Flächen werden geladen …</p>
                ) : !liste || liste.flaechen.length === 0 ? (
                    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.015] px-5 py-6">
                        <p className="text-sm text-white/52">Noch keine Fläche angelegt.</p>
                        <p className="mt-2 text-[12px] leading-relaxed text-white/32">
                            Flächen entstehen in der Ortsredaktion. Sobald eine angelegt ist, erscheint
                            sie hier — auch bevor sie öffentlich sichtbar wird.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="flex gap-2">
                            <Kennzahl icon={<MapPin size={12} />} wert={String(liste.anzahl)} was="Flächen" />
                            {/* „0,00 €" wäre hier eine Behauptung: dass nichts
                                gekostet hat. Solange keine einzige Akte
                                angelegt ist, ist die Summe unbekannt, nicht
                                null — und ein Strich sagt genau das. */}
                            <Kennzahl
                                icon={<Coins size={12} />}
                                wert={liste.flaechen.some(f => f.akte_angelegt) ? euro(liste.summe_cent) : '—'}
                                was="Haushalt"
                            />
                            <Kennzahl
                                icon={<Scissors size={12} />}
                                wert={String(liste.offene_pflege)}
                                was="Pflege offen"
                            />
                        </div>
                        <div className="mt-4 space-y-1.5">
                            {liste.flaechen.map(f => (
                                <FlaechenZeile key={f.place_id} flaeche={f} onOeffnen={() => setOffen(f)} />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
