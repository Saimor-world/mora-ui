"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Command,
  Box,
  Users,
  FileText,
  Settings,
  Mic,
  Send,
  X,
  Maximize2,
  Minimize2,
  Folder,
  MoreHorizontal,
  Activity,
  ChevronRight,
  Search,
  Sparkles,
  Share2,
  Layers,
  Lightbulb,
  MessageSquareText,
  Loader2,
  Check,
  Bell,
  Grid,
  Power,
  Terminal,
  Clock,
  BatteryCharging,
  Wifi,
  Cpu,
  Notebook,
  User,
  Bot,
  Eye,
  Shield,
  Home,
  Globe,
  Database,
  Zap
} from 'lucide-react';
import { OrganicBackground } from "@/components/organic/OrganicBackground";
import { MoraOrb } from "@/components/organic/MoraOrb";
import { ConnectorNode } from "@/components/organic/ConnectorNode";
import { RoleCard } from "@/components/organic/RoleCard";
import { OrganicInput } from "@/components/organic/OrganicInput";
import { NavIcon } from "@/components/organic/NavIcon";
import { DataCluster } from "@/components/organic/DataCluster";
import { InsightCard } from "@/components/organic/InsightCard";
import MyceliumGraph2D, { type MyceliumGraph2DRef, type GraphStats } from '@/components/canvas/FieldMode/MyceliumGraph2D';
import { MyceliumBackground } from '@/components/canvas/MyceliumBackground';
import { CameraControlsUI, useCamera } from '@/components/canvas/CameraControls';
import { NodeDetailsPanel } from '@/components/organic/NodeDetailsPanel';
import { FileUploadZone } from '@/components/organic/FileUploadZone';
import { BootSequence } from '@/components/organic/BootSequence';
import { MyceliumCanvas } from '@/components/organic/MyceliumCanvas';
import { OrganicStatePanel } from '@/components/organic/OrganicStatePanel';

// --- REAL HOOKS ---
import { useRole } from '@/lib/hooks/useRole';
import { useRealtime } from '@/lib/hooks/useRealtime';
import { useHealthCheck } from '@/lib/hooks/useApi';
import { useMindloopSynthesis } from '@/lib/hooks/useMindloopSynthesis';
import { useSemanticEvents } from '@/lib/hooks/useSemanticEvents';
import { useSpaces } from '@/lib/hooks/useSpaces';
import { useSaimorCore } from '@/lib/hooks/useSaimorCore';
import { mockSnapshots } from '@/lib/mockData';
import type { MoraObject } from '@/lib/types';
import { SpaceSwitcher } from '@/components/organic/SpaceSwitcher';
import { useSessionStore } from '@/store/session';
import type { RoleKey } from '@/lib/roles';
import type { Space } from '@/lib/types/spaces';
import { useShallow } from 'zustand/react/shallow';

// --- BRAND PALETTE & UTILS ---
const COLORS = {
  owner: '#ef4444', // Red-500
  department: '#CEB676', // Gold
  member: '#3b82f6', // Blue-500
};

// Create a client instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

type ActiveView = 'home' | 'layers' | 'documents' | 'activity' | 'team' | 'settings' | 'profile';

const ROLE_HUBS: Record<RoleKey, { rootId: string; spaceId: string }> = {
  owner: { rootId: 'cafe_root', spaceId: 'space_cafe' },
  department: { rootId: 'marketing_root', spaceId: 'space_marketing' },
  member: { rootId: 'cafe_root', spaceId: 'space_cafe' },
  admin: { rootId: 'lab_root', spaceId: 'space_lab' },
};

const SPACE_COLORS = ['#CEB676', '#5C8D85', '#34D399', '#60A5FA', '#F472B6'];

