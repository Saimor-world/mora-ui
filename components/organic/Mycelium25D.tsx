import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MyceliumNode } from '@/lib/utils/myceliumDataMapper';
import { setLearning } from '@/lib/mora/awarenessController';

// --- CONFIGURATION ---
const IDLE_BREATH_DURATION = 6;
const CALM_MODE_THRESHOLD = 20; // Increased slightly
const SCALE = 22;
const CAMERA_DAMPING = 25;
const CAMERA_STIFFNESS = 40;

// --- SUB-COMPONENTS ---

/**
 * AMBIENT DUST
 * Optimized floating particles
 */
const AmbientDust = React.memo(({ count = 15 }: { count?: number }) => {
    const particles = useMemo(() => Array.from({ length: count }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 0.5,
        duration: Math.random() * 15 + 15,
        delay: Math.random() * 5
    })), [count]);

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {particles.map(p => (
                <motion.div
                    key={p.id}
                    className="absolute rounded-full bg-emerald-500/10"
                    style={{
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        width: p.size,
                        height: p.size,
                    }}
                    animate={{
                        y: [0, -100, 0],
                        opacity: [0, 0.2, 0],
                    }}
                    transition={{
                        duration: p.duration,
                        repeat: Infinity,
                        ease: "linear",
                        delay: p.delay
                    }}
                />
            ))}
        </div>
    );
});
AmbientDust.displayName = 'AmbientDust';

/**
 * ORGANIC HYPHA (Connection Line)
 * Unified visual style across all levels
 */
const OrganicHypha = React.memo(({
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
    const startX = 50 + start[0] * SCALE;
    const startY = 50 + start[1] * SCALE;
    const endX = 50 + end[0] * SCALE;
    const endY = 50 + end[1] * SCALE;

    // Deterministic randomness for curve
    const seed = Math.abs((startX + endX + startY + endY) * 100);
    const pseudoRandom = (seed % 100) / 100;

    // Organic curve - less intense for semantic to keep it clean
    const curveIntensity = isSemanticConnection ? 2 : 5;
    const midX = (startX + endX) / 2 + (pseudoRandom - 0.5) * curveIntensity;
    const midY = (startY + endY) / 2 + ((seed * 13 % 100) / 100 - 0.5) * curveIntensity;

    const pathD = `M ${startX.toFixed(2)} ${startY.toFixed(2)} Q ${midX.toFixed(2)} ${midY.toFixed(2)} ${endX.toFixed(2)} ${endY.toFixed(2)}`;

    // Unified Style
    const strokeWidth = isActive ? 1.5 : isSemanticConnection ? 0.6 : 0.8;
    const baseOpacity = isActive ? 0.8 : isSemanticConnection ? 0.2 : 0.12;
    const opacity = globalDimmed && !isActive ? baseOpacity * 0.1 : baseOpacity;
    const color = isActive ? '#CEB676' : isSemanticConnection ? '#10B981' : '#065f46';

    return (
        <motion.path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={isSemanticConnection ? "2 4" : "0"}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
                pathLength: 1,
                opacity: opacity,
                strokeWidth: strokeWidth
            }}
            transition={{
                duration: 1.5,
                ease: "easeOut"
            }}
            style={{
                vectorEffect: "non-scaling-stroke",
                filter: isActive ? `drop-shadow(0 0 4px ${color}40)` : 'none'
            }}
        />
    );
});
OrganicHypha.displayName = 'OrganicHypha';

/**
 * ORGANIC SPORE (Node)
 * Unified physics and interaction
 */
