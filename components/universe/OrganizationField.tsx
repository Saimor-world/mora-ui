"use client";

import { attentionScores, attentionDiameter, attentionLevel } from '@/lib/universe/autonomy';
import { PlanetSphere, AmbientMoons, moonBackground } from './PlanetSphere';
import { depthZ, universePlanetSize } from '@/lib/universe/stylebookPlanets';
import { glyphFor } from '@/lib/universe/planetModel';
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ArrowUpRight, BookOpen, Building2, CalendarDays, FileText, Hammer, Lock, Mail, Radio, Rss, ShieldCheck, Sparkles, Wallet, X } from 'lucide-react';
import type { UniverseSignal } from '@/lib/universe/types';
import { buildRelationStrands, territoryDiameter, type RelationStrand } from '@/lib/universe/relations';
import { stableUniverseHash } from '@/lib/universe/layout';
import { buildOrbitals, type Orbitals } from '@/lib/universe/orbitals';
import { emphasisFor } from '@/lib/universe/emphasis';
import { useUniverseFieldStore } from '@/lib/store/universeFieldStore';
import type { FieldAnchor } from '@/lib/universe/anchors';
import { computeFallTarget, decodeFallPayload, FALL_PAYLOAD_MIME, type FallSource } from '@/lib/universe/fall';
import { FallCapture, type FallState } from '@/components/universe/FallCapture';
import { isUniverseV2Enabled } from '@/lib/universe/morgen';
import { ORBIT, orbitRxOf } from '@/lib/universe/planetModel';
import '@/app/universe-orbits.css';
import { MoraCore } from '@/components/universe/MoraCore';
import type { PlanetChip } from '@/lib/universe/planetModel';
import { MyzelLayer } from '@/components/universe/MyzelLayer';

export type UniverseLens = 'organization' | 'relations';

export interface OrganizationTerritory {
    id: string;
    name: string;
    description?: string | null;
    color?: string | null;
    x: number;
    y: number;
    spaces: number;
    folders: number;
    documents: number;
    /** Die echten Bereiche dieser Abteilung - jeder wird ein Mond. Zahl
     *  allein (spaces) reicht dafuer nicht: ein Mond traegt einen Namen. */
    spaceList?: { id: string; name: string; documents?: number; reading?: boolean; countUnknown?: boolean }[];
    metricSource: 'live' | 'derived' | 'missing';
    access: 'open' | 'locked';
    /** Planeten-Modell v1 (CORE /v3/universe): wenn gesetzt, bestimmt der Server Aussehen, Größe und Zustand. */
    model?: {
        kind: 'system' | 'domain' | 'cluster';
        archetype: string;
        glyph: string;
        seed: number;
        diameter: number;
        state: 'seed' | 'active' | 'sleeping' | 'hidden';
        brightness: number;
        meta: string;
        glow?: { level: string; reason: string } | null;
        demo?: boolean;
        chips?: PlanetChip[];
    };
}

interface Props {
    lens: UniverseLens;
    organizationName: string;
    territories: OrganizationTerritory[];
    signals: UniverseSignal[];
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    onOpen: (id: string) => void;
    onAskMora: (territory: OrganizationTerritory) => void;
    /** Legt einen gefallenen Gegenstand wirklich in der Abteilung ab.
     *  Gibt zurueck, ob es geklappt hat - die Oberflaeche darf keinen
     *  Erfolg zeigen, den es nicht gab. */
    onFile: (departmentId: string, label: string, kind: FallSource['kind']) => Promise<boolean>;
    /** Oeffnet einen Ordner dort, wo er wirklich liegt - nicht als
     *  generisches Vorschaufenster. */
    onOpenMoon: (folderId: string, folderName: string) => void;
    /** Worauf Môra gerade schaut - erzeugt die Blickhierarchie im Feld. */
    attentionId?: string | null;
    /** Opt-in (OS-Prototyp): Faeden starten hier statt an den Feldraendern
     *  und werden auf das Feld beschnitten. */
    strandOrigin?: { x: number; y: number };
    /** Opt-in: Inhalt genau in der Feldmitte (z. B. der MÔRA-Kern). */
    centerSlot?: React.ReactNode;
    /** Opt-in: Klassen fuer Kopf, Feld und Legende, wenn das Feld in einen
     *  anderen Rahmen (Shell mit Dock) eingebettet ist. */
    frame?: { header?: string; field?: string; legend?: string; mobile?: string };
    /** Opt-in: hellere Planeten (staerkere Akzentverlaeufe, lesbare Symbole). */
    vivid?: boolean;
    /** Opt-in: eigenes Detailpanel statt des eingebauten (OS-Prototyp). */
    renderDetail?: (territory: OrganizationTerritory) => React.ReactNode;
}

const metricLabel: Record<OrganizationTerritory['metricSource'], string> = {
    live: 'live erfasst',
    derived: 'aus Struktur',
    missing: 'noch ohne Quelle',
};

const signalToneLegacy: Record<UniverseSignal['kind'], { stroke: string; icon: React.ReactNode; label: string }> = {
    mail: { stroke: '#7dd3fc', icon: <Mail size={11} />, label: 'Mail' },
    calendar: { stroke: '#6ee7b7', icon: <CalendarDays size={11} />, label: 'Kalender' },
    rss: { stroke: '#c4b5fd', icon: <Rss size={11} />, label: 'Feed' },
    nightwatch: { stroke: '#fcd34d', icon: <Radio size={11} />, label: 'Nightwatch' },
};
/** v2: Signalfäden in Systemfarben – Gold = Termin/Aktion, Creme = Post/Feed, Warnton nur für die Wache. */
const signalTone: Record<UniverseSignal['kind'], { stroke: string; icon: React.ReactNode; label: string }> = isUniverseV2Enabled()
    ? {
        mail: { ...signalToneLegacy.mail, stroke: '#F7F4E9' },
        calendar: { ...signalToneLegacy.calendar, stroke: '#D6A848' },
        rss: { ...signalToneLegacy.rss, stroke: '#CFC8B4' },
        nightwatch: { ...signalToneLegacy.nightwatch, stroke: '#E0876A' },
    }
    : signalToneLegacy;


/** Mond-Beschriftung: Zahl nur aus CORE; verbunden ohne Zahl heißt "wird gelesen", nie "leer". */
export function moonCaption(moon: { documents: number; reading?: boolean; countUnknown?: boolean }): string {
    if (moon.reading) return 'verbunden · wird gelesen';
    if (moon.countUnknown) return 'verbunden';
    if (moon.documents === 0) return 'noch leer';
    return moon.documents + (moon.documents === 1 ? ' Dokument' : ' Dokumente');
}