const formatSpaceLabel = (spaceId: string) => {
  if (!spaceId) return 'Ungrouped';
  const trimmed = spaceId.replace(/^space[_-]?/i, '');
  return trimmed
    .split(/[_-]/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ') || 'Space';
};

type SpaceInventoryEntry = {
  label: string;
  nodes: MoraObject[];
  rootId?: string;
};

import { GlobalCommandBar } from '@/components/organic/GlobalCommandBar';

function HomePageContent() {
  const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);

  // Toggle Command Bar with Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandBarOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  const [commandQuery, setCommandQuery] = useState('');

  const [stage, setStage] = useState<'intro' | 'connect' | 'role' | 'generating' | 'booting' | 'dashboard'>('intro');
  const [text, setText] = useState('');
  const [connected, setConnected] = useState<string[]>([]);
  const [hoveredRole, setHoveredRole] = useState<string | null>(null);
  const [blueprintMode, setBlueprintMode] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [ownerConsoleCollapsed, setOwnerConsoleCollapsed] = useState(false);
  const [orbState, setOrbState] = useState<'idle' | 'speaking' | 'processing' | 'listening'>('idle');

  // Spaces
  const [currentSpace, setCurrentSpace] = useState<string | null>(null);

  // MyceliumGraph state
  const [selectedNode, setSelectedNode] = useState<MoraObject | null>(null);
  const [focusedRootId, setFocusedRootId] = useState<string | null>(null); // For drill-down navigation
  const [resetSignal, setResetSignal] = useState(0);
  const [graphStats, setGraphStats] = useState<GraphStats | null>(null);
  const graphRef = useRef<MyceliumGraph2DRef>(null);

  // --- REAL APPLICATION STATE ---
  const { role: selectedRole, setRole: setSelectedRole } = useRole();
  const {
    events: mindEvents,
    status: realtimeStatus,
    statusMessage: realtimeStatusMessage,
    lastUpdate: realtimeLastUpdate
  } = useRealtime();
  const { data: healthData } = useHealthCheck();
  const { summary: synthesisSummary } = useMindloopSynthesis();
  const { data: semanticEvents } = useSemanticEvents();
  const { spaces, loading: spacesLoading, createSpace } = useSpaces();
  const {
    activeOrb,
    lastViewedNode,
    recentEvents,
    lastVisitedRoute,
    setLastVisitedRoute
  } = useSessionStore(
    useShallow((state) => ({
      activeOrb: state.activeOrb,
      lastViewedNode: state.lastViewedNode,
      recentEvents: state.recentEvents,
      lastVisitedRoute: state.lastVisitedRoute,
      setLastVisitedRoute: state.setLastVisitedRoute,
    }))
  );

  // Snapshots
  const token = process.env.NEXT_PUBLIC_JWT_TOKEN || null;
  const { data: snapshotsData, loading: snapshotsLoading, error: snapshotsError } = useSaimorCore<any[]>('/snapshots', 5000, token); // Assuming Snapshot[] type, adjusted to any[] for flexibility
  const snapshots = snapshotsData && snapshotsData.length > 0 ? snapshotsData : mockSnapshots;
  const snapshot = snapshots[0] || mockSnapshots[0];
  const ambientSignalStrength = synthesisSummary?.highest_severity ? (synthesisSummary.highest_severity - 0.7) / 0.3 : 0;
  const roleHub = ROLE_HUBS[selectedRole as RoleKey] || ROLE_HUBS.owner;
  const isOwnerOrAdmin = selectedRole === 'owner' || selectedRole === 'admin';
  const isMemberView = selectedRole === 'member';

  // Command bar search results (must be after snapshot is declared)
  const commandSearchResults = useMemo(() => {
    if (!commandQuery || !snapshot) return [];
    return snapshot.nodes.filter((n: MoraObject) =>
      n.title.toLowerCase().includes(commandQuery.toLowerCase()) ||
      n.type.toLowerCase().includes(commandQuery.toLowerCase())
    ).slice(0, 5);
  }, [commandQuery, snapshot]);


  const spaceInventory = useMemo(() => {
    const map = new Map<string, SpaceInventoryEntry>();
    if (!snapshot) return map;
    snapshot.nodes.forEach((node: MoraObject) => {
      const spaceId = node.spaceId || 'ungrouped';
      if (!map.has(spaceId)) {
        map.set(spaceId, {
          label: node.spaceId ? formatSpaceLabel(spaceId) : 'Ungrouped',
          nodes: [],
        });
      }
      const entry = map.get(spaceId)!;
      entry.nodes.push(node);
      if (!entry.rootId && node.id.endsWith('_root')) {
        entry.rootId = node.id;
        entry.label = node.title || entry.label;
      }
    });
    return map;
  }, [snapshot]);

  const fallbackSpaces = useMemo<Space[]>(() => {
    const entries = Array.from(spaceInventory.entries()).filter(([id]) => id !== 'ungrouped');
    return entries.map(([id, meta], index) => ({
      id,
      name: meta.label,
      description: `Demo space ${meta.label}`,
      icon: meta.rootId ? '?' : '?',
      color: SPACE_COLORS[index % SPACE_COLORS.length],
      order: index,
      is_default: id === ROLE_HUBS.owner.spaceId,
      created_at: 'demo',
      updated_at: 'demo',
    }));
  }, [spaceInventory]);

  const resolvedSpaces = spaces.length > 0 ? spaces : fallbackSpaces;
  const spacesForNavigation = isOwnerOrAdmin
    ? resolvedSpaces
    : resolvedSpaces.filter((space) => space.id === roleHub.spaceId);
  const enforcedSpaceId = isOwnerOrAdmin ? null : roleHub.spaceId;
  const effectiveSpaceId = enforcedSpaceId ?? currentSpace;
  const activeSpaceMeta = effectiveSpaceId ? spaceInventory.get(effectiveSpaceId) : null;

  // --- FILTERED SNAPSHOT FOR DRILL-DOWN ---
  const filteredSnapshot = useMemo(() => {
    if (!snapshot) return null;
    if (!focusedRootId) return snapshot;

    // Find children of the focused node
    const childrenIds = new Set<string>();
    snapshot.edges.forEach((e: any) => {
      if (e.sourceId === focusedRootId && e.kind === 'contains') {
        childrenIds.add(e.targetId);
      }
    });

    // Also include the focused node itself (as central anchor)
    childrenIds.add(focusedRootId);

    const nodes = snapshot.nodes.filter((n: any) => childrenIds.has(n.id));
    const edges = snapshot.edges.filter((e: any) => childrenIds.has(e.sourceId) && childrenIds.has(e.targetId));

    return { ...snapshot, nodes, edges };
  }, [snapshot, focusedRootId]);

  const canvasSnapshot = useMemo(() => {
    const baseSnapshot = filteredSnapshot || snapshot;
    if (!baseSnapshot) return null;

    const targetSpaceId = effectiveSpaceId ?? (isOwnerOrAdmin ? null : roleHub?.spaceId);
    if (!targetSpaceId) return baseSnapshot;

    const nodes = baseSnapshot.nodes.filter(
      (n: any) => n.spaceId === targetSpaceId || n.id === roleHub?.rootId
    );
    if (nodes.length === 0) return baseSnapshot;

    const allowedIds = new Set(nodes.map((n: any) => n.id));
    const edges = baseSnapshot.edges.filter(
      (edge: any) => allowedIds.has(edge.sourceId) && allowedIds.has(edge.targetId)
    );
    return { ...baseSnapshot, nodes, edges };
  }, [filteredSnapshot, snapshot, effectiveSpaceId, roleHub, isOwnerOrAdmin]);
  const highlightNodeId = selectedNode?.id || roleHub?.rootId || null;

  // Typing Effect Hook
  useEffect(() => {
    if (stage === 'intro') {
      const fullText = "The space grows with you. Let us weave your network.";
      let i = 0;
      const interval = setInterval(() => {
        setText(fullText.slice(0, i + 1));
        i++;
        if (i > fullText.length) {
          clearInterval(interval);
          setTimeout(() => setStage('connect'), 1500);
        }
      }, 50);
      return () => clearInterval(interval);
    }
  }, [stage]);

  useEffect(() => {
    if (isOwnerOrAdmin) return;
    if (!snapshot || !roleHub?.spaceId) return;
    const hasSpace = snapshot.nodes.some((node: MoraObject) => node.spaceId === roleHub.spaceId);
    if (!hasSpace) return;
    setCurrentSpace((prev) => (prev === null ? roleHub.spaceId : prev));
  }, [snapshot, roleHub, isOwnerOrAdmin]);

  useEffect(() => {
    if (!isOwnerOrAdmin || activeView !== 'home') {
      if (!ownerConsoleCollapsed) {
        setOwnerConsoleCollapsed(true);
      }
      return;
    }
    if (ownerConsoleCollapsed && currentSpace === null) {
      setOwnerConsoleCollapsed(false);
    }
  }, [isOwnerOrAdmin, activeView, ownerConsoleCollapsed, currentSpace]);

  const handleConnect = async (id: string) => {
    if (connected.includes(id)) return;
    if (id === 'files') {
      // Native File System Access API (from IST-Stand)
      try {
        if (window.showDirectoryPicker) {
          await window.showDirectoryPicker();
          // In real app, we'd scan here.
        }
      } catch (e) {
        console.log("File picker cancelled or not supported", e);
      }
    }
    setConnected(prev => [...prev, id]);

    // Auto-advance if enough connected
    if (connected.length >= 0) { // Threshold simplified for demo
      setTimeout(() => setStage('role'), 1000);
    }
  };

  const handleRoleSelect = (role: string) => {
    // @ts-expect-error - Role string from UI might need casting to RoleKey
    setSelectedRole(role);
    setOrbState('processing');
    setStage('generating');
    setTimeout(() => setStage('booting'), 2000);
  };

  const handleInputSend = (_msg: string) => {
    setOrbState('processing');
    setTimeout(() => {
      setOrbState('speaking');
      setTimeout(() => setOrbState('idle'), 3000);
    }, 1500);
  };

  const handleNodeClick = useCallback((node: MoraObject) => {
    setSelectedNode(node);
    setOrbState('speaking');
    setTimeout(() => setOrbState('idle'), 2000);
  }, []);

  const handleResetView = useCallback(() => {
    setResetSignal((value) => value + 1);
    graphRef.current?.resetView();
  }, []);

  const changeView = useCallback((view: ActiveView) => {
    setActiveView(view);
    setLastVisitedRoute(view);
  }, [setLastVisitedRoute]);

  const handleSpaceChange = useCallback((spaceId: string | null) => {
    if (!isOwnerOrAdmin) {
      if (spaceId && spaceId === roleHub.spaceId) {
        setCurrentSpace(spaceId);
        setFocusedRootId(roleHub.rootId);
      }
      return;
    }
    if (activeView === 'home' && !ownerConsoleCollapsed) {
      setOwnerConsoleCollapsed(true);
    }
    setCurrentSpace(spaceId);
    if (!spaceId) {
      setFocusedRootId(null);
      return;
    }
    const entry = spaceInventory.get(spaceId);
    if (entry?.rootId) {
      setFocusedRootId(entry.rootId);
    }
  }, [spaceInventory, isOwnerOrAdmin, roleHub, activeView, ownerConsoleCollapsed]);

  const openUploadPanel = useCallback(() => {
    changeView('documents');
    setShowUpload(true);
  }, [changeView]);

  const closeUploadPanel = useCallback(() => {
    setShowUpload(false);
    changeView('home');
  }, [changeView]);

  // Quick action handler for the member overlay; defined before it's consumed below.
  const handleMemberAction = useCallback((nodeId: string) => {
    if (!snapshot) return;
    const target = snapshot.nodes.find((node: MoraObject) => node.id === nodeId);
    if (!target) return;
    setSelectedNode(target);
    graphRef.current?.panToNode?.(nodeId);
    setOrbState('speaking');
    setTimeout(() => setOrbState('idle'), 1200);
  }, [snapshot]);

  const overlayContent = useMemo(() => {
    if (activeView === 'home') {
      if (isMemberView) {
        const memberMeta = spaceInventory.get(roleHub.spaceId);
        const memberNodes = memberMeta?.nodes ?? [];
        const documents = memberNodes.filter((node) => node.type === 'document').length;
        const notes = memberNodes.filter((node) => node.type === 'note').length;
        const insightsFromCore = (semanticEvents ?? []).filter((event) =>
          event.entity_id?.includes('cafe')
        );
        const fallbackInsights = [
          { event_id: 'rev', message: 'Revenue steady vs. last week.', severity: 0.3 },
          { event_id: 'queue', message: 'Queue heatmap ready for evening rush.', severity: 0.5 },
          { event_id: 'customers', message: '3 StammgÃ¤ste flagged for follow-up.', severity: 0.4 },
        ];
        const insightEntries = insightsFromCore.length ? insightsFromCore : fallbackInsights;

        const quickActions = [
          { id: 'cafe_daily', label: 'Open Daily Revenue', description: 'Siehe Umsatznotiz' },
          { id: 'cafe_queue', label: 'Queue Heatmap', description: 'Interaktive Warteschlange' },
          { id: 'cafe_customers', label: 'Customer Notes', description: 'Top StammgÃ¤ste ansehen' },
        ];

        return (
          <div className="rounded-3xl glass-panel border border-white/10 bg-mora-forest/85 backdrop-blur-xl p-6 space-y-5 shadow-[0_25px_60px_rgba(0,0,0,0.55)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-emerald-400/60">Member Focus</p>
                <h3 className="text-xl font-semibold text-emerald-50">Cafe Aurora</h3>
                <p className="text-emerald-300/70 text-sm">Dein Arbeitsraum ist auf den CafÃ©-Orb fixiert.</p>
              </div>
              <button
                onClick={() => changeView('layers')}
                className="text-emerald-400/70 text-xs hover:text-mora-gold transition-colors"
              >
                Raumkarte
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/5 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.4em] text-emerald-400/60">Docs</p>
                <p className="text-2xl font-semibold text-emerald-50">{documents}</p>
                <p className="text-xs text-emerald-300/70">verlinkte Dokumente</p>
              </div>
              <div className="rounded-2xl border border-white/5 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.4em] text-emerald-400/60">Notizen</p>
                <p className="text-2xl font-semibold text-emerald-50">{notes}</p>
                <p className="text-xs text-emerald-300/70">persÃ¶nliche Insights</p>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-emerald-400/50 mb-3">Aktionen</p>
              <div className="flex flex-col gap-2">
                {quickActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleMemberAction(action.id)}
                    className="w-full flex items-center justify-between px-4 py-2 rounded-2xl border border-white/5 hover:border-mora-gold/40 text-left transition-colors"
                  >
                    <div>
                      <p className="text-sm text-emerald-50">{action.label}</p>
                      <p className="text-xs text-emerald-300/70">{action.description}</p>
                    </div>
                    <ChevronRight size={16} className="text-emerald-400/70" />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-emerald-400/50 mb-3">Live Hinweise</p>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                {insightEntries.map((event) => (
                  <div
                    key={event.event_id}
                    className="rounded-2xl border border-white/5 px-4 py-2 text-sm text-emerald-100/90"
                  >
                    {event.message || 'Signal pending'}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }

      if (isOwnerOrAdmin) {
        const ownerSpaces = Array.from(spaceInventory.entries()).filter(
          ([spaceId]) => spaceId !== 'ungrouped'
        );

        if (ownerConsoleCollapsed) {
          return (
            <div className="rounded-3xl glass-panel border border-white/10 bg-[#041712]/90 backdrop-blur-xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.45)] flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-emerald-400/60">Owner Console</p>
                <p className="text-sm text-emerald-100/80">Ausgeblendet f?r mehr Canvas-Fl?che.</p>
              </div>
              <button
                onClick={() => setOwnerConsoleCollapsed(false)}
                className="text-xs px-3 py-1 rounded-full border border-mora-gold/40 text-mora-gold hover:bg-mora-gold/10 transition-colors"
              >
                Wieder anzeigen
              </button>
            </div>
          );
        }

        return (
          <div className="rounded-3xl glass-panel border border-white/10 bg-[#041712]/95 backdrop-blur-xl p-6 space-y-4 shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-emerald-400/60">Owner Console</p>
                <h3 className="text-xl font-semibold text-emerald-50">Space Overview</h3>
                <p className="text-emerald-300/70 text-sm">WÃ¤hle einen Raum, um das Canvas zu filtern.</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={() => handleSpaceChange(null)}
                  className="text-emerald-400/70 text-xs hover:text-mora-gold transition-colors"
                >
                  All Spaces
                </button>
                <button
                  onClick={() => setOwnerConsoleCollapsed(true)}
                  className="text-emerald-400/60 text-[11px] hover:text-mora-gold transition-colors"
                >
                  Minimieren
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
              {ownerSpaces.map(([spaceId, meta]) => {
                const docs = meta.nodes.filter((node) => node.type === 'document').length;
                const total = meta.nodes.length;
                return (
                  <div
                    key={spaceId}
                    className="rounded-2xl border border-white/10 px-4 py-3 flex flex-col gap-3 hover:border-mora-gold/40 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-emerald-50">{meta.label}</p>
                        <p className="text-xs text-emerald-300/70">{total} Nodes gesamt</p>
                      </div>
                      <button
                        onClick={() => handleSpaceChange(spaceId)}
                        className="text-xs px-3 py-1 rounded-full border border-mora-gold/40 text-mora-gold hover:bg-mora-gold/10 transition-colors"
                      >
                        Fokus
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                        Live: {Math.max(total - docs, 0)}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-200 border border-amber-400/30">
                        Docs: {docs}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 via-amber-300 to-emerald-400 transition-all"
                        style={{ width: `${total > 0 ? Math.round((docs / total) * 100) : 0}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-emerald-300/70">
                      {total > 0 ? Math.round((docs / total) * 100) : 0}% Dokumente ? {Math.max(total - docs, 0)} aktive Nodes
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      return null;
    }
    return null;
  }, [
    activeView,
    spacesForNavigation,
    fallbackSpaces,
    currentSpace,
    activeSpaceMeta,
    snapshot,
    changeView,
    handleSpaceChange,
    mindEvents,
    semanticEvents,
    realtimeStatus,
    realtimeStatusMessage,
    realtimeLastUpdate,
    setSelectedRole,
    selectedRole,
    blueprintMode,
    setBlueprintMode,
    lastViewedNode,
    recentEvents,
    activeOrb,
    lastVisitedRoute,
    spaceInventory,
    isMemberView,
    isOwnerOrAdmin,
    roleHub.spaceId,
    roleHub.rootId,
    handleMemberAction,
    ownerConsoleCollapsed,
  ]);


  const handleCreateSpace = async () => {
    const name = prompt('Space Name:');
    if (!name) return;
    const newSpace = {
      id: `space_${Date.now()}`,
      name,
      order: spaces.length,
      icon: '??',
      color: '#8B5CF6'
    };
    await createSpace(newSpace);
  };

  const handleFilesUploaded = async (files: File[]) => {
    console.log('Files to upload:', files);
    // TODO: Send to Core API to process and add to graph
    // For now, just close the modal
    closeUploadPanel();
    // Show success notification
    alert(`${files.length} file(s) will be added to the mycelium`);
  };



  const BlueprintLabel = ({ text, side = 'right' }: { text: string, side?: 'left' | 'right' }) => {
    if (!blueprintMode) return null;
    return (
      <div className={`absolute z-50 bg-blue-600/90 text-white text-[10px] font-mono px-2 py-1 rounded border border-blue-400/50 shadow-lg pointer-events-none whitespace-nowrap ${side === 'left' ? '-left-2 transform -translate-x-full' : '-right-2 transform translate-x-full'} top-0`}>
        ? {text}
      </div>
    );
  };

  // --- LOADING & ERROR STATES ---
  if (stage === 'dashboard') {
    if (snapshotsError) {
      return (
        <div className="relative w-full h-screen overflow-hidden bg-mora-forest">
          <OrganicStatePanel
            variant="error"
            actionLabel="Retry Connection"
            onAction={() => window.location.reload()}
          />
        </div>
      );
    }

    if (snapshotsLoading && !snapshotsData) {
      return (
        <div className="relative w-full h-screen overflow-hidden bg-mora-forest">
          <OrganicStatePanel variant="loading" />
        </div>
      );
    }
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-mora-forest text-emerald-50 font-sans selection:bg-mora-gold/30">
      <div className={`absolute inset-0 transition-opacity duration-1000 ${stage === 'dashboard' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <OrganicBackground intensity={1} />
      </div>

      <button
        onClick={() => setBlueprintMode(!blueprintMode)}
        className="absolute top-6 right-6 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-xs uppercase tracking-widest transition-all"
      >
        <Layers className="w-4 h-4" />
        {blueprintMode ? 'Blueprint: On' : 'Visual Mode'}
      </button>

      {/* --- BOOT SEQUENCE --- */}
      {stage === 'booting' && (
        <BootSequence onComplete={() => {
          setStage('dashboard');
          setOrbState('idle');
        }} />
      )}

      {/* --- STAGE 1: INTRO & ONBOARDING --- */}
      {stage !== 'dashboard' && stage !== 'booting' && (
        <div className="relative z-10 flex flex-col items-center justify-center h-full w-full">

          {/* Central Orb */}
          <div className={`transition-all duration-1000 ${stage === 'generating' ? 'scale-150' : 'scale-100'}`}>
            <MoraOrb state={orbState} />
          </div>

          {/* Text Area */}
          <div className="h-16 mt-12 mb-8 text-center relative z-20">
            <p className="text-2xl md:text-3xl font-light tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-emerald-100 via-mora-gold to-emerald-100 animate-pulse">
              {stage === 'intro' && text}
              {stage === 'connect' && "Choose the roots of your knowledge."}
              {stage === 'role' && hoveredRole ? `Preview: ${hoveredRole.charAt(0).toUpperCase() + hoveredRole.slice(1)}` : (stage === 'role' ? "How will you tend to this space?" : "")}
              {stage === 'generating' && "Weaving your mycelium network..."}
            </p>
          </div>

          {/* Interaction Layer */}
          <div className="relative h-48 w-full max-w-4xl flex justify-center items-center gap-12 z-20">

            {stage === 'connect' && (
              <>
                <ConnectorNode
                  icon={Database} label="Core API"
                  delay={100} isSelected={connected.includes('db')} onSelect={() => handleConnect('db')}
                  status={healthData?.status === 'ok' ? 'connected' : 'idle'}
                />
                <ConnectorNode
                  icon={FileText} label="Local Files"
                  delay={300} isSelected={connected.includes('files')} onSelect={() => handleConnect('files')}
                />
                <ConnectorNode
                  icon={Globe} label="Notion"
                  delay={500} isSelected={connected.includes('notion')} onSelect={() => handleConnect('notion')}
                />
              </>
            )}

            {stage === 'role' && (
              <div className="flex gap-6 animate-in fade-in slide-in-from-bottom-10 duration-1000">
                <RoleCard
                  role="owner"
                  icon={Shield}
                  desc="System Health & Architecture"
                  onSelect={() => handleRoleSelect('owner')}
                  onHover={setHoveredRole}
                />
                <RoleCard
                  role="department"
                  icon={Users}
                  desc="Projects & Active Threads"
                  onSelect={() => handleRoleSelect('department')}
                  onHover={setHoveredRole}
                />
                <RoleCard
                  role="member"
                  icon={Eye}
                  desc="Minimal Read-Only View"
                  onSelect={() => handleRoleSelect('member')}
                  onHover={setHoveredRole}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- STAGE 2: DASHBOARD VARIATIONS --- */}
      {stage === 'dashboard' && (
        <div className="relative z-10 flex h-full w-full animate-in fade-in duration-2000">

          {/* FLOATING SIDEBAR */}
          <nav className="w-64 h-[90%] my-auto ml-6 rounded-3xl glass-panel flex flex-col py-6 gap-6 relative z-30 transition-all hover:bg-white/[0.05] bg-mora-forest/30 backdrop-blur-md border border-white/5">
            {/* MÃ´ra Logo/Status */}
            <div className="px-6">
              <div className="w-10 h-10 rounded-full bg-emerald-900/50 border border-mora-gold/50 flex items-center justify-center shadow-[0_0_15px_rgba(206,182,118,0.2)]">
                <div className="w-2 h-2 bg-mora-gold rounded-full"></div>
              </div>
            </div>

            {/* Space Switcher */}
            {isOwnerOrAdmin ? (
              <SpaceSwitcher
                spaces={spacesForNavigation}
                currentSpace={currentSpace}
                onSpaceChange={handleSpaceChange}
                onCreateSpace={handleCreateSpace}
                loading={spacesLoading}
              />
            ) : (
              <div className="px-6 text-xs text-emerald-200/70 leading-relaxed">
                <p className="font-semibold text-mora-gold tracking-[0.3em] uppercase mb-1">Locked Scope</p>
                <p className="text-emerald-200/80">
                  Diese Ansicht fokussiert <span className="text-mora-gold">{activeSpaceMeta?.label || roleHub.spaceId}</span>. Admins &amp; Owner sehen das gesamte Netz.
                </p>
              </div>
            )}

            {/* Divider */}
            <div className="w-full h-px bg-white/5"></div>

            {/* Navigation Icons - Every button is a DOOR */}
            <div className="flex flex-col gap-4 px-4">
              <NavIcon
                icon={Home}
                active={activeView === 'home'}
                label="Mycelium"
                onClick={() => {
                  changeView('home');
                  handleSpaceChange(roleHub?.spaceId ?? null);
                  setSelectedNode(null);
                }}
              />
              {selectedRole !== 'member' && (
                <NavIcon
                  icon={Layers}
                  active={activeView === 'layers'}
                  label="Spaces"
                  onClick={() => changeView('layers')}
                />
              )}
              <NavIcon
                icon={FileText}
                active={activeView === 'documents'}
                label="Add Files"
                onClick={openUploadPanel}
              />
              {selectedRole === 'owner' && (
                <NavIcon
                  icon={Activity}
                  active={activeView === 'activity'}
                  activeColor="text-red-400"
                  label="Live Events"
                  onClick={() => changeView('activity')}
                />
              )}
              {selectedRole !== 'member' && (
                <NavIcon
                  icon={Users}
                  active={activeView === 'team'}
                  label="Collaborators"
                  onClick={() => changeView('team')}
                />
              )}
            </div>

            {/* Bottom Section */}
            <div className="mt-auto px-4 flex flex-col gap-4 items-center">
              <NavIcon
                icon={Settings}
                active={activeView === 'settings'}
                label="Settings"
                onClick={() => changeView('settings')}
              />
              <button
                onClick={() => changeView('profile')}
                className="w-10 h-10 rounded-full bg-emerald-800/50 border border-white/10 flex items-center justify-center text-emerald-100/70 hover:text-mora-gold transition-colors"
                title="Session profile"
              >
                <User className="w-5 h-5" />
              </button>
            </div>
            <BlueprintLabel text="Floating Nav + Spaces" side="right" />
          </nav>

          {/* MAIN STAGE */}
          <main className="flex-1 relative flex flex-col px-8 py-6">

            {/* SPACE HEADER */}
            <header className="h-16 w-full flex items-center justify-between z-30 glass-panel rounded-2xl px-6 mb-4 bg-mora-forest/30 backdrop-blur-md border border-white/5">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-emerald-100/50 text-sm">
                  <button onClick={() => setFocusedRootId(null)} className="hover:text-emerald-100 transition-colors flex items-center gap-2">
                    <Home className="w-4 h-4" />
                    <span>Mycelium</span>
                  </button>

                  {focusedRootId && (
                    <>
                      <div className="h-4 w-px bg-white/10"></div>
                      <span className="text-emerald-100 font-medium">
                        {snapshot?.nodes.find((n: MoraObject) => n.id === focusedRootId)?.title || 'Folder'}
                      </span>
                    </>
                  )}
                </div>
                <div className="h-4 w-px bg-white/10"></div>
                <h1 className="text-sm font-medium tracking-widest text-emerald-100 uppercase flex items-center gap-2">
                  MÃ”RA <span className="text-mora-gold">/</span> {selectedRole}
                </h1>
                <span className={`px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider ${selectedRole === 'owner' ? 'bg-red-500/10 border-red-500/30 text-red-300' :
                  selectedRole === 'member' ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' :
                    'bg-mora-gold/10 border-mora-gold/20 text-mora-gold'
                  }`}>
                  {snapshotsData ? 'Live Core' : 'Demo Data'}
                </span>
              </div>
              <div className="flex items-center gap-6">
                {selectedRole !== 'member' && <Search className="w-5 h-5 text-emerald-400/50 hover:text-emerald-100 cursor-pointer transition-colors" />}
                <Bell className="w-5 h-5 text-emerald-400/50 hover:text-emerald-100 cursor-pointer transition-colors" />
              </div>
            </header>

            {/* DASHBOARD CONTENT - THE MYCELIUM */}
            <div className="flex-1 relative overflow-hidden rounded-3xl">

              {/* Organic Canvas */}
              <MyceliumCanvas
                snapshot={canvasSnapshot || snapshot}
                onNodeSelect={(nodeId) => {
                  const node = snapshot?.nodes.find((n: MoraObject) => n.id === nodeId);
                  if (node) setSelectedNode(node);
                }}
                activeNodeId={highlightNodeId}
              />

              {/* Central Orb (only when no node selected) */}
              {!selectedNode && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                  <MoraOrb state={orbState} scale={0.8} />
                </div>
              )}

              {/* Floating Stats (Owner View) */}
              {selectedRole === 'owner' && (
                <div className="absolute inset-0 pointer-events-none">
                  <DataCluster top="15%" left="10%" label={`${snapshot?.nodes.length || 0} Nodes`} delay={0} icon={Database} />
                  <DataCluster top="15%" right="10%" label={`${snapshot?.edges.length || 0} Edges`} delay={0.5} icon={Activity} />
                  <DataCluster bottom="25%" left="12%" label={healthData?.status === 'ok' ? '?? Live' : '?? Demo'} delay={1} icon={Cpu} />
                  {graphStats && (
                    <DataCluster bottom="25%" right="12%" label={`${graphStats.fps} FPS`} delay={1.5} icon={Zap} />
                  )}
                </div>
              )}

              {/* Collaborator: Simple Stats */}
              {selectedRole === 'department' && (
                <div className="absolute top-6 left-6 bg-mora-forest/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 text-sm">
                  <div className="text-mora-gold font-medium mb-2">Network</div>
                  <div className="text-emerald-200/70">{snapshot?.nodes.length || 0} Nodes</div>
                  <div className="text-emerald-200/70">{snapshot?.edges.length || 0} Edges</div>
                </div>
              )}

              {/* Navigation Spores (Bottom Right) */}
              {/* Camera Controls */}
              <div className="absolute bottom-6 right-6 z-20">
                <CameraControlsUI
                  controls={{
                    zoomIn: () => graphRef.current?.zoomIn(),
                    zoomOut: () => graphRef.current?.zoomOut(),
                    reset: handleResetView,
                    panTo: () => { }, // Not used in UI
                    focusNode: () => { } // Not used in UI
                  }}
                />
              </div>

              {/* Node Details Panel (Right Side) */}
              {selectedNode && selectedRole !== 'member' && (
                <NodeDetailsPanel
                  node={selectedNode}
                  snapshot={snapshot}
                  onClose={() => setSelectedNode(null)}
                  onFocusNode={(nodeId) => {
                    const node = snapshot.nodes.find((n: MoraObject) => n.id === nodeId);
                    if (node) {
                      setSelectedNode(node);
                      graphRef.current?.panToNode(nodeId);
                    }
                  }}
                  onEnterNode={(nodeId) => {
                    setFocusedRootId(nodeId);
                    setSelectedNode(null); // Clear selection on enter
                    graphRef.current?.resetView(); // Reset view for new context
                  }}
                />
              )}

              {overlayContent && activeView !== 'documents' && (
                <div className="absolute inset-0 flex justify-end items-start p-6 pointer-events-none z-30">
                  <div className="w-full max-w-md pointer-events-auto">
                    {overlayContent}
                  </div>
                </div>
              )}

            </div>

            {/* Bottom Chat Bar */}
            <div className="h-24 w-full flex items-center justify-center relative z-40 mt-4">
              <BlueprintLabel text="Unified @-Comm System" side="right" />
              <OrganicInput onSend={handleInputSend} />
            </div>

          </main>
        </div>
      )}

      {/* File Upload Modal - Accessible from anywhere */}
      {showUpload && (
        <FileUploadZone
          onFilesUploaded={handleFilesUploaded}
          onClose={closeUploadPanel}
        />
      )}

      <GlobalCommandBar
        isOpen={isCommandBarOpen}
        onClose={() => setIsCommandBarOpen(false)}
        onNavigate={(view) => {
          if (view === 'create-space') handleCreateSpace();
          else changeView(view as ActiveView);
        }}
        onSearch={setCommandQuery}
        searchResults={commandSearchResults}
      />
    </div>
  );
}

// Wrap with QueryClientProvider
export default function HomePage() {
  return (
    <QueryClientProvider client={queryClient}>
      <HomePageContent />
    </QueryClientProvider>
  );
}
