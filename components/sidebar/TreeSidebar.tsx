"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useMoraStore } from '@/lib/store/moraState';
import { ChevronRight, ChevronDown, Folder, FileText, Link as LinkIcon, Building2, Box, File, Settings, MessageSquare, Zap } from 'lucide-react';
import type { CoreTreeNode } from '@/lib/types/core';
import { motion, AnimatePresence } from 'framer-motion';
import { SemanticSearch } from '@/components/search/SemanticSearch';
import { useUser } from '@/lib/hooks/useUser';
import { useDemoFlow } from '@/lib/hooks/useDemoFlow';
import { SettingsPane } from '@/components/ui/SettingsPane';
import { ChatOverlay } from '@/components/chat/ChatOverlay';
import { SmartDepartmentDialog } from '@/components/dialogs/SmartDepartmentDialog';

export const TreeSidebar: React.FC = () => {
    const {
        treeData,
        isLoadingTree,
        expandedTreeNodes,
        activeDepartmentId,
        activeSpaceId,
        activeFolderId,
        activeNode,
        loadTree,
        toggleTreeNode,
        navigateToCore,
        navigateToDepartment,
        navigateToSpace,
        navigateToFolder,
        loadNodeDetails
    } = useMoraStore();

    const { role, tenantId, isLoading: isLoadingUser, isAdmin } = useUser();
    const { runDemoFlow, isRunning } = useDemoFlow();
    const [isSettingsOpen, setSettingsOpen] = useState(false);
    const [isChatOpen, setChatOpen] = useState(false);
    const [showActions, setShowActions] = useState(false);
    const [isSmartDeptOpen, setSmartDeptOpen] = useState(false);

    // Load tree on mount
    useEffect(() => {
        if (!treeData && !isLoadingUser) {
            loadTree(tenantId || undefined);
        }
    }, [treeData, loadTree, tenantId, isLoadingUser]);

    // Filter tree based on role
    const filteredTreeData = useMemo(() => {
        if (!treeData) return null;

        // Admin/Manager see everything
        let base = treeData;
        if (role === 'member') {
            // Member only sees Personal + Engineering (public example)
            base = treeData.filter(dept =>
                dept.id === 'dept-personal' ||
                dept.id === 'dept-engineering' ||
                dept.name === 'Personal' ||
                dept.name === 'Engineering'
            );
        }

        // Flatten single spaces that duplicate the department name to avoid double entries
        const flattened = base.map(dept => {
            if (!dept.children || dept.children.length !== 1) return dept;
            const onlySpace = dept.children[0];
            if (onlySpace.type === 'space' && onlySpace.name === dept.name) {
                return {
                    ...dept,
                    children: onlySpace.children || []
                };
            }
            return dept;
        });

        return flattened;
    }, [treeData, role]);

    const handleNodeClick = (node: CoreTreeNode) => {
        switch (node.type) {
            case 'department':
                navigateToDepartment(node.id);
                break;
            case 'space':
                navigateToSpace(node.id);
                break;
            case 'folder':
                navigateToFolder(node.id);
                break;
            case 'node':
                loadNodeDetails(node.id);
                break;
        }

        // Expand if it has children
        if (node.children && node.children.length > 0 && !expandedTreeNodes.has(node.id)) {
            toggleTreeNode(node.id);
        }
    };

    const getNodeIcon = (node: CoreTreeNode) => {
        switch (node.type) {
            case 'department': return Building2;
            case 'space': return Box;
            case 'folder': return Folder;
            case 'node':
                if (node.nodeType === 'link') return LinkIcon;
                if (node.nodeType === 'document') return FileText;
                if (node.nodeType === 'note') return FileText;
                return File;
            default: return File;
        }
    };

    const getNodeColorClass = (node: CoreTreeNode) => {
        if (node.color) return { color: node.color };

        switch (node.type) {
            case 'department': return 'text-emerald-400';
            case 'space': return 'text-blue-400';
            case 'folder': return 'text-purple-400';
            case 'node': return 'text-gray-400';
            default: return 'text-gray-500';
        }
    };

    const isActiveNode = (node: CoreTreeNode): boolean => {
        switch (node.type) {
            case 'department': return activeDepartmentId === node.id;
            case 'space': return activeSpaceId === node.id;
            case 'folder': return activeFolderId === node.id;
            case 'node': return activeNode?.id === node.id;
            default: return false;
        }
    };

    const renderTreeNode = (node: CoreTreeNode, depth: number = 0): React.ReactNode => {
        const isExpanded = expandedTreeNodes.has(node.id);
        const hasChildren = node.children && node.children.length > 0;
        const Icon = getNodeIcon(node);
        const isActive = isActiveNode(node);
        const colorClass = getNodeColorClass(node);

        return (
            <div key={node.id} className="select-none">
                <div
                    onClick={() => handleNodeClick(node)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all group
                        ${isActive ? 'bg-emerald-500/20 border border-emerald-500/30' : 'hover:bg-white/5'}
                    `}
                    style={{ paddingLeft: `${depth * 16 + 12}px` }}
                >
                    {/* Expand/Collapse Icon */}
                    {hasChildren && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleTreeNode(node.id);
                            }}
                            className="w-4 h-4 flex items-center justify-center text-emerald-500/50 hover:text-emerald-400 transition-colors"
                        >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                    )}

                    {/* Node Icon */}
                    <Icon
                        className={`w-4 h-4 ${typeof colorClass === 'string' ? colorClass : ''} transition-colors ${isActive ? 'text-mora-gold' : ''}`}
                        style={typeof colorClass === 'object' ? colorClass : undefined}
                    />

                    {/* Node Name */}
                    <span className={`flex-1 text-sm truncate transition-colors ${isActive ? 'text-white font-medium' : 'text-emerald-100/70 group-hover:text-white'}`}>
                        {node.name}
                    </span>
                </div>

                {/* Children */}
                <AnimatePresence>
                    {isExpanded && hasChildren && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            {node.children?.map(child => renderTreeNode(child, depth + 1))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    return (
        <aside className="w-80 h-full glass-panel border-r border-white/10 bg-[#050f0a]/90 backdrop-blur-md flex flex-col z-10">
            {/* Header */}
            <div className="p-6 border-b border-white/10 space-y-4">
                <h2 className="text-sm font-light text-emerald-50 tracking-widest uppercase">
                    NAVIGATION
                </h2>

                {/* Navigation shortcuts */}
                <div className="grid grid-cols-2 gap-2">
                    <button className="px-3 py-2 rounded-lg bg-white/5 text-emerald-100/80 text-xs hover:bg-white/10"
                        onClick={() => { navigateToCore(); loadTree(tenantId || undefined); }}>
                        Home
                    </button>
                    <button className="px-3 py-2 rounded-lg bg-white/5 text-emerald-100/80 text-xs hover:bg-white/10"
                        onClick={() => {
                            useMoraStore.getState().setActiveCompany(null);
                            useMoraStore.getState().setViewLevel('company');
                        }}>
                        Companies
                    </button>
                    <button className="px-3 py-2 rounded-lg bg-white/5 text-emerald-100/80 text-xs hover:bg-white/10"
                        onClick={() => setShowActions(true)}>
                        Intelligence
                    </button>
                    <button className="px-3 py-2 rounded-lg bg-white/5 text-emerald-100/80 text-xs hover:bg-white/10">
                        Activity
                    </button>
                </div>

                {/* Semantic Search */}
                <SemanticSearch />
            </div>

            {/* Tree Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                {isLoadingTree && (
                    <div className="flex items-center justify-center py-8">
                        <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                    </div>
                )}

                {!isLoadingTree && !filteredTreeData && (
                    <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                        <div className="text-emerald-500/30 text-sm">
                            Connection interrupted
                        </div>
                        <button
                            onClick={() => loadTree(tenantId || undefined)}
                            className="px-3 py-1.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-xs text-emerald-400 border border-emerald-500/20 transition-colors"
                        >
                            Retry Connection
                        </button>
                    </div>
                )}

                {!isLoadingTree && filteredTreeData && filteredTreeData.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                        <div className="text-emerald-500/30 text-sm">
                            Tree is empty
                        </div>
                        <button
                            onClick={() => loadTree(tenantId || undefined)}
                            className="px-3 py-1.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-xs text-emerald-400 border border-emerald-500/20 transition-colors"
                        >
                            Refresh
                        </button>
                    </div>
                )}

                {!isLoadingTree && filteredTreeData && filteredTreeData.length > 0 && (
                    <div className="space-y-1">
                        {filteredTreeData.map(node => renderTreeNode(node, 0))}
                    </div>
                )}

                {/* System Section */}
                <div className="mt-6 space-y-2">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-500/40 px-3">System</div>
                    <button
                        onClick={() => setSettingsOpen(true)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-emerald-100/80"
                    >
                        <Settings className="w-4 h-4 text-mora-gold" />
                        <span>Settings</span>
                    </button>
                    <button
                        onClick={() => setChatOpen(true)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-emerald-100/80"
                    >
                        <MessageSquare className="w-4 h-4 text-emerald-400" />
                        <span>Chat</span>
                    </button>
                    <div className="relative">
                        <button
                            onClick={() => setShowActions((v) => !v)}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-emerald-100/80"
                        >
                            <span className="flex items-center gap-2">
                                <Zap className="w-4 h-4 text-emerald-400" />
                                Quick Actions
                            </span>
                            <ChevronDown size={14} className={`transition-transform ${showActions ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                            {showActions && (
                                <motion.div
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                    className="mt-2 bg-[#0a1712] border border-white/10 rounded-lg shadow-lg overflow-hidden"
                                >
                                    <button
                                        className="w-full text-left px-3 py-2 text-xs text-emerald-100/80 hover:bg-white/5"
                                        onClick={() => { loadTree(tenantId || undefined); setShowActions(false); }}
                                    >
                                        Refresh Tree
                                    </button>
                                    {isAdmin && (
                                        <button
                                            className="w-full text-left px-3 py-2 text-xs text-emerald-100/80 hover:bg-white/5"
                                            onClick={() => {
                                                setSmartDeptOpen(true);
                                                setShowActions(false);
                                            }}
                                        >
                                            New Department (Smart)
                                        </button>
                                    )}
                                    <button
                                        className="w-full text-left px-3 py-2 text-xs text-emerald-100/80 hover:bg-white/5 disabled:opacity-50"
                                        disabled={isRunning}
                                        onClick={async () => {
                                            await runDemoFlow(tenantId || undefined);
                                            setShowActions(false);
                                        }}
                                    >
                                        Reset Demo
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            <SettingsPane isOpen={isSettingsOpen} onClose={() => setSettingsOpen(false)} />
            <ChatOverlay isOpen={isChatOpen} onClose={() => setChatOpen(false)} />
            <SmartDepartmentDialog
                isOpen={isSmartDeptOpen}
                onClose={() => setSmartDeptOpen(false)}
                onSuccess={() => {
                    loadTree(tenantId || undefined);
                    setSmartDeptOpen(false);
                }}
            />
        </aside>
    );
};
