"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CoreNode } from '@/lib/types/core';

interface NodeStarProps {
    node: CoreNode;
    position: { x: number | string; y: number | string };
    delay?: number;
    size?: 'xs' | 'sm';
    onHover?: (active: boolean) => void;
    onClick?: () => void;
    isPromoted?: boolean;
}

/**
 * NODE STAR COMPONENT (Represents a STAR / FILE)
 *
 * In the SAIMÔR Universe metaphor:
 * - STAR = Node (File, Note, Document)
 * - Orbiting a Moon (Space) OR floating freely
 *
 * Visuals:
 * - Tiny particles of knowledge
 * - Different colors based on node type
 * - Gentle twinkling animation
 * - Hover tooltip with Môra explanations
 */
export const NodeStar: React.FC<NodeStarProps> = ({
    node,
    position,
    delay = 0,
    size = 'xs',
    onHover,
    onClick,
    isPromoted = false
}) => {
    const [showTooltip, setShowTooltip] = useState(false);

    const sizeMap = {
        xs: { diameter: 6, glowSize: 18 }, // Stable, visible
        sm: { diameter: 10, glowSize: 26 }
    };

    const baseSize = sizeMap[size];
    const starSize = isPromoted
        ? { diameter: baseSize.diameter * 1.6, glowSize: baseSize.glowSize * 1.8 }
        : baseSize;

    // Color based on node type
    const getNodeColor = (type?: string) => {
        switch (type?.toLowerCase()) {
            case 'document': return '#10B981'; // Emerald
            case 'note': return '#3B82F6'; // Blue
            case 'link': return '#8B5CF6'; // Purple
            case 'folder': return '#F59E0B'; // Amber
            case 'image': return '#F59E0B'; // Amber
            case 'video': return '#EF4444'; // Red
            default: return '#6B7280'; // Gray
        }
    };

    const getNodeTypeLabel = (type?: string) => {
        switch (type?.toLowerCase()) {
            case 'document': return 'Dokument';
            case 'note': return 'Notiz';
            case 'link': return 'Link';
            case 'folder': return 'Ordner';
            case 'image': return 'Bild';
            case 'video': return 'Video';
            default: return 'Element';
        }
    };

    const color = getNodeColor(node.type);

    // Check for importance
    const tags: string[] = (node.metadata?.tags as string[]) || [];
    const isImportant =
        node.metadata?.is_pinned === true ||
        node.metadata?.is_important === true ||
        tags.some((tag: string) => ['important', 'urgent', 'priority'].includes(tag.toLowerCase()));

    // Generate Môra explanation for why node is here
    const getMoraExplanation = () => {
        if (isImportant) {
            return "⭐ Dieser Knoten ist als wichtig markiert und hat hohe semantische Verbindungen.";
        }
        if (tags.length >= 3) {
            return `🔗 Stark vernetzt durch ${tags.length} Themen.`;
        }
        if (node.metadata?.weight && (node.metadata.weight as number) > 0.7) {
            return "📈 Hohe Relevanz basierend auf Aktivität.";
        }
        return "📄 Datei im Wissensnetz";
    };

    const handleMouseEnter = () => {
        setShowTooltip(true);
        onHover?.(true);
    };

    const handleMouseLeave = () => {
        setShowTooltip(false);
        onHover?.(false);
    };

    const seed = (node.id?.charCodeAt(0) || 0) + (node.id?.charCodeAt(node.id.length - 1) || 0);
    const pulseDuration = isImportant ? 2.6 : 3.4 + (seed % 3);
    const baseOpacity = isImportant ? 0.95 : isPromoted ? 0.85 : 0.75;

    return (
        <motion.div
            className="absolute pointer-events-auto cursor-pointer"
            style={{
                left: position.x,
                top: position.y,
                transform: 'translate(-50%, -50%)',
                width: isImportant ? 30 : 20,
                height: isImportant ? 30 : 20,
                opacity: baseOpacity
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
                scale: isImportant ? [1, 1.04, 1] : isPromoted ? [1, 1.03, 1] : [1, 1.01, 1],
                opacity: baseOpacity
            }}
            transition={{
                delay,
                duration: pulseDuration,
                repeat: Infinity,
                ease: 'easeInOut'
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={onClick}
        >
            {/* Invisible Hit Area expansion for easier hovering */}
            <div className="absolute inset-0 -m-4 rounded-full z-10" />

            {/* Môra Tooltip - WHY is this node here? */}
            <AnimatePresence>
                {showTooltip && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 z-[100]"
                        style={{ pointerEvents: 'none' }}
                    >
                        <div className="bg-black/90 backdrop-blur-xl border border-emerald-500/30 rounded-xl px-4 py-3 shadow-xl min-w-[200px] max-w-[280px]">
                            {/* Node Title */}
                            <div className="text-sm font-medium text-emerald-50 mb-1 truncate">
                                {node.title || 'Unbekannter Knoten'}
                            </div>

                            {/* Type Badge */}
                            <div className="flex items-center gap-2 mb-2">
                                <span
                                    className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full"
                                    style={{
                                        backgroundColor: `${color}20`,
                                        color: color,
                                        border: `1px solid ${color}40`
                                    }}
                                >
                                    {getNodeTypeLabel(node.type)}
                                </span>
                                {isImportant && (
                                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-mora-gold/20 text-mora-gold border border-mora-gold/40">
                                        Wichtig
                                    </span>
                                )}
                            </div>

                            {/* Môra Explanation */}
                            <div className="text-xs text-emerald-400/80 italic border-t border-emerald-500/20 pt-2 mt-2">
                                {getMoraExplanation()}
                            </div>

                            {/* Tags */}
                            {tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {tags.slice(0, 4).map((tag, i) => (
                                        <span key={i} className="text-[9px] text-emerald-500/60 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                            #{tag}
                                        </span>
                                    ))}
                                    {tags.length > 4 && (
                                        <span className="text-[9px] text-white/40">+{tags.length - 4}</span>
                                    )}
                                </div>
                            )}

                            {/* Tooltip Arrow */}
                            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-emerald-500/30" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Importance Ring (Only for important nodes) */}
            {isImportant && !isPromoted && (
                <motion.div
                    className="absolute inset-0 rounded-full border border-white/10"
                    animate={{ scale: [1, 1.5], opacity: [0.3, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                />
            )}

            {/* Promoted Halo */}
            {isPromoted && (
                <motion.div
                    className="absolute inset-0 rounded-full border"
                    style={{ borderColor: `${color}80` }}
                    animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0.2, 0.5] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                />
            )}

            {/* Subtle Glow */}
            <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{
                    width: (isImportant ? starSize.glowSize * 2 : starSize.glowSize) * (isPromoted ? 1.2 : 1),
                    height: (isImportant ? starSize.glowSize * 2 : starSize.glowSize) * (isPromoted ? 1.2 : 1),
                    background: `radial-gradient(circle, ${color}${isPromoted ? '55' : (isImportant ? '40' : '20')}, transparent)`,
                    filter: 'blur(3px)',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)'
                }}
                animate={{
                    scale: isImportant ? [1, 1.5, 1] : [1, 1.3, 1],
                    opacity: isImportant ? [0.3, 0.6, 0.3] : [0.2, 0.4, 0.2]
                }}
                transition={{
                    duration: 4 + Math.random() * 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: Math.random() * 2
                }}
            />

            {/* Node Star Core */}
            <div
                className="relative rounded-full pointer-events-none"
                style={{
                    width: isImportant ? starSize.diameter * 1.5 : starSize.diameter,
                    height: isImportant ? starSize.diameter * 1.5 : starSize.diameter,
                    background: isImportant || isPromoted ? '#FFFFFF' : color,
                    boxShadow: isImportant
                        ? `0 0 10px #FFFFFF60, 0 0 5px ${color}`
                        : `0 0 ${starSize.diameter * 2}px ${color}60`,
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)'
                }}
            />
        </motion.div>
    );
};

export default NodeStar;



