"use client";

import React, { useEffect } from 'react';
import { useMoraStore } from '@/lib/store/moraState';
import { ChevronRight, ChevronDown, Folder, FileText, Link as LinkIcon, Building2, Box, File } from 'lucide-react';
import type { CoreTreeNode } from '@/lib/types/core';
import { motion, AnimatePresence } from 'framer-motion';

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
        navigateToDepartment,
        navigateToSpace,
        navigateToFolder,
        loadNodeDetails
    } = useMoraStore();

    // Load tree on mount
    useEffect(() => {
        if (!treeData) {
            loadTree();
        }
    }, [treeData, loadTree]);

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
                            {node.children!.map(child => renderTreeNode(child, depth + 1))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    return (
        <div className="w-80 h-full border-r border-white/10 bg-black/40 backdrop-blur-xl flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-white/10">
                <h2 className="text-lg font-light text-emerald-50 tracking-widest uppercase">Navigation</h2>
                <p className="text-xs text-emerald-400/50 tracking-wider mt-1">Organizational Tree</p>
            </div>

            {/* Tree Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                {isLoadingTree && (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-6 h-6 border-2 border-mora-gold/30 border-t-mora-gold rounded-full animate-spin" />
                    </div>
                )}

                {!isLoadingTree && treeData && treeData.length === 0 && (
                    <div className="text-center py-12 text-emerald-500/30 text-sm">
                        No data available
                    </div>
                )}

                {!isLoadingTree && treeData && treeData.map(node => renderTreeNode(node))}
            </div>
        </div>
    );
};
