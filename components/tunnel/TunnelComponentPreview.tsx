"use client";
/* Dev-only preview harness — relaxed typing intentional */

import React, { Component, Suspense } from "react";
import dynamic from "next/dynamic";
import type { TunnelComponentKey } from "@/lib/tunnel/tunnelCatalog";

const MOCK_RADAR = {
  id: "tunnel-mock-radar",
  tier: "suggest" as const,
  signal_type: "stale_folder",
  entity_type: "folder",
  entity_id: "folder-demo",
  title: "Tunnel: Ordner wartet",
  body: "Vorschau einer Radar-Karte — keine echten Daten.",
  created_at: new Date().toISOString(),
  read: false,
};

const MOCK_INSIGHT = {
  id: "tunnel-insight",
  content: "Beispiel-Erkenntnis aus MindLoop — Tunnel Vorschau",
  source: "mindloop",
  confidence: 0.82,
  timestamp: new Date().toISOString(),
};

function PreviewFallback() {
  return (
    <div className="flex h-32 items-center justify-center text-xs text-white/40">
      Lädt Vorschau…
    </div>
  );
}

class PreviewErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: string | null }
> {
  state = { error: null as string | null };

  static getDerivedStateFromError(err: Error) {
    return { error: err.message };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-100">
          Vorschau fehlgeschlagen: {this.state.error}
          <div className="mt-1 text-white/50">
            Komponente braucht evtl. Session/API — trotzdem behalten?
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function devDynamic(
  loader: () => Promise<Record<string, unknown>>,
  exportName: string,
): React.ComponentType {
  return dynamic(
    () =>
      loader().then((mod) => {
        const C = mod[exportName] as React.ComponentType | undefined;
        if (!C) {
          return {
            default: () => (
              <div className="p-3 text-xs text-amber-200">
                Export `{exportName}` nicht gefunden
              </div>
            ),
          };
        }
        return { default: C };
      }),
    { ssr: false, loading: PreviewFallback },
  ) as React.ComponentType;
}

const LOADERS: Record<TunnelComponentKey, React.ComponentType> = {
  ResonanceRoom: dynamic(
    () =>
      import("@/components/mora/ResonanceRoom").then((m) => ({
        default: () => <m.ResonanceRoom isOpen onClose={() => {}} />,
      })),
    { ssr: false, loading: PreviewFallback },
  ) as React.ComponentType,
  GhostOverlay: devDynamic(
    () => import("@/components/mora/GhostOverlay"),
    "GhostOverlay",
  ),
  CursorTrailEffect: devDynamic(
    () => import("@/components/effects/CursorTrailEffect"),
    "CursorTrailEffect",
  ),
  MemorySidebar: devDynamic(
    () => import("@/components/os/MemorySidebar"),
    "MemorySidebar",
  ),
  MoraPulsePanel: devDynamic(
    () => import("@/components/os/MoraPulsePanel"),
    "MoraPulsePanel",
  ),
  MoraInsightPopup: dynamic(
    () =>
      import("@/components/mora/MoraInsightPopup").then((m) => ({
        default: () => (
          <m.MoraInsightPopup
            insight={MOCK_INSIGHT}
            onDismiss={() => {}}
            onConfirm={() => {}}
          />
        ),
      })),
    { ssr: false, loading: PreviewFallback },
  ) as React.ComponentType,
  LiquidOrb: dynamic(
    () =>
      import("@/components/mora/LiquidOrb").then((m) => ({
        default: () => (
          <div className="flex h-40 items-center justify-center">
            <div className="w-48 h-48"><m.LiquidOrb color="#34d399" state="idle" /></div>
          </div>
        ),
      })),
    { ssr: false, loading: PreviewFallback },
  ) as React.ComponentType,
  PlasmaOrb: dynamic(
    () =>
      import("@/components/mora/PlasmaOrb").then((m) => ({
        default: () => (
          <div className="flex h-40 items-center justify-center">
            <m.PlasmaOrb color="#34d399" state="idle" size={100} />
          </div>
        ),
      })),
    { ssr: false, loading: PreviewFallback },
  ) as React.ComponentType,
  MoraOrb: devDynamic(() => import("@/components/mora/MoraOrb"), "MoraOrb"),
  StarField: dynamic(
    () =>
      import("@/components/visual/StarField").then((m) => ({
        default: () => (
          <div className="relative h-48 w-full overflow-hidden rounded-xl">
            <style>{`.preview-starfield canvas { position: absolute !important; width: 100% !important; height: 100% !important; }`}</style><div className="preview-starfield w-full h-full"><m.StarField density="medium" /></div>
          </div>
        ),
      })),
    { ssr: false, loading: PreviewFallback },
  ) as React.ComponentType,
  ForestLightCanopy: dynamic(
    () =>
      import("@/components/visual/ForestLightCanopy").then((m) => ({
        default: () => (
          <div className="relative h-48 w-full overflow-hidden rounded-xl">
            <style>{`.preview-canopy canvas { position: absolute !important; width: 100% !important; height: 100% !important; }`}</style><div className="preview-canopy w-full h-full"><m.ForestLightCanopy orbState="idle" /></div>
          </div>
        ),
      })),
    { ssr: false, loading: PreviewFallback },
  ) as React.ComponentType,
  NeuralGrid: devDynamic(
    () => import("@/components/visual/NeuralGrid"),
    "NeuralGrid",
  ),
  SemanticConstellation: dynamic(
    () =>
      import("@/components/visual/SemanticConstellation").then((m) => ({
        default: () => (
          <div className="relative h-48 w-full overflow-hidden rounded-xl bg-black/20">
            <m.SemanticConstellation
              center={{ x: 50, y: 50 }}
              satellites={[
                { id: 'a', x: 18, y: 22, weight: 0.9 },
                { id: 'b', x: 82, y: 20, weight: 0.7 },
                { id: 'c', x: 25, y: 78, weight: 0.85 },
                { id: 'd', x: 75, y: 75, weight: 0.5 },
                { id: 'e', x: 60, y: 35, weight: 0.6 },
              ]}
              isActive
            />
          </div>
        ),
      })),
    { ssr: false, loading: PreviewFallback },
  ) as React.ComponentType,
  OrbitalCanvas: dynamic(
    () =>
      import("@/components/visual/OrbitalCanvas").then((m) => ({
        default: () => (
          <div className="relative h-48 w-full overflow-hidden rounded-xl bg-black/30">
            <m.OrbitalCanvas
              bodies={[
                { id: 'core', name: 'SAIMOR', type: 'star', baseX: 50, baseY: 50, size: 36, color: '#34d399' },
                { id: 'p1', name: 'Design', type: 'planet', baseX: 50, baseY: 50, size: 14, color: '#818cf8', orbitRadius: 90, orbitSpeed: 0.5, parentId: 'core' },
                { id: 'p2', name: 'Tech', type: 'planet', baseX: 50, baseY: 50, size: 18, color: '#f472b6', orbitRadius: 140, orbitSpeed: 0.3, parentId: 'core' },
                { id: 'p3', name: 'Ops', type: 'planet', baseX: 50, baseY: 50, size: 12, color: '#fb923c', orbitRadius: 190, orbitSpeed: 0.2, parentId: 'core' },
              ]}
            />
          </div>
        ),
      })),
    { ssr: false, loading: PreviewFallback },
  ) as React.ComponentType,
  MyceliumOverlay: dynamic(
    () =>
      import("@/components/organic/MyceliumOverlay").then((m) => ({
        default: () => (
          <div className="relative h-48 w-full overflow-hidden rounded-xl bg-[#030912]">
            <style>{`.preview-mycelium-overlay canvas { position: absolute !important; width: 100% !important; height: 100% !important; inset: 0 !important; }`}</style>
            <div className="preview-mycelium-overlay w-full h-full"><m.MyceliumOverlay /></div>
          </div>
        ),
      })),
    { ssr: false, loading: PreviewFallback },
  ) as React.ComponentType,
  MyceliumLayer: devDynamic(
    () => import("@/components/organic/MyceliumLayer"),
    "MyceliumLayer",
  ),
  Mycelium25D: dynamic(
    () =>
      import("@/components/organic/Mycelium25D").then((m) => ({
        default: () => (
          <div className="relative h-48 w-full overflow-hidden rounded-xl bg-[#030912]">
            <m.Mycelium25D nodes={[]} />
          </div>
        ),
      })),
    { ssr: false, loading: PreviewFallback },
  ) as React.ComponentType,
  MyceliumField3D: dynamic(
    () =>
      import("@/components/organic/MyceliumField3D").then((m) => ({
        default: () => (
          <div className="relative h-48 w-full overflow-hidden rounded-xl bg-[#030912]">
            <m.MyceliumField3D nodes={[]} />
          </div>
        ),
      })),
    { ssr: false, loading: PreviewFallback },
  ) as React.ComponentType,
  AmbientDust: devDynamic(
    () => import("@/components/organic/AmbientDust"),
    "AmbientDust",
  ),
  OrganicBackground: devDynamic(
    () => import("@/components/organic/OrganicBackground"),
    "OrganicBackground",
  ),
  RadarCard: dynamic(
    () =>
      import("@/components/mora/RadarCard").then((m) => ({
        default: () => (
          <m.RadarCard
            notification={MOCK_RADAR as never}
            onDismiss={() => {}}
            onAct={() => {}}
          />
        ),
      })),
    { ssr: false, loading: PreviewFallback },
  ) as React.ComponentType,
  MoraPlayground: dynamic(
    () =>
      import("@/components/mora/MoraPlayground").then((m) => ({
        default: () => <m.MoraPlayground scope="company" compact />,
      })),
    { ssr: false, loading: PreviewFallback },
  ) as React.ComponentType,
  BootSequence: devDynamic(
    () => import("@/components/organic/BootSequence"),
    "BootSequence",
  ),
  EventsViewer: dynamic(() => import("@/_archive/debug/EventsViewer"), {
    ssr: false,
    loading: PreviewFallback,
  }),
  ConfirmCard: dynamic(
    () =>
      import("@/components/mora/dialogue/ConfirmCard").then((m) => ({
        default: () => (
          <m.ConfirmCard
            riskLevel="write"
            affectedSummary="Tunnel — nur visuelle Vorschau"
            onConfirm={() => {}}
            onCancel={() => {}}
          />
        ),
      })),
    { ssr: false, loading: PreviewFallback },
  ) as React.ComponentType,
  FocusModeWidget: devDynamic(
    () => import("@/components/os/FocusMode"),
    "FocusModeWidget",
  ),
  ActionTray: devDynamic(
    () => import("@/components/os/ActionTray"),
    "ActionTray",
  ),
};

interface Props {
  componentKey: TunnelComponentKey;
  height?: number;
}

export function TunnelComponentPreview({ componentKey, height = 360 }: Props) {
  const Comp = LOADERS[componentKey];

  return (
    <PreviewErrorBoundary>
      <Suspense fallback={<PreviewFallback />}>
        <div
          className="relative overflow-hidden rounded-xl border border-white/10 bg-black/40"
          style={{ minHeight: height }}
        >
          <Comp />
        </div>
      </Suspense>
    </PreviewErrorBoundary>
  );
}
