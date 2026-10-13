'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Check, History, RotateCcw, ShieldCheck, X } from 'lucide-react';
import { JARVIS_ACTION_EVENT, grantApproval, runAction, type JarvisActionEventDetail, type RunResult } from '@/lib/jarvis/registry';
import { getLog, subscribeLog, undoEntry, undoLast, type JarvisSource } from '@/lib/jarvis/undoLog';
import { getOsSnapshot } from '@/lib/jarvis/snapshot';

export const JARVIS_REQUEST_EVENT = 'saimor:jarvis-request';
export interface JarvisRequestDetail { id: string; params?: unknown; source?: JarvisSource }

/** Ask the OS to run a registered action (approval actions open a card first). */
export function requestJarvisAction(detail: JarvisRequestDetail) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent<JarvisRequestDetail>(JARVIS_REQUEST_EVENT, { detail }));
}

interface Thread { key: number; d: string; end: { x: number; y: number }; start: { x: number; y: number }; el: HTMLElement | null }
interface Pending { id: string; params: unknown; source: JarvisSource; description: string }

function originPoint() {
    const dock = document.querySelector('[data-testid="dock"]')?.getBoundingClientRect();
    if (dock && dock.width) return { x: dock.right - 34, y: dock.top + dock.height / 2 };
    return { x: window.innerWidth / 2, y: window.innerHeight - 60 };
}

type Circle = { x: number; y: number; r: number };
const PLANET = '[data-testid^="territory-"]';

function circleOf(el: Element): Circle | null {
    const body = (el.querySelector('.saimor-territory-body') as HTMLElement | null) || (el as HTMLElement);
    const r = body.getBoundingClientRect();
    if (!r.width) return null;
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: Math.min(r.width, r.height) / 2 };
}

/** hd24: weiche Kurve, die anderen Planeten ausweicht; endet am Rand des Ziels statt mitten darin. */
function threadTo(selector?: string): Thread | null {
    if (!selector) return null;
    let el: HTMLElement | null = null;
    try { el = document.querySelector<HTMLElement>(selector); } catch { return null; }
    const r = el?.getBoundingClientRect();
    if (!el || !r || !r.width || r.top < 0 || r.top > window.innerHeight - 80 || r.left > window.innerWidth - 20) return null;
    const a = originPoint();
    const isPlanet = el.matches(PLANET);
    const tc = isPlanet ? circleOf(el) : null;
    let b = tc ? { x: tc.x, y: tc.y } : { x: r.left + Math.min(r.width / 2, 60), y: r.top + Math.min(r.height / 2, 28) };
    const obstacles: Circle[] = [];
    const seen = new Set<string>();
    document.querySelectorAll(PLANET).forEach((p) => {
        if (p === el || el!.contains(p) || p.contains(el!)) return;
        if (p.getAttribute('data-testid') === el!.getAttribute('data-testid')) return;
        const c = circleOf(p); if (!c || c.r < 4) return;
        const k = `${Math.round(c.x)},${Math.round(c.y)}`; if (seen.has(k)) return; seen.add(k);
        obstacles.push(c);
    });
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const at = (t: number, c1: { x: number; y: number }, c2: { x: number; y: number }, e: { x: number; y: number }) => {
        const u = 1 - t;
        return { x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * e.x, y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * e.y };
    };
    let best = { cost: Infinity, c1: a, c2: b };
    for (let k = -1; k <= 1.0001; k += 0.1) {
        const off = k * Math.min(420, len * 0.75);
        const c1 = { x: a.x + dx * 0.25 + nx * off, y: a.y + dy * 0.25 + ny * off - 40 };
        const c2 = { x: a.x + dx * 0.75 + nx * off, y: a.y + dy * 0.75 + ny * off };
        let cost = Math.abs(k) * 30;
        for (let i = 2; i <= 38; i++) {
            const p = at(i / 40, c1, c2, b);
            if (p.x < 8 || p.x > window.innerWidth - 8 || p.y < 8) cost += 400;
            for (const o of obstacles) { const d = Math.hypot(p.x - o.x, p.y - o.y) - (o.r + 26); if (d < 0) cost += 60 + -d * 4; }
        }
        if (cost < best.cost) best = { cost, c1, c2 };
    }
    if (tc) {
        // am Rand des Zielplaneten enden, aus Richtung der Kurve
        const p = at(0.97, best.c1, best.c2, b);
        const vx = p.x - tc.x, vy = p.y - tc.y, vl = Math.hypot(vx, vy) || 1;
        b = { x: tc.x + (vx / vl) * (tc.r + 6), y: tc.y + (vy / vl) * (tc.r + 6) };
    }
    const f = (n: number) => n.toFixed(1);
    return { key: Date.now(), d: `M${f(a.x)},${f(a.y)} C${f(best.c1.x)},${f(best.c1.y)} ${f(best.c2.x)},${f(best.c2.y)} ${f(b.x)},${f(b.y)}`, end: b, start: a, el: isPlanet ? el : null };
}

