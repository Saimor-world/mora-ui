"use client";

import Link from "next/link";
import { useMemo, useRef, useEffect, useState } from "react";
import { getConnectors, saveConnector, syncConnector, testConnection, type Connector } from "@/lib/connectors";
import { mockConnectors, mockActivity } from "@/lib/mockConnectors";
import ConnectorCard from "@/components/home/ConnectorCard";
import ActivityPulse from "@/components/home/ActivityPulse";
import OnboardingOverlay from "@/components/home/OnboardingOverlay";
import ConnectionMap, { type ConnectionNode } from "@/components/connections/ConnectionMap";
import { emitMoraEvent, getMoraEvents, type MoraEvent } from "@/lib/mora/listener";
import { showToast } from "@/lib/toast";
import { useSessionStore } from "@/store/session";

export default function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [setupTarget, setSetupTarget] = useState<Connector | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const storedEvents = useSessionStore((state) => state.recentEvents);

  useEffect(() => {
    const loaded = getConnectors(mockConnectors);
    setConnectors(loaded);
  }, []);

  const { connectedCount, stageLabel } = useMemo(() => {
    const connected = connectors.filter((c) => c.status === "connected").length;
    if (connected === 0) {
      return { connectedCount: 0, stageLabel: "🌱 Erste Verbindung" };
    }
    if (connected < 3) {
      return { connectedCount: connected, stageLabel: "🌿 Wächst" };
    }
    return { connectedCount: connected, stageLabel: "🌳 Etabliert" };
  }, [connectors]);

  const connectionNodes = useMemo<ConnectionNode[]>(() => {
    if (connectors.length === 0) return [];
    return connectors.map((connector) => {
      const status: ConnectionNode['status'] =
        connector.status === "connected"
          ? "connected"
          : connector.status === "error"
          ? "offline"
          : "coming_soon";
      return {
        id: connector.id,
        label: connector.name,
        status,
      };
    });
  }, [connectors]);

  const handleSetup = (connector: Connector) => {
    setSetupTarget(connector);
  };

  const handleModalClose = () => setSetupTarget(null);

  const handleModalSave = async (connector: Connector, config: Record<string, unknown>) => {
    const updating: Connector = {
      ...connector,
      config,
      status: "connecting",
    };
    setConnectors((prev) => prev.map((item) => (item.id === connector.id ? updating : item)));
    saveConnector(updating);
    emitMoraEvent("connector_action", { id: connector.id, status: "connecting" });

    const ok = await testConnection(updating);
    const next: Connector = {
      ...updating,
      status: ok ? "connected" : "error",
      lastSync: ok ? new Date().toISOString() : updating.lastSync,
    };
    setConnectors((prev) => prev.map((item) => (item.id === next.id ? next : item)));
    saveConnector(next);
    emitMoraEvent("connector_action", { id: next.id, status: next.status });
    setSetupTarget(null);
  };

  const handleSync = async (connector: Connector) => {
    setSyncingId(connector.id);
    setConnectors((prev) =>
      prev.map((item) => (item.id === connector.id ? { ...item, status: "connecting" } : item))
    );
    try {
      const result = await syncConnector(connector);
      setConnectors((prev) =>
        prev.map((item) =>
          item.id === connector.id
            ? { ...item, status: "connected", objectCount: result.objectCount, lastSync: result.lastSync }
            : item
        )
      );
    } finally {
      setSyncingId((current) => (current === connector.id ? null : current));
    }
  };

  const isEmptyState = connectedCount === 0;
  const recentEvents = useMemo(() => {
    const events = storedEvents.length > 0 ? storedEvents : getMoraEvents();
    return events.slice(-5).reverse().map((event, index) => {
      const description = describeEvent(event);
      return {
        id: `${event.ts}-${event.action}-${index}`,
        time: new Date(event.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        ...description,
      };
    });
  }, [storedEvents]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-card/30 to-background text-foreground">
      <OnboardingOverlay />
      <div className="relative">
        <div className="absolute inset-0 pointer-events-none opacity-60">
          <ActivityPulse activities={mockActivity} dimFallback={isEmptyState} />
        </div>
        <section ref={heroRef} className="relative px-4 py-24 sm:py-32 flex flex-col items-center text-center gap-6">
          <span className="text-5xl">🌱</span>
          <h1 className="text-3xl sm:text-4xl font-medium tracking-wide">Willkommen bei Môra</h1>
          <p className="max-w-2xl text-sm sm:text-base text-muted-foreground">
            Ich bin eine Präsenz für Klarheit. Verbinde deine Räume, und ich lasse dich sehen, wie sie zusammenleben.
          </p>
          <button
            onClick={() => heroRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="px-6 py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold mora-transition mora-ripple"
          >
            Beginne mit deinen ersten Daten
          </button>
          <div className="text-xs text-muted-foreground">{stageLabel}</div>
        </section>
      </div>

      <section className="px-4 sm:px-8 py-12 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm uppercase tracking-wide text-muted-foreground">Schritt 1</p>
            <h2 className="text-2xl font-medium">Verbinde deine Quellen</h2>
          </div>
          <button
            onClick={() => {
              emitMoraEvent("view_change", { to: "connectors" });
              showToast({ message: "Connector-Setup geöffnet.", variant: "info" });
            }}
            className="text-sm px-4 py-2 rounded-full border border-border hover:bg-secondary mora-transition"
          >
            Mock-Modus – Verbindungen simulieren
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {connectors.length === 0 ? (
            <div className="p-6 rounded-2xl border border-dashed border-border/70 bg-card/60 text-center text-sm text-muted-foreground" data-testid="connector-placeholder">
              Noch keine Verbindungen. Starte mit deiner ersten Quelle, um den Raum zu wecken.
            </div>
          ) : (
            connectors.map((connector) => (
              <ConnectorCard
                key={connector.id}
                connector={connector}
                onSetup={handleSetup}
                onSync={handleSync}
                isSyncing={syncingId === connector.id}
              />
            ))
          )}
        </div>
      </section>

      <section className="px-4 sm:px-8 py-12 grid lg:grid-cols-2 gap-6 items-center">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Schritt 2</p>
          <h2 className="text-2xl font-medium">Môra versteht</h2>
          <p className="text-sm text-muted-foreground">
            Datenpunkte verbinden sich zu einem Myzel-Netz. Jede neue Quelle stärkt das gemeinsame Bewusstsein.
          </p>
          <ConnectionMap nodes={connectionNodes.length === 0 ? undefined : connectionNodes} />
        </div>
        <div className="space-y-4">
          <h3 className="text-sm uppercase tracking-wide text-muted-foreground">Letzte Aktionen</h3>
          <div className="rounded-3xl border border-border bg-card/70 p-4 max-h-64 overflow-auto">
            {recentEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Noch keine Awareness-Events – verbinde eine Quelle oder erkunde das Feld.
              </p>
            ) : (
              <ul className="space-y-3 text-sm">
                {recentEvents.map((entry) => (
                  <li key={entry.id} className="flex items-start gap-3">
                    <span className="text-xs text-muted-foreground mt-1">{entry.time}</span>
                    <div className="flex-1 rounded-2xl border border-border/60 bg-background/60 px-3 py-2">
                      <div className="flex items-center gap-2 font-medium">
                        <span>{entry.icon}</span>
                        <span className={entry.level === "warning" ? "text-amber-500" : "text-foreground"}>
                          {entry.title}
                        </span>
                      </div>
                      {entry.detail && (
                        <p className="text-xs text-muted-foreground mt-1">{entry.detail}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-8 py-16 text-center space-y-4">
        <h2 className="text-2xl font-medium">Bereit, Môra zu erkunden?</h2>
        <p className="text-sm text-muted-foreground">
          Folder Mode für Dokumente. Field Mode für Verbindungen. Insights für Resonanz.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/folder" className="px-6 py-2 rounded-full bg-secondary hover:bg-secondary/80 text-sm mora-transition">
            Zu Folder Mode
          </Link>
          <Link href="/field" className="px-6 py-2 rounded-full bg-primary text-primary-foreground text-sm mora-transition">
            Zu Field Mode
          </Link>
        </div>
      </section>

      {setupTarget && (
        <ConnectorSetupModal
          connector={setupTarget}
          onClose={handleModalClose}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
}

function ConnectorSetupModal({
  connector,
  onClose,
  onSave,
}: {
  connector: Connector;
  onClose: () => void;
  onSave: (connector: Connector, config: Record<string, unknown>) => void;
}) {
  const [formState, setFormState] = useState<Record<string, string>>(() => {
    const entries = Object.entries(connector.config ?? {}).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string"
    );
    return Object.fromEntries(entries);
  });

  const handleChange = (key: string, value: string) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSave(connector, formState);
  };

  return (
    <div className="fixed inset-0 z-[90] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-3xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Connector Setup</p>
            <h3 className="text-lg font-semibold">{connector.name}</h3>
          </div>
          <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">
            Schließen
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {getConfigFields(connector.type).map((field) => (
            <div key={field.key} className="space-y-1">
              <label className="text-xs text-muted-foreground">{field.label}</label>
              <input
                type={field.type}
                value={formState[field.key] ?? ""}
                onChange={(e) => handleChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="w-full rounded-xl border border-border px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          ))}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full bg-secondary hover:bg-secondary/80 text-sm"
            >
              Abbrechen
            </button>
            <button type="submit" className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm">
              Speichern
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function getConfigFields(type: Connector["type"]) {
  switch (type) {
    case "email":
      return [
        { key: "email", label: "E-Mail", placeholder: "demo@example.com", type: "email" },
        { key: "appPassword", label: "App Password", placeholder: "••••••", type: "password" },
      ];
    case "filesystem":
      return [{ key: "path", label: "Pfad", placeholder: "/Users/demo/Documents", type: "text" }];
    case "notion":
      return [
        { key: "token", label: "Integration Token", placeholder: "secret_", type: "text" },
        { key: "workspace", label: "Workspace", placeholder: "Workspace-ID", type: "text" },
      ];
    case "github":
      return [
        { key: "token", label: "Personal Access Token", placeholder: "ghp_", type: "text" },
        { key: "repo", label: "Repository", placeholder: "orga/repo", type: "text" },
      ];
    case "n8n":
      return [
        { key: "webhook", label: "Webhook URL", placeholder: "https://...", type: "url" },
        { key: "workflow", label: "Workflow Name", placeholder: "Digest", type: "text" },
      ];
    default:
      return [{ key: "details", label: "Details", placeholder: "Konfiguration", type: "text" }];
  }
}

type FeedEntry = {
  icon: string;
  title: string;
  detail?: string;
  level: "info" | "warning";
};

function describeEvent(event: MoraEvent): FeedEntry {
  const payload = (event.payload ?? {}) as Record<string, unknown>;
  switch (event.action) {
    case "node_click": {
      const title = typeof payload.title === "string" ? payload.title : typeof payload.id === "string" ? payload.id : null;
      const type = typeof payload.type === "string" ? payload.type : undefined;
      return {
        icon: "🕸️",
        title: title ? `Node: ${title}` : "Node geöffnet",
        detail: type ? `Typ: ${type}` : undefined,
        level: "info",
      };
    }
    case "connector_action": {
      const payloadLevel = typeof payload.level === "string" ? payload.level : null;
      const statusText = typeof payload.status === "string" ? payload.status : null;
      const level: FeedEntry["level"] =
        payloadLevel === "warning" || statusText === "error" ? "warning" : "info";
      const id = typeof payload.id === "string" ? payload.id : "Connector";
      const synced = typeof payload.synced === "boolean" ? payload.synced : false;
      const message =
        typeof payload.message === "string"
          ? payload.message
          : synced
          ? `${id} synchronisiert`
          : statusText
          ? `${id} → ${statusText}`
          : `${id} aktualisiert`;
      return {
        icon: "🔌",
        title: message,
        detail: synced ? "Sync abgeschlossen" : undefined,
        level,
      };
    }
    case "filter_change":
    case "tag_filter_change": {
      const tag = typeof payload.tag === "string" ? payload.tag : null;
      return {
        icon: "🏷️",
        title: tag ? `Filter: #${tag}` : "Filter entfernt",
        detail: "Quick Filter aktualisiert",
        level: "info",
      };
    }
    default:
      return {
        icon: "🌿",
        title: event.action,
        detail: undefined,
        level: "info",
      };
  }
}
