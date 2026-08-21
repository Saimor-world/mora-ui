"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ArrowUpRight, Building2, CalendarDays, FileText, Lock, Mail, Radio, Rss, Sparkles, X } from 'lucide-react';
import type { UniverseSignal } from '@/lib/universe/types';
import { buildRelationStrands, territoryDiameter, type RelationStrand } from '@/lib/universe/relations';
import { stableUniverseHash } from '@/lib/universe/layout';
import { useUniverseFieldStore } from '@/lib/store/universeFieldStore';
import type { FieldAnchor } from '@/lib/universe/anchors';
import { computeFallTarget, decodeFallPayload, FALL_PAYLOAD_MIME } from '@/lib/universe/fall';
import { FallCapture, type FallState } from '@/components/universe/FallCapture';

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
    metricSource: 'live' | 'derived' | 'missing';
    access: 'open' | 'locked';
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
}

const metricLabel: Record<OrganizationTerritory['metricSource'], string> = {
    live: 'live erfasst',
    derived: 'aus Struktur',
    missing: 'noch ohne Quelle',
};

const signalTone: Record<UniverseSignal['kind'], { stroke: string; icon: React.ReactNode; label: string }> = {
    mail: { stroke: '#7dd3fc', icon: <Mail size={11} />, label: 'Mail' },
    calendar: { stroke: '#6ee7b7', icon: <CalendarDays size={11} />, label: 'Kalender' },
    rss: { stroke: '#c4b5fd', icon: <Rss size={11} />, label: 'Feed' },
    nightwatch: { stroke: '#fcd34d', icon: <Radio size={11} />, label: 'Nightwatch' },
};

