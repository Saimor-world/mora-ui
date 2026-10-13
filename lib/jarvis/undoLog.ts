'use client';

export type JarvisSource = 'user' | 'mora' | 'core';

export interface JarvisLogEntry {
    id: string;
    ts: number;
    actionId: string;
    title: string;
    tier: string;
    source: JarvisSource;
    summary: string;
    params: unknown;
    status: 'done' | 'undone';
    undo?: () => void;
    /** true when loaded from storage after a reload (no undo available) */
    restored?: boolean;
}

const MAX = 50;
const STORAGE_KEY = 'saimor_jarvis_log_v1';
const MAX_AGE_MS = 7 * 24 * 3600 * 1000;
const listeners = new Set<() => void>();
let seq = 0;

/** Undo closures cannot survive a reload: restored entries are history only (no Zurück). */
function load(): JarvisLogEntry[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(arr)) return [];
        const now = Date.now();
        return arr
            .filter((e) => e && typeof e.id === 'string' && typeof e.ts === 'number' && now - e.ts < MAX_AGE_MS)
            .slice(0, MAX)
            .map((e) => ({ ...e, params: null, restored: true }));
    } catch {
        return [];
    }
}

function persist() {
    if (typeof window === 'undefined') return;
    try {
        // params can carry ids/titles; keep only what the log shows
        const slim = entries.map(({ undo, params, ...e }) => e);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
    } catch {
        // quota or disabled storage: log stays in memory
    }
}

let entries: JarvisLogEntry[] = load();

function emit() { persist(); listeners.forEach((l) => l()); }

export function recordAction(e: Omit<JarvisLogEntry, 'id' | 'ts' | 'status'>): JarvisLogEntry {
    const entry: JarvisLogEntry = { ...e, id: `j${Date.now().toString(36)}${(seq++).toString(36)}`, ts: Date.now(), status: 'done' };
    entries = [entry, ...entries].slice(0, MAX);
    emit();
    return entry;
}

export function undoEntry(id: string): boolean {
    const e = entries.find((x) => x.id === id);
    if (!e || e.status !== 'done' || !e.undo) return false;
    e.undo();
    entries = entries.map((x) => (x.id === id ? { ...x, status: 'undone' } : x));
    emit();
    return true;
}

/** Undo the most recent undoable action (optionally only MÔRA's). */
export function undoLast(source?: JarvisSource): boolean {
    const e = entries.find((x) => x.status === 'done' && x.undo && (!source || x.source === source));
    return e ? undoEntry(e.id) : false;
}

export function getLog(): JarvisLogEntry[] { return entries; }
export function subscribeLog(fn: () => void): () => void { listeners.add(fn); return () => { listeners.delete(fn); }; }
export function clearLog() { entries = []; emit(); }

/** Test helper: re-read storage as after a reload. */
export function __reloadLogForTest() { entries = load(); }
