import type { ConnectorStatus } from "./connectors";

export const mockConnectors: ConnectorStatus[] = [
  {
    id: "mock-email",
    type: "email",
    label: "Work E-Mail (Gmail)",
    mode: "mock",
    state: "disconnected",
    lastSyncAt: null,
    objectCount: null,
    config: { email: "demo@example.com" },
  },
  {
    id: "mock-filesystem",
    type: "filesystem",
    label: "Dokumente",
    mode: "mock",
    state: "disconnected",
    lastSyncAt: null,
    objectCount: null,
    config: { path: "/Users/demo/Documents" },
  },
  {
    id: "mock-notion",
    type: "notion",
    label: "Notion Workspace",
    mode: "mock",
    state: "disconnected",
    lastSyncAt: null,
    objectCount: null,
    config: {},
  },
  {
    id: "mock-github",
    type: "github",
    label: "GitHub Repos",
    mode: "mock",
    state: "disconnected",
    lastSyncAt: null,
    objectCount: null,
    config: {},
  },
  {
    id: "mock-n8n",
    type: "n8n",
    label: "n8n Workflows",
    mode: "mock",
    state: "disconnected",
    lastSyncAt: null,
    objectCount: null,
    config: {},
  },
];

export const mockActivity = [
  { type: "new_object", title: "Q4 Budget Report.pdf", timestamp: "2025-11-12T08:15:00Z" },
  { type: "broadcast", title: "Q4 Planning", resonance: 5, timestamp: "2025-11-12T07:45:00Z" },
  { type: "connection", from: "README.md", to: "ARCHITECTURE.md", timestamp: "2025-11-12T07:30:00Z" },
];
