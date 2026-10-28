"use client";
import { coreGet } from '@/lib/api/http';

export type ConnectorType = "email" | "filesystem" | "notion" | "github" | "n8n";
export type ConnectorMode = "mock" | "real";
export type ConnectorState = "unknown" | "disconnected" | "syncing" | "connected" | "error";

export interface ConnectorStatus {
  id: string;
  type: ConnectorType;
  label: string;
  mode: ConnectorMode;
  state: ConnectorState;
  lastSyncAt: string | null;
  objectCount: number | null;
  config?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

const STORAGE_KEY = "mora_connector_statuses";

type StoredShape = Partial<ConnectorStatus> & {
  id?: string;
  name?: string;
  status?: string;
  lastSync?: string | null;
};

function readFromStorage(): StoredShape[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as StoredShape[];
    }
  } catch (error) {
    console.warn("[mora] Failed to parse connector cache", error);
  }
  return [];
}

function writeToStorage(statuses: ConnectorStatus[]) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(statuses));
  } catch (error) {
    console.warn("[mora] Failed to persist connectors", error);
  }
}

function mapState(value: string | undefined, fallback: ConnectorState = "disconnected"): ConnectorState {
  switch (value) {
    case "connected":
      return "connected";
    case "syncing":
    case "connecting":
      return "syncing";
    case "error":
      return "error";
    case "disconnected":
    case "not_connected":
      return "disconnected";
    default:
      return fallback;
  }
}

function normalizeStatus(raw: StoredShape, fallback?: ConnectorStatus): ConnectorStatus | null {
  const id = raw.id ?? fallback?.id;
  const type = raw.type ?? fallback?.type;
  if (!id || !type) {
    return null;
  }

  const mode: ConnectorMode =
    raw.mode === "real" || fallback?.mode === "real" ? "real" : "mock";

  const state = mapState(raw.state ?? raw.status, fallback?.state);

  const label =
    typeof raw.label === "string"
      ? raw.label
      : typeof raw.name === "string"
      ? raw.name
      : fallback?.label ?? id;

  const lastSyncAt =
    typeof raw.lastSyncAt === "string"
      ? raw.lastSyncAt
      : typeof raw.lastSync === "string"
      ? raw.lastSync
      : fallback?.lastSyncAt ?? null;

  const objectCount =
    typeof raw.objectCount === "number"
      ? raw.objectCount
      : typeof fallback?.objectCount === "number"
      ? fallback.objectCount
      : null;

  const config =
    raw.config && typeof raw.config === "object"
      ? raw.config
      : fallback?.config && typeof fallback.config === "object"
      ? fallback.config
      : undefined;

  const meta =
    raw.meta && typeof raw.meta === "object"
      ? raw.meta
      : fallback?.meta && typeof fallback.meta === "object"
      ? fallback.meta
      : undefined;

  return {
    id,
    type,
    label,
    mode,
    state,
    lastSyncAt,
    objectCount,
    config,
    meta,
  };
}

function mergeStatuses(seed: ConnectorStatus[], stored: StoredShape[]): ConnectorStatus[] {
  const seedMap = new Map(seed.map((entry) => [entry.id, entry]));
  const merged = seed.map((entry) => ({ ...entry }));

  stored.forEach((raw) => {
    const base = raw.id ? seedMap.get(raw.id) : undefined;
    const normalized = normalizeStatus(raw, base);
    if (!normalized) {
      return;
    }
    const idx = merged.findIndex((entry) => entry.id === normalized.id);
    if (idx >= 0) {
      merged[idx] = { ...merged[idx], ...normalized };
    } else {
      merged.push(normalized);
    }
  });

  return merged;
}

export function getConnectors(seed: ConnectorStatus[] = []): ConnectorStatus[] {
  if (typeof window === "undefined") {
    return seed;
  }
  const stored = readFromStorage();
  const merged = mergeStatuses(seed, stored);
  if (stored.length === 0 && seed.length > 0) {
    writeToStorage(merged);
  }
  return merged.map(c => c.state === "connected" ? { ...c, state: "unknown" as const, lastSyncAt: null, objectCount: null } : c);
}

export function saveConnector(status: ConnectorStatus) {
  const current = typeof window === "undefined" ? [] : getConnectors();
  const next = updateList(current, status);
  writeToStorage(next);
}

export function saveConnectorList(statuses: ConnectorStatus[]) {
  writeToStorage(statuses);
}

function updateList(list: ConnectorStatus[], status: ConnectorStatus) {
  const existingIndex = list.findIndex((entry) => entry.id === status.id);
  if (existingIndex >= 0) {
    const next = [...list];
    next[existingIndex] = status;
    return next;
  }
  return [...list, status];
}

/** Legacy connector cache is never evidence of a live connection. */
export async function testConnection(connector: ConnectorStatus): Promise<ConnectorStatus> {
  if (connector.mode !== 'real') return { ...connector, state: 'unknown', lastSyncAt: null, objectCount: null };
  try {
    const result = await coreGet('/v3/connections', { throwAuthErrors: true }) as { connections?: Array<{ id: string; status: string }> } | null;
    const checked = result?.connections?.find(item => item.id === connector.id);
    if (connector.mode === 'real' && checked?.status === 'connected') return { ...connector, state: 'connected', objectCount: null, lastSyncAt: null };
    return { ...connector, state: checked ? 'disconnected' : 'unknown', lastSyncAt: null, objectCount: null };
  } catch {
    return { ...connector, state: 'unknown', lastSyncAt: null, objectCount: null };
  }
}

export async function syncConnector(connector: ConnectorStatus): Promise<ConnectorStatus> {
  // No verified synchronization endpoint exists for this legacy adapter.
  return { ...connector, state: 'unknown', lastSyncAt: null, objectCount: null };
}

export function markConnectorState(connector: ConnectorStatus, state: ConnectorState): ConnectorStatus {
  const next = { ...connector, state: state === 'connected' ? 'unknown' as const : state };
  saveConnector(next);
  return next;
}
