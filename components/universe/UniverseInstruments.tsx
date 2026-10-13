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
                    <span className="uv2-timeline" aria-label={`${total14} Vorfälle in 14 Tagen, ${open} offen`}>
                        {days.map((d, i) => {
                            const n = d.open + d.closed;
                            return (
                                <span key={i} className={'uv2-tick' + (i === 13 ? ' is-today' : '') + (d.open ? ' is-open' : '')}
                                    style={{ height: n ? 6 + (n / peak) * 18 : 2, animationDelay: (0.6 + i * 0.03) + 's' }}
                                    title={d.day.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) + ': ' + n} />
                            );
                        })}
                    </span>
                    <span className="mt-2 flex justify-between uv2-inst-aside"><span>vor 14 T</span><span>heute</span></span>
                    <span className="uv2-inst-text mt-2 block truncate">{props.openIncidents[0]?.title || 'Keine offenen Vorfälle.'}</span>
                </button>
            </Block>

            <Block id="wirtschaft" label="Wirtschaft" aside={amount ? `${b.activeCount} Abo${b.activeCount === 1 ? '' : 's'}` : 'Paddle bereit'}>
                <p className="uv2-inst-text">{amount ? <>Monatlich <span className="uv2-inst-figure">{amount}</span></> : 'Noch kein Umsatz – das erste Abo erscheint hier.'}</p>
            </Block>
        </div>
    );
}
