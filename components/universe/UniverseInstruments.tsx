'use client';

/**
 * Universe V2 – rechte Instrumentenspalte (Spalten 10–12 des 12er-Rasters).
 * Ein Ton, eine Typo-Hierarchie: Mono-Label (Gold) · Serif-Titel (Creme) · Inter-Text.
 * Alle Werte sind echte Daten; fehlt etwas, steht das ehrlich da.
 */
import React from 'react';
import type { CalendarPreviewItem, FeedPreviewItem, LiveSourceStatus, MailPreviewItem } from '@/lib/hooks/useCommunicationLiveData';
import type { NightwatchIncidentItem } from '@/lib/openflow/nightwatch';
import type { BusinessSummary } from '@/lib/business/mrr';
import type { SubstanceBar } from '@/lib/universe/substanceChart';
import { SubstanceWidget } from './SubstanceWidget';
import { CountUp } from './UniverseLinks';
import { useActionEvents, type ActionEvent } from '@/lib/hooks/useActionEvents';

/** Nur wirklich ausgeführte Handlungen von Môra/System – keine Navigation des Nutzers, keine Vorschläge. */
export function doneForYou(events: ActionEvent[]): ActionEvent[] {
    return events
        .filter((e) => e.status === 'done' && e.actor_role !== 'owner' && e.actor_role !== 'user' && e.intent !== 'navigate' && e.intent !== 'navigation' && Boolean(e.message))
        .sort((a, b) => Date.parse(b.timestamp || '') - Date.parse(a.timestamp || ''));
}

function DoneTrace() {
    const { events } = useActionEvents(true);
    const done = doneForYou(events || []).slice(0, 3);
    return (
        <section data-uv2-instrument="getan" className="uv2-inst" data-testid="uv2-getan">
            <header className="flex items-baseline justify-between gap-3">
                <p className="uv2-inst-label">Was ich für dich getan habe</p>
                <span className="uv2-inst-aside">{done.length || '–'}</span>
            </header>
            {done.length === 0
                ? <p className="uv2-inst-text mt-2 uv2-getan-leer">Noch nichts selbstständig erledigt. Ich handle erst, wenn du freigibst.</p>
                : done.map((e) => (
                    <div key={e.action_id} className="uv2-inst-row">
                        <span className="flex items-baseline justify-between gap-2">
                            <span className="uv2-inst-label">Erledigt</span>
                            <span className="uv2-inst-aside">{relativeTime(e.timestamp)}</span>
                        </span>
                        <span className="uv2-inst-text truncate">{e.message}</span>
                    </div>
                ))}
        </section>
    );
}

/** "vor 3 Std", "in 2 Std", "morgen", "vor 4 T" – ruhig und kurz. */
export function relativeTime(iso?: string, now = Date.now()): string {
    if (!iso) return '';
    const t = Date.parse(iso);
    if (Number.isNaN(t)) return '';
    const diff = t - now;
    const abs = Math.abs(diff);
    const min = Math.round(abs / 60000);
    const h = Math.round(abs / 3600000);
    const d = Math.round(abs / 86400000);
    const fmt = (v: string) => (diff >= 0 ? 'in ' + v : 'vor ' + v);
    if (min < 1) return 'jetzt';
    if (min < 60) return fmt(min + ' Min');
    if (h < 24) return fmt(h + ' Std');
    if (d === 1) return diff >= 0 ? 'morgen' : 'gestern';
    return fmt(d + ' T');
}

function calendarIso(item?: CalendarPreviewItem): string | undefined {
    if (!item?.date) return undefined;
    if (item.date.includes('T')) return item.date;
    return item.time ? `${item.date}T${item.time.length === 5 ? item.time : item.time.slice(0, 5)}:00` : `${item.date}T09:00:00`;
}

/** 14 Tage, ein Strich je Tag; Höhe = Zahl der Vorfälle, Glut = noch offen. */
export function incidentDays(incidents: NightwatchIncidentItem[], now = new Date()): { day: Date; open: number; closed: number }[] {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13);
    const days = Array.from({ length: 14 }, (_, i) => ({ day: new Date(start.getFullYear(), start.getMonth(), start.getDate() + i), open: 0, closed: 0 }));
    for (const inc of incidents) {
        const t = Date.parse(inc.detected_at || (inc as { created_at?: string }).created_at || inc.updated_at || '');
        if (Number.isNaN(t)) continue;
        const idx = Math.floor((t - start.getTime()) / 86400000);
        if (idx < 0 || idx > 13) continue;
        const closed = ['resolved', 'closed', 'dismissed'].includes(String(inc.status || 'open').toLowerCase());
        days[idx][closed ? 'closed' : 'open'] += 1;
    }
    return days;
}

function Block({ label, title, aside, children, id }: { label: string; title?: React.ReactNode; aside?: React.ReactNode; children?: React.ReactNode; id: string }) {
    return (
        <section data-uv2-instrument={id} className="uv2-inst">
            <header className="flex items-baseline justify-between gap-3">
                <p className="uv2-inst-label">{label}</p>
                {aside && <span className="uv2-inst-aside">{aside}</span>}
            </header>
            {title && <h2 className="uv2-inst-title">{title}</h2>}
            {children}
        </section>
    );
}

