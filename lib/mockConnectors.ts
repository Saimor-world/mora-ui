import type { ConnectorStatus } from "./connectors";

export const mockConnectors: ConnectorStatus[] = [
  {
    id: "mock-email",
    type: "email",
    label: "Cafe Mail (Gmail)",
    mode: "mock",
    state: "disconnected",
    lastSyncAt: null,
    objectCount: null,
    config: { email: "kontakt@cafe-aurora.example" },
  },
  {
    id: "mock-filesystem",
    type: "filesystem",
    label: "Kassen-Exporte",
    mode: "mock",
    state: "disconnected",
    lastSyncAt: null,
    objectCount: null,
    config: { path: "/CafeAurora/Exports" },
  },
  {
    id: "mock-notion",
    type: "notion",
    label: "Checklisten & Rezepte",
    mode: "mock",
    state: "disconnected",
    lastSyncAt: null,
    objectCount: null,
    config: {},
  },
  {
    id: "mock-github",
    type: "github",
    label: "POS Scripts",
    mode: "mock",
    state: "disconnected",
    lastSyncAt: null,
    objectCount: null,
    config: {},
  },
  {
    id: "mock-n8n",
    type: "n8n",
    label: "Automationen",
    mode: "mock",
    state: "disconnected",
    lastSyncAt: null,
    objectCount: null,
    config: {},
  },
];

export const mockActivity = [
  { type: "new_object", title: "Wochenplanung KW45", timestamp: "2025-11-12T08:15:00Z" },
  { type: "broadcast", title: "Latte Art Training", resonance: 5, timestamp: "2025-11-12T07:45:00Z" },
  { type: "connection", from: "Tagesumsatz Montag", to: "Dashboard KPI", timestamp: "2025-11-12T07:30:00Z" },
];
