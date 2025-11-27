"use client";

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

// ============================================================================
// MYCELIUM 2.5D - CALM OS EDITION
// ============================================================================
// DESIGN PHILOSOPHY:
// - Firefly Mode: Labels hidden when n > 20 (clarity)
// - Focus Mode: Hover = spotlight (attention)
// - Semantic Clustering: Types cluster naturally (not random)
// - Calm Energy: Idle = slow breath, Hover = local pulse, Alert = rare flash
// - Connection Language: Structural (solid) vs Semantic (dotted)
//
// NODE THRESHOLDS:
// - n ≤ 20: Full labels visible (like garden)
// - n > 20: Firefly mode (orbs only, hover reveals)
// - n > 60: Performance warning (consider LOD levels)
//
// ENERGY LEVELS:
// - IDLE: 6bpm breathing, barely visible
// - HOVER: Local 100%, neighbors 70%, rest 20%
// - ALERT: Flash (Intel-Report, rare)
// ============================================================================

export interface MyceliumNode {
    id: string;
    title: string;
    type: string;
    position: [number, number, number]; // x, y, z (z = layer depth)
    color: string;
    size: number;
    connections: string[];
    semanticType?: 'structural' | 'semantic'; // Connection type
}

interface Mycelium25DProps {
    nodes: MyceliumNode[];
    onNodeClick?: (nodeId: string) => void;
    activeNodeId?: string | null;
    variant?: 'department' | 'space' | 'folder' | 'node';
}

// CONSTANTS - Focus-Only Mode for Large Networks
const CALM_MODE_THRESHOLD = 25; // Above this, activate focus-only mode
const FOCUS_DIM_OPACITY = 0.25; // Rest of network when focusing
const NEIGHBOR_OPACITY = 0.8; // Direct neighbors opacity
const IDLE_BREATH_DURATION = 12; // seconds (balanced: 5bpm)
const MAX_VISIBLE_CONNECTIONS = 150; // Limit visible connections for performance

