'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Cloud, FileText, Folder, Loader2, Sparkles, Orbit, ShieldCheck, Zap } from 'lucide-react';
import { fetchMyContent, type UserContentResponse } from '@/lib/api/contentClient';
import { usePaneStore } from '@/lib/store/paneStore';
import { GlassPanel } from '@/components/layers/GlassPanel';
import { useActionEvents } from '@/lib/hooks/useActionEvents';
import { toast } from 'sonner';
import type { AppProps } from '@/lib/apps/types';

export default function PrivateOrbitApp({ paneId }: AppProps) {
    const [content, setContent] = useState<UserContentResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const { getPane, removePane, minimizePane, focusPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const { events } = useActionEvents(true); // Listen to Mora's work in private space

    const pane = getPane(paneId);
    const isActive = usePaneStore(state => state.activePaneId === paneId);

    useEffect(() => {
        void fetchMyContent()
            .then((result) => {
                setContent(result);
                setLoading(false);
            })
            .catch(() => {
                setLoading(false);
            });
    }, []);

    if (!pane) return null;

    if (loading) {
        return (
            <GlassPanel {...getGlassProps(pane, paneId, isActive)}>
                <div className="flex h-full items-center justify-center space-y-4 flex-col">
                    <Loader2 className="animate-spin text-cyan-400" size={24} />
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">Lade deinen Private Orbit...</p>
                </div>
            </GlassPanel>
        );
    }

    return (
        <GlassPanel {...getGlassProps(pane, paneId, isActive)} title="Private Orbit">
            <div className="flex h-full flex-col p-6 space-y-8 overflow-hidden">
                
                {/* Mora Intelligence Header */}
                <div className="rounded-3xl border border-cyan-500/20 bg-cyan-500/[0.05] p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Sparkles size={60} />
                    </div>
                    <div className="relative z-10 space-y-2">
                        <div className="flex items-center gap-2 text-cyan-300">
                            <Zap size={14} />
                            <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Kognitiver Radar</span>
                        </div>
                        <h3 className="text-lg font-medium text-white/90">Willkommen in deiner PrivatsphÃ¤re</h3>
                        <p className="text-xs text-white/40 leading-relaxed max-w-md">
                            Mora analysiert deine Dateien nur lokal. Wir haben 3 neue Dokumente gefunden, die fÃ¼r dein aktuelles Projekt relevant sein könnten.
                        </p>
                    </div>
                </div>

                {/* Main Content: Bubbles/Grid */}
                <div className="flex-1 overflow-y-auto space-y-8 scrollbar-hide">
                    
                    {/* Active Actions (Realtime) */}
                    {events.filter(e => e.status === 'running').length > 0 && (
                        <div className="space-y-3">
                            <p className="text-[10px] uppercase tracking-widest text-white/20">Mora arbeitet gerade...</p>
                            {events.filter(e => e.status === 'running').map(evt => (
                                <div key={evt.action_id} className="flex items-center gap-3 text-xs text-cyan-200/60 italic">
                                    <Loader2 size={12} className="animate-spin" />
                                    {evt.message || 'Verarbeite Daten...'}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                        {/* Folders as Spheres */}
                        {content?.folders?.map(folder => (
                            <div key={folder.id} className="group cursor-pointer space-y-3 text-center">
                                <div className="aspect-square rounded-full border border-white/10 bg-white/[0.03] flex items-center justify-center transition-all group-hover:bg-white/[0.08] group-hover:scale-105 group-hover:border-white/20">
                                    <Folder className="text-white/20 group-hover:text-white/60 transition-colors" size={32} />
                                </div>
                                <p className="text-[11px] font-medium text-white/50 group-hover:text-white truncate px-2">{folder.name}</p>
                            </div>
                        ))}

                        {/* Files as Memory Points */}
                        {content?.items?.filter(i => i.kind === 'file').map(file => (
                            <div key={file.id} className="group cursor-pointer space-y-3 text-center">
                                <div className="aspect-square rounded-full border border-cyan-500/10 bg-cyan-500/[0.02] flex items-center justify-center transition-all group-hover:bg-cyan-500/[0.05] group-hover:scale-105 group-hover:border-cyan-500/30">
                                    <FileText className="text-cyan-500/20 group-hover:text-cyan-500/60 transition-colors" size={28} />
                                </div>
                                <p className="text-[11px] font-medium text-white/40 group-hover:text-white truncate px-2">{file.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom Stats / Connectivity */}
                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-[10px] text-white/30">
                            <ShieldCheck size={12} className="text-emerald-500/50" />
                            Lokal gesichert
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-white/30">
                            <Cloud size={12} />
                            2 Cloud Quellen
                        </div>
                    </div>
                    <button className="text-[10px] uppercase tracking-widest text-cyan-400 hover:text-cyan-300 transition-colors">
                        Orbit verwalten
                    </button>
                </div>
            </div>
        </GlassPanel>
    );
}

function getGlassProps(pane: any, paneId: string, isActive: boolean) {
    return {
        width: pane.size.width,
        height: pane.size.height,
        initialX: pane.position.x,
        initialY: pane.position.y,
        isActive,
        zIndex: pane.zIndex,
        showCloseButton: true,
        showMinimizeButton: true,
        draggable: true,
        resizable: true,
        paneId,
    };
}
