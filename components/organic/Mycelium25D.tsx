import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MyceliumNode } from '@/lib/utils/myceliumDataMapper';

// --- CONFIGURATION ---
const IDLE_BREATH_DURATION = 8;
const CALM_MODE_THRESHOLD = 20;

// --- SUB-COMPONENTS ---

/**
 * ORGANIC HYPHA (Connection Line)
 * Filigree, subtle, semantic
 */
const OrganicHypha = ({
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
}) => {
    // Convert normalized coords (-1 to 1) to percentage (0 to 100)
    // Adjust scale factor to fit in container comfortably
    const startX = 50 + start[0] * 25;
    const startY = 50 + start[1] * 25;
    const endX = 50 + end[0] * 25;
    const endY = 50 + end[1] * 25;

    // Deterministic randomness based on coordinates to avoid hydration mismatch
    const seed = Math.abs((startX + endX + startY + endY) * 100);
    const pseudoRandom = (seed % 100) / 100; // 0.0 to 1.0

    // Organic curve with subtle randomness (deterministic)
    // Semantic connections are straighter, structural ones more curved
    const curveIntensity = isSemanticConnection ? 0 : 5;
    const midX = (startX + endX) / 2 + (pseudoRandom - 0.5) * curveIntensity;
    const midY = (startY + endY) / 2 + ((seed * 13 % 100) / 100 - 0.5) * curveIntensity;

    // Round to 3 decimals to avoid hydration mismatch (floating point diffs)
    const pathD = `M ${startX.toFixed(3)} ${startY.toFixed(3)} Q ${midX.toFixed(3)} ${midY.toFixed(3)} ${endX.toFixed(3)} ${endY.toFixed(3)}`;

    // FILIGREE STYLE
    const strokeWidth = isActive ? 1.5 : isSemanticConnection ? 0.5 : 0.8;
    const baseOpacity = isActive ? 0.8 : isSemanticConnection ? 0.15 : 0.1;
    const opacity = globalDimmed && !isActive ? baseOpacity * 0.1 : baseOpacity;

    const color = isActive ? '#CEB676' : isSemanticConnection ? '#10B981' : '#065f46'; // Gold active, Emerald semantic, Dark Green structural

    return (
        <motion.path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={isSemanticConnection ? "2 4" : "0"} // Dotted for semantic
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
                pathLength: 1,
                opacity: opacity,
                strokeWidth: strokeWidth
            }}
            transition={{
                duration: 1.5,
                ease: "easeOut",
                opacity: { duration: 0.5 }
            }}
            style={{
                vectorEffect: "non-scaling-stroke",
                filter: isActive ? `drop-shadow(0 0 4px ${color}80)` : 'none'
            }}
        />
    );
};

/**
 * ORGANIC SPORE (Node)
 * Floating, glowing, interactive
 */
