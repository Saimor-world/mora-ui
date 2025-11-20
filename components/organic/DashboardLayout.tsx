"use client";

import React, { useState } from 'react';
import {
    Hexagon,
    Layers,
    FileText,
    Activity,
    Users,
    Search,
    Sparkles,
    Shield,
    Zap,
    Cpu,
    Database
} from 'lucide-react';
import { NavIcon } from './NavIcon';
import { MoraOrb } from './MoraOrb';
import { OrganicInput } from './OrganicInput';
import { InsightCard } from './InsightCard';
import { DataCluster } from './DataCluster';

interface DashboardLayoutProps {
    role: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ role }) => {
    const [blueprintMode, setBlueprintMode] = useState(false);

    const BlueprintLabel = ({ text, side = 'right' }: { text: string, side?: 'left' | 'right' }) => {
        if (!blueprintMode) return null;
        return (
            <div className={`absolute z-50 bg-blue-600/90 text-white text-[10px] font-mono px-2 py-1 rounded border border-blue-400/50 shadow-lg pointer-events-none whitespace-nowrap ${side === 'left' ? '-left-2 transform -translate-x-full' : '-right-2 transform translate-x-full'} top-0`}>
                ➔ {text}
            </div>
        );
    };

    return (
        <div className="relative z-10 flex h-full w-full animate-in fade-in duration-2000">

            <button
                onClick={() => setBlueprintMode(!blueprintMode)}
                className="absolute top-6 right-6 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-xs uppercase tracking-widest transition-all"
            >
                <Layers className="w-4 h-4" />
                {blueprintMode ? 'Blueprint: On' : 'Visual Mode'}
            </button>

            {/* SIDEBAR (Adapts slightly by role) */}
            <nav className="w-20 h-full glass-panel border-r border-white/5 flex flex-col items-center py-8 gap-8 relative z-30 bg-mora-forest/30 backdrop-blur-md">
                <div className="w-10 h-10 rounded-full bg-emerald-900/50 border border-mora-gold/50 flex items-center justify-center mb-8 shadow-[0_0_15px_rgba(206,182,118,0.2)]">
                    <div className="w-2 h-2 bg-mora-gold rounded-full"></div>
                </div>

                <div className="flex flex-col gap-6 w-full items-center">
                    <NavIcon icon={Hexagon} active={true} />
                    {role !== 'observer' && <NavIcon icon={Layers} />}
                    <NavIcon icon={FileText} />
                    {role === 'owner' && <NavIcon icon={Activity} activeColor="text-red-400" />}
                    {role !== 'observer' && <NavIcon icon={Users} />}
                </div>

                <div className="mt-auto mb-8">
                    <div className="w-8 h-8 rounded-full bg-emerald-800/50 border border-white/10"></div>
                </div>
                <BlueprintLabel text="Adaptive Nav" side="right" />
            </nav>

            {/* MAIN STAGE */}
            <main className="flex-1 relative flex flex-col">

                {/* HEADER */}
                <header className="h-20 w-full flex items-center justify-between px-10 z-30">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-light tracking-widest text-emerald-100 uppercase">
                            MÔRA <span className="text-mora-gold">/</span> {role}
                        </h1>
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider ${role === 'owner' ? 'bg-red-500/10 border-red-500/30 text-red-300' :
                                role === 'observer' ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' :
                                    'bg-mora-gold/10 border-mora-gold/20 text-mora-gold'
                            }`}>Live</span>
                    </div>
                    <div className="flex items-center gap-6">
                        {role !== 'observer' && <Search className="w-5 h-5 text-emerald-400/50" />}
                        <div className="w-px h-4 bg-white/10"></div>
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <div className="text-xs text-emerald-100 font-medium">Alex V.</div>
                                <div className="text-[10px] text-emerald-500/50 uppercase tracking-widest">{role}</div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-emerald-800 border border-emerald-500/30"></div>
                        </div>
                    </div>
                </header>

                {/* DASHBOARD CONTENT LAYERS */}
                <div className="flex-1 flex relative">

                    {/* Center Workspace */}
                    <div className="flex-1 flex flex-col items-center justify-center relative">
                        <div className="absolute top-10 left-10 opacity-50">
                            <BlueprintLabel text={`Workspace: ${role}`} side="right" />
                        </div>

                        {/* The Living Orb - Scale based on Role */}
                        <div className={`transform transition-all duration-1000 ${role === 'collaborator' ? 'scale-75 translate-y-[-40px]' : 'translate-y-[-20px]'}`}>
                            <MoraOrb state="idle" scale={role === 'observer' ? 0.6 : 0.9} />
                        </div>

                        {/* Role Specific Data Layers */}

                        {/* OWNER VIEW: High Density, System Health */}
                        {role === 'owner' && (
                            <div className="absolute inset-0 pointer-events-none">
                                <DataCluster top="20%" left="15%" label="CPU Load 12%" delay={0} icon={Cpu} />
                                <DataCluster top="25%" right="15%" label="Network 4.2TB" delay={1} icon={Activity} />
                                <DataCluster bottom="30%" left="25%" label="Security: Stable" delay={2} icon={Shield} />
                                <DataCluster bottom="40%" right="20%" label="Bot Traffic" delay={3} icon={Zap} />
                                {/* Connecting Lines Canvas would go here for owner */}
                            </div>
                        )}

                        {/* COLLABORATOR VIEW: Project Focused */}
                        {role === 'collaborator' && (
                            <div className="absolute inset-0 pointer-events-none">
                                <DataCluster top="30%" left="20%" label="Design Sprint" delay={0} icon={Layers} />
                                <DataCluster top="30%" right="20%" label="Frontend Rep" delay={1} icon={Database} />
                                {/* Active Task Cards Floating */}
                                <div className="absolute bottom-32 left-1/2 -translate-x-1/2 flex gap-4 pointer-events-auto">
                                    <div className="p-4 glass-panel rounded-xl w-64 border-l-4 border-mora-gold animate-in slide-in-from-bottom-8 fade-in duration-700 bg-mora-forest/40 backdrop-blur-md">
                                        <h4 className="text-emerald-100 text-sm font-medium mb-1">Q4 Strategy Review</h4>
                                        <div className="flex -space-x-2 mt-2">
                                            <div className="w-6 h-6 rounded-full bg-emerald-800 border border-[#0E1F18]"></div>
                                            <div className="w-6 h-6 rounded-full bg-emerald-700 border border-[#0E1F18]"></div>
                                        </div>
                                    </div>
                                    <div className="p-4 glass-panel rounded-xl w-64 border-l-4 border-emerald-500 animate-in slide-in-from-bottom-8 fade-in duration-1000 bg-mora-forest/40 backdrop-blur-md">
                                        <h4 className="text-emerald-100 text-sm font-medium mb-1">Asset Migration</h4>
                                        <p className="text-xs text-emerald-500/60">Processing 402 files...</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* OBSERVER VIEW: Clean, Minimal */}
                        {role === 'observer' && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <h2 className="text-4xl font-thin text-white/10 tracking-[1em] mt-48">WATCHING</h2>
                            </div>
                        )}

                        {role !== 'observer' && (
                            <div className="mt-12 text-center max-w-md relative z-10">
                                <h2 className="text-2xl font-light text-white mb-2">
                                    {role === 'owner' ? 'System Integrity: 98%' : 'Welcome back, Alex.'}
                                </h2>
                                <p className="text-emerald-200/50 text-sm leading-relaxed">
                                    {role === 'owner'
                                        ? '3 orphan nodes detected in the archive sector. Auto-pruning scheduled.'
                                        : 'I\'ve summarized the pattern matching results from the Finance update.'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Right Intelligence Panel (Hidden for Observer) */}
                    {role !== 'observer' && (
                        <aside className="w-80 h-[calc(100%-2rem)] mr-4 mt-4 glass-panel rounded-3xl p-6 relative overflow-hidden transition-all duration-500 hover:bg-white/[0.02] z-30 bg-mora-forest/30 backdrop-blur-md border border-white/5">
                            <BlueprintLabel text="Context Panel" side="left" />

                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xs font-bold tracking-widest text-mora-gold uppercase">
                                    {role === 'owner' ? 'System Events' : 'Insights'}
                                </h3>
                                <Sparkles className="w-4 h-4 text-mora-gold" />
                            </div>

                            <div className="space-y-4">
                                <InsightCard
                                    title={role === 'owner' ? "Security Patch" : "Anomaly Detected"}
                                    body={role === 'owner' ? "Patch 4.2 installed on DB-01." : "Traffic spike in Server DB-04."}
                                    type={role === 'owner' ? "success" : "alert"}
                                />
                                <InsightCard
                                    title="Optimization"
                                    body="Indexing complete. 4,203 nodes connected."
                                    type="success"
                                />

                                <div className="mt-8 p-4 rounded-xl bg-black/20 border border-white/5">
                                    <div className="flex justify-between text-[10px] text-emerald-500/50 mb-2 uppercase">
                                        <span>Flow Rate</span>
                                        <span>+12%</span>
                                    </div>
                                    <div className="h-24 flex items-end gap-1">
                                        {[30, 45, 35, 60, 75, 50, 80].map((h, i) => (
                                            <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-gradient-to-t from-mora-gold/10 to-mora-gold/60 rounded-t-sm hover:bg-mora-gold transition-colors"></div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </aside>
                    )}

                </div>

                {/* Bottom Chat Bar - THE ROOT */}
                <div className="h-24 w-full flex items-center justify-center relative z-40">
                    <BlueprintLabel text="Unified @-Comm System" side="right" />
                    <OrganicInput />
                </div>

            </main>
        </div>
    );
};