export function OrganizationField({
    lens,
    organizationName,
    territories,
    signals,
    selectedId,
    onSelect,
    onOpen,
    onAskMora,
    onFile,
    onOpenMoon,
    attentionId = null,
    strandOrigin,
    centerSlot,
    frame,
    vivid = false,
    renderDetail,
}: Props) {
    const selected = useMemo(
        () => territories.find((item) => item.id === selectedId) ?? null,
        [selectedId, territories],
    );
    const selectedSignals = useMemo(
        () => selected ? signals.filter((signal) => signal.targetId === selected.id) : [],
        [selected, signals],
    );
    const strands = useMemo(
        () => lens === 'relations' ? buildRelationStrands(signals, territories, strandOrigin) : [],
        [lens, signals, territories, strandOrigin],
    );

    // Das Feld misst sich selbst und veroeffentlicht, wo seine Bereiche
    // stehen. Vorher trug jede Schicht darueber ihre eigene Kopie der
    // Positionen - MyceliumOverlay zeichnete dadurch jahrelang neben die
    // Planeten, ohne dass es auffiel. Eine Kopie faellt nicht auf, wenn sie
    // falsch wird; eine Messung schon.
    const fieldRef = useRef<HTMLDivElement | null>(null);
    const setField = useUniverseFieldStore((state) => state.setField);
    const clearField = useUniverseFieldStore((state) => state.clearField);

    const anchors = useMemo<FieldAnchor[]>(
        () => territories.map((territory) => ({
            id: territory.id,
            name: territory.name,
            color: territory.color || '#67e8f9',
            x: territory.x,
            y: territory.y,
        })),
        [territories],
    );

    // Planeten haben feste Pixelgroessen (bis 152px plus Name darunter), das
    // Feld aber nicht: zwischen den Widget-Spalten bleiben auf einem Laptop
    // ~870x590px. Dort passten die Planeten schlicht nicht nebeneinander und
    // ueberlappten. Sie schrumpfen deshalb mit dem Feld - voll ab ~1350x770.
    const [fieldScale, setFieldScale] = useState(1);
    const [hoverId, setHoverId] = useState<string | null>(null);
    // Fokus-Flug: ein ausgewählter Modell-Planet wird zur Mitte (700 ms, CSS), Esc führt zurück.
    const zoomTarget = useMemo(() => {
        const t = territories.find((x) => x.id === selectedId && x.model);
        return t ? { x: t.x, y: t.y, name: t.name } : null;
    }, [territories, selectedId]);
    useEffect(() => {
        if (!zoomTarget) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onSelect(null); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [zoomTarget, onSelect]);
    const [todayAreas, setTodayAreas] = useState<string[]>(() => (typeof window !== 'undefined' && (window as unknown as { __uv2TodayAreas?: string[] }).__uv2TodayAreas) || []);
    useEffect(() => {
        const on = (e: Event) => setTodayAreas(((e as CustomEvent).detail as string[]) || []);
        window.addEventListener('uv2:today-areas', on);
        return () => window.removeEventListener('uv2:today-areas', on);
    }, []);
    // Abklingen über Stunden: alle 10 min neu bewerten (Übergang 1,6 s im CSS).
    const [decayTick, setDecayTick] = useState(0);
    useEffect(() => { const t = window.setInterval(() => setDecayTick((n) => n + 1), 600_000); return () => window.clearInterval(t); }, []);
    // Autonomie: Môra ordnet nach Aufmerksamkeit (echte Signale), nicht nach Menge.
    const attention = useMemo(() => {
        const extra: Record<string, number> = {};
        todayAreas.forEach((area, i) => {
            const a = area.trim().toLowerCase();
            const t = territories.find((x) => x.name.trim().toLowerCase() === a);
            if (t) extra[t.id] = (extra[t.id] || 0) + (i === 0 ? 2.5 : 2);
        });
        const scores = attentionScores(territories.map((t) => t.id), signals, extra, Date.now() + decayTick * 0);
        return { scores, any: Object.values(scores).some((v) => v > 0) };
    }, [territories, signals, todayAreas, decayTick]);
    // Dieselbe Rangfolge geht an die Deutung (LAGE), damit Text und Feld übereinstimmen.
    useEffect(() => {
        const ranked = territories.map((t) => ({ name: t.name, score: attention.scores[t.id] || 0 })).sort((a, b) => b.score - a.score);
        const detail = { ohneQuelle: territories.filter((t) => t.metricSource === 'missing' && t.id !== '__weitere').map((t) => t.name), vorn: ranked.filter((r) => r.score >= 0.85).map((r) => r.name), ruhig: attention.any ? ranked.filter((r) => r.score < 0.35).map((r) => r.name) : [] };
        (window as unknown as { __uv2Attention?: typeof detail }).__uv2Attention = detail;
        window.dispatchEvent(new CustomEvent('uv2:attention', { detail }));
    }, [territories, attention]);
    const publishedRef = useRef('');
    const territoryCountRef = useRef(territories.length); territoryCountRef.current = territories.length;

    useLayoutEffect(() => {
        const publish = () => {
            const node = fieldRef.current;
            if (!node) {
                clearField();
                return;
            }
            const box = node.getBoundingClientRect();
            if (box.width > 0 && box.height > 0) {
                const immersive = isUniverseV2Enabled() && document.documentElement.dataset.uv2Immersive === 'on';
                const fit = Math.max(0.6, Math.min(1, box.width / (isUniverseV2Enabled() ? (territoryCountRef.current > 5 ? 900 : 780) : 1350), box.height / 770));
                const next = fit * (immersive ? 1.4 : 1);
                setFieldScale((current) => (Math.abs(current - next) < 0.01 ? current : next));
            }
            // Unter lg ist das Feld ausgeblendet und misst 0x0. Dann steht hier
            // nichts, und jede Schicht darueber zeichnet folgerichtig nichts -
            // statt auf einen Punkt zu kollabieren.
            // Nur veröffentlichen, wenn sich wirklich etwas geändert hat – sonst schaukeln
            // sich Feld und Universe gegenseitig hoch (z. B. während einer Kamerafahrt).
            const rect = { left: Math.round(box.left), top: Math.round(box.top), width: Math.round(box.width), height: Math.round(box.height) };
            const key = JSON.stringify([anchors, rect]);
            if (key === publishedRef.current) return;
            publishedRef.current = key;
            setField(anchors, rect);
        };

        publish();
        window.addEventListener('resize', publish);
        // Room controls change the field's CSS bounds without a window resize.
        const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(publish) : null;
        if (fieldRef.current) resizeObserver?.observe(fieldRef.current);
        const roomObserver = new MutationObserver(publish);
        roomObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-uv2-immersive'] });
        return () => {
            window.removeEventListener('resize', publish);
            resizeObserver?.disconnect();
            roomObserver.disconnect();
        };
    }, [anchors, clearField, setField]);

    useEffect(() => () => { publishedRef.current = ''; clearField(); }, [clearField]);

    // Die eine Geste: etwas faellt ins Feld und findet seinen Bereich, ohne
    // dass jemand ihn nennt. computeFallTarget entscheidet ueber echte
    // Gruende (Namenstreffer, Substanz).
    //
    // Seit es POST /v3/departments/{id}/intake gibt, wird auch wirklich
    // abgelegt - im Eingang GENAU der Abteilung, auf die es sichtbar
    // gefallen ist. Vorher stand hier "nur probeweise zugeordnet", weil der
    // einzige vorhandene Weg (der Firmen-Eingang) es woanders abgelegt
    // haette, als das Bild zeigt.
    //
    // Der Zustand ist dreiteilig, nicht zweiteilig: 'filing' waehrend CORE
    // arbeitet, dann 'filed' ODER 'failed'. Eine Animation, die immer
    // "abgelegt" sagt, waere wieder eine Behauptung.
    const [fall, setFall] = useState<(FallState & { targetId: string; targetName: string; label: string; kind: FallSource['kind'] }) | null>(null);
    const [landed, setLanded] = useState<{ targetName: string; label: string; state: 'filing' | 'filed' | 'failed' } | null>(null);
    const landedTimer = useRef<number | null>(null);

    const handleFieldDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        if (!event.dataTransfer.types.includes(FALL_PAYLOAD_MIME)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    };

    const handleFieldDrop = (event: React.DragEvent<HTMLDivElement>) => {
        const raw = event.dataTransfer.getData(FALL_PAYLOAD_MIME);
        if (!raw) return;
        event.preventDefault();

        const source = decodeFallPayload(raw);
        const node = fieldRef.current;
        if (!source || !node) return;

        const result = computeFallTarget(source, territories);
        const target = result && territories.find((item) => item.id === result.targetId);
        if (!target) return;

        const box = node.getBoundingClientRect();
        setFall({
            from: { x: event.clientX, y: event.clientY },
            to: { x: box.left + (target.x / 100) * box.width, y: box.top + (target.y / 100) * box.height },
            color: target.color || '#67e8f9',
            targetId: target.id,
            targetName: target.name,
            label: source.label,
            kind: source.kind,
        });
    };

    const handleFallLanded = () => {
        if (fall) {
            onSelect(fall.targetId);
            // Jetzt wirklich ablegen, nicht nur zeigen. Der Zustand beginnt
            // als 'filing' und wird erst zu 'filed', wenn CORE bestaetigt
            // hat - eine Animation darf keine Ablage vortaeuschen, die noch
            // laeuft oder scheitert.
            setLanded({ targetName: fall.targetName, label: fall.label, state: 'filing' });
            void onFile(fall.targetId, fall.label, fall.kind)
                .then((ok) => {
                    setLanded({ targetName: fall.targetName, label: fall.label, state: ok ? 'filed' : 'failed' });
                    if (landedTimer.current) window.clearTimeout(landedTimer.current);
                    landedTimer.current = window.setTimeout(() => setLanded(null), ok ? 5000 : 9000);
                });
        }
        setFall(null);
    };

    useEffect(() => () => {
        if (landedTimer.current) window.clearTimeout(landedTimer.current);
    }, []);

    return (
        <section
            data-uv2-field className="absolute inset-0 z-[18] overflow-hidden"
            aria-label={lens === 'organization' ? 'Organisation' : 'Zusammenhänge'}
        >
            {/* Die Zeile "Organisationsfeld" stand direkt unter dem Umschalter,
                der schon "Organisation" sagt - vier gestapelte Textzeilen, bevor
                irgendein Inhalt kam. Und max-w-[38ch] ohne mx-auto liess den
                Untertitel-Block links im 620px-Kopf kleben, waehrend sein Text
                zentriert war: er sass sichtbar neben der Mitte der Ueberschrift
                und brach in drei ausgefranste Zeilen. */}
            <header className={frame?.header ?? "pointer-events-none absolute left-1/2 top-[120px] z-30 w-[min(620px,calc(100%-2rem))] -translate-x-1/2 text-center"}>
                {/* Ein Feld, ein Titel. Frueher wechselte die Ueberschrift mit
                    der Linse ("Woraus X besteht" / "Was nachweislich
                    zusammenhaengt") - seit die beiden Linsen zu einem Feld
                    verschmolzen sind, gibt es nur noch eine Frage, die dieser
                    Ort beantwortet. */}
                {/* Universe v2: MÔRAs Begrüßung ist die eine Überschrift – kein zweiter Titel. */}
                {!isUniverseV2Enabled() && (
                <h1 className="text-[clamp(1.45rem,2.2vw,2.25rem)] font-light tracking-[-0.035em] text-white/92">
                    Woraus {organizationName} besteht
                </h1>
                )}
                {/* Die erklaerende Zeile darunter ("Echte Bereiche, ihr Umfang...")
                    ist raus. Sie erklaerte die Metapher - nuetzlich beim ersten
                    Mal, aber sie besetzte genau den Streifen, den das Datenband
                    jetzt fuellt. "Viel zu wenig info, ich weiss gar nicht wo ich
                    hinschauen soll" war der Befund; ein Erklaertext ist keine
                    Information, ein laufendes Band echter Werte schon. */}
                {landed && (
                    <p className={'pointer-events-none mx-auto mt-3 inline-flex max-w-[52ch] items-center gap-1.5 rounded-full border px-4 py-1.5 text-[11px] ' +
                        (landed.state === 'failed'
                            ? 'border-amber-300/25 bg-[#1b1206]/85 text-amber-100/80'
                            : 'border-white/10 bg-[#08121e]/80 text-white/58')}>
                        {landed.state === 'filing' && <>„{landed.label}“ wird in <strong className="font-medium text-white/82">{landed.targetName}</strong> abgelegt…</>}
                        {landed.state === 'filed' && <>„{landed.label}“ liegt jetzt im Eingang von <strong className="font-medium text-white/82">{landed.targetName}</strong>.</>}
                        {landed.state === 'failed' && <>„{landed.label}“ konnte nicht abgelegt werden. Nichts wurde gespeichert.</>}
                    </p>
                )}
            </header>

            {/* Die Grenze stand auf xl (1280px). Ein Fenster mit 1245 nutzbaren
                Pixeln - also ein ganz normaler Laptop - fiel damit auf die
                Handy-Ansicht zurueck: ein 2x2-Raster runder Symbole und der
                Detailbereich als Balken ueber die halbe Hoehe. Auf einem
                grossen Bildschirm sieht das billig aus, und genau das war der
                Eindruck.

                Jetzt ab lg (1024px), mit Raendern, die mitwachsen statt fest
                570px zu belegen - bei 1024 blieben davon nur 454px Feld. */}
            <div
                ref={fieldRef}
                data-uv2-plane
                data-uv2-focus={territories.some((t) => t.model) && (selectedId || hoverId) ? '' : undefined}
                data-uv2-zoom={zoomTarget ? '' : undefined}
                style={zoomTarget ? ({ transformOrigin: zoomTarget.x + '% ' + zoomTarget.y + '%', transform: 'translate(' + (40 - zoomTarget.x) + '%, ' + (56 - zoomTarget.y) + '%) scale(1.3)' } as CSSProperties) : undefined}
                onPointerOver={(e) => { const el = (e.target as HTMLElement).closest('[data-uv2-planet]'); setHoverId(el ? el.getAttribute('data-uv2-planet') : null); }}
                onPointerLeave={() => setHoverId(null)}
                onDragOver={handleFieldDragOver}
                onDrop={handleFieldDrop}
                // isolate: the planets' depth order (z 10–110) stays inside the field, under panels and legend.
                className={(frame?.field ?? "absolute bottom-24 left-[168px] right-[168px] top-[210px] hidden lg:block xl:left-[285px] xl:right-[285px]") + ' isolate'}
                data-testid="organization-field-box"
            >
                {territories.some((t) => t.model) && (
                    // Eine saubere Bahn je Planet; der Planet sitzt mittig darauf.
                    <svg className="uv2-orbits" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                        {territories.filter((t) => t.model).map((t) => {
                            const rx = orbitRxOf(t.x, t.y);
                            return <ellipse key={t.id} cx="50" cy="50" rx={rx} ry={rx * ORBIT.aspect} data-kind={t.model?.kind} data-selected={t.id === selectedId || undefined} data-hover={t.id === hoverId || undefined} />;
                        })}
                    </svg>
                )}
                {territories.some((t) => t.model) && (
                    <MyzelLayer planets={territories.filter((t) => t.model).map((t) => ({ id: t.id, x: t.x, y: t.y }))} focusId={hoverId || selectedId} />
                )}
                {territories.some((t) => t.model) && (
                    <MoraCore
                        planets={territories.filter((t) => t.model).map((t) => ({ id: t.id, x: t.x, y: t.y, needs: !!t.model?.glow }))}
                    />
                )}
                <RelationLayer strands={strands} selectedId={selectedId} clip={Boolean(strandOrigin)} />
                {centerSlot ? <div className="absolute left-1/2 top-1/2 z-[8] -translate-x-1/2 -translate-y-1/2">{centerSlot}</div> : null}
                {territories.map((territory) => (
                    <Territory
                        key={territory.id}
                        attention={attention.scores[territory.id] || 0}
                        anySignal={attention.any}
                        territory={territory}
                        signals={signals.filter((signal) => signal.targetId === territory.id)}
                        lens={lens}
                        selected={territory.id === selectedId}
                        fieldScale={fieldScale}
                        vivid={vivid}
                        emphasis={emphasisFor({ id: territory.id, attentionId, selectedId })}
                        onSelect={onSelect}
                        onOpenMoon={onOpenMoon}
                    />
                ))}
            </div>

            {zoomTarget && (
                <nav className="uv2-crumb" aria-label="Pfad">
                    <button type="button" onClick={() => onSelect(null)}>Universe</button>
                    <span aria-hidden="true">›</span>
                    <span aria-current="page">{zoomTarget.name}</span>
                    <kbd>Esc</kbd>
                </nav>
            )}
            {lens === 'relations' && !(isUniverseV2Enabled() && selectedSignals.length === 0) && (
                <div className={frame?.legend ?? "pointer-events-none absolute bottom-24 left-1/2 z-30 hidden -translate-x-1/2 lg:block"} data-testid="relation-legend">
                    <RelationLegend strands={strands} />
                </div>
            )}

            <div className={frame?.mobile ?? (isUniverseV2Enabled() ? 'absolute inset-x-0 bottom-[168px] z-20 overflow-x-auto px-4 lg:hidden' : 'absolute inset-x-0 bottom-24 top-[220px] z-20 overflow-y-auto px-5 pb-8 lg:hidden')} data-testid="mobile-territories" style={isUniverseV2Enabled() ? { scrollbarWidth: 'none' } : undefined}>
                <div className={isUniverseV2Enabled() ? 'mx-auto flex w-max gap-1' : 'grid grid-cols-2 gap-x-4 gap-y-9'}>
                    {territories.map((territory) => (
                        <MobileTerritory
                            key={territory.id}
                            territory={territory}
                            signals={signals.filter((signal) => signal.targetId === territory.id)}
                            selected={territory.id === selectedId}
                            onSelect={onSelect}
                            vivid={vivid}
                        />
                    ))}
                </div>
            </div>

            {selected && renderDetail ? renderDetail(selected) : null}
            {selected && !renderDetail && (
                <aside data-testid="planet-detail" style={isUniverseV2Enabled() ? { background: 'rgba(22,24,30,0.58)', backdropFilter: 'blur(40px) saturate(160%)', WebkitBackdropFilter: 'blur(40px) saturate(160%)', borderColor: 'transparent', borderRadius: 20, boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,0.14), 0 20px 50px rgba(0,0,0,0.45)' } : undefined} className="absolute inset-x-4 bottom-20 z-50 rounded-[28px] border border-white/12 bg-[#07131f]/88 p-5 text-white shadow-[0_30px_100px_rgba(0,0,0,0.58)] backdrop-blur-xl lg:inset-x-auto lg:bottom-24 lg:right-8 lg:w-[370px] lg:p-6">
                    <button
                        type="button"
                        onClick={() => onSelect(null)}
                        className="absolute right-4 top-4 rounded-full p-2 text-white/38 transition hover:bg-white/10 hover:text-white"
                        aria-label="Auswahl schließen"
                    >
                        <X size={16} />
                    </button>
                    <div className="text-[9px] font-semibold uppercase tracking-[0.24em] text-cyan-100/48">
                        {selected.metricSource === 'missing' ? 'Datenquelle fehlt' : metricLabel[selected.metricSource]}
                    </div>
                    <h2 className="mt-3 pr-8 text-xl font-medium text-white/94">{selected.name}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-white/48">
                        {selected.description || 'Noch keine Beschreibung hinterlegt.'}
                    </p>
                    {isUniverseV2Enabled() ? (
                        <p className="mt-5 border-y border-white/[0.09] py-3 text-[10px] uppercase tracking-[0.2em] text-white/45" data-testid="planet-detail-facts" style={{ fontFamily: 'Inter, -apple-system, system-ui, sans-serif' }}>
                            {[selected.spaces ? `${selected.spaces} ${selected.spaces === 1 ? 'Bereich' : 'Bereiche'}` : null,
                              selected.documents ? `${selected.documents} Dokumente` : null,
                              selectedSignals.length ? `${selectedSignals.length} Signale` : null].filter(Boolean).join(' · ') || 'Noch leer'}
                        </p>
                    ) : (
                    <div className="mt-5 grid grid-cols-3 gap-2">
                        <TruthValue icon={<Building2 size={13} />} value={selected.spaces} label="Bereiche" />
                        <TruthValue icon={<FileText size={13} />} value={selected.documents} label="Dokumente" />
                        <TruthValue icon={<Radio size={13} />} value={selectedSignals.length} label="Signale" />
                    </div>
                    )}
                    {lens === 'relations' && selectedSignals.length > 0 && (
                        <div className="mt-5 space-y-2">
                            {selectedSignals.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-white/12 px-4 py-3 text-xs leading-relaxed text-white/38">
                                    Keine belegte Beziehung. Saimôr zeichnet hier bewusst keine Verbindung.
                                </div>
                            ) : selectedSignals.slice(0, 3).map((signal) => (
                                <div key={signal.kind + '-' + signal.id} className="flex items-start gap-3 border-t border-white/[0.07] pt-3">
                                    <Radio size={12} className="mt-0.5 shrink-0 text-amber-200/72" />
                                    <div className="min-w-0">
                                        <div className="truncate text-xs text-white/74">{signal.title}</div>
                                        <div className="mt-0.5 text-[9px] uppercase tracking-[0.12em] text-white/28">{signal.subtitle}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            disabled={selected.access === 'locked'}
                            data-uv2-open="true"
                            onClick={() => onOpen(selected.id)}
                            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/38"
                        >
                            {selected.access === 'locked'
                                ? <>Mitgliedschaft erforderlich <Lock size={13} /></>
                                : <>Arbeitsraum <ArrowUpRight size={14} /></>}
                        </button>
                        <button
                            type="button"
                            onClick={() => onAskMora(selected)}
                            className="inline-flex items-center gap-2 rounded-full border border-cyan-100/16 px-4 py-2.5 text-xs font-semibold text-cyan-100/72 transition hover:border-cyan-100/34 hover:text-cyan-50"
                        >
                            <Sparkles size={13} /> Mit Môra klären
                        </button>
                    </div>
                </aside>
            )}

            <FallCapture fall={fall} onLanded={handleFallLanded} />
        </section>
    );
}

function Territory({
    territory,
    signals,
    lens,
    selected,
    fieldScale = 1,
    vivid = false,
    emphasis,
    onSelect,
    onOpenMoon,
    attention = 0,
    anySignal = false,
}: {
    attention?: number;
    anySignal?: boolean;
    territory: OrganizationTerritory;
    signals: UniverseSignal[];
    lens: UniverseLens;
    selected: boolean;
    fieldScale?: number;
    vivid?: boolean;
    emphasis: { opacity: number; scale: number };
    onSelect: (id: string | null) => void;
    onOpenMoon: (folderId: string, folderName: string) => void;
}) {
    const accent = territory.color || '#67e8f9';
    const v2 = isUniverseV2Enabled();
    const model = territory.model;
    const quiet = model && (model.state === 'sleeping' || model.state === 'seed');
    const today = !!model?.chips?.some((c: any) => c.tone && c.tone !== 'calm');
    const rawSize = Math.round((model ? model.diameter * (quiet ? 0.6 : today ? 1.24 : 1.08) : v2 ? attentionDiameter(attention, anySignal) : territoryDiameter(territory)) * fieldScale);
    // Stylebook 22.10.: planets from the CORE planet model are 58–72 px in the universe.
    const size = model ? universePlanetSize(rawSize) : rawSize;
    const attnLevel = attentionLevel(attention, anySignal);
    // Monde = echte Bereiche, Sterne = echte Dokumente. Beides kommt aus
    // dem, was CORE wirklich liefert - nichts davon ist Zierde.
    const orbitals = useMemo(
        () => buildOrbitals({
            id: territory.id,
            diameter: size,
            spaces: territory.spaceList ?? [],
            documentCount: territory.documents,
        }),
        [territory.id, territory.spaceList, territory.documents, size],
    );
    // Eigene Phase je Bereich, abgeleitet aus der id: die Planeten treiben
    // dann nicht im Gleichschritt, und die Bewegung bleibt ueber Neuladen
    // hinweg dieselbe.
    const drift = stableUniverseHash(territory.id);
    const style = {
        left: territory.x + '%',
        top: territory.y + '%',
        '--territory-accent': accent,
        '--territory-size': size + 'px',
        // Depth order: planets further down (closer) sit above those behind; the chosen one on top.
        zIndex: selected ? 200 : depthZ(territory.y),
        '--territory-drift': (16 + (drift % 9)) + 's',
        '--territory-phase': '-' + ((drift >>> 4) % 13) + 's',
        // Licht kommt von der Mitte (MÔRAs Licht): Terminator und Randlicht drehen sich zu ihr.
        '--uv2-lit': (Math.atan2(50 - territory.y, 50 - territory.x) * 180 / Math.PI + 135).toFixed(1) + 'deg',
    } as CSSProperties;

    return (
        <button
            type="button"
            onClick={() => onSelect(selected ? null : territory.id)}
            data-uv2-planet={territory.id}
            data-planet-kind={model?.kind}
            data-planet-state={model?.state}
            data-uv2-today={today ? '' : undefined}
            data-planet-glow={model?.glow ? model.glow.level : undefined}
            data-uv2-attn={v2 ? attnLevel : undefined}
            data-uv2-nosource={v2 && territory.metricSource === 'missing' ? '' : undefined}
            className={'group absolute z-10 text-center transition-all duration-700 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#6f8f78] ' +
                (selected ? 'z-30' : 'hover:z-20')}
            style={{
                ...style,
                // Blickhierarchie statt gleichmaessiger Flaeche: was
                // Aufmerksamkeit braucht, tritt hervor - der Rest tritt
                // zurueck, bleibt aber lesbar. Liegt nichts an, ist alles
                // gleich (siehe lib/universe/emphasis.ts).
                opacity: emphasis.opacity,
                transform: 'translate(-50%, -50%) scale(' + emphasis.scale + ')',
            }}
            aria-pressed={selected}
            aria-label={territory.name + ' auswählen'}
            // Fuer Screenreader ist "Growth auswaehlen" richtig - eine
            // Aufforderung. Als Zielname im Môra-Chip ist es falsch: dort
            // heisst dieser Planet "Growth".
            data-mora-label={territory.name}
            data-testid={territory.access === 'locked' ? 'locked-territory-' + territory.id : 'territory-' + territory.id}
        >
            {/* Vorher: Akzentfarbe bei '2e' - 18% Deckkraft - ueber einem Koerper
                aus rgba(3,13,24,0.72). Die Farbe kam nie durch, alle vier
                Bereiche sahen aus wie derselbe graue Klumpen. Dazu ein
                unrunder border-radius (42% 58% 48% 52% / ...), der nicht
                organisch wirkte, sondern wie ein misslungener Kreis, und drei
                uebereinanderliegende Schleier, die nur Unschaerfe zufuegten.

                Jetzt: eine echte Lichtquelle oben links, ein sichtbarer Rand in
                der Bereichsfarbe, ein sauberer Kreis. */}
            {/* Der Planet ist nicht mehr allein: Monde sind echte Bereiche,
                Sterne echte Dokumente. Die Huelle traegt die Drift, damit das
                ganze System zusammen treibt statt der Koerper allein - und sie
                clippt NICHT, damit Monde ihre Bahn ausserhalb ziehen koennen.
                Der Koerper selbst behaelt overflow-hidden fuer seine
                Innenverlaeufe. */}
            <span
                className="saimor-territory-body relative mx-auto block"
                style={{ width: 'var(--territory-size)', height: 'var(--territory-size)' }}
            >
                {model && territory.access !== 'locked' ? (
                    <PlanetSphere lit={Math.atan2(50 - territory.y, 50 - territory.x)} name={territory.name} size={size} selected={selected} seed={model.seed % 9973} glyph={glyphFor(model.glyph)} archetype={model.archetype} dim={model.state === 'seed' ? 'seed' : model.state === 'sleeping' ? 'sleeping' : false} />
                ) : isUniverseV2Enabled() && territory.access !== 'locked' ? (
                    <PlanetSphere name={territory.name} size={size} selected={selected} seed={drift} glyph={planetGlyph(territory.name)} />
                ) : (
                <span
                    className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-full"
                    style={{
                        color: accent,
                        background: vivid
                            ? 'radial-gradient(circle at 33% 27%, ' + accent + 'c0, ' + accent + '4d 40%, transparent 70%),' +
                              'radial-gradient(circle at 66% 82%, rgba(0,0,0,0.38), transparent 58%),' +
                              'linear-gradient(158deg, rgba(26,56,84,0.96), rgba(8,20,34,0.98))'
                            : 'radial-gradient(circle at 33% 27%, ' + accent + '66, ' + accent + '1f 38%, transparent 64%),' +
                              'radial-gradient(circle at 64% 80%, rgba(0,0,0,0.5), transparent 56%),' +
                              'linear-gradient(158deg, rgba(15,34,55,0.96), rgba(4,11,20,0.98))',
                        boxShadow:
                            'inset 0 1px 1px rgba(255,255,255,0.18),' +
                            'inset 0 -24px 44px rgba(0,0,0,0.5),' +
                            'inset 0 0 0 1px ' + accent + (selected ? '7a' : vivid ? '99' : '4d') + ',' +
                            '0 18px 46px rgba(0,0,0,0.5),' +
                            '0 0 ' + (selected ? '64px' : vivid ? '46px' : '38px') + ' ' + accent + (selected ? '5c' : vivid ? '66' : '2e'),
                    }}
                >
                    {territory.access === 'locked'
                        ? <Lock size={Math.round(size * 0.2)} strokeWidth={1.3} className="relative opacity-70" />
                        : (() => { const Glyph = isUniverseV2Enabled() ? planetGlyph(territory.name) : Building2; return <Glyph size={Math.round(size * (vivid ? 0.3 : 0.24))} strokeWidth={vivid ? 1.6 : 1.3} className="relative" style={{ color: vivid ? '#f2fbff' : undefined, filter: 'drop-shadow(0 0 ' + (vivid ? '8px ' + accent : '10px ' + accent + '55') + ')' }} />; })()}
                </span>
                )}

                <OrbitalSystem orbitals={orbitals} accent={accent} selected={selected} onOpenMoon={onOpenMoon} planetName={territory.name} />
                {false && isUniverseV2Enabled() && territory.access !== 'locked' && orbitals.moons.length === 0 && <AmbientMoons name={territory.name} size={size} seed={drift} />}
            </span>

            {/* Frueher sassen diese Marker INNERHALB der Blase - die traegt
                overflow-hidden, und ihre Mittelpunkte lagen bei bis zu 98%.
                Die Kreise wurden am Rand abgeschnitten. Jetzt haengen sie am
                Button, der nicht clippt, und zaehlen statt zu streuen. */}
            {lens === 'relations' && signals.length > 0 && (
                <span data-territory-badge className="pointer-events-none absolute -top-1 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/12 bg-[#08121e]/96 px-2 py-1 shadow-[0_6px_20px_rgba(0,0,0,0.45)]">
                    {Array.from(new Set(signals.map((signal) => signal.kind))).slice(0, 4).map((kind) => (
                        <span key={kind} style={{ color: signalTone[kind].stroke }} title={signalTone[kind].label}>
                            {signalTone[kind].icon}
                        </span>
                    ))}
                    <span className="text-[9px] font-semibold tabular-nums text-white/62">{signals.length}</span>
                </span>
            )}
            <span data-territory-label className="saimor-territory-name mt-3 block text-sm font-medium tracking-[-0.01em] text-white/88">{territory.name}</span>
            {model ? (
                model.meta ? (
                    <span data-territory-meta className={'uv2-planet-meta mt-1.5 block text-[12px] leading-[16px] tabular-nums ' + (model.state === 'seed' ? 'text-[#D6A848]/80' : 'text-[#F7F4E9]/55')}>
                        {model.meta}
                    </span>
                ) : null
            ) : isUniverseV2Enabled() ? (
                // v2: Meta nur, wenn es etwas zu zählen gibt – null ist Rauschen. Normale Schreibweise, 11px.
                (territory.spaces > 0 || territory.documents > 0) && (
                    <span data-territory-meta className="uv2-planet-meta mt-2 block font-mono text-[10px] leading-[14px] tracking-[0.08em] tabular-nums text-[#F7F4E9]/45">
                        {[territory.spaces > 0 && `${territory.spaces} ${territory.spaces === 1 ? 'Bereich' : 'Bereiche'}`,
                          territory.documents > 0 && `${territory.documents} ${territory.documents === 1 ? 'Dokument' : 'Dokumente'}`].filter(Boolean).join(' · ')}
                    </span>
                )
            ) : (
            <span data-territory-meta className="mt-1 flex items-center justify-center gap-2 text-[9px] uppercase tracking-[0.14em] text-white/34">
                <span>{territory.spaces} {territory.spaces === 1 ? 'Bereich' : 'Bereiche'}</span>
                <span className="h-0.5 w-0.5 rounded-full bg-white/30" />
                <span>{territory.documents} {territory.documents === 1 ? 'Dokument' : 'Dokumente'}</span>
            </span>
            )}
            {/* Was sich hier bewegt - an einer FESTEN Stelle unter dem
                Planeten, nicht als schwebendes Etikett am kreisenden Mond.
                Dort landete es je nach Bahnstellung mitten auf der
                Beschriftung des Planeten. Eine Zeile, die nicht wandert,
                kann auch nichts verdecken. */}
            {orbitals.moons.find((moon) => moon.inMotion) && (
                <span
                    className="mt-1.5 flex items-center justify-center gap-1.5 text-[9px] font-medium tracking-[0.02em]"
                    style={{ color: accent }}
                >
                    <span className="inline-block h-1 w-1 rounded-full" style={{ background: accent }} />
                    {orbitals.moons.find((moon) => moon.inMotion)!.name}
                </span>
            )}
            {model && <PlanetHud name={territory.name} meta={model.meta} chips={model.chips ?? []} size={size} documents={territory.documents} seed={drift} />}
            {territory.access === 'locked' ? (
                <span className="mt-1.5 block text-[9px] text-amber-200/62">Mitgliedschaft erforderlich</span>
            ) : territory.metricSource === 'missing' && !isUniverseV2Enabled() && (
                <span className="mt-1.5 block text-[9px] text-amber-200/52">Quelle fehlt</span>
            )}
        </button>
    );
}

/** v2: Jeder Planet bekommt ein eigenes Zeichen in derselben Strichstärke statt fünfmal dasselbe Gebäude. */
export function planetGlyph(name: string): React.ComponentType<any> {
    const n = name.toLowerCase();
    if (/finanz|wirtschaft|finance|buchhalt/.test(n)) return Wallet;
    if (/post|termin|kalender|mail/.test(n)) return Mail;
    if (/werkstatt|engineering|technik|product|produkt/.test(n)) return Hammer;
    if (/wissen|knowledge|doku/.test(n)) return BookOpen;
    if (/wache|watch|sicherheit/.test(n)) return ShieldCheck;
    return Building2;
}

function MobileTerritory({
    territory,
    signals,
    selected,
    onSelect,
    vivid = false,
}: {
    territory: OrganizationTerritory;
    signals: UniverseSignal[];
    selected: boolean;
    onSelect: (id: string | null) => void;
    vivid?: boolean;
}) {
    const accent = territory.color || '#67e8f9';
    return (
        <button
            type="button"
            onClick={() => onSelect(selected ? null : territory.id)}
            data-mora-label={territory.name}
            data-testid={isUniverseV2Enabled() ? 'territory-' + territory.id : undefined}
            className={(isUniverseV2Enabled() ? 'w-[112px] shrink-0 ' : '') + 'flex min-w-0 flex-col items-center rounded-[28px] px-2 py-4 text-center transition ' +
                (selected ? 'bg-white/[0.08]' : 'bg-transparent')}
        >
            <span
                className={'saimor-territory-body relative flex items-center justify-center rounded-full border border-white/10 ' + (isUniverseV2Enabled() ? 'h-16 w-16' : 'h-24 w-24')}
                style={{
                    color: accent,
                    background: vivid
                        ? 'radial-gradient(circle at 33% 27%, ' + accent + 'c0, ' + accent + '4d 40%, transparent 70%), linear-gradient(158deg, rgba(26,56,84,0.96), rgba(8,20,34,0.98))'
                        : 'radial-gradient(circle at 38% 30%, ' + accent + '30, transparent 38%), rgba(3,13,24,0.75)',
                    boxShadow: vivid ? 'inset 0 0 0 1px ' + accent + '99, 0 0 40px ' + accent + '55' : '0 0 36px ' + accent + '22',
                }}
            >
                {territory.access === 'locked' ? <Lock size={22} strokeWidth={1.2} /> : (() => { const G = isUniverseV2Enabled() ? planetGlyph(territory.name) : Building2; return <G size={vivid ? 28 : isUniverseV2Enabled() ? 18 : 23} strokeWidth={vivid ? 1.6 : 1.2} style={vivid ? { color: '#f2fbff', filter: 'drop-shadow(0 0 8px ' + accent + ')' } : undefined} />; })()}
                {signals.length > 0 && (
                    <span className="absolute -right-1 top-2 flex h-6 min-w-6 items-center justify-center rounded-full border border-amber-100/25 bg-slate-950 px-1.5 text-[9px] text-amber-200">
                        {signals.length}
                    </span>
                )}
            </span>
            <span className="saimor-territory-name mt-3 max-w-full truncate text-sm font-medium text-white/84">{territory.name}</span>
            {!isUniverseV2Enabled() && <span className="mt-1 text-[9px] uppercase tracking-[0.12em] text-white/30">
                {territory.spaces} {territory.spaces === 1 ? 'Bereich' : 'Bereiche'} · {territory.documents} {territory.documents === 1 ? 'Dokument' : 'Dokumente'}
            </span>}
        </button>
    );
}

/**
 * Zeichnet die Beziehungen, die die Linse "Zusammenhaenge" verspricht.
 *
 * Bis hierher zeichnete sie gar keine: buildSoftUniverseRoute lag seit dem
 * Umbau abd3233 verwaist in lib/universe/layout.ts, exportiert und getestet,
 * aber von keiner Komponente aufgerufen. Beide Linsen zeigten dasselbe Bild,
 * nur mit anderer Ueberschrift.
 *
 * Die Kurve laeuft in denselben Prozentkoordinaten wie die Bereiche selbst,
 * darum preserveAspectRatio="none" - die Linie soll den Planeten treffen,
 * nicht ihre Form behalten. vectorEffect haelt die Strichstaerke konstant.
 */
function RelationLayer({ strands, selectedId, clip = false }: { strands: RelationStrand[]; selectedId: string | null; clip?: boolean }) {
    if (strands.length === 0) return null;

    return (
        <svg
            className={'pointer-events-none absolute inset-0 z-[6] h-full w-full ' + (clip ? 'overflow-hidden' : 'overflow-visible')}
            data-testid="relation-layer"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
        >
            {strands.map((strand) => {
                const tone = signalTone[strand.kind].stroke;
                const muted = Boolean(selectedId && strand.targetId !== selectedId);
                return (
                    <g key={strand.id} opacity={muted ? 0.12 : 1}>
                        <path
                            d={strand.d}
                            fill="none"
                            stroke={tone}
                            strokeWidth={strand.dashed ? 1 : 1.6}
                            strokeOpacity={strand.dashed ? 0.34 : 0.62}
                            strokeLinecap="round"
                            strokeDasharray={strand.dashed ? '3 5' : undefined}
                            vectorEffect="non-scaling-stroke"
                        />
                        <circle
                            cx={strand.endX}
                            cy={strand.endY}
                            r={1.1}
                            fill={tone}
                            fillOpacity={strand.dashed ? 0.4 : 0.85}
                            vectorEffect="non-scaling-stroke"
                        />
                    </g>
                );
            })}
        </svg>
    );
}

/**
 * Die Ueberschrift sagt "nachweislich". Ohne diese Legende sieht ein
 * Namenstreffer im Mailbetreff genauso aus wie eine echte department_id am
 * Vorfall - und die Zusage waere nicht gedeckt.
 *
 * Und wenn nichts zusammenhaengt, muss das Feld das sagen. Genau das war der
 * Grund, warum die zweite Linse wie die erste aussah: bei null Signalen blieb
 * ein leeres Feld mit anderer Ueberschrift stehen.
 */
function RelationLegend({ strands }: { strands: RelationStrand[] }) {
    const assigned = strands.filter((strand) => !strand.dashed).length;
    const inferred = strands.length - assigned;

    // Solange "Zusammenhaenge" eine eigene Linse war, musste ein leerer
    // Zustand erklaeren, warum diese Ansicht nichts zeigt. Seit beide Linsen
    // ein Feld sind, gibt es nichts zu erklaeren: es sind einfach keine
    // Verbindungen da, und eine dauerhafte Zeile "hier ist nichts" ist dann
    // nur noch Laerm unter den Planeten.
    if (strands.length === 0) return null;

    return (
        <div className="flex items-center gap-4 rounded-full border border-white/10 bg-[#08121e]/94 px-5 py-2.5 text-[10px] text-white/52">
            <span className="flex items-center gap-2">
                <svg width="22" height="6" aria-hidden="true"><line x1="1" y1="3" x2="21" y2="3" stroke="#fcd34d" strokeWidth="1.6" strokeLinecap="round" /></svg>
                {assigned} belegt
            </span>
            <span className="h-3 w-px bg-white/12" />
            <span className="flex items-center gap-2">
                <svg width="22" height="6" aria-hidden="true"><line x1="1" y1="3" x2="21" y2="3" stroke="#7dd3fc" strokeWidth="1" strokeDasharray="3 4" strokeLinecap="round" /></svg>
                {inferred} nur vermutet
            </span>
        </div>
    );
}

/**
 * Das Sonnensystem einer Abteilung: Monde sind ihre Bereiche, Sterne ihre
 * Dokumente.
 *
 * Bis hierher war der Sternenhimmel Kulisse - huebsch, aber ohne Bezug zu
 * irgendetwas. Jetzt gehoert jeder Punkt im Bild zu etwas, das existiert:
 * ein Mond ist ein Bereich mit Namen und id, ein Stern ein Dokument. Ein
 * leerer Bereich hat kein System - das Bild ist dann leer, weil die Sache
 * leer ist.
 *
 * pointer-events-none durchgehend: das System ist Anzeige, nicht Ziel. Der
 * Klick gehoert dem Planeten darunter, sonst waeren die Monde
 * Klickfallen vor dem eigentlichen Bedienelement.
 */
function OrbitalSystem({ orbitals, accent, selected, onOpenMoon, planetName }: { orbitals: Orbitals; accent: string; selected: boolean; onOpenMoon: (folderId: string, folderName: string) => void; planetName?: string }) {
    const v2 = isUniverseV2Enabled() && Boolean(planetName);
    if (orbitals.moons.length === 0 && orbitals.stars.length === 0) return null;

    return (
        <span className="pointer-events-none absolute inset-0">
            {/* 64 Sterne in DREI gemalten Ebenen statt 64 Elementen.
                Frueher war jeder Stern ein eigenes animiertes div mit
                box-shadow - die Kosten kamen von der Bauweise, nicht von der
                Anzahl. Darum jetzt mehr Sterne UND weniger Arbeit: gerastert
                als radial-gradient, drei Ebenen mit eigener Phase, damit das
                Funkeln bleibt und nicht wie ein Blinklicht aussieht. */}
            {orbitals.starLayers.map((layer, band) => (
                layer === 'none' ? null : (
                    <span
                        key={'starband-' + band}
                        className="saimor-doc-star absolute inset-0"
                        aria-hidden="true"
                        style={{
                            color: accent,
                            backgroundImage: layer,
                            backgroundRepeat: 'no-repeat',
                            '--star-delay': (band * 1.7).toFixed(1) + 's',
                            '--star-duration': (4.5 + band) + 's',
                        } as CSSProperties}
                    />
                )
            ))}

            {orbitals.moons.map((moon) => (
                <span
                    key={moon.id}
                    className="saimor-moon-orbit absolute left-1/2 top-1/2"
                    style={{
                        '--moon-start': ((moon.angle * 180) / Math.PI).toFixed(1) + 'deg',
                        '--moon-distance': moon.distance.toFixed(1) + 'px',
                        '--moon-duration': moon.duration + 's',
                    } as CSSProperties}
                >
                    {/* Marius: "die Monde sind grau, es sind keine echten
                        Inhalte. Ich muss drueberfahren koennen, damit ich sehe,
                        was es ist." Der Mond traegt jetzt sichtbar den Namen
                        seines Bereichs - ein title-Attribut allein ist ein
                        Systemtipp, der erst nach Sekunden erscheint und nicht
                        zum Bild gehoert. */}
                    <span className="group/moon absolute" style={{ marginLeft: -moon.size / 2, marginTop: -moon.size / 2 }}>
                        {/* Der Mond ist ein eigenes Ziel: ein Klick fuehrt in
                            SEINEN Ordner, nicht in ein generisches
                            Vorschaufenster. stopPropagation, damit der Klick
                            nicht am Planeten darunter haengen bleibt. */}
                        <span
                            role="button"
                            tabIndex={0}
                            aria-label={moon.name + ' öffnen'}
                            data-mora-label={moon.name}
                            onClick={(event) => { event.stopPropagation(); onOpenMoon(moon.id, moon.name); }}
                            onKeyDown={(event) => {
                                if (event.key !== 'Enter' && event.key !== ' ') return;
                                event.preventDefault();
                                event.stopPropagation();
                                onOpenMoon(moon.id, moon.name);
                            }}
                            className="pointer-events-auto block cursor-pointer rounded-full transition-transform duration-300 group-hover/moon:scale-[1.6]"
                            style={{
                                width: moon.size,
                                height: moon.size,
                                // Kein harter Rand: ein Lichtkoerper, kein
                                // Abzeichen. Die Deckkraft kommt aus der
                                // Frische - ein heute angefasster Ordner
                                // leuchtet, ein lange ruhender glimmt nur.
                                background: v2 ? moonBackground(planetName!, moon.freshness) :
                                    'radial-gradient(circle at 36% 30%, rgba(255,255,255,' + (0.55 * moon.freshness + 0.2).toFixed(2) + '), ' +
                                    accent + ' 62%, ' + accent + '44 100%)',
                                opacity: v2 ? 0.7 + moon.freshness * 0.3 : 0.45 + moon.freshness * 0.55,
                                boxShadow: v2 ? 'none' : '0 0 ' + (6 + moon.freshness * 14).toFixed(0) + 'px ' + accent +
                                    Math.round(60 + moon.freshness * 120).toString(16).padStart(2, '0'),
                            }}
                        />
                        {/* Kein Zahl-Abzeichen mehr. Marius: "die Monde sind
                            nicht schoen, die Zahlen sind auch Quatsch." Er hat
                            recht - ein Zaehler am Objekt ist
                            Benachrichtigungs-Sprache ("3 Ungelesene"), und auf
                            einem kreisenden Koerper kann man ihn ohnehin nicht
                            lesen.

                            Stattdessen traegt die Form die Information:
                            Groesse sagt wieviel drin liegt, Helligkeit sagt wie
                            lange es her ist. Die genauen Zahlen stehen in der
                            Karte beim Darueberfahren, wo Zeit zum Lesen ist. */}
                        {/* Der bewegte Mond traegt einen pulsierenden Ring und
                            seinen Namen OHNE Hover. Marius: "Ich will doch
                            nicht ueber jeden Mond fahren muessen, um zu sehen,
                            wo die wichtige Kampagne ist." */}
                        {moon.inMotion && (
                            <span
                                className="saimor-motion-ring pointer-events-none absolute rounded-full border"
                                    style={{
                                        width: moon.size,
                                        height: moon.size,
                                    borderColor: accent,
                                }}
                            />
                        )}
                        <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2.5 -translate-x-1/2 whitespace-nowrap rounded-xl border border-white/10 bg-[#08121e]/97 px-3 py-2 text-left opacity-0 shadow-[0_8px_26px_rgba(0,0,0,0.6)] transition-opacity duration-200 group-hover/moon:opacity-100 group-focus-within/moon:opacity-100">
                            <span className="block text-[11px] font-medium text-white/92">{moon.name}</span>
                            <span className="mt-1 block text-[9px] uppercase tracking-[0.13em] text-white/45">
                                {moonCaption(moon)}
                            </span>
                        </span>
                    </span>
                </span>
            ))}
        </span>
    );
}

function TruthValue({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
    return (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] px-3 py-3">
            <span className="text-cyan-100/46">{icon}</span>
            <span className="mt-2 block text-lg font-medium text-white/88">{value}</span>
            <span className="block text-[9px] uppercase tracking-[0.14em] text-white/28">{label}</span>
        </div>
    );
}
/** HUD statt Karte: feine Eckklammern + kurzes Etikett; dazu das Sternbild der Dateien (nur bei Zeigen/Auswahl sichtbar, per CSS). */
function PlanetHud({ name, meta, chips, size, documents, seed }: { name: string; meta: string; chips: PlanetChip[]; size: number; documents: number; seed: number }) {
    const box = Math.round(size + 28);
    const n = Math.min(9, Math.max(0, documents));
    const pts = Array.from({ length: n }, (_, i) => {
        const a = ((seed >>> (i % 16)) % 360) * (Math.PI / 180) + i * 0.7;
        const r = size * (0.85 + ((seed >>> ((i * 3) % 20)) % 70) / 100);
        return { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.8, a: Math.atan2(Math.sin(a) * 0.8, Math.cos(a)) };
    }).sort((p, q) => p.a - q.a);
    const ext = size * 2.4;
    return (
        <>
            <span className="uv2-hud" aria-hidden="true" style={{ width: box, height: box, marginLeft: -box / 2, top: size / 2 - box / 2 }}>
                <i /><i /><i /><i />
                <span className="uv2-hud__label">{name}</span>
                <span className="uv2-hud__chips">
                    {chips.length ? chips.map((c, i) => (
                        <span key={i} className="uv2-chip" data-tone={c.tone}>{c.value != null && <b>{c.value}</b>}{c.label}</span>
                    )) : <span className="uv2-chip" data-tone="calm">{meta || 'ruhig'}</span>}
                </span>
            </span>
            {n >= 2 && (
                <svg className="uv2-constellation" aria-hidden="true" width={ext * 2} height={ext * 2} viewBox={`${-ext} ${-ext} ${ext * 2} ${ext * 2}`} style={{ marginLeft: -ext, top: size / 2 - ext }}>
                    <polyline points={pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} />
                    {pts.map((p, i) => <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={1.3} />)}
                </svg>
            )}
        </>
    );
}
