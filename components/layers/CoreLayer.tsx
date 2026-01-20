"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createFolder, fetchFoldersByCompany, fetchNodes, fetchSpacesByCompany } from '@/lib/api/coreClient';
import { useMoraStore } from '@/lib/store/moraState';
import type { CoreNode } from '@/lib/types/core';
import { AlertTriangle, Inbox } from 'lucide-react';

/**
 * CoreLayer - Landing view for the Core/Home state
 * 
 * NOTE: The MoraOrb is now rendered by MoraOrbController (single source of truth)
 * This layer only shows the status text and instructions.
 */
export const CoreLayer: React.FC = () => {
    const {
        isLoadingDepartments,
        coreError,
        loadDepartments,
        activeCompanyId,
        companies
    } = useMoraStore();

    const [inboxNodes, setInboxNodes] = useState<CoreNode[]>([]);
    const [inboxError, setInboxError] = useState<string | null>(null);
    const [isLoadingInbox, setIsLoadingInbox] = useState(false);

    const activeCompany = useMemo(
        () => companies.find((company) => company.id === activeCompanyId) || null,
        [companies, activeCompanyId]
    );

    useEffect(() => {
        // Load departments for sidebar
        loadDepartments();
    }, [loadDepartments]);

    const loadInbox = useCallback(async () => {
        if (!activeCompanyId) {
            setInboxNodes([]);
            setInboxError(null);
            return;
        }

        setIsLoadingInbox(true);
        setInboxError(null);

        try {
            const folders = await fetchFoldersByCompany(activeCompanyId);
            let inbox = folders.find((folder) => folder.name?.toLowerCase() === 'inbox') || null;

            if (!inbox) {
                const spaces = await fetchSpacesByCompany(activeCompanyId);
                if (spaces.length === 0) {
                    setInboxError('No space available for Inbox');
                    setInboxNodes([]);
                    return;
                }
                inbox = await createFolder({
                    space_id: spaces[0].id,
                    name: 'Inbox',
                    description: 'Home / Unassigned Stack'
                });
            }

            const nodes = await fetchNodes(inbox.id);
            const sorted = [...nodes].sort((a, b) => {
                const aTime = a.created_at ? Date.parse(a.created_at) : 0;
                const bTime = b.created_at ? Date.parse(b.created_at) : 0;
                return bTime - aTime;
            });
            setInboxNodes(sorted);
        } catch (error) {
            console.error('Failed to load Inbox stack', error);
            setInboxError('Failed to load Inbox');
            setInboxNodes([]);
        } finally {
            setIsLoadingInbox(false);
        }
    }, [activeCompanyId]);

    useEffect(() => {
        loadInbox();
    }, [loadInbox]);

    useEffect(() => {
        const handleRefresh = () => loadInbox();
        window.addEventListener('saimor:inbox-refresh', handleRefresh);
        return () => window.removeEventListener('saimor:inbox-refresh', handleRefresh);
    }, [loadInbox]);

    const visibleNodes = inboxNodes.slice(0, 6);
    const remainingCount = inboxNodes.length - visibleNodes.length;

    return (
        <div className="relative w-full h-full flex items-center justify-center">
            {/* Inbox Stack */}
            <div className="absolute bottom-32 left-6 w-[320px] sm:left-10 sm:w-[360px] pointer-events-auto">
                <div className="glass-card p-4 border border-emerald-500/20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.35em] text-emerald-200/70">
                            <Inbox size={14} className="text-emerald-400" />
                            Home / Inbox
                        </div>
                        {activeCompany && (
                            <span className="text-[10px] text-white/40 truncate max-w-[140px]">
                                {activeCompany.name}
                            </span>
                        )}
                    </div>
                    <div className="mt-1 text-[10px] text-emerald-400/60 uppercase tracking-[0.2em]">
                        Unassigned Stack
                    </div>

                    <div className="mt-3 space-y-2 max-h-44 overflow-auto">
                        {!activeCompanyId && (
                            <div className="text-xs text-white/40">
                                Select a company to view the Inbox.
                            </div>
                        )}
                        {activeCompanyId && isLoadingInbox && (
                            <div className="text-xs text-white/40">Loading Inbox...</div>
                        )}
                        {activeCompanyId && !isLoadingInbox && inboxError && (
                            <div className="text-xs text-red-300/80">{inboxError}</div>
                        )}
                        {activeCompanyId && !isLoadingInbox && !inboxError && inboxNodes.length === 0 && (
                            <div className="text-xs text-white/40">
                                Inbox is empty. Upload a file to drop it here.
                            </div>
                        )}
                        {activeCompanyId && !isLoadingInbox && !inboxError && visibleNodes.map((node) => (
                            <div key={node.id} className="flex items-center gap-2 text-xs text-white/75">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
                                <span className="truncate">
                                    {node.title || node.name || 'Untitled'}
                                </span>
                            </div>
                        ))}
                        {activeCompanyId && remainingCount > 0 && (
                            <div className="text-[10px] text-white/35">
                                +{remainingCount} more in Inbox
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Status Text (below the controller-managed Orb) */}
            <div className="relative z-10 mt-48 text-center w-96">
                <h1 className="text-4xl font-light tracking-[0.3em] text-emerald-50 mb-3">MÃ”RA</h1>
                <p className="text-xs text-emerald-400/50 tracking-widest uppercase">
                    {isLoadingDepartments ? 'Initializing System...' : (coreError ? 'Connection Error' : 'System Online')}
                </p>
                {coreError && (
                    <div className="mt-4 flex items-center justify-center gap-2 text-red-400/80 text-xs bg-red-900/20 p-3 rounded border border-red-500/20">
                        <AlertTriangle size={14} />
                        <span>{coreError}</span>
                    </div>
                )}
            </div>

            {/* Subtle Instructions */}
            <div className="absolute bottom-20 text-center text-emerald-500/30 text-xs tracking-widest uppercase">
                <p>Select a department from the sidebar to begin</p>
            </div>
        </div>
    );
};

