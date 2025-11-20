"use client";

import { useState, useEffect } from 'react';
import { Layers, Database, Activity, Sparkles, Network, FileText } from 'lucide-react';
import { useSnapshots } from '@/lib/hooks/useApi';
import { useSessionStore } from '@/store/session';
import { useRole } from '@/lib/hooks/useRole';
import { useSemanticEvents } from '@/lib/hooks/useSemanticEvents';
import { useMindloopSynthesis } from '@/lib/hooks/useMindloopSynthesis';
import type { MoraObject } from '@/lib/types';

// Antigravity Components - CLEAN UI
import { OrganicBackground } from '@/components/organic/OrganicBackground';
import { MoraOrb } from '@/components/organic/MoraOrb';
import { OrganicInput } from '@/components/organic/OrganicInput';
import { DataCluster } from '@/components/organic/DataCluster';
import { ConnectorNode } from '@/components/organic/ConnectorNode';
import { InsightCard } from '@/components/organic/InsightCard';
import SpaceHeader from '@/components/spaces/SpaceHeader';
import { OrganicStatePanel } from '@/components/organic/OrganicStatePanel';

interface OrganicFieldProps {
  spaceId?: string;
}

export default function OrganicField({ spaceId }: OrganicFieldProps) {
  const [blueprintMode, setBlueprintMode] = useState(false);
  const [orbState, setOrbState] = useState<'idle' | 'speaking' | 'processing' | 'listening'>('idle');
  const [selectedNode, setSelectedNode] = useState<MoraObject | null>(null);

  const activeRole = useSessionStore((state) => state.activeRole);
  const { definition: roleDefinition } = useRole();

  // Fetch data from Core API
  const { data: apiSnapshots, isLoading, error } = useSnapshots();
  const { data: semanticEvents } = useSemanticEvents();
  const { summary: synthesisSummary } = useMindloopSynthesis();

  // Extract current snapshot
  const snapshot = apiSnapshots?.[0] || { nodes: [], edges: [], ts: 'Demo' };
  const hasLiveData = (apiSnapshots?.length ?? 0) > 0;
  const snapshotError = error instanceof Error ? error.message : undefined;
  const showLoadingState = isLoading && !hasLiveData;
  const showErrorState = !isLoading && !hasLiveData && !!error;

  // Detect AI activity
  useEffect(() => {
    if (semanticEvents && semanticEvents.length > 0) {
      setOrbState('processing');
      const timer = setTimeout(() => setOrbState('idle'), 2000);
      return () => clearTimeout(timer);
    }
  }, [semanticEvents]);

  const handleChatSend = (message: string) => {
    console.log('Chat:', message);
    setOrbState('speaking');
    setTimeout(() => setOrbState('idle'), 2000);
  };

  // Get top nodes for ConnectorNodes (wichtigste/häufigste)
  const topNodes = snapshot.nodes
    .filter(n => n.tags?.includes('important') || n.type === 'project')
    .slice(0, 5);

  const BlueprintLabel = ({ text, side = 'right' }: { text: string; side?: 'left' | 'right' }) => {
    if (!blueprintMode) return null;
    return (
      <div className={`absolute z-50 bg-blue-600/90 text-white text-[10px] font-mono px-2 py-1 rounded border border-blue-400/50 shadow-lg pointer-events-none whitespace-nowrap ${side === 'left' ? '-left-2 transform -translate-x-full' : '-right-2 transform translate-x-full'} top-0`}>
        ➔ {text}
      </div>
    );
  };

  if (showLoadingState) {
    return (
      <OrganicStatePanel variant="loading" />
    );
  }

  if (showErrorState) {
    return (
      <OrganicStatePanel
        variant="error"
        description={snapshotError}
        actionLabel="Erneut versuchen"
        onAction={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      {/* 🌿 Animated Organic Background */}
      <OrganicBackground intensity={1.2} breathingSpeed={3300} />

      {/* ✨ Space Header */}
      {spaceId && (
        <div className="absolute top-6 left-6 z-40">
          <SpaceHeader spaceId={spaceId} />
        </div>
      )}

      {/* 🔍 Blueprint Mode Toggle */}
      <button
        onClick={() => setBlueprintMode(!blueprintMode)}
        className="absolute top-6 right-6 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-xs uppercase tracking-widest transition-all"
      >
        <Layers className="w-4 h-4 text-emerald-400" />
        {blueprintMode ? 'Blueprint: On' : 'Visual Mode'}
      </button>

      {/* 📊 Main Content */}
      <div className="flex-1 relative flex flex-col items-center justify-center">

        {/* 🔮 Central MoraOrb - Das Herz */}
        <div className="relative z-20 mb-8">
          <MoraOrb
            state={orbState}
            scale={activeRole === 'member' ? 0.6 : 0.9}
          />
          <BlueprintLabel text="MoraOrb - Breathing Heart" />
        </div>

        {/* 💫 Floating Data Satellites */}
        <div className="absolute inset-0 pointer-events-none">
          <DataCluster
            top="15%"
            left="10%"
            label={`${snapshot.nodes.length} Objects`}
            icon={Database}
            delay={0}
          />

          <DataCluster
            top="15%"
            right="10%"
            label={`${snapshot.edges.length} Links`}
            icon={Network}
            delay={0.5}
          />

          <DataCluster
            bottom="30%"
            left="12%"
            label={hasLiveData ? '🟢 Live' : '🟡 Demo'}
            icon={Activity}
            delay={1}
          />

          {activeRole === 'owner' && (
            <DataCluster
              bottom="30%"
              right="12%"
              label={`Space: ${spaceId || 'Global'}`}
              icon={Sparkles}
              delay={1.5}
            />
          )}
        </div>

        {/* 🔗 Connector Nodes - Top Objects als Satelliten */}
        {topNodes.length > 0 && (
          <div className="absolute bottom-40 left-1/2 -translate-x-1/2 flex gap-12 pointer-events-auto z-30">
            {topNodes.map((node, i) => (
              <ConnectorNode
                key={node.id}
                icon={node.type === 'project' ? Layers : FileText}
                label={node.title.slice(0, 12)}
                isSelected={selectedNode?.id === node.id}
                onSelect={() => setSelectedNode(node)}
                delay={i * 200}
                status="connected"
              />
            ))}
          </div>
        )}

        {/* 📝 Center Message */}
        <div className="text-center max-w-md relative z-10">
          <h2 className="text-2xl font-light text-white mb-2">
            {activeRole === 'owner' ? 'System Overview' : `Welcome back, ${roleDefinition.label}`}
          </h2>
          <p className="text-emerald-200/50 text-sm leading-relaxed">
            {activeRole === 'owner'
              ? `${snapshot.nodes.length} objects connected. Everything flowing smoothly.`
              : 'Your mycelium is alive and growing.'}
          </p>
        </div>

        {/* ⏳ Loading State */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-30">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-mora-gold border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-emerald-200/70">Môra erwacht...</p>
            </div>
          </div>
        )}
      </div>

      {/* 📋 Right Intelligence Panel (Owner/Collaborator only) */}
      {activeRole !== 'member' && (
        <aside className="absolute right-4 top-20 bottom-28 w-80 glass-panel rounded-3xl p-6 overflow-hidden transition-all duration-500 hover:bg-white/[0.02] z-30 bg-mora-forest/30 backdrop-blur-md border border-white/5">
          <BlueprintLabel text="Intelligence Panel" side="left" />

          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-bold tracking-widest text-mora-gold uppercase">
              {activeRole === 'owner' ? 'System Insights' : 'Recent Activity'}
            </h3>
            <Sparkles className="w-4 h-4 text-mora-gold" />
          </div>

          <div className="space-y-4">
            {/* Semantic Events als Insight Cards */}
            {semanticEvents && semanticEvents.length > 0 ? (
              semanticEvents.slice(0, 3).map((event, i) => (
                <InsightCard
                  key={event.event_id}
                  title={event.signal_type}
                  body={event.message || 'Processing...'}
                  type={event.severity > 0.7 ? 'alert' : 'success'}
                />
              ))
            ) : (
              <>
                <InsightCard
                  title="Network Healthy"
                  body="All connections stable and flowing."
                  type="success"
                />
                <InsightCard
                  title="Demo Mode Active"
                  body="Connect to Core API for live data."
                  type="alert"
                />
              </>
            )}

            {/* Mini Chart */}
            <div className="mt-8 p-4 rounded-xl bg-black/20 border border-white/5">
              <div className="flex justify-between text-[10px] text-emerald-500/50 mb-2 uppercase">
                <span>Activity</span>
                <span>+{snapshot.nodes.length}</span>
              </div>
              <div className="h-24 flex items-end gap-1">
                {[30, 45, 35, 60, 75, 50, 80].map((h, i) => (
                  <div
                    key={i}
                    style={{ height: `${h}%` }}
                    className="flex-1 bg-gradient-to-t from-mora-gold/10 to-mora-gold/60 rounded-t-sm hover:bg-mora-gold transition-colors cursor-pointer"
                  ></div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Observer View - Minimal */}
      {activeRole === 'member' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-25">
          <h2 className="text-4xl font-thin text-white/10 tracking-[1em] mt-48">WATCHING</h2>
        </div>
      )}

      {/* 💬 Bottom Chat Bar - DAS ROOT */}
      <div className="h-24 w-full flex items-center justify-center relative z-40 border-t border-white/5 bg-mora-forest/60 backdrop-blur-xl">
        <BlueprintLabel text="Organic Input - @ Comm" />
        <OrganicInput onSend={handleChatSend} />
      </div>
    </div>
  );
}