function Row({ label, when, value, onClick, link }: { label: string; when?: string; value: string; onClick: () => void; link?: string }) {
    return (
        <button type="button" onClick={onClick} data-uv2-flow={link} className="uv2-inst-row group">
            <span className="flex items-baseline justify-between gap-2">
                <span className="uv2-inst-label">{label}</span>
                {when && <span className="uv2-inst-aside">{when}</span>}
            </span>
            <span className="uv2-inst-text truncate">{value}</span>
            <span aria-hidden className="uv2-flow-dot" />
        </button>
    );
}

export function UniverseInstruments(props: {
    mail: MailPreviewItem[]; calendar: CalendarPreviewItem[]; feed: FeedPreviewItem[];
    mailStatus?: LiveSourceStatus; calendarStatus?: LiveSourceStatus;
    incidents: NightwatchIncidentItem[]; openIncidents: NightwatchIncidentItem[];
    business: BusinessSummary; substanceBars: SubstanceBar[];
    onSelectTerritory: (id: string) => void;
    onOpenMail: () => void; onOpenCalendar: () => void; onOpenFeed: () => void; onOpenNightwatch: () => void; onOpenIntegrations?: () => void;
}) {
    const cal = props.calendar[0];
    const mail = props.mail[0];
    const feed = props.feed[0];
    const days = incidentDays(props.incidents);
    const peak = Math.max(1, ...days.map((d) => d.open + d.closed));
    const total14 = days.reduce((n, d) => n + d.open + d.closed, 0);
    const open = props.openIncidents.length;
    const b = props.business;
    const amount = b.activeCount > 0 && b.currency
        ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: b.currency, maximumFractionDigits: 0 }).format(b.monthlyRevenueMinor / 100)
        : null;

    return (
        <div className="uv2-instruments" data-testid="uv2-instruments">
            <Block id="horizont" label="Horizont">
                <Row label="Kalender" when={relativeTime(calendarIso(cal))} link="calendar"
                    value={props.calendarStatus === 'unavailable' ? 'Nicht erreichbar – Verbindung prüfen' : cal?.title || 'Keine Termine im Horizont'}
                    onClick={props.calendarStatus === 'unavailable' && props.onOpenIntegrations ? props.onOpenIntegrations : props.onOpenCalendar} />
                <Row label="Mail" when={relativeTime(mail?.date)} link="mail"
                    value={props.mailStatus === 'unavailable' ? 'Nicht erreichbar – Verbindung prüfen' : mail?.subject || 'Posteingang ruhig'}
                    onClick={props.mailStatus === 'unavailable' && props.onOpenIntegrations ? props.onOpenIntegrations : props.onOpenMail} />
                <Row label="Feed" when={relativeTime((feed as { publishedAt?: string; published_at?: string } | undefined)?.publishedAt || (feed as { published_at?: string } | undefined)?.published_at)} link="rss"
                    value={feed?.title || 'Keine neuen Feed-Signale'} onClick={props.onOpenFeed} />
            </Block>

            <SubstanceWidget bars={props.substanceBars} onSelect={props.onSelectTerritory} />

            <Block id="wache" label="Wache · 14 Tage" aside={open ? <><CountUp value={open} /> offen</> : 'ruhig'}>
                <button type="button" onClick={props.onOpenNightwatch} data-mora-label="Nightwatch" className="block w-full text-left" data-testid="uv2-wache-timeline">
                    {/* Wenige echte Daten sind der Normalfall: eine ruhige Grundlinie mit
                        Tagespunkten; nur Tage mit Vorfällen bekommen einen Strich. */}
                    <span className={'uv2-timeline' + (total14 <= 2 ? ' is-sparse' : '')} aria-label={`${total14} Vorfälle in 14 Tagen, ${open} offen`}>
                        {days.map((d, i) => {
                            const n = d.open + d.closed;
                            return (
                                <span key={i} className={'uv2-tick' + (n ? ' has-n' : '') + (i === 13 ? ' is-today' : '') + (d.open ? ' is-open' : '')}
                                    style={{ height: n ? 8 + (n / peak) * 16 : undefined, animationDelay: (0.6 + i * 0.03) + 's' }}
                                    title={d.day.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) + ': ' + n} />
                            );
                        })}
                    </span>
                    <span className="mt-2 flex justify-between uv2-inst-aside">
                        <span>{total14 === 0 ? 'keine Vorfälle' : `${total14} ${total14 === 1 ? 'Vorfall' : 'Vorfälle'}`}</span><span>heute</span>
                    </span>
                    {props.openIncidents[0] && <span className="uv2-inst-text mt-2 block truncate">{props.openIncidents[0].title}</span>}
                </button>
            </Block>

            <Block id="wirtschaft" label="Wirtschaft" aside={amount ? `${b.activeCount} Abo${b.activeCount === 1 ? '' : 's'}` : 'Paddle bereit'}>
                <p className="uv2-inst-text">{amount ? <>Monatlich <span className="uv2-inst-figure">{amount}</span></> : 'Noch kein Umsatz – das erste Abo erscheint hier.'}</p>
            </Block>
        </div>
    );
}