/** Zeichnet sich ein (0,7 s), hält, verblasst ab 2,0 s – per rAF, damit es überall gleich läuft. */
function ThreadView({ t }: { t: Thread }) {
    const ref = useRef<SVGSVGElement>(null);
    useEffect(() => {
        const svg = ref.current; if (!svg) return;
        const path = svg.querySelector('path')!; const dot = svg.querySelector('circle')!;
        const t0 = performance.now(); let raf = 0;
        const ease = (x: number) => 1 - Math.pow(1 - x, 3);
        const tick = (now: number) => {
            const e = now - t0;
            const draw = ease(Math.min(1, e / 700));
            const fade = e < 2000 ? 1 : Math.max(0, 1 - (e - 2000) / 550);
            path.style.strokeDashoffset = String(1 - draw);
            dot.style.opacity = String(draw > 0.96 ? fade : 0);
            svg.style.opacity = String(fade);
            if (e < 2600) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        const el = t.el;
        if (el) el.setAttribute('data-jv-target', '');
        const clear = window.setTimeout(() => el?.removeAttribute('data-jv-target'), 2600);
        return () => { cancelAnimationFrame(raf); window.clearTimeout(clear); el?.removeAttribute('data-jv-target'); };
    }, [t]);
    const gid = `jvg${t.key}`;
    return (
        <svg ref={ref} className="uv2-jv__thread" aria-hidden>
            <defs>
                <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1={t.start.x} y1={t.start.y} x2={t.end.x} y2={t.end.y}>
                    <stop offset="0" stopColor="#d8b56a" stopOpacity="0" />
                    <stop offset="0.35" stopColor="#d8b56a" stopOpacity="0.55" />
                    <stop offset="1" stopColor="#f3dfae" stopOpacity="1" />
                </linearGradient>
            </defs>
            <path d={t.d} pathLength={1} stroke={`url(#${gid})`} style={{ strokeDasharray: 1, strokeDashoffset: 1 }} />
            <circle cx={t.end.x} cy={t.end.y} r={3.5} style={{ opacity: 0 }} />
        </svg>
    );
}

const fmt = (ts: number) => new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
const SRC: Record<JarvisSource, string> = { user: 'Du', mora: 'MÔRA', core: 'CORE' };

export function JarvisLayer() {
    const log = useSyncExternalStore(subscribeLog, getLog, getLog);
    const [chip, setChip] = useState<JarvisActionEventDetail | null>(null);
    const [thread, setThread] = useState<Thread | null>(null);
    const [pending, setPending] = useState<Pending | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const handle = useCallback((res: RunResult, id: string, params: unknown, source: JarvisSource) => {
        if (res.status === 'needs_approval') setPending({ id, params, source, description: res.description });
        else if (res.status === 'blocked' || res.status === 'invalid') setNotice(res.reason);
    }, []);

    useEffect(() => {
        const onAction = (e: Event) => {
            const d = (e as CustomEvent<JarvisActionEventDetail>).detail;
            setChip(d);
            // a just-opened window may still be mounting: retry briefly
            // and windows fly in: wait until the target stops moving
            let tries = 0;
            let last = '';
            const seek = () => {
                const t = threadTo(d.target);
                const key = t ? `${Math.round(t.end.x)},${Math.round(t.end.y)}` : '';
                if (t && key === last) { setThread(t); return; }
                last = key;
                if (d.target && tries++ < 20) window.setTimeout(seek, 90);
                else if (t) setThread(t);
            };
            window.setTimeout(seek, 60);
        };
        const onRequest = (e: Event) => {
            const d = (e as CustomEvent<JarvisRequestDetail>).detail;
            if (!d?.id) return;
            const source = d.source ?? 'mora';
            handle(runAction(d.id, d.params ?? {}, { source }), d.id, d.params, source);
        };
        const onKey = (e: KeyboardEvent) => {
            const t = e.target as HTMLElement | null;
            const editable = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
            if (!editable && (e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && undoLast()) e.preventDefault();
        };
        window.addEventListener(JARVIS_ACTION_EVENT, onAction);
        window.addEventListener(JARVIS_REQUEST_EVENT, onRequest);
        window.addEventListener('keydown', onKey);
        (window as any).saimorJarvis = {
            run: (id: string, params?: unknown) => requestJarvisAction({ id, params, source: 'mora' }),
            snapshot: () => getOsSnapshot(),
            log: () => getLog().map(({ undo, ...e }) => ({ ...e, undoable: Boolean(undo) })),
        };
        return () => {
            window.removeEventListener(JARVIS_ACTION_EVENT, onAction);
            window.removeEventListener(JARVIS_REQUEST_EVENT, onRequest);
            window.removeEventListener('keydown', onKey);
            delete (window as any).saimorJarvis;
        };
    }, [handle]);

    useEffect(() => { if (!thread) return; const t = setTimeout(() => setThread(null), 2700); return () => clearTimeout(t); }, [thread]);
    useEffect(() => { if (!chip || open) return; const t = setTimeout(() => setChip(null), 7000); return () => clearTimeout(t); }, [chip, open]);
    useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(null), 5000); return () => clearTimeout(t); }, [notice]);

    if (!mounted) return null;
    const chipEntry = chip ? log.find((e) => e.id === chip.entryId) : null;

    return createPortal(
        <div className="uv2-jv" data-testid="jarvis-layer">
            {thread && (
                <ThreadView key={thread.key} t={thread} />
            )}
            {pending && (
                <div className="uv2-jv__card" role="dialog" aria-label="Freigabe" data-testid="jarvis-approval">
                    <span className="uv2-jv__cardico"><ShieldCheck /></span>
                    <div className="uv2-jv__cardtxt"><b>Freigabe nötig</b><span>{pending.description}</span></div>
                    <button type="button" className="uv2-pill" onClick={() => setPending(null)}><X />Nein</button>
                    <button type="button" className="uv2-pill uv2-pill--gold" data-testid="jarvis-approve" onClick={() => {
                        const p = pending; setPending(null);
                        handle(runAction(p.id, p.params, { source: p.source, approvalToken: grantApproval(p.id) }), p.id, p.params, p.source);
                    }}><Check />Freigeben</button>
                </div>
            )}
            {!pending && (chip || notice || open) && (
                <div className="uv2-jv__chip" data-testid="jarvis-chip">
                    <span className="uv2-jv__orb" data-src={chip?.source ?? 'mora'} />
                    <span className="uv2-jv__txt">{notice ?? (chip ? `${SRC[chip.source]} · ${chip.summary}` : 'Verlauf')}</span>
                    {chipEntry?.undo && chipEntry.status === 'done' && (
                        <button type="button" className="uv2-jv__btn" data-testid="jarvis-undo" onClick={() => undoEntry(chipEntry.id)}><RotateCcw />Zurück</button>
                    )}
                    {chipEntry?.status === 'undone' && <span className="uv2-jv__undone">zurückgenommen</span>}
                    <button type="button" className="uv2-jv__btn" aria-pressed={open} data-testid="jarvis-log-toggle" onClick={() => setOpen((v) => !v)}><History />{log.length}</button>
                </div>
            )}
            {open && (
                <div className="uv2-jv__log" data-testid="jarvis-log">
                    <div className="uv2-jv__loghead"><History /><b>Was heute geschah</b><button type="button" aria-label="Schließen" onClick={() => setOpen(false)}><X /></button></div>
                    {log.length === 0 && <p className="uv2-jv__empty">Noch nichts.</p>}
                    {log.map((e) => (
                        <div key={e.id} className="uv2-jv__row" data-status={e.status}>
                            <span className="uv2-jv__orb" data-src={e.source} />
                            <span className="uv2-jv__rowtxt"><b>{e.summary}</b><small>{fmt(e.ts)} · {SRC[e.source]} · {e.tier === 'instant' ? 'Ansicht' : e.tier === 'undoable' ? 'umkehrbar' : 'freigegeben'}</small></span>
                            {e.undo && e.status === 'done' ? <button type="button" className="uv2-jv__btn" onClick={() => undoEntry(e.id)}><RotateCcw /></button> : e.status === 'undone' ? <span className="uv2-jv__undone">zurück</span> : null}
                        </div>
                    ))}
                </div>
            )}
        </div>,
        document.body,
    );
}
