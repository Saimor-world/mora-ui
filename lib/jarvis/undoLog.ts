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
}

const MAX = 50;
let entries: JarvisLogEntry[] = [];
const listeners = new Set<() => void>();
let seq = 0;

function emit() { listeners.forEach((l) => l()); }

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
