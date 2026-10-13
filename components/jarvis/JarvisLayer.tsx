'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
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

interface Thread { key: number; d: string; end: { x: number; y: number } }
interface Pending { id: string; params: unknown; source: JarvisSource; description: string }

function originPoint() {
    const dock = document.querySelector('[data-testid="dock"]')?.getBoundingClientRect();
    if (dock && dock.width) return { x: dock.right - 34, y: dock.top + dock.height / 2 };
    return { x: window.innerWidth / 2, y: window.innerHeight - 60 };
}

function threadTo(selector?: string): Thread | null {
    if (!selector) return null;
    let el: Element | null = null;
    try { el = document.querySelector(selector); } catch { return null; }
    const r = el?.getBoundingClientRect();
    if (!r || !r.width || r.top < 0 || r.top > window.innerHeight - 80 || r.left > window.innerWidth - 20) return null;
    const a = originPoint();
    const b = { x: r.left + Math.min(r.width / 2, 60), y: r.top + Math.min(r.height / 2, 28) };
    const c = { x: (a.x + b.x) / 2 + (a.x > b.x ? 80 : -80), y: (a.y + b.y) / 2 - 90 };
    return { key: Date.now(), d: `M${a.x},${a.y} Q${c.x},${c.y} ${b.x},${b.y}`, end: b };
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

    useEffect(() => { if (!thread) return; const t = setTimeout(() => setThread(null), 2600); return () => clearTimeout(t); }, [thread]);
    useEffect(() => { if (!chip || open) return; const t = setTimeout(() => setChip(null), 7000); return () => clearTimeout(t); }, [chip, open]);
    useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(null), 5000); return () => clearTimeout(t); }, [notice]);

    if (!mounted) return null;
    const chipEntry = chip ? log.find((e) => e.id === chip.entryId) : null;

    return createPortal(
        <div className="uv2-jv" data-testid="jarvis-layer">
            {thread && (
                <svg className="uv2-jv__thread" key={thread.key} aria-hidden>
                    <path d={thread.d} pathLength={1} />
                    <circle cx={thread.end.x} cy={thread.end.y} r={5} />
                </svg>
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
            {(chip || notice || open) && (
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
