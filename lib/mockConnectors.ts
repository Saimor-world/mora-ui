import type { Connector } from "./connectors";

export const mockConnectors: Connector[] = [
  {
    id: "mock-email",
    type: "email",
    name: "Work E-Mail (Gmail)",
    status: "connected",
    config: { email: "demo@example.com" },
    lastSync: "2025-11-12T08:00:00Z",
    objectCount: 42,
    note: "Demo",
  },
  {
    id: "mock-filesystem",
    type: "filesystem",
    name: "Dokumente",
    status: "connected",
    config: { path: "/Users/demo/Documents" },
    lastSync: "2025-11-12T07:30:00Z",
    objectCount: 156,
  },
  {
    id: "mock-notion",
    type: "notion",
    name: "Notion Workspace",
    status: "not_connected",
    config: {},
  },
  {
    id: "mock-github",
    type: "github",
    name: "GitHub Repos",
    status: "not_connected",
    config: {},
  },
  {
    id: "mock-n8n",
    type: "n8n",
    name: "n8n Workflows",
    status: "not_connected",
    config: {},
  },
];

export const mockActivity = [
  { type: "new_object", title: "Q4 Budget Report.pdf", timestamp: "2025-11-12T08:15:00Z" },
  { type: "broadcast", title: "Q4 Planning", resonance: 5, timestamp: "2025-11-12T07:45:00Z" },
  { type: "connection", from: "README.md", to: "ARCHITECTURE.md", timestamp: "2025-11-12T07:30:00Z" },
];
