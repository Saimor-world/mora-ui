"use client";

import Link from "next/link";
import { useMemo, useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  applyMockSnapshot,
  getConnectors,
  saveConnector,
  saveConnectorList,
  syncConnector,
  testConnection,
  type ConnectorStatus,
} from "@/lib/connectors";
import { mockConnectors, mockActivity } from "@/lib/mockConnectors";
import ConnectorCard from "@/components/home/ConnectorCard";
import ActivityPulse from "@/components/home/ActivityPulse";
import OnboardingOverlay from "@/components/home/OnboardingOverlay";
import SuggestionsPanel from "@/components/home/SuggestionsPanel";
import EventDetailDrawer from "@/components/home/EventDetailDrawer";
import ConnectionMap, { type ConnectionNode } from "@/components/connections/ConnectionMap";
import { emitMoraEvent, getMoraEvents, type MoraEvent } from "@/lib/mora/listener";
import { showToast } from "@/lib/toast";
import { useSessionStore } from "@/store/session";
import RoleSwitcher from "@/components/home/RoleSwitcher";
import { useRole } from "@/lib/hooks/useRole";
import DiagnosticsPanel from "@/components/diagnostics/DiagnosticsPanel";
import { useHealthCheck } from "@/lib/hooks/useApi";
import { getHealthFlags } from "@/lib/health";
import { QueryProvider } from "@/lib/queryClient";
import PageSection from "@/components/ui/PageSection";
import PanelCard from "@/components/ui/PanelCard";
import MyceliumContextChip from "@/components/ui/MyceliumContextChip";
import HintsCard from "@/components/home/HintsCard";
import SignalCard from "@/components/home/SignalCard";
import { useMindloopSynthesis } from "@/lib/hooks/useMindloopSynthesis";
import { useMyceliumSelection, mapObjectToNode } from "@/lib/mycelium/selection";
import { mockSnapshots } from "@/lib/mockData";
import ActionsCard from "@/components/home/ActionsCard";
import ThoughtBubble from "@/components/hints/ThoughtBubble";
import { ThoughtBubbleProvider, useThoughtBubbles } from "@/lib/contexts/ThoughtBubbleContext";

