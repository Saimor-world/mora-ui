'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Folder, FileText, ArrowRight } from 'lucide-react';
import { useTree } from '@/lib/queries/useTree';
import { useNavStore } from '@/lib/store/navStore';
import { usePaneStore } from '@/lib/store/paneStore';
import type { CoreTreeNode } from '@/lib/types/core';

interface DeptSpaceMapProps {
    departmentId: string;
    departmentName?: string;
}

function countNodes(children: CoreTreeNode[] = []): number {
    let count = 0;
    for (const child of children) {
        if (child.type === 'node') count++;
        if (child.children) count += countNodes(child.children);
    }
    return count;
}

function getRoomSize(docCount: number): 'sm' | 'md' | 'lg' {
    if (docCount >= 10) return 'lg';
    if (docCount >= 3)  return 'md';
    return 'sm';
}

const SIZE_DIMS = {
    sm: 'min-h-[120px]',
    md: 'min-h-[148px]',
    lg: 'min-h-[176px]',
};

export function DeptSpaceMap({ departmentId, departmentName }: DeptSpaceMapProps) {
    const activeCompanyId = useNavStore((s) => s.activeCompanyId);
    const { navigateToSpace } = useNavStore();
    const { openPane } = usePaneStore();
    const { data: treeData = [] } = useTree(activeCompanyId);

    const spaces = useMemo(() => {
        const deptNode = (Array.isArray(treeData) ? treeData : []).find(
            (n: CoreTreeNode) => n.id === departmentId,
        );
        const spaceChildren = (deptNode?.children ?? []).filter(
            (c: CoreTreeNode) => c.type === 'space',
        );
        return spaceChildren.map((space: CoreTreeNode) => ({
            id: space.id,
            name: space.name,
            color: space.color,
            docCount: countNodes(space.children),
            folderCount: (space.children ?? []).filter((c) => c.type === 'folder').length,
        }));
    }, [treeData, departmentId]);

    const maxDocs = Math.max(1, ...spaces.map((s) => s.docCount));

    if (spaces.length === 0) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="rounded-[28px] border border-white/[0.08] bg-black/22 px-8 py-10 text-center backdrop-blur-2xl">
                    <Folder size={32} className="mx-auto mb-3 text-white/20" />
                    <p className="text-sm text-white/42">
                        Noch keine Bereiche in {departmentName ?? 'dieser Abteilung'}.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col gap-6 px-6 pb-28 pt-20 overflow-y-auto">
            <header>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white/45">
                    {departmentName ?? 'Abteilung'} · Bereiche
                </div>
                <p className="text-[11px] text-white/30">{spaces.length} Bereich{spaces.length !== 1 ? 'e' : ''}</p>
            </header>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
                {spaces.map((space, idx) => {
                    const size = getRoomSize(space.docCount);
                    const activity = maxDocs > 0 ? space.docCount / maxDocs : 0;
                    const hasActivity = space.docCount > 0;

                    return (
                        <motion.button
                            key={space.id}
                            type="button"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.32, delay: idx * 0.04, ease: 'easeOut' as const }}
                            onClick={() => {
                                navigateToSpace(space.id);
                                openPane({
                                    id: `finder-space-${space.id}`,
                                    type: 'finder',
                                    title: space.name,
                                    size: { width: 900, height: 700 },
                                    data: { spaceId: space.id },
                                });
                            }}
                            className={`group relative flex flex-col overflow-hidden rounded-[22px] border border-white/[0.09] bg-black/22 p-4 text-left backdrop-blur-2xl transition-colors hover:border-white/[0.16] hover:bg-black/30 ${SIZE_DIMS[size]}`}
                        >
                            {/* Activity glow — scales with doc count */}
                            {hasActivity && (
                                <div
                                    className="pointer-events-none absolute inset-0 rounded-[22px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                                    style={{
                                        background: `radial-gradient(ellipse 80% 60% at 30% 30%, rgba(16,185,129,${(activity * 0.18).toFixed(2)}) 0%, transparent 70%)`,
                                    }}
                                />
                            )}

                            {/* Top accent line — brighter with more activity */}
                            <div
                                className="pointer-events-none absolute left-0 top-0 h-[2px] w-full rounded-t-[22px]"
                                style={{
                                    background: hasActivity
                                        ? `linear-gradient(90deg, rgba(16,185,129,${(0.3 + activity * 0.5).toFixed(2)}) 0%, rgba(6,182,212,${(0.2 + activity * 0.35).toFixed(2)}) 60%, transparent 100%)`
                                        : 'linear-gradient(90deg, rgba(255,255,255,0.06) 0%, transparent 100%)',
                                }}
                            />

                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${hasActivity ? 'border-emerald-400/20 bg-emerald-500/10' : 'border-white/[0.07] bg-white/[0.04]'}`}>
                                        <Folder size={15} className={hasActivity ? 'text-emerald-300/70' : 'text-white/35'} />
                                    </div>
                                    <span className="text-sm font-medium leading-tight text-white/82 group-hover:text-white transition-colors">
                                        {space.name}
                                    </span>
                                </div>
                                <ArrowRight size={13} className="mt-0.5 shrink-0 text-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
                            </div>

                            <div className="mt-auto flex items-center gap-3 pt-3">
                                {space.docCount > 0 && (
                                    <span className="flex items-center gap-1 text-[11px] text-white/40">
                                        <FileText size={11} />
                                        {space.docCount} Dok{space.docCount !== 1 ? 'umente' : 'ument'}
                                    </span>
                                )}
                                {space.folderCount > 0 && (
                                    <span className="flex items-center gap-1 text-[11px] text-white/30">
                                        <Folder size={10} />
                                        {space.folderCount}
                                    </span>
                                )}
                                {!hasActivity && (
                                    <span className="text-[11px] italic text-white/25">Leer</span>
                                )}
                            </div>

                            {/* Activity bar */}
                            {hasActivity && (
                                <div className="absolute bottom-0 left-0 h-[3px] w-full overflow-hidden rounded-b-[22px]">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-emerald-400/60 to-cyan-400/40"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.max(8, activity * 100)}%` }}
                                        transition={{ duration: 0.8, delay: idx * 0.04 + 0.2, ease: 'easeOut' as const }}
                                    />
                                </div>
                            )}
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
}