export function OrganizationField({
    lens,
    organizationName,
    territories,
    signals,
    selectedId,
    onSelect,
    onOpen,
    onAskMora,
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
        () => lens === 'relations' ? buildRelationStrands(signals, territories) : [],
        [lens, signals, territories],
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

    useLayoutEffect(() => {
        const publish = () => {
            const node = fieldRef.current;
            if (!node) {
                clearField();
                return;
            }
            const box = node.getBoundingClientRect();
            // Unter lg ist das Feld ausgeblendet und misst 0x0. Dann steht hier
            // nichts, und jede Schicht darueber zeichnet folgerichtig nichts -
            // statt auf einen Punkt zu kollabieren.
            setField(anchors, { left: box.left, top: box.top, width: box.width, height: box.height });
        };

        publish();
        window.addEventListener('resize', publish);
        return () => window.removeEventListener('resize', publish);
    }, [anchors, clearField, setField]);

    useEffect(() => () => clearField(), [clearField]);

    // Die eine Geste: etwas faellt ins Feld und findet seinen Bereich, ohne
    // dass jemand ihn nennt. computeFallTarget entscheidet ueber echte
    // Gruende (Namenstreffer, Substanz) - diese Komponente zeigt nur die
    // Entscheidung und behauptet nichts, was noch nicht wahr ist: der
    // Gegenstand wird nicht abgelegt, nur probeweise zugeordnet. Eine echte
    // Ablage braucht eine eigene, bestaetigte Handlung.
    const [fall, setFall] = useState<(FallState & { targetId: string; targetName: string; label: string }) | null>(null);
    const [landed, setLanded] = useState<{ targetName: string; label: string } | null>(null);
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
        });
    };

    const handleFallLanded = () => {
        if (fall) {
            onSelect(fall.targetId);
            setLanded({ targetName: fall.targetName, label: fall.label });
            if (landedTimer.current) window.clearTimeout(landedTimer.current);
            landedTimer.current = window.setTimeout(() => setLanded(null), 5000);
        }
        setFall(null);
    };

    useEffect(() => () => {
        if (landedTimer.current) window.clearTimeout(landedTimer.current);
    }, []);

    return (
        <section
            className="absolute inset-0 z-[18] overflow-hidden"
            aria-label={lens === 'organization' ? 'Organisation' : 'Zusammenhänge'}
        >
            {/* Die Zeile "Organisationsfeld" stand direkt unter dem Umschalter,
                der schon "Organisation" sagt - vier gestapelte Textzeilen, bevor
                irgendein Inhalt kam. Und max-w-[38ch] ohne mx-auto liess den
                Untertitel-Block links im 620px-Kopf kleben, waehrend sein Text
                zentriert war: er sass sichtbar neben der Mitte der Ueberschrift
                und brach in drei ausgefranste Zeilen. */}
            <header className="pointer-events-none absolute left-1/2 top-[120px] z-30 w-[min(620px,calc(100%-2rem))] -translate-x-1/2 text-center">
                <h1 className="text-[clamp(1.45rem,2.2vw,2.25rem)] font-light tracking-[-0.035em] text-white/92">
                    {lens === 'organization'
                        ? 'Woraus ' + organizationName + ' besteht'
                        : 'Was nachweislich zusammenhängt'}
                </h1>
                <p className="mx-auto mt-2.5 max-w-[54ch] text-xs leading-relaxed text-sky-50/46 md:text-sm">
                    {lens === 'organization'
                        ? 'Echte Bereiche, ihr Umfang und ihre Quellen. Größe zeigt Substanz – niemals erfundene Gesundheit.'
                        : 'Eingehende Signale landen bei dem Bereich, dem sie wirklich zugeordnet werden können.'}
                </p>
                {landed && (
                    <p className="pointer-events-none mx-auto mt-3 inline-flex max-w-[46ch] items-center gap-1.5 rounded-full border border-white/10 bg-[#08121e]/80 px-4 py-1.5 text-[11px] text-white/58 backdrop-blur-md">
                        „{landed.label}“ würde zu <strong className="font-medium text-white/82">{landed.targetName}</strong> fallen — probeweise, noch nicht abgelegt.
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
                onDragOver={handleFieldDragOver}
                onDrop={handleFieldDrop}
                className="absolute bottom-24 left-[168px] right-[168px] top-[210px] hidden lg:block xl:left-[285px] xl:right-[285px]"
            >
                <RelationLayer strands={strands} selectedId={selectedId} />
                {territories.map((territory) => (
                    <Territory
                        key={territory.id}
                        territory={territory}
                        signals={signals.filter((signal) => signal.targetId === territory.id)}
                        lens={lens}
                        selected={territory.id === selectedId}
                        dimmed={Boolean(selectedId && territory.id !== selectedId)}
                        onSelect={onSelect}
                    />
                ))}
            </div>

            {lens === 'relations' && (
                <div className="pointer-events-none absolute bottom-24 left-1/2 z-30 hidden -translate-x-1/2 lg:block">
                    <RelationLegend strands={strands} />
                </div>
            )}

            <div className="absolute inset-x-0 bottom-24 top-[220px] z-20 overflow-y-auto px-5 pb-8 lg:hidden">
                <div className="grid grid-cols-2 gap-x-4 gap-y-9">
                    {territories.map((territory) => (
                        <MobileTerritory
                            key={territory.id}
                            territory={territory}
                            signals={signals.filter((signal) => signal.targetId === territory.id)}
                            selected={territory.id === selectedId}
                            onSelect={onSelect}
                        />
                    ))}
                </div>
            </div>

            {selected && (
                <aside className="absolute inset-x-4 bottom-20 z-50 rounded-[28px] border border-white/12 bg-[#07131f]/94 p-5 text-white shadow-[0_30px_100px_rgba(0,0,0,0.58)] backdrop-blur-2xl lg:inset-x-auto lg:bottom-24 lg:right-8 lg:w-[370px] lg:p-6">
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
                    <div className="mt-5 grid grid-cols-3 gap-2">
                        <TruthValue icon={<Building2 size={13} />} value={selected.spaces} label="Bereiche" />
                        <TruthValue icon={<FileText size={13} />} value={selected.documents} label="Dokumente" />
                        <TruthValue icon={<Radio size={13} />} value={selectedSignals.length} label="Signale" />
                    </div>
                    {lens === 'relations' && (
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
    dimmed,
    onSelect,
}: {
    territory: OrganizationTerritory;
    signals: UniverseSignal[];
    lens: UniverseLens;
    selected: boolean;
    dimmed: boolean;
    onSelect: (id: string | null) => void;
}) {
    const accent = territory.color || '#67e8f9';
    const size = territoryDiameter(territory);
    // Eigene Phase je Bereich, abgeleitet aus der id: die Planeten treiben
    // dann nicht im Gleichschritt, und die Bewegung bleibt ueber Neuladen
    // hinweg dieselbe.
    const drift = stableUniverseHash(territory.id);
    const style = {
        left: territory.x + '%',
        top: territory.y + '%',
        '--territory-accent': accent,
        '--territory-size': size + 'px',
        '--territory-drift': (16 + (drift % 9)) + 's',
        '--territory-phase': '-' + ((drift >>> 4) % 13) + 's',
    } as CSSProperties;

    return (
        <button
            type="button"
            onClick={() => onSelect(selected ? null : territory.id)}
            className={'group absolute z-10 -translate-x-1/2 -translate-y-1/2 text-center transition-all duration-700 focus:outline-none ' +
                (selected ? 'z-30 scale-110' : 'hover:z-20 hover:scale-105') +
                (dimmed ? ' opacity-20 saturate-50' : ' opacity-100')}
            style={style}
            aria-pressed={selected}
            aria-label={territory.name + ' auswählen'}
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
            <span
                className="saimor-territory-body relative mx-auto flex items-center justify-center overflow-hidden rounded-full"
                style={{
                    width: 'var(--territory-size)',
                    height: 'var(--territory-size)',
                    color: accent,
                    background:
                        'radial-gradient(circle at 33% 27%, ' + accent + '66, ' + accent + '1f 38%, transparent 64%),' +
                        'radial-gradient(circle at 64% 80%, rgba(0,0,0,0.5), transparent 56%),' +
                        'linear-gradient(158deg, rgba(15,34,55,0.96), rgba(4,11,20,0.98))',
                    boxShadow:
                        'inset 0 1px 1px rgba(255,255,255,0.18),' +
                        'inset 0 -24px 44px rgba(0,0,0,0.5),' +
                        'inset 0 0 0 1px ' + accent + (selected ? '7a' : '4d') + ',' +
                        '0 18px 46px rgba(0,0,0,0.5),' +
                        '0 0 ' + (selected ? '64px' : '38px') + ' ' + accent + (selected ? '5c' : '2e'),
                }}
            >
                {territory.access === 'locked'
                    ? <Lock size={Math.round(size * 0.2)} strokeWidth={1.3} className="relative opacity-70" />
                    : <Building2 size={Math.round(size * 0.24)} strokeWidth={1.3} className="relative" style={{ filter: 'drop-shadow(0 0 10px ' + accent + '55)' }} />}
            </span>

            {/* Frueher sassen diese Marker INNERHALB der Blase - die traegt
                overflow-hidden, und ihre Mittelpunkte lagen bei bis zu 98%.
                Die Kreise wurden am Rand abgeschnitten. Jetzt haengen sie am
                Button, der nicht clippt, und zaehlen statt zu streuen. */}
            {lens === 'relations' && signals.length > 0 && (
                <span className="pointer-events-none absolute -top-1 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/12 bg-[#08121e]/92 px-2 py-1 shadow-[0_6px_20px_rgba(0,0,0,0.45)] backdrop-blur-sm">
                    {Array.from(new Set(signals.map((signal) => signal.kind))).slice(0, 4).map((kind) => (
                        <span key={kind} style={{ color: signalTone[kind].stroke }} title={signalTone[kind].label}>
                            {signalTone[kind].icon}
                        </span>
                    ))}
                    <span className="text-[9px] font-semibold tabular-nums text-white/62">{signals.length}</span>
                </span>
            )}
            <span className="mt-3 block text-sm font-medium tracking-[-0.01em] text-white/88">{territory.name}</span>
            <span className="mt-1 flex items-center justify-center gap-2 text-[9px] uppercase tracking-[0.14em] text-white/34">
                <span>{territory.spaces} Bereiche</span>
                <span className="h-0.5 w-0.5 rounded-full bg-white/30" />
                <span>{territory.documents} Docs</span>
            </span>
            {territory.access === 'locked' ? (
                <span className="mt-1.5 block text-[9px] text-amber-200/62">Mitgliedschaft erforderlich</span>
            ) : territory.metricSource === 'missing' && (
                <span className="mt-1.5 block text-[9px] text-amber-200/52">Quelle fehlt</span>
            )}
        </button>
    );
}

function MobileTerritory({
    territory,
    signals,
    selected,
    onSelect,
}: {
    territory: OrganizationTerritory;
    signals: UniverseSignal[];
    selected: boolean;
    onSelect: (id: string | null) => void;
}) {
    const accent = territory.color || '#67e8f9';
    return (
        <button
            type="button"
            onClick={() => onSelect(selected ? null : territory.id)}
            className={'flex min-w-0 flex-col items-center rounded-[28px] px-2 py-4 text-center transition ' +
                (selected ? 'bg-white/[0.08]' : 'bg-transparent')}
        >
            <span
                className="relative flex h-24 w-24 items-center justify-center rounded-full border border-white/10"
                style={{
                    color: accent,
                    background: 'radial-gradient(circle at 38% 30%, ' + accent + '30, transparent 38%), rgba(3,13,24,0.75)',
                    boxShadow: '0 0 36px ' + accent + '22',
                }}
            >
                {territory.access === 'locked' ? <Lock size={22} strokeWidth={1.2} /> : <Building2 size={23} strokeWidth={1.2} />}
                {signals.length > 0 && (
                    <span className="absolute -right-1 top-2 flex h-6 min-w-6 items-center justify-center rounded-full border border-amber-100/25 bg-slate-950 px-1.5 text-[9px] text-amber-200">
                        {signals.length}
                    </span>
                )}
            </span>
            <span className="mt-3 max-w-full truncate text-sm font-medium text-white/84">{territory.name}</span>
            <span className="mt-1 text-[9px] uppercase tracking-[0.12em] text-white/30">
                {territory.spaces} Bereiche · {territory.documents} Docs
            </span>
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
function RelationLayer({ strands, selectedId }: { strands: RelationStrand[]; selectedId: string | null }) {
    if (strands.length === 0) return null;

    return (
        <svg
            className="pointer-events-none absolute inset-0 z-[6] h-full w-full overflow-visible"
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

    if (strands.length === 0) {
        return (
            <div className="rounded-full border border-dashed border-white/14 bg-[#08121e]/72 px-5 py-2.5 text-xs text-white/44 backdrop-blur-md">
                Aktuell hängt nichts nachweisbar zusammen. Saimôr zeichnet hier bewusst keine Linie.
            </div>
        );
    }

    return (
        <div className="flex items-center gap-4 rounded-full border border-white/10 bg-[#08121e]/76 px-5 py-2.5 text-[10px] text-white/52 backdrop-blur-md">
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

function TruthValue({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
    return (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] px-3 py-3">
            <span className="text-cyan-100/46">{icon}</span>
            <span className="mt-2 block text-lg font-medium text-white/88">{value}</span>
            <span className="block text-[9px] uppercase tracking-[0.14em] text-white/28">{label}</span>
        </div>
    );
}