const OrganicSpore = React.memo(({
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

    // Position with Jitter to prevent stacking
    // We use the node ID to generate a deterministic jitter
    const seed = node.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const jitterX = ((seed % 100) / 100 - 0.5) * 0.5; // Small offset
    const jitterY = ((seed * 13 % 100) / 100 - 0.5) * 0.5;

    const x = 50 + (node.position[0] * SCALE) + jitterX;
    const y = 50 + (node.position[1] * SCALE) + jitterY;
    const z = node.position[2];

    // Visual State
    const isHighlighted = isActive || isFocused || hovered;
    const isDimmed = globalDimmed && !isHighlighted;

    // Size & Scale
    const baseSize = Math.max(node.size * 50, 10); // Normalized size
    const scale = (isHighlighted ? 1.2 : 1.0) * z;
    const opacity = isDimmed ? 0.1 : Math.min(1, z * 0.7 + 0.3);

    // Color
    const color = node.color;
    const glowOpacity = isHighlighted ? 0.4 : 0.05;

    // Animation Params
    const floatDuration = 6 + (seed % 40) / 10;
    const floatDelay = (seed % 20) / 10;

    return (
        <motion.div
            className="absolute flex items-center justify-center cursor-pointer"
            style={{
                left: `${x.toFixed(2)}%`,
                top: `${y.toFixed(2)}%`,
                width: baseSize,
                height: baseSize,
                zIndex: Math.floor(z * 100) + (isHighlighted ? 1000 : 0),
            }}
            animate={{
                scale: scale,
                opacity: opacity,
                y: [0, -8 * z, 0], // Reduced float range for calmness
            }}
            transition={{
                y: {
                    duration: floatDuration,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: floatDelay,
                },
                scale: { type: "spring", stiffness: 200, damping: 25 },
                opacity: { duration: 0.3 }
            }}
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Core Shell */}
            <motion.div
                className="rounded-full border backdrop-blur-[1px]"
                style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: isHighlighted ? `${color}30` : `${color}05`,
                    borderColor: isHighlighted ? '#CEB676' : color,
                    borderWidth: isHighlighted ? 1.5 : 1,
                    boxShadow: `0 0 ${isHighlighted ? 30 : 10}px ${color}${Math.floor(glowOpacity * 255).toString(16).padStart(2, '0')}`
                }}
            />

            {/* Nucleus (Breathing) */}
            <motion.div
                className="absolute rounded-full"
                animate={{
                    scale: [0.85, 1, 0.85],
                }}
                transition={{
                    duration: IDLE_BREATH_DURATION,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: floatDelay
                }}
                style={{
                    width: '40%',
                    height: '40%',
                    backgroundColor: isHighlighted ? '#CEB676' : color,
                    opacity: 0.8
                }}
            />

            {/* Label - Only show if highlighted or close/large enough */}
            <AnimatePresence>
                {(isHighlighted || (!isCalmMode && z > 0.8 && node.size > 0.3)) && (
                    <motion.div
                        className="absolute top-full mt-2 pointer-events-none z-50 w-40 flex justify-center"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className="flex flex-col items-center bg-[#050a08]/80 backdrop-blur-sm border border-white/5 px-2 py-1 rounded shadow-xl">
                            <span className="text-[10px] font-medium tracking-wide text-emerald-50 whitespace-normal text-center leading-tight truncate max-w-full">
                                {node.title}
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
});
OrganicSpore.displayName = 'OrganicSpore';

// --- MAIN COMPONENT ---

interface Mycelium25DProps {
    nodes?: MyceliumNode[];
    onNodeClick?: (nodeId: string) => void;
    activeNodeId?: string | null;
    variant?: 'folder' | 'node' | 'department';
}

export function Mycelium25D({
    nodes = [],
    onNodeClick,
    activeNodeId,
    variant = 'folder',
}: Mycelium25DProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

    // Defensive default
    const safeNodes = useMemo(() => Array.isArray(nodes) ? nodes : [], [nodes]);
    const isCalmMode = safeNodes.length > CALM_MODE_THRESHOLD;

    // Awareness: Trigger learning state when nodes are being loaded/rendered
    useEffect(() => {
        if (safeNodes.length > 0) {
            setLearning();
        }
    }, [safeNodes.length]);

    // Mouse Tracking (Throttled via RequestAnimationFrame ideally, but simple state is okay for low freq)
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        // Normalize -1 to 1
        const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
        const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
        setMousePosition({ x, y });
    };

    // Connection Logic - Memoized for performance
    const connections = useMemo(() => {
        if (safeNodes.length === 0) return [];

        const conns: Array<{
            start: [number, number, number];
            end: [number, number, number];
            isActive: boolean;
            isSemanticConnection: boolean;
            depth: number;
            key: string;
        }> = [];

        const nodeMap = new Map(safeNodes.map(n => [n.id, n]));

        safeNodes.forEach(node => {
            if (!node.connections) return;

            node.connections.forEach(targetId => {
                const targetNode = nodeMap.get(targetId);
                // Ensure unique edges (id < targetId) and target exists
                if (targetNode && node.id < targetNode.id) {
                    const isActive = focusedNodeId === node.id || focusedNodeId === targetId || activeNodeId === node.id || activeNodeId === targetId;
                    const isSemantic = node.type !== targetNode.type;

                    // Calm Mode: Hide non-active, non-semantic connections
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

        // Fallback ring if no connections exist (prevents floating dots)
        if (conns.length === 0 && safeNodes.length > 1) {
            safeNodes.forEach((node, idx) => {
                const next = safeNodes[(idx + 1) % safeNodes.length];
                conns.push({
                    start: node.position,
                    end: next.position,
                    isActive: false,
                    isSemanticConnection: false,
                    depth: (node.position[2] + next.position[2]) / 2,
                    key: `ring-${node.id}-${next.id}`
                });
            });
        }
        return conns;
    }, [safeNodes, focusedNodeId, activeNodeId, isCalmMode]);

    if (safeNodes.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center text-emerald-500/30 text-xs font-mono tracking-widest">
                <div>∅ NO SPORES DETECTED</div>
            </div>
        );
    }

    // Camera Logic - Center on active node
    const activeNode = safeNodes.find(n => n.id === activeNodeId);
    // If no active node, center on (0,0)
    const panX = activeNode ? -(activeNode.position[0] * SCALE) : 0;
    const panY = activeNode ? -(activeNode.position[1] * SCALE) : 0;

    // Parallax Offset - Subtle
    const parallaxX = mousePosition.x * -1.5;
    const parallaxY = mousePosition.y * -1.5;

    return (
        <div
            ref={containerRef}
            className="w-full h-full relative overflow-hidden bg-[#030806] select-none"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setFocusedNodeId(null)}
        >
            <AmbientDust count={isCalmMode ? 10 : 20} />

            {/* Movable Container (Camera) */}
            <motion.div
                className="absolute inset-0 w-full h-full"
                animate={{
                    x: `calc(${panX}% + ${parallaxX}px)`,
                    y: `calc(${panY}% + ${parallaxY}px)`,
                }}
                transition={{
                    type: "spring",
                    stiffness: CAMERA_STIFFNESS,
                    damping: CAMERA_DAMPING,
                    mass: 1
                }}
            >
                {/* Deep Background Glow */}
                <div className="absolute inset-0 pointer-events-none opacity-20">
                    <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,#10b98110_0%,transparent_60%)]" />
                </div>

                {/* Connection Layer */}
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
                    {safeNodes.map((node) => {
                        const isFocused = focusedNodeId === node.id;
                        const isNeighbor = focusedNodeId ? node.connections?.includes(focusedNodeId) : false;
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

            {/* UI Overlay Stats */}
            <div className="absolute bottom-6 left-6 text-[9px] text-emerald-500/20 font-mono tracking-widest pointer-events-none select-none flex gap-4">
                <span>NET :: {safeNodes.length}</span>
                <span className={isCalmMode ? "text-emerald-400/40" : ""}>
                    {isCalmMode ? 'CALM_MODE' : 'FULL_VIS'}
                </span>
                {/* Môra Micro-Hint */}
                {connections.length === 0 && safeNodes.length > 0 && (
                    <span className="text-mora-gold/30">
                        • MÔRA: No connections detected
                    </span>
                )}
                {connections.length > 0 && !isCalmMode && (
                    <span className="text-mora-gold/30">
                        • MÔRA: {connections.length} links active
                    </span>
                )}
            </div>
        </div>
    );
}