function HomePageInner() {
  const router = useRouter();
  const heroRef = useRef<HTMLDivElement>(null);
  const connectorsRef = useRef<HTMLElement | null>(null);
  const [connectors, setConnectors] = useState<ConnectorStatus[]>([]);
  const [setupTarget, setSetupTarget] = useState<ConnectorStatus | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [mockSyncRunning, setMockSyncRunning] = useState(false);
  const storedEvents = useSessionStore((state) => state.recentEvents);
  const [drawerEvent, setDrawerEvent] = useState<MoraEvent | null>(null);
  const setIntroSeen = useSessionStore((state) => state.setIntroSeen);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const { setSelection } = useMyceliumSelection();

  useEffect(() => {
    const loaded = getConnectors(mockConnectors);
    setConnectors(loaded);
  }, []);

  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = useHealthCheck();
  const { isOnline, isAuthError } = getHealthFlags(health?.status);
  const { items: synthesisItems, summary: synthesisSummary, isLoading: synthesisLoading } = useMindloopSynthesis();
  const mockNodeIndex = useMemo(() => {
    const index = new Map<string, (typeof mockSnapshots)[number]['nodes'][number]>();
    mockSnapshots.forEach((snap) => snap.nodes.forEach((node) => index.set(node.id, node)));
    return index;
  }, []);
  const { pushBubble } = useThoughtBubbles();
  const lastSynthesisCountRef = useRef(0);
  const connectorsTotal = connectors.length || mockConnectors.length;
  const coreStatusLabel = healthLoading
    ? "Pruefung laeuft"
    : isAuthError
    ? "Auth-Fehler"
    : isOnline
    ? "Online"
    : "Offline";
  const coreStatusTone = isOnline
    ? "text-green-600 border-green-500/40 bg-green-500/5"
    : isAuthError
    ? "text-amber-600 border-amber-500/40 bg-amber-500/5"
    : "text-red-600 border-red-500/40 bg-red-500/5";
  const coreStatusText = isOnline ? "text-green-600" : isAuthError ? "text-amber-600" : "text-red-600";
  const coreDotTone = isOnline ? "bg-green-500" : isAuthError ? "bg-amber-500" : "bg-red-500";
  const lastCheckedLabel = health?.timestamp
    ? new Date(health.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "n/a";

  const handleMindloopNavigate = (targetIds?: string[], contextLabel?: string) => {
    const targetId = targetIds?.[0];
    if (targetId) {
      const found = mockNodeIndex.get(targetId);
      const fallback = {
        id: targetId,
        title: contextLabel || targetId,
        type: found?.type ?? "document",
        tags: found?.tags ?? [],
        path: found?.path,
        spaceId: found?.spaceId ?? "cafe-main",
      };
      setSelection({ kind: "node", node: mapObjectToNode(found ?? fallback), object: found ?? fallback });
      // Navigate with deep-linking focus param
      const focusParam = targetIds && targetIds.length > 0 ? `?focus=${targetIds.join(',')}` : '';
      router.push(`/field${focusParam}`);
    } else {
      setSelection({ kind: "none" });
      router.push("/field");
    }
  };

  useEffect(() => {
    if ((synthesisItems?.length ?? 0) > lastSynthesisCountRef.current) {
      const top = synthesisItems[0];
      const message = top?.summary || top?.title || null;
      if (message) {
        pushBubble({
          title: 'Mind Loop',
          message,
          source: 'mindloop',
        });
      }
    }
    lastSynthesisCountRef.current = synthesisItems?.length ?? 0;
  }, [synthesisItems, pushBubble]);

  const applyConnectorUpdate = (next: ConnectorStatus) => {
    setConnectors((prev) => prev.map((item) => (item.id === next.id ? next : item)));
    saveConnector(next);
  };

  const { connectedCount, stageLabel } = useMemo(() => {
    const connected = connectors.filter((c) => c.state === "connected").length;
    if (connected === 0) {
      return { connectedCount: 0, stageLabel: "Keine Verbindungen" };
    }
    if (connected < 3) {
      return { connectedCount: connected, stageLabel: `Aufbauend (${connected}/3)` };
    }
    return { connectedCount: connected, stageLabel: `Verbunden (${connected})` };
  }, [connectors]);

  const connectionNodes = useMemo<ConnectionNode[]>(() => {
    if (connectors.length === 0) return [];
    return connectors.map((connector) => {
      const status: ConnectionNode['status'] =
        connector.state === "connected"
          ? "connected"
          : connector.state === "error"
          ? "offline"
          : "coming_soon";
      return {
        id: connector.id,
        label: connector.label,
        status,
      };
    });
  }, [connectors]);

  const handleSetup = (connector: ConnectorStatus) => {
    setSetupTarget(connector);
  };

  const handleModalClose = () => setSetupTarget(null);

  const handleModalSave = async (connector: ConnectorStatus, config: Record<string, unknown>) => {
    const pending: ConnectorStatus = {
      ...connector,
      config,
      state: "syncing",
    };
    applyConnectorUpdate(pending);
    emitMoraEvent("connector_action", {
      id: pending.id,
      status: "syncing",
      mode: pending.mode,
    });

    try {
      const next = await testConnection(pending);
      applyConnectorUpdate(next);
      emitMoraEvent("connector_action", {
        id: next.id,
        status: next.state,
        mode: next.mode,
        objectCount: next.objectCount ?? undefined,
      });
      showToast({ message: `${next.label} verbunden`, variant: "success" });
    } catch (error) {
      const failed: ConnectorStatus = { ...pending, state: "error" };
      applyConnectorUpdate(failed);
      emitMoraEvent("connector_action", {
        id: failed.id,
        status: "error",
        mode: failed.mode,
      });
      showToast({ message: `${failed.label} konnte nicht verbunden werden`, variant: "error" });
    } finally {
      setSetupTarget(null);
    }
  };

  const handleSync = async (connector: ConnectorStatus) => {
    setSyncingId(connector.id);
    const syncing: ConnectorStatus = { ...connector, state: "syncing" };
    applyConnectorUpdate(syncing);
    emitMoraEvent("connector_action", {
      id: syncing.id,
      status: "syncing",
      mode: syncing.mode,
    });
    try {
      const result = await syncConnector(syncing);
      applyConnectorUpdate(result);
      emitMoraEvent("connector_action", {
        id: result.id,
        status: result.state,
        mode: result.mode,
        objectCount: result.objectCount ?? undefined,
      });
      showToast({ message: `${result.label} synchronisiert`, variant: "success" });
    } catch (error) {
      const failed: ConnectorStatus = { ...syncing, state: "error" };
      applyConnectorUpdate(failed);
      emitMoraEvent("connector_action", {
        id: failed.id,
        status: "error",
        mode: failed.mode,
      });
      showToast({ message: `${failed.label} Sync fehlgeschlagen`, variant: "error" });
    } finally {
      setSyncingId((current) => (current === connector.id ? null : current));
    }
  };

  const handleMockSimulation = async () => {
    if (mockSyncRunning) return;
    setMockSyncRunning(true);
    try {
      const base = connectors.length > 0 ? connectors : mockConnectors;
      if (base.length === 0) {
        return;
      }

      const syncingList = base.map((entry) => ({
        ...entry,
        mode: "mock" as const,
        state: "syncing" as ConnectorStatus["state"],
      }));
      setConnectors(syncingList);
      saveConnectorList(syncingList);
      syncingList.forEach((entry) =>
        emitMoraEvent("connector_action", {
          id: entry.id,
          status: "syncing",
          mode: "mock",
        })
      );
      showToast({ message: "Mock-Sync gestartet", variant: "info" });
      await delay(1500);
      const result = applyMockSnapshot(syncingList);
      setConnectors(result);
      result.forEach((entry) =>
        emitMoraEvent("connector_action", {
          id: entry.id,
          status: entry.state,
          mode: entry.mode,
          objectCount: entry.objectCount ?? undefined,
        })
      );
      showToast({ message: "Demo-Sync abgeschlossen", variant: "success" });
    } finally {
      setMockSyncRunning(false);
    }
  };

  const isEmptyState = connectedCount === 0;
  const awarenessEvents = useMemo(() => {
    return storedEvents.length > 0 ? storedEvents : getMoraEvents();
  }, [storedEvents]);

  const recentEvents = useMemo(() => {
    const events = awarenessEvents;
    return events.slice(-5).reverse().map((event, index) => {
      const description = describeEvent(event);
      return {
        id: `${event.ts}-${event.action}-${index}`,
        time: new Date(event.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        raw: event,
        ...description,
      };
    });
  }, [awarenessEvents]);

  const awarenessTraces = useMemo(() => {
    return awarenessEvents.slice(-3).reverse().map((event, index) => ({
      id: `${event.ts}-${index}`,
      label: summarizeAwarenessEvent(event),
    }));
  }, [awarenessEvents]);

  const { definition: roleDefinition } = useRole();

  const awarenessFeedItems = useMemo(() => recentEvents.slice(0, 5), [recentEvents]);

  const awarenessSummary = useMemo(() => {
    const source = storedEvents.length > 0 ? "session" : "demo";
    if (awarenessEvents.length === 0) {
      return {
        source,
        headline: "Môra hört zu",
        detail: roleDefinition.homeEmpty,
        badges: [roleDefinition.label, roleDefinition.insightsTone],
        count: 0,
        lastTime: null as string | null,
      };
    }

    const latestWindow = awarenessEvents.slice(-5);
    const lastEvent = latestWindow[latestWindow.length - 1];
    const headline = summarizeAwarenessEvent(lastEvent);
    const badges = Array.from(
      new Set([
        `${latestWindow.length} Impulse`,
        roleDefinition.label,
        roleDefinition.insightsTone,
      ].filter(Boolean))
    );

    return {
      source,
      headline: `Letzte Resonanz: ${headline}`,
      detail: `Zuletzt ${new Date(lastEvent.ts).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`,
      badges,
      count: awarenessEvents.length,
      lastTime: lastEvent.ts,
    };
  }, [awarenessEvents, storedEvents.length, roleDefinition]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-card/30 to-background text-foreground">
      <OnboardingOverlay />
      <div className="relative">
        <div className="absolute inset-0 pointer-events-none opacity-60">
          <ActivityPulse activities={mockActivity} dimFallback={isEmptyState} />
        </div>
        
        <PageSection
          ref={heroRef}
          className="relative py-20 sm:py-28 border-b border-border/50"
          maxWidthClassName="max-w-5xl"
        >
          <div className="absolute top-6 right-4 sm:right-10">
            <RoleSwitcher />
          </div>
          <div className="flex flex-col items-center text-center gap-6">
            <div className="flex flex-wrap justify-center gap-2 text-[11px] uppercase tracking-[0.35em] text-muted-foreground">
              <span className="px-3 py-1 rounded-full border border-border/60 bg-card/70">Mora Resonanzraum</span>
              <span className="px-3 py-1 rounded-full border border-border/60 bg-card/70">Rolle: {roleDefinition.label}</span>
              <span className="px-3 py-1 rounded-full border border-border/60 bg-card/70">{stageLabel}</span>
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">{roleDefinition.homeTitle}</h1>
              <p className="max-w-3xl mx-auto text-sm sm:text-base text-muted-foreground leading-relaxed">
                {roleDefinition.homeMessage}
              </p>
              <p className="text-xs text-muted-foreground">
                Saimor als semantisches OS fuer Klarheit: oben der Wald, unten das Myzel. Gefuehrter Demo-Blick mit simulierten Daten - spaeter laeuft derselbe Pfad mit euren echten Signalen durchs Myzel. Mora haelt den Kontext ueber Field, Folder, Insights und Chat hinweg.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 text-[11px] text-muted-foreground uppercase tracking-wide">
              {roleDefinition.highlights.map((highlight) => (
                <span key={highlight} className="px-3 py-1 rounded-full border border-border/60 bg-card/70">
                  {highlight}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-4 items-center">
              <button
                onClick={() => connectorsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="px-6 py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold mora-transition mora-ripple"
              >
                Starte mit deinen Datenquellen
              </button>
              <button
                type="button"
                onClick={() => setIntroSeen(false)}
                className="text-sm px-4 py-2 rounded-full border border-dashed border-border text-muted-foreground hover:text-foreground mora-transition"
              >
                Kurze Tour erneut starten
              </button>
            </div>
          </div>
        </PageSection>

      </div>

      <PageSection className="py-12" containerClassName="grid gap-6 lg:grid-cols-2">
          <PanelCard
            paddingClassName="p-6 lg:p-7"
            className="space-y-4 shadow-xl"
            data-testid="home-pulse-card"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">System Pulse</p>
                <h3 className="text-lg font-semibold">Systemgesundheit & Datenlage</h3>
                <p className="text-sm text-muted-foreground">
                  Core-Status, Demo-Quellen und letzter Check auf einen Blick.
                </p>
              </div>
              <span className={`flex items-center gap-2 text-xs px-3 py-1 rounded-full border ${coreStatusTone}`}>
                <span
                  className={`h-2 w-2 rounded-full ${coreDotTone} ${healthLoading ? "" : "animate-pulse"}`}
                  aria-hidden="true"
                />
                {coreStatusLabel}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-border/60 bg-background/70 px-4 py-3 flex items-center justify-between">
                <span className="text-muted-foreground">Core-Status</span>
                <span className={`font-semibold ${coreStatusText}`}>{coreStatusLabel}</span>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/70 px-4 py-3 flex items-center justify-between">
                <span className="text-muted-foreground">Demo-Quellen</span>
                <span className="font-semibold">{connectedCount} / {connectorsTotal} aktiv</span>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/70 px-4 py-3 flex items-center justify-between sm:col-span-2">
                <span className="text-muted-foreground">Zuletzt geprueft</span>
                <span className="text-xs">{lastCheckedLabel}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowDiagnostics(true)}
                className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold mora-transition"
                data-testid="open-diagnostics"
              >
                Diagnostics anzeigen
              </button>
              <button
                type="button"
                onClick={handleMockSimulation}
                disabled={mockSyncRunning}
                className="px-4 py-2 rounded-full border border-border text-sm mora-transition disabled:opacity-60"
              >
                {mockSyncRunning ? "Simulation laeuft..." : "Demo-Sync starten"}
              </button>
              <button
                type="button"
                onClick={() => refetchHealth()}
                className="text-xs px-3 py-2 rounded-full border border-border/70 hover:bg-secondary mora-transition"
              >
                Health neu laden
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Demo-Sync haelt die Mock-Daten frisch. Diagnostics zeigt Details zum System.
            </p>
          </PanelCard>

          <PanelCard paddingClassName="p-6 lg:p-7" className="space-y-4 shadow-xl">
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Naechste Schritte</p>
            <h3 className="text-lg font-semibold">Gefuehrte Demo-Reise (simuliert)</h3>
            <MyceliumContextChip neutralText="Auswahl in Field/Folder steuert Kontext fuer Insights & Chat" />
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 h-8 w-8 rounded-full border border-primary/30 bg-primary/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3v6l-2 2 6 6 2-2h6" />
                    <circle cx="8" cy="3" r="1.5" />
                    <circle cx="20" cy="15" r="1.5" />
                  </svg>
                </span>
                <span>Quellen verbinden (Wald): Demo-Daten starten oder spaeter echte Connectoren fuer Teams, Projekte, KPIs anschliessen - derselbe Weg bleibt bestehen.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 h-8 w-8 rounded-full border border-border bg-secondary/50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="6" cy="12" r="2" />
                    <circle cx="18" cy="8" r="2" />
                    <circle cx="18" cy="16" r="2" />
                    <path d="M8 12h8M8 12l8-4M8 12l8 4" />
                  </svg>
                </span>
                <span>Myzel erkennen (Feld): Field oder Folder oeffnen, einen Knoten waehlen - dieser Kontext traegt in Insights & Chat.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 h-8 w-8 rounded-full border border-border bg-card/70 flex items-center justify-center">
                  <svg className="w-4 h-4 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 18l-1.5 3 3-1.5H20a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h1z" />
                    <path d="M8 10h8M8 7h5M8 13h6" />
                  </svg>
                </span>
                <span>Kontextbewusster Dialog (Chat): Insights und Chat nutzen dieselbe Auswahl - heute Demo-Antworten, spaeter fliessen echte Kennzahlen und Dokumente ueber denselben Pfad.</span>
              </li>
            </ul>
            <div className="flex gap-2 flex-wrap">
              <Link href="/field" className="px-4 py-2 rounded-full bg-secondary hover:bg-secondary/80 text-sm mora-transition">
                Zum Field Mode
              </Link>
              <Link href="/folder" className="px-4 py-2 rounded-full border border-border text-sm mora-transition">
                Zum Folder Mode
              </Link>
            </div>
          </PanelCard>

          <HintsCard maxHints={3} />
          <SignalCard
            items={synthesisItems}
            summary={synthesisSummary}
            isLoading={synthesisLoading}
            onNavigateToTargets={handleMindloopNavigate}
          />
          <ActionsCard
            items={synthesisItems}
            onNavigateToTarget={(id, label) => handleMindloopNavigate(id ? [id] : undefined, label)}
          />
      </PageSection>
      <ThoughtBubble />
      <PageSection className="py-12">
        <PanelCard className="rounded-3xl shadow-lg overflow-hidden" paddingClassName="p-0">
          <div className="grid gap-6 lg:grid-cols-2 p-6">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
                Mora hoert zu - {roleDefinition.label}
              </p>
              <h3 className="text-2xl font-medium">{awarenessSummary.headline}</h3>
              <p className="text-sm text-muted-foreground max-w-xl">{awarenessSummary.detail}</p>
              {awarenessSummary.badges.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {awarenessSummary.badges.map((badge) => (
                    <span
                      key={badge}
                      className="px-3 py-1 rounded-full bg-secondary/40 text-secondary-foreground text-xs tracking-wide"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              )}
              {awarenessTraces.length > 0 && (
                <div className="flex flex-wrap gap-2 text-[11px]">
                  {awarenessTraces.map((trace) => (
                    <span
                      key={trace.id}
                      className="px-3 py-1 rounded-full border border-border/60 text-muted-foreground uppercase tracking-wide"
                    >
                      {trace.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-3" aria-live="polite" aria-label="Letzte Awareness-Ereignisse">
              {awarenessFeedItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/60 bg-background/70 px-4 py-6 text-sm text-muted-foreground">
                  {roleDefinition.homeEmpty}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.35em] text-muted-foreground">Letzte Resonanz</p>
                  <ul className="space-y-3">
                    {awarenessFeedItems.map((entry) => (
                      <li
                        key={entry.id}
                        className="rounded-2xl border border-border/70 bg-background/85 px-4 py-3 shadow-sm mora-breathe flex gap-3"
                      >
                        <span className="text-lg" aria-hidden="true">{entry.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{entry.title}</p>
                          {entry.detail && (
                            <p className="text-xs text-muted-foreground truncate">{entry.detail}</p>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">{entry.time}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </PanelCard>
      </PageSection>

      <PageSection className="py-12">
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm uppercase tracking-wide text-muted-foreground">Schritt 1</p>
              <h2 className="text-2xl font-medium">Quellen anschliessen</h2>
            </div>
            <button
              onClick={handleMockSimulation}
              disabled={mockSyncRunning}
              className="text-sm px-4 py-2 rounded-full border border-border hover:bg-secondary mora-transition disabled:opacity-60 disabled:pointer-events-none"
            >
              {mockSyncRunning ? "Simulation laeuft..." : "Mock-Modus - Verbindungen simulieren"}
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
        </div>
      </PageSection>

      <PageSection className="py-12">
        <div className="grid lg:grid-cols-2 gap-6 items-center">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-wide text-muted-foreground">Schritt 2</p>
            <h2 className="text-2xl font-medium">Mora verknuepft</h2>
            <p className="text-sm text-muted-foreground">
              Datenpunkte formen ein Myzel. Jede neue Quelle schaerft das gemeinsame Bild.
            </p>
            <ConnectionMap nodes={connectionNodes.length === 0 ? undefined : connectionNodes} />
          </div>
          <div className="space-y-4">
            <h3 className="text-sm uppercase tracking-wide text-muted-foreground">Letzte Aktionen</h3>
            <PanelCard className="rounded-3xl bg-card/70" paddingClassName="p-4 max-h-64 overflow-auto border-border">
              {recentEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Noch keine Awareness-Events - verbinde eine Quelle oder erkunde das Feld.
                </p>
              ) : (
                <ul className="space-y-3 text-sm">
                  {recentEvents.map((entry) => (
                    <li key={entry.id} className="flex items-start gap-3">
                      <span className="text-xs text-muted-foreground mt-1">{entry.time}</span>
                      <button
                        type="button"
                        onClick={() => setDrawerEvent(entry.raw)}
                        className="flex-1 rounded-2xl border border-border/60 bg-background/60 px-3 py-2 text-left hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
                      >
                        <div className="flex items-center gap-2 font-medium">
                          <span>{entry.icon}</span>
                          <span className={entry.level === "warning" ? "text-amber-500" : "text-foreground"}>
                            {entry.title}
                          </span>
                        </div>
                        {entry.detail && (
                          <p className="text-xs text-muted-foreground mt-1">{entry.detail}</p>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </PanelCard>
          </div>
        </div>
      </PageSection>
      <PageSection className="py-16 text-center space-y-4">
        <h2 className="text-2xl font-medium">Bereit, Mora weiter zu erkunden?</h2>
        <p className="text-sm text-muted-foreground">
          Folder Mode fuer Dokumente. Field Mode fuer Verbindungen. Insights fuer Resonanz.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/folder" className="px-6 py-2 rounded-full bg-secondary hover:bg-secondary/80 text-sm mora-transition">
            Zu Folder Mode
          </Link>
          <Link href="/field" className="px-6 py-2 rounded-full bg-primary text-primary-foreground text-sm mora-transition">
            Zu Field Mode
          </Link>
        </div>
      </PageSection>

      {setupTarget && (
        <ConnectorSetupModal
          connector={setupTarget}
          onClose={handleModalClose}
          onSave={handleModalSave}
        />
      )}

      {showDiagnostics && (
        <section className="px-4 sm:px-8 pb-8">
          <div className="rounded-3xl border border-border bg-card/90 shadow-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Systemdiagnose</h3>
              <button
                type="button"
                onClick={() => setShowDiagnostics(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Schliessen
              </button>
            </div>
            <DiagnosticsPanel />
          </div>
        </section>
      )}

      <SuggestionsPanel />
      <EventDetailDrawer event={drawerEvent} open={Boolean(drawerEvent)} onClose={() => setDrawerEvent(null)} />
    </div>
  );
}

function ConnectorSetupModal({
  connector,
  onClose,
  onSave,
}: {
  connector: ConnectorStatus;
  onClose: () => void;
  onSave: (connector: ConnectorStatus, config: Record<string, unknown>) => void;
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
            <h3 className="text-lg font-semibold">{connector.label}</h3>
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

function getConfigFields(type: ConnectorStatus["type"]) {
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

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function describeEvent(event: MoraEvent): FeedEntry {
  const payload = (event.payload ?? {}) as Record<string, unknown>;
  switch (event.action) {
    case "node_click": {
      const title =
        typeof payload.title === "string"
          ? payload.title
          : typeof payload.id === "string"
          ? payload.id
          : "Knoten";
      const type = typeof payload.type === "string" ? payload.type : undefined;
      const tags = Array.isArray(payload.tags) ? payload.tags : [];
      return {
        icon: "🕸️",
        title: `Knoten fokussiert: ${title}`,
        detail: type ? `Typ ${type}` : tags[0] ? `#${tags[0]}` : undefined,
        level: "info",
      };
    }
    case "connector_action": {
      const statusText = typeof payload.status === "string" ? payload.status : null;
      const level: FeedEntry["level"] = statusText === "error" ? "warning" : "info";
      const id = typeof payload.id === "string" ? payload.id : "Connector";
      let title = `${id} aktualisiert`;
      if (statusText === "connecting" || statusText === "syncing") {
        title = `${id} startet Sync`;
      } else if (statusText === "connected") {
        title = `${id} verbunden`;
      } else if (statusText === "error") {
        title = `${id} meldet Fehler`;
      }
      return {
        icon: statusText === "error" ? "⚠️" : "🔗",
        title,
        detail: statusText && statusText !== "connected" ? `Status: ${statusText}` : undefined,
        level,
      };
    }
    case "filter_change":
    case "tag_filter_change": {
      const tag = typeof payload.tag === "string" ? payload.tag : null;
      const orb = typeof payload.orb === "string" ? payload.orb : null;
      return {
        icon: "🎚️",
        title: "Filter angepasst",
        detail: tag ? `Tag #${tag}` : orb ? `Orb ${orb}` : undefined,
        level: "info",
      };
    }
    case "open_document": {
      const title = typeof payload.title === "string" ? payload.title : "Dokument";
      const pathValue = typeof payload.path === "string" ? payload.path : undefined;
      return {
        icon: "📄",
        title: `Dokument geoeffnet: ${title}`,
        detail: pathValue,
        level: "info",
      };
    }
    default:
      return {
        icon: "✨",
        title: event.action,
        detail: undefined,
        level: "info",
      };
  }
}

function summarizeAwarenessEvent(event: MoraEvent) {
  switch (event.action) {
    case "node_click":
      return "Field beruehrt";
    case "connector_action":
      return "Connector aktiv";
    case "filter_change":
    case "tag_filter_change":
      return "Filter gewechselt";
    case "open_document":
      return "Dokument geoeffnet";
    default:
      return "Impulse registriert";
  }
}

export default function HomePage() {
  return (
    <QueryProvider>
      <ThoughtBubbleProvider>
        <HomePageInner />
      </ThoughtBubbleProvider>
    </QueryProvider>
  );
}