const OrganicSpore = ({
    node,
    isActive,
    onClick,
    isCalmMode,
    isFocused,
    isNeighbor,
    globalDimmed,
}: {
    node: MyceliumNode;
    isActive: boolean;
    onClick: () => void;
    isCalmMode: boolean;
    isFocused: boolean;
    isNeighbor: boolean;
    globalDimmed: boolean;
}) => {
    const [hovered, setHovered] = useState(false);

    // Position calculation
    const x = 50 + node.position[0] * 25;
    const y = 50 + node.position[1] * 25;
    const z = node.position[2]; // Depth 0.6 to 1.2 approx

    // Visual State
    const isHighlighted = isActive || isFocused || hovered;
    const isDimmed = globalDimmed && !isHighlighted;

    // Size & Scale
    const baseSize = node.size * 60; // Increased from 20 to 60 for better usability
    const depthScale = z; // Larger when closer (higher z)
    const scale = (isHighlighted ? 1.2 : 1.0) * depthScale;

    // Opacity based on depth and focus
    const opacity = isDimmed ? 0.2 : Math.min(1, z * 0.8 + 0.4); // More visible

    // Color & Glow
    const color = node.color;
    const glowSize = isHighlighted ? 30 : 10; // Larger glow
    const glowOpacity = isHighlighted ? 0.6 : 0.2;

    // Deterministic randomness based on node ID for animation params
    // This prevents hydration mismatch
    const seed = node.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const floatDuration = 4 + (seed % 30) / 10; // 4.0 to 7.0s
    const floatDelay = (seed % 20) / 10; // 0.0 to 2.0s

    return (
        <motion.div
            className="absolute flex items-center justify-center cursor-pointer"
            style={{
                left: `${x.toFixed(3)}%`,
                top: `${y.toFixed(3)}%`,
                width: baseSize,
                height: baseSize,
                zIndex: Math.floor(z * 100) + (isHighlighted ? 1000 : 0),
            }}
            animate={{
                scale: scale,
                opacity: opacity,
                y: [0, -8 * z, 0], // Floating effect based on depth
            }}
            transition={{
                y: {
                    duration: floatDuration,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: floatDelay,
                },
                scale: { type: "spring", stiffness: 300, damping: 20 },
                opacity: { duration: 0.3 }
            }}
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Core Dot */}
            <motion.div
                className="rounded-full border backdrop-blur-sm"
                style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: isHighlighted ? `${color}40` : `${color}10`,
                    borderColor: isHighlighted ? '#CEB676' : color,
                    borderWidth: isHighlighted ? 2 : 1,
                    boxShadow: `0 0 ${glowSize}px ${glowSize / 4}px ${color}${Math.floor(glowOpacity * 255).toString(16).padStart(2, '0')}`
                }}
            />

            {/* Inner Nucleus */}
            <div
                className="absolute rounded-full"
                style={{
                    width: '30%',
                    height: '30%',
                    backgroundColor: isHighlighted ? '#CEB676' : color,
                    opacity: 0.8
                }}
            />

            {/* Label (ALWAYS VISIBLE NOW) */}
            <motion.div
                className="absolute top-full mt-2 pointer-events-none z-50 w-48 flex justify-center"
                initial={{ opacity: 0.8 }}
                animate={{
                    opacity: isHighlighted ? 1 : 0.7,
                    scale: isHighlighted ? 1.1 : 1
                }}
            >
                <div className="flex flex-col items-center bg-mora-forest/80 backdrop-blur-sm border border-white/5 px-3 py-1.5 rounded-lg shadow-lg">
                    <span className="text-xs font-bold tracking-wider text-emerald-50 whitespace-normal text-center leading-tight">
                        {node.title}
                    </span>
                    {isHighlighted && (
                        <span className="text-[10px] text-emerald-400/70 uppercase tracking-widest mt-1">
                            {node.type}
                        </span>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

// --- MAIN COMPONENT ---

interface Mycelium25DProps {
    nodes: MyceliumNode[];
    onNodeClick?: (nodeId: string) => void;
    activeNodeId?: string | null;
    variant?: 'folder' | 'node';
}

export function Mycelium25D({
    nodes,
    onNodeClick,
    activeNodeId,
    variant = 'folder',
}: Mycelium25DProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

    // Calm Mode Logic
    const isCalmMode = nodes.length > CALM_MODE_THRESHOLD;

    // Mouse Tracking
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
        const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
        setMousePosition({ x, y });
    };

    // Connection Logic
    const connections = useMemo(() => {
        const conns: Array<{
            start: [number, number, number];
            end: [number, number, number];
            isActive: boolean;
            isSemanticConnection: boolean;
            depth: number;
            key: string;
        }> = [];

        const nodeMap = new Map(nodes.map(n => [n.id, n]));

        nodes.forEach(node => {
            node.connections.forEach(targetId => {
                const targetNode = nodeMap.get(targetId);
                // Avoid duplicate lines (A-B and B-A) by ID comparison
                if (targetNode && node.id < targetNode.id) {
                    const isActive = focusedNodeId === node.id || focusedNodeId === targetId || activeNodeId === node.id || activeNodeId === targetId;
                    const isSemantic = node.type !== targetNode.type; // Simple heuristic for semantic vs structural

                    // Filter in Calm Mode: Only show if active/focused or semantic
                    if (isCalmMode && !isActive && !isSemantic) return;

                    conns.push({
                        start: node.position,
                        end: targetNode.position,
                        isActive,
                        isSemanticConnection: isSemantic,
                        depth: (node.position[2] + targetNode.position[2]) / 2,
                        key: `${node.id}-${targetNode.id}`
                    });
                }
            });
        });
        return conns;
    }, [nodes, focusedNodeId, activeNodeId, isCalmMode]);

    if (nodes.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center text-emerald-500/30 text-sm font-mono">
                <div>∅ NO SPORES DETECTED</div>
            </div>
        );
    }

    // Camera / Pan Logic
    // Instead of re-calculating layout, we shift the view to center the active node
    const activeNode = nodes.find(n => n.id === activeNodeId);
    const panX = activeNode ? -(activeNode.position[0] * 25) : 0;
    const panY = activeNode ? -(activeNode.position[1] * 25) : 0;

    return (
        <div
            ref={containerRef}
            className="w-full h-full relative overflow-hidden bg-[#071C18]"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setFocusedNodeId(null)}
        >
            {/* Movable Container (Camera) */}
            <motion.div
                className="absolute inset-0 w-full h-full"
                animate={{
                    x: `${panX}%`,
                    y: `${panY}%`,
                }}
                transition={{
                    type: "spring",
                    stiffness: 50,
                    damping: 20
                }}
            >
                {/* Ambient Background Layers */}
                <div className="absolute inset-0 pointer-events-none opacity-40">
                    <div className="absolute top-[-20%] left-[-20%] w-[70%] h-[70%] bg-[#0f3d31] rounded-full blur-[120px] opacity-30" />
                    <div className="absolute bottom-[-20%] right-[-20%] w-[70%] h-[70%] bg-[#1c5d4b] rounded-full blur-[120px] opacity-30" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_0%,transparent_70%)]" />
                </div>

                {/* Connection Layer (SVG) */}
                <svg
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ zIndex: 5 }}
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                >
                    {connections.map((conn) => (
                        <OrganicHypha
                            key={conn.key}
                            start={conn.start}
                            end={conn.end}
                            isActive={conn.isActive}
                            isSemanticConnection={conn.isSemanticConnection}
                            depth={conn.depth}
                            globalDimmed={focusedNodeId !== null}
                        />
                    ))}
                </svg>

                {/* Node Layer */}
                <div className="absolute inset-0">
                    {nodes.map((node) => {
                        const isFocused = focusedNodeId === node.id;
                        const isNeighbor = focusedNodeId ? node.connections.includes(focusedNodeId) : false;
                        const globalDimmed = focusedNodeId !== null && !isFocused && !isNeighbor;

                        return (
                            <div
                                key={node.id}
                                onMouseEnter={() => setFocusedNodeId(node.id)}
                            >
                                <OrganicSpore
                                    node={node}
                                    isActive={activeNodeId === node.id}
                                    onClick={() => onNodeClick?.(node.id)}
                                    isCalmMode={isCalmMode}
                                    isFocused={isFocused}
                                    isNeighbor={isNeighbor}
                                    globalDimmed={globalDimmed}
                                />
                            </div>
                        );
                    })}
                </div>
            </motion.div>

            {/* UI Overlay Stats (Fixed position, outside camera) */}
            <div className="absolute bottom-4 left-4 text-[10px] text-emerald-500/30 font-mono tracking-widest pointer-events-none select-none">
                <div className="flex gap-4">
                    <span>MYCELIUM_NET :: {nodes.length} SPORES</span>
                    <span>{isCalmMode ? 'CALM_MODE' : 'FULL_VISIBILITY'}</span>
                </div>
            </div>
        </div>
    );
}
