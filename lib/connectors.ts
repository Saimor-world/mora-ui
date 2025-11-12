import { showToast } from "@/lib/toast";
import { emitMoraEvent } from "@/lib/mora/listener";

export type ConnectorType = "email" | "filesystem" | "notion" | "github" | "n8n";
export type ConnectorStatus = "not_connected" | "connecting" | "connected" | "error";

export interface Connector {
  id: string;
  type: ConnectorType;
  name: string;
  status: ConnectorStatus;
  config: Record<string, unknown>;
  lastSync?: string;
  objectCount?: number;
  note?: string;
}

const STORAGE_KEY = "mora_connectors";
const SYNC_DELAY_MS = 3000;

type SyncEventLevel = "success" | "warning";

export interface ConnectorSyncResult {
  objectCount: number;
  lastSync: string;
  outcome: SyncEventLevel;
}

function readConnectorsFromStorage(): Connector[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (error) {
    console.warn("[connectors] Failed to read storage", error);
    return [];
  }
}

function writeConnectorsToStorage(connectors: Connector[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(connectors));
  } catch (error) {
    console.warn("[connectors] Failed to persist storage", error);
  }
}

export function getConnectors(fallback: Connector[] = []): Connector[] {
  const stored = readConnectorsFromStorage();
  if (stored.length > 0) return stored;
  if (fallback.length > 0) {
    writeConnectorsToStorage(fallback);
    return fallback;
  }
  return [];
}

export function saveConnector(connector: Connector) {
  const connectors = getConnectors();
  const index = connectors.findIndex((item) => item.id === connector.id);
  if (index >= 0) {
    connectors[index] = connector;
  } else {
    connectors.push(connector);
  }
  writeConnectorsToStorage(connectors);
}

export function removeConnector(connectorId: string) {
  const connectors = getConnectors().filter((c) => c.id !== connectorId);
  writeConnectorsToStorage(connectors);
}

export async function testConnection(connector: Connector): Promise<boolean> {
  showToast({ message: `Teste ${connector.name}...`, variant: "info" });
  await new Promise((resolve) => setTimeout(resolve, 800));
  const success = connector.status !== "error";
  showToast({
    message: success ? `${connector.name} erfolgreich geprüft.` : `${connector.name} konnte nicht verbunden werden.`,
    variant: success ? "info" : "error",
  });
  return success;
}

export async function syncConnector(connector: Connector): Promise<ConnectorSyncResult> {
  emitMoraEvent("connector_action", { id: connector.id, status: "syncing" });
  await delay(SYNC_DELAY_MS);
  const delta = Math.floor(Math.random() * 4) + 1;
  const newCount = (connector.objectCount ?? 0) + delta;
  const lastSync = new Date().toISOString();
  const syncEvents = buildSyntheticSyncEvents(connector.name);
  syncEvents.forEach((event) => {
    emitMoraEvent("connector_action", {
      id: connector.id,
      message: event.message,
      level: event.level,
    });
  });
  const outcome: SyncEventLevel = syncEvents.some((event) => event.level === "warning") ? "warning" : "success";
  const updated: Connector = {
    ...connector,
    status: "connected",
    objectCount: newCount,
    lastSync,
  };
  saveConnector(updated);
  showToast({
    message:
      outcome === "success"
        ? `${connector.name} synchronisiert – ${newCount} Objekte.`
        : `${connector.name} synchronisiert – Hinweise prüfen.`,
    variant: outcome === "success" ? "info" : "warning",
  });
  return { objectCount: newCount, lastSync, outcome };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildSyntheticSyncEvents(name: string): Array<{ level: SyncEventLevel; message: string }> {
  const eventCount = Math.random() > 0.6 ? 2 : 1;
  const events: Array<{ level: SyncEventLevel; message: string }> = [];
  for (let i = 0; i < eventCount; i += 1) {
    const level: SyncEventLevel = Math.random() > 0.8 ? "warning" : "success";
    const message =
      level === "warning"
        ? `Warnung bei ${name}: Prüfe Quelle ${i + 1}.`
        : `${name}: ${Math.floor(Math.random() * 4) + 1} neue Objekte.`;
    events.push({ level, message });
  }
  return events;
}
