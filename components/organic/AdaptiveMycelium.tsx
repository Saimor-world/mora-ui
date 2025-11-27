"use client";

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// ADAPTIVE MYCELIUM - Calm, Zen, Intelligent
// ============================================================================
// Nicht alles auf einmal. Nicht grün-explodierend.
// Ein atmender Organismus der NUR zeigt was relevant ist.
// ============================================================================

interface MyceliumNode {
    id: string;
    title: string;
    type: string;
    position: [number, number, number];
    color: string;
    size: number;
    connections: string[];
}

interface AdaptiveMyceliumProps {
    nodes: MyceliumNode[];
    onNodeClick?: (nodeId: string) => void;
    activeNodeId?: string | null;
    variant?: 'department' | 'space' | 'folder' | 'node';
}

// ZEN COLOR PALETTE - Nicht aggressives Grün!
const ZEN_COLORS = {
    background: 'rgba(5, 10, 15, 0.95)',      // Deep calm
    nodePrimary: 'rgba(180, 190, 200, 0.6)',   // Soft blue-gray
    nodeActive: 'rgba(206, 182, 118, 0.9)',    // Warm gold
    nodeHover: 'rgba(200, 210, 220, 0.8)',     // Light gray
    connection: 'rgba(150, 160, 170, 0.15)',   // Very subtle
    connectionActive: 'rgba(206, 182, 118, 0.4)', // Gold glow
    ambientGlow: 'rgba(100, 120, 140, 0.08)',  // Soft ambient
};

