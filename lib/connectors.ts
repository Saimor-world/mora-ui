"use client";

export type ConnectorType = "email" | "filesystem" | "notion" | "github" | "n8n";
export type ConnectorMode = "mock" | "real";
export type ConnectorState = "disconnected" | "syncing" | "connected" | "error";

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
  return merged;
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

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function withSyncPayload(connector: ConnectorStatus, overrides?: Partial<ConnectorStatus>): ConnectorStatus {
  return {
    ...connector,
    lastSyncAt: overrides?.lastSyncAt ?? new Date().toISOString(),
    objectCount:
      typeof overrides?.objectCount === "number"
        ? overrides.objectCount
        : typeof connector.objectCount === "number"
        ? connector.objectCount
        : 0,
    ...overrides,
  };
}

export async function testConnection(connector: ConnectorStatus): Promise<ConnectorStatus> {
  await wait(connector.mode === "mock" ? 900 : 1400);
  const next = withSyncPayload(connector, {
    state: "connected",
    objectCount: connector.objectCount ?? Math.max(5, Math.floor(Math.random() * 35) + 5),
  });
  return next;
}

export async function syncConnector(connector: ConnectorStatus): Promise<ConnectorStatus> {
  await wait(connector.mode === "mock" ? 1600 : 2600);
  const increment = Math.max(1, Math.floor(Math.random() * 4) + 1);
  const next = withSyncPayload(connector, {
    state: "connected",
    objectCount: (connector.objectCount ?? 0) + increment,
  });
  return next;
}

export function applyMockSnapshot(statuses: ConnectorStatus[]): ConnectorStatus[] {
  const now = new Date().toISOString();
  const next = statuses.map<ConnectorStatus>((connector, index) => ({
    ...connector,
    mode: "mock" as ConnectorMode,
    state: "connected" as ConnectorState,
    lastSyncAt: now,
    objectCount: (connector.objectCount ?? 12) + (index + 1) * 3,
  }));
  saveConnectorList(next);
  return next;
}

export function markConnectorState(
  connector: ConnectorStatus,
  state: ConnectorState
): ConnectorStatus {
  const next =
    state === "connected"
      ? withSyncPayload(connector, { state })
      : { ...connector, state };
  saveConnector(next);
  return next;
}