// ============================================================================
// ORGANIC SPORE - PHASE 1 (Firefly) + PHASE 2 (Focus)
// ============================================================================
function OrganicSpore({
    node,
    isActive,
    onClick,
    mouseX,
    mouseY,
    isCalmMode,
    isFocused,
    isNeighbor,
    globalDimmed,
}: {
    node: MyceliumNode;
    isActive: boolean;
    onClick: () => void;
    mouseX: number;
    mouseY: number;
    isCalmMode: boolean;
    isFocused: boolean;
    isNeighbor: boolean;
    globalDimmed: boolean;
}) {
    const [hovered, setHovered] = useState(false);

    // BALANCED: Slight parallax reduction in calm mode
    const depth = node.position[2];
    const parallaxX = isCalmMode ? mouseX * depth * 0.008 : mouseX * depth * 0.015;
    const parallaxY = isCalmMode ? mouseY * depth * 0.008 : mouseY * depth * 0.015;

    // BALANCED: Moderate size reduction in calm mode
    const depthScale = isCalmMode ? 0.85 : (1 + depth * 0.08);

    // PHASE 2: Focus Mode opacity calculation
    const calculateOpacity = () => {
        if (isActive) return 1.0;
        if (isFocused) return 1.0;
        if (isNeighbor) return NEIGHBOR_OPACITY;
        if (globalDimmed) return FOCUS_DIM_OPACITY;
        // BALANCED: Only slight opacity reduction
        return isCalmMode ? 0.85 : 1.0;
    };

    const nodeOpacity = calculateOpacity();

    // BALANCED: Show labels on hover always, but reduce neighbor labels in calm mode
    const showLabel = isActive || hovered || (isFocused && !isCalmMode) || (isNeighbor && !isCalmMode);

    return (
        <motion.div
            className="absolute cursor-pointer group"
            style={{
                left: `${50 + node.position[0] * 2.2}%`,
                top: `${50 + node.position[1] * 2.2}%`,
                zIndex: Math.floor(10 + depth * 10),
            }}
            animate={{
                x: parallaxX,
                y: parallaxY,
                scale: (isActive ? 1.5 : isFocused ? 1.3 : hovered ? 1.2 : 1) * depthScale,
                opacity: nodeOpacity,
            }}
            transition={{
                type: "spring",
                stiffness: 120,
                damping: 25,
            }}
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            onHoverStart={() => setHovered(true)}
            onHoverEnd={() => setHovered(false)}
        >
            {/* MINIMAL GLOW: Only for active/focused, very subtle otherwise */}
            {(isActive || isFocused) && (
                <motion.div
                    className="absolute inset-0 rounded-full blur-xl"
                    style={{
                        width: node.size * 30,
                        height: node.size * 30,
                        backgroundColor: node.color,
                        transform: 'translate(-50%, -50%)',
                    }}
                    animate={{
                        opacity: isActive ? [0.4, 0.6, 0.4] : [0.3, 0.4, 0.3],
                    }}
                    transition={{
                        duration: IDLE_BREATH_DURATION,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            )}

            {/* Core Spore */}
            <motion.div
                className="relative rounded-full border backdrop-blur-sm flex items-center justify-center"
                style={{
                    width: node.size * 28,
                    height: node.size * 28,
                    backgroundColor: `${node.color}15`,
                    borderColor: isActive ? '#CEB676' : node.color,
                    borderWidth: isActive ? 3 : 2,
                    // Reduce glow in calm mode to prevent blob effect
                    boxShadow: isCalmMode
                        ? `0 0 ${isActive ? 20 : isFocused ? 12 : 4}px ${node.color}`
                        : `0 0 ${isActive ? 25 : isFocused ? 18 : 8}px ${node.color}`,
                }}
                animate={{
                    borderColor: isActive ? '#CEB676' : isFocused ? '#10B981' : node.color,
                }}
            >
                {/* Inner core - MINIMAL: Static, no animation */}
                <div
                    className="absolute inset-2 rounded-full"
                    style={{
                        backgroundColor: node.color,
                        opacity: isActive ? 0.5 : isFocused ? 0.4 : 0.2
                    }}
                />
            </motion.div>

            {/* PHASE 1: Firefly Mode - Conditional Label */}
            {showLabel && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1.5 bg-mora-forest/95 backdrop-blur-md border border-mora-gold/30 rounded-full text-xs text-emerald-100 pointer-events-none shadow-lg"
                    style={{ zIndex: 100 }}
                >
                    <div className="font-medium">{node.title}</div>
                    <div className="text-[9px] text-emerald-400/50 uppercase tracking-wider">{node.type}</div>
                </motion.div>
            )}
        </motion.div>
    );
}

// ============================================================================
// ORGANIC HYPHA - PHASE 4 (Connection Differentiation)
// ============================================================================
function OrganicHypha({
    start,
    end,
    isActive,
    isSemanticConnection,
    depth,
    globalDimmed,
}: {
    start: [number, number, number];
    end: [number, number, number];
    isActive: boolean;
    isSemanticConnection: boolean;
    depth: number;
    globalDimmed: boolean;
}) {
    const startX = 50 + start[0] * 2.2;
    const startY = 50 + start[1] * 2.2;
    const endX = 50 + end[0] * 2.2;
    const endY = 50 + end[1] * 2.2;

    // Organic curve with subtle randomness
    const midX = (startX + endX) / 2 + (Math.random() - 0.5) * 5;
    const midY = (startY + endY) / 2 + (Math.random() - 0.5) * 5;

    const pathD = `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`;

    // MINIMAL: Very subtle connections
    const strokeStyle = isSemanticConnection
        ? "2 4" // Dotted for semantic
        : "0"; // Solid for structural

    const baseWidth = isSemanticConnection ? 0.8 : 1.2; // Very thin
    const baseOpacity = isSemanticConnection ? 0.15 : 0.25; // Very subtle

    // PHASE 2: Respect focus mode
    const connectionOpacity = globalDimmed && !isActive
        ? baseOpacity * FOCUS_DIM_OPACITY
        : baseOpacity;

    return (
        <motion.path
            d={pathD}
            fill="none"
            stroke={isActive ? '#CEB676' : '#10B981'}
            strokeWidth={baseWidth}
            strokeLinecap="round"
            strokeDasharray={strokeStyle}
            animate={{
                strokeDashoffset: isSemanticConnection ? [0, -8] : 0, // Flow for semantic
                opacity: isActive ? [connectionOpacity * 1.5, connectionOpacity * 2, connectionOpacity * 1.5]
                    : [connectionOpacity, connectionOpacity * 1.2, connectionOpacity],
                strokeWidth: isActive ? [baseWidth, baseWidth * 1.5, baseWidth] : baseWidth,
            }}
            transition={{
                strokeDashoffset: {
                    duration: 6,
                    repeat: Infinity,
                    ease: "linear",
                },
                opacity: {
                    duration: isActive ? 2 : 8, // Faster pulse when active
                    repeat: Infinity,
                    ease: "easeInOut",
                },
            }}
            style={{
                filter: `drop-shadow(0 0 ${isActive ? 4 : 1}px ${isActive ? '#CEB676' : '#10B981'}30)`,
            }}
        />
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export function Mycelium25D({
    nodes,
    onNodeClick,
    activeNodeId,
    variant = 'folder',
}: Mycelium25DProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

    // Smooth mouse tracking
    const mouseX = useSpring(0, { stiffness: 80, damping: 25 });
    const mouseY = useSpring(0, { stiffness: 80, damping: 25 });

    useEffect(() => {
        mouseX.set(mousePosition.x);
        mouseY.set(mousePosition.y);
    }, [mousePosition, mouseX, mouseY]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
        const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
        setMousePosition({ x, y });
    };

    // CALM MODE: Activate for large networks
    const isCalmMode = nodes.length > CALM_MODE_THRESHOLD;

    // PHASE 2: Build neighbor map for focus mode
    const neighborMap = useMemo(() => {
        const map = new Map<string, Set<string>>();
        nodes.forEach(node => {
            map.set(node.id, new Set(node.connections));
        });
        return map;
    }, [nodes]);

    // PHASE 4: Categorize connections as structural or semantic
    const connections = useMemo(() => {
        const conns: Array<{
            start: [number, number, number];
            end: [number, number, number];
            isActive: boolean;
            isSemanticConnection: boolean;
            depth: number;
            distance: number;
        }> = [];

        // Detect connection types
        // Structural: same folder_id (all nodes in same folder connect)
        // Semantic: tags, type, author (detected by mapper)

        nodes.forEach((node) => {
            node.connections.forEach((targetId) => {
                const targetNode = nodes.find((n) => n.id === targetId);
                if (targetNode) {
                    const isActive = focusedNodeId === node.id || focusedNodeId === targetId || activeNodeId === node.id || activeNodeId === targetId;
                    const depth = (node.position[2] + targetNode.position[2]) / 2;

                    // Calculate distance for filtering in Calm Mode
                    const dx = targetNode.position[0] - node.position[0];
                    const dy = targetNode.position[1] - node.position[1];
                    const dz = targetNode.position[2] - node.position[2];
                    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

                    // All connections in folder layer are structural (same folder)
                    // Semantic connections would come from tags/author matching
                    const isSemanticConnection = node.type !== targetNode.type; // Simple heuristic

                    conns.push({
                        start: node.position,
                        end: targetNode.position,
                        isActive,
                        isSemanticConnection,
                        depth,
                        distance,
                    });
                }
            });
        });

        // CALM MODE: Show ONLY connections from focused/active nodes
        if (isCalmMode) {
            if (focusedNodeId || activeNodeId) {
                // Show only connections involving the focused/active node
                return conns.filter(conn => conn.isActive);
            } else {
                // No focus: Show balanced sample of connections
                // Strategy: Show connections from each node (max 2-3 per node)
                const nodeConnectionCounts = new Map<string, number>();
                const balancedConns: typeof conns = [];

                // Sort by distance first (prefer closer connections)
                const sorted = conns.sort((a, b) => a.distance - b.distance);

                // Take connections, but limit per node to avoid clustering
                sorted.forEach(conn => {
                    const startKey = `${conn.start[0]},${conn.start[1]}`;
                    const endKey = `${conn.end[0]},${conn.end[1]}`;
                    const startCount = nodeConnectionCounts.get(startKey) || 0;
                    const endCount = nodeConnectionCounts.get(endKey) || 0;

                    // Only add if both nodes have less than 3 visible connections
                    if (startCount < 3 && endCount < 3 && balancedConns.length < 80) {
                        balancedConns.push(conn);
                        nodeConnectionCounts.set(startKey, startCount + 1);
                        nodeConnectionCounts.set(endKey, endCount + 1);
                    }
                });

                return balancedConns;
            }
        }

        // Normal mode: Limit to prevent overload
        if (conns.length > MAX_VISIBLE_CONNECTIONS) {
            const sorted = conns.sort((a, b) => {
                if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
                return a.distance - b.distance;
            });
            return sorted.slice(0, MAX_VISIBLE_CONNECTIONS);
        }

        return conns;
    }, [nodes, activeNodeId, focusedNodeId, isCalmMode]);

    if (nodes.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center text-emerald-500/30 text-sm">
                <div className="text-center">
                    <div className="text-2xl mb-2">∅</div>
                    <div>No nodes to visualize</div>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="w-full h-full relative overflow-hidden"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setFocusedNodeId(null)}
            style={{
                background: 'radial-gradient(circle at 50% 50%, rgba(10, 42, 37, 0.2) 0%, rgba(2, 13, 10, 0.05) 100%)',
            }}
        >
            {/* PHASE 5: Calm background - very subtle */}
            <motion.div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                    x: mouseX,
                    y: mouseY,
                    scale: 1.05,
                }}
            >
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-900/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-900/5 rounded-full blur-3xl" />
            </motion.div>

            {/* Connection Layer (SVG) */}
            <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{
                    zIndex: 5,
                    mixBlendMode: 'screen',
                }}
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
            >
                {connections.map((conn, i) => (
                    <OrganicHypha
                        key={i}
                        start={conn.start}
                        end={conn.end}
                        isActive={conn.isActive}
                        isSemanticConnection={conn.isSemanticConnection}
                        depth={conn.depth}
                        globalDimmed={focusedNodeId !== null}
                    />
                ))}
            </svg>

            {/* Nodes Layer */}
            <div className="absolute inset-0">
                {nodes.map((node) => {
                    const isFocused = focusedNodeId === node.id;
                    const isNeighbor = focusedNodeId ? neighborMap.get(focusedNodeId)?.has(node.id) : false;
                    const globalDimmed = focusedNodeId !== null && !isFocused && !isNeighbor;

                    return (
                        <div
                            key={node.id}
                            onMouseEnter={() => setFocusedNodeId(node.id)}
                            onMouseLeave={() => setFocusedNodeId(null)}
                        >
                            <OrganicSpore
                                node={node}
                                isActive={activeNodeId === node.id}
                                onClick={() => onNodeClick?.(node.id)}
                                mouseX={mousePosition.x}
                                mouseY={mousePosition.y}
                                isCalmMode={isCalmMode}
                                isFocused={isFocused}
                                isNeighbor={isNeighbor || false}
                                globalDimmed={globalDimmed}
                            />
                        </div>
                    );
                })}
            </div>

            {/* PHASE 6: UI Overlay with stats and hints */}
            <div className="absolute bottom-4 left-4 text-[10px] text-emerald-500/40 uppercase tracking-wider pointer-events-none font-mono space-y-1">
                <div className="flex items-center gap-3">
                    <span>Mycelium Network</span>
                    <span className="text-mora-gold/50">•</span>
                    <span className="text-emerald-400/60">{nodes.length} Nodes</span>
                    <span className="text-mora-gold/50">•</span>
                    <span className="text-emerald-500/30">{connections.length} Links</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-500/25">
                    <span>{isCalmMode ? '🌿 Calm Mode' : '🏷️ Full Labels'}</span>
                    <span className="text-mora-gold/30">•</span>
                    <span>Hover to focus</span>
                </div>
            </div>

            {/* PHASE 5: Idle breathing aura - extremely subtle */}
            <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.015) 0%, transparent 60%)',
                }}
                animate={{
                    opacity: [0.2, 0.35, 0.2],
                }}
                transition={{
                    duration: IDLE_BREATH_DURATION,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />
        </div>
    );
}