// Adaptive Node - Zeigt sich nur wenn relevant
function AdaptiveNode({
    node,
    isActive,
    isConnected,
    isVisible,
    onClick,
}: {
    node: MyceliumNode;
    isActive: boolean;
    isConnected: boolean;
    isVisible: boolean;
    onClick: () => void;
}) {
    const [hovered, setHovered] = useState(false);

    // Nur sichtbar wenn: active, connected to active, oder hovered
    const shouldShow = isActive || isConnected || isVisible || hovered;

    return (
        <AnimatePresence>
            {shouldShow && (
                <motion.div
                    className="absolute cursor-pointer"
                    style={{
                        left: `${50 + node.position[0] * 2}%`,
                        top: `${50 + node.position[1] * 2}%`,
                        zIndex: isActive ? 50 : isConnected ? 30 : 20,
                    }}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{
                        opacity: isActive ? 1 : isConnected ? 0.8 : 0.4,
                        scale: isActive ? 1.3 : hovered ? 1.1 : 1,
                    }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{
                        duration: 0.6,
                        ease: "easeOut",
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onClick();
                    }}
                    onHoverStart={() => setHovered(true)}
                    onHoverEnd={() => setHovered(false)}
                >
                    {/* Soft Aura */}
                    <motion.div
                        className="absolute rounded-full blur-2xl"
                        style={{
                            width: node.size * 60,
                            height: node.size * 60,
                            backgroundColor: isActive
                                ? ZEN_COLORS.nodeActive
                                : ZEN_COLORS.ambientGlow,
                            transform: 'translate(-50%, -50%)',
                        }}
                        animate={{
                            opacity: isActive ? [0.4, 0.6, 0.4] : [0.1, 0.2, 0.1],
                            scale: [1, 1.1, 1],
                        }}
                        transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                    />

                    {/* Core Node */}
                    <motion.div
                        className="relative rounded-full backdrop-blur-md border"
                        style={{
                            width: node.size * 35,
                            height: node.size * 35,
                            backgroundColor: isActive
                                ? 'rgba(206, 182, 118, 0.2)'
                                : 'rgba(20, 25, 30, 0.6)',
                            borderColor: isActive
                                ? ZEN_COLORS.nodeActive
                                : hovered
                                ? ZEN_COLORS.nodeHover
                                : ZEN_COLORS.nodePrimary,
                            boxShadow: isActive
                                ? `0 0 20px ${ZEN_COLORS.nodeActive}`
                                : 'none',
                        }}
                    >
                        {/* Inner Pulse */}
                        <motion.div
                            className="absolute inset-2 rounded-full"
                            style={{
                                backgroundColor: isActive
                                    ? ZEN_COLORS.nodeActive
                                    : ZEN_COLORS.nodePrimary,
                            }}
                            animate={{
                                opacity: [0.2, 0.4, 0.2],
                            }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: "easeInOut",
                            }}
                        />
                    </motion.div>

                    {/* Label - nur bei active/hover */}
                    {(isActive || hovered) && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute top-full mt-3 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1.5 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg text-xs text-gray-200 pointer-events-none"
                        >
                            {node.title}
                        </motion.div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// Adaptive Connection - Zeigt sich nur wenn einer der Nodes aktiv ist
function AdaptiveConnection({
    start,
    end,
    isActive,
}: {
    start: [number, number, number];
    end: [number, number, number];
    isActive: boolean;
}) {
    const startX = 50 + start[0] * 2;
    const startY = 50 + start[1] * 2;
    const endX = 50 + end[0] * 2;
    const endY = 50 + end[1] * 2;

    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;

    const pathD = `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`;

    return (
        <AnimatePresence>
            {isActive && (
                <motion.path
                    d={pathD}
                    fill="none"
                    stroke={ZEN_COLORS.connectionActive}
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    initial={{ opacity: 0, pathLength: 0 }}
                    animate={{
                        opacity: [0.3, 0.5, 0.3],
                        pathLength: 1,
                        strokeDashoffset: [0, -10],
                    }}
                    exit={{ opacity: 0 }}
                    transition={{
                        pathLength: { duration: 0.8, ease: "easeOut" },
                        opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                        strokeDashoffset: { duration: 4, repeat: Infinity, ease: "linear" },
                    }}
                    strokeDasharray="3 5"
                    style={{
                        filter: `drop-shadow(0 0 4px ${ZEN_COLORS.connectionActive})`,
                    }}
                />
            )}
        </AnimatePresence>
    );
}

// Main Component - ADAPTIVE INTELLIGENCE
export function AdaptiveMycelium({
    nodes,
    onNodeClick,
    activeNodeId,
    variant = 'folder',
}: AdaptiveMyceliumProps) {
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

    // Adaptive Logic: Nur relevante Nodes anzeigen
    const { visibleNodes, activeConnections } = useMemo(() => {
        const active = activeNodeId || hoveredNodeId;

        if (!active) {
            // Kein Active: Zeige nur wenige "Anchor" Nodes
            const anchors = nodes.slice(0, Math.min(8, nodes.length));
            return {
                visibleNodes: new Set(anchors.map(n => n.id)),
                activeConnections: new Set<string>(),
            };
        }

        // Active Node + alle connected Nodes
        const activeNode = nodes.find(n => n.id === active);
        if (!activeNode) {
            return { visibleNodes: new Set<string>(), activeConnections: new Set<string>() };
        }

        const visible = new Set<string>([active]);
        const connections = new Set<string>();

        // Direktverbundene Nodes
        activeNode.connections.forEach(connId => {
            visible.add(connId);
            connections.add(`${active}-${connId}`);
            connections.add(`${connId}-${active}`);
        });

        // Zweite Ebene (Freunde der Freunde) - aber nur wenige
        activeNode.connections.slice(0, 3).forEach(connId => {
            const connNode = nodes.find(n => n.id === connId);
            if (connNode) {
                connNode.connections.slice(0, 2).forEach(secondId => {
                    if (!visible.has(secondId)) {
                        visible.add(secondId);
                    }
                });
            }
        });

        return { visibleNodes: visible, activeConnections: connections };
    }, [nodes, activeNodeId, hoveredNodeId]);

    // Build only ACTIVE connections
    const connectionPaths = useMemo(() => {
        const paths: Array<{
            start: [number, number, number];
            end: [number, number, number];
            isActive: boolean;
            key: string;
        }> = [];

        nodes.forEach(node => {
            node.connections.forEach(targetId => {
                const targetNode = nodes.find(n => n.id === targetId);
                if (!targetNode) return;

                const key1 = `${node.id}-${targetId}`;
                const key2 = `${targetId}-${node.id}`;
                const isActive = activeConnections.has(key1) || activeConnections.has(key2);

                if (isActive) {
                    paths.push({
                        start: node.position,
                        end: targetNode.position,
                        isActive: true,
                        key: key1,
                    });
                }
            });
        });

        return paths;
    }, [nodes, activeConnections]);

    if (nodes.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center text-gray-500/30 text-sm">
                <div className="text-center">
                    <div className="text-2xl mb-2">∅</div>
                    <div>Empty space</div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="w-full h-full relative overflow-hidden"
            style={{ backgroundColor: ZEN_COLORS.background }}
            onMouseLeave={() => setHoveredNodeId(null)}
        >
            {/* Subtle ambient breathing */}
            <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: `radial-gradient(circle at 50% 50%, ${ZEN_COLORS.ambientGlow} 0%, transparent 70%)`,
                }}
                animate={{
                    opacity: [0.2, 0.4, 0.2],
                }}
                transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />

            {/* Connection Layer */}
            <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ zIndex: 5 }}
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
            >
                {connectionPaths.map((conn) => (
                    <AdaptiveConnection
                        key={conn.key}
                        start={conn.start}
                        end={conn.end}
                        isActive={conn.isActive}
                    />
                ))}
            </svg>

            {/* Nodes Layer */}
            <div className="absolute inset-0">
                {nodes.map((node) => (
                    <AdaptiveNode
                        key={node.id}
                        node={node}
                        isActive={activeNodeId === node.id}
                        isConnected={visibleNodes.has(node.id)}
                        isVisible={visibleNodes.has(node.id)}
                        onClick={() => onNodeClick?.(node.id)}
                    />
                ))}
            </div>

            {/* Zen Info */}
            <div className="absolute bottom-4 left-4 text-[10px] text-gray-500/40 uppercase tracking-wider pointer-events-none font-mono space-y-1">
                <div>Adaptive Network • {nodes.length} Total</div>
                <div className="text-gray-500/20">
                    {visibleNodes.size} Visible • {connectionPaths.length} Active Links
                </div>
                <div className="text-gray-600/30 text-[8px] mt-2">
                    {activeNodeId ? 'FOCUS MODE' : 'CALM MODE'}
                </div>
            </div>
        </div>
    );
}