/**
 * LAGE: linkes Drittel (Spalten 1–3). Signale = was hereinkam, Deutung = was es
 * heißt – nur aus echten Zählungen abgeleitet, nichts erfunden.
 */
export function LageSignals(props: {
    mail: MailPreviewItem[]; calendar: CalendarPreviewItem[]; feed: FeedPreviewItem[];
    openIncidents: NightwatchIncidentItem[]; substanceBars: SubstanceBar[];
    onOpenMail: () => void; onOpenCalendar: () => void; onOpenFeed: () => void; onOpenNightwatch: () => void;
}) {
    type Sig = { kind: string; title: string; when?: string; t: number; open: () => void };
    const sigs: Sig[] = [];
    props.openIncidents.slice(0, 2).forEach((i) => sigs.push({ kind: 'Wache', title: i.title || 'Vorfall', when: relativeTime(i.detected_at || (i as { created_at?: string }).created_at), t: Date.parse(i.detected_at || (i as { created_at?: string }).created_at || '') || 0, open: props.onOpenNightwatch }));
    props.calendar.slice(0, 2).forEach((c) => { const iso = calendarIso(c); sigs.push({ kind: 'Kalender', title: c.title, when: relativeTime(iso), t: Date.parse(iso || '') || 0, open: props.onOpenCalendar }); });
    props.mail.slice(0, 2).forEach((m) => sigs.push({ kind: 'Mail', title: m.subject, when: relativeTime(m.date), t: Date.parse(m.date || '') || 0, open: props.onOpenMail }));
    props.feed.slice(0, 1).forEach((f) => sigs.push({ kind: 'Feed', title: f.title, t: 0, open: props.onOpenFeed }));
    const list = sigs.slice(0, 4);
    const [focus, setFocus] = React.useState<{ vorn: string[]; ruhig: string[]; ohneQuelle?: string[] }>(() => (typeof window !== 'undefined' && (window as unknown as { __uv2Attention?: { vorn: string[]; ruhig: string[]; ohneQuelle?: string[] } }).__uv2Attention) || { vorn: [], ruhig: [] });
    React.useEffect(() => {
        const on = (e: Event) => setFocus((e as CustomEvent).detail);
        window.addEventListener('uv2:attention', on);
        return () => window.removeEventListener('uv2:attention', on);
    }, []);
    const deutung: string[] = [];
    const nOpen = props.openIncidents.length;
    if (nOpen) deutung.push(nOpen === 1 ? 'Ein offener Vorfall braucht einen Blick.' : `${nOpen} offene Vorfälle brauchen einen Blick.`);
    if (!focus.vorn.length && props.calendar.length) deutung.push(`${props.calendar.length === 1 ? 'Ein Termin' : props.calendar.length + ' Termine'} im Horizont.`);
    if (!focus.vorn.length && props.mail.length) deutung.push(`${props.mail.length === 1 ? 'Eine Nachricht' : props.mail.length + ' Nachrichten'} im Eingang.`);
    // Gleiche Logik wie das Feld: was vorn steht, wird benannt; Ruhiges auch.
    const und = (xs: string[]) => xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' und ' + xs[xs.length - 1];
    if (focus.vorn.length) deutung.push(`Im Vordergrund: ${und(focus.vorn)}.`);
    const ruhig = focus.ruhig.filter((n) => n !== 'Weitere');
    const oq = focus.ohneQuelle || [];
    if (oq.length) deutung.push(oq.length === 1 ? `${oq[0]} hat noch keine Datenquelle.` : `${oq.length} Bereiche haben noch keine Datenquelle.`);
    if (ruhig.length) deutung.push(ruhig.length > 2 ? `${ruhig.length} Bereiche sind ruhig.` : `Ruhig: ${und(ruhig)}.`);

    return (
        <div className="uv2-instruments uv2-lage-left" data-testid="uv2-lage-signale">
            <section data-uv2-instrument="signale" className="uv2-inst">
                <header className="flex items-baseline justify-between gap-3">
                    <p className="uv2-inst-label">Signale</p><span className="uv2-inst-aside">{list.length}</span>
                </header>
                {list.length === 0 && <p className="uv2-inst-text mt-2">Gerade kommt nichts herein.</p>}
                {list.map((x, i) => (
                    <Row key={i} label={x.kind} when={x.when} value={x.title} onClick={x.open} />
                ))}
            </section>
            <DoneTrace />
            <section data-uv2-instrument="deutung" className="uv2-inst">
                <header><p className="uv2-inst-label">Deutung</p></header>
                <p className="uv2-lage-deutung">{deutung.length ? deutung.join(' ') : 'Ruhige Lage – nichts verlangt gerade Aufmerksamkeit.'}</p>
            </section>
        </div>
    );
}
