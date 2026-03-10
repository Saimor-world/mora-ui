"use client";

/**
 * NODE STAR — Knowledge Particle (Layer 4: Deep Space)
 *
 * Glass micro-orb upgrade — nodes are tiny glowing stars in the knowledge field.
 * Type-chromatic glow, specular, portal hover card with Mora insight.
 * Promoted nodes = cross-sparkle + brighter halo.
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Link, StickyNote, Image as ImageIcon, Video, Folder, File, Star } from 'lucide-react';
import type { CoreNode } from '@/lib/types/core';
import type { LucideIcon } from 'lucide-react';

interface NodeStarProps {
    node: CoreNode;
    position: { x: number | string; y: number | string };
    delay?: number;
    size?: 'xs' | 'sm';
    onHover?: (active: boolean) => void;
    onClick?: () => void;
    isPromoted?: boolean;
}

// ── Type → color ─────────────────────────────────────────────────────────────
function getNodeColor(type?: string): string {
    switch (type?.toLowerCase()) {
        case 'document': return '#10B981'; // Emerald
        case 'note': return '#3B82F6'; // Blue
        case 'link': return '#8B5CF6'; // Purple
        case 'folder': return '#F59E0B'; // Amber
        case 'image': return '#EC4899'; // Pink
        case 'video': return '#EF4444'; // Red
        case 'audio': return '#06B6D4'; // Cyan
        default: return '#6B7280'; // Stone
    }
}

function getNodeIcon(type?: string): LucideIcon {
    switch (type?.toLowerCase()) {
        case 'document': return FileText;
        case 'note': return StickyNote;
        case 'link': return Link;
        case 'folder': return Folder;
        case 'image': return ImageIcon;
        case 'video': return Video;
        default: return File;
    }
}

function getNodeTypeLabel(type?: string): string {
    switch (type?.toLowerCase()) {
        case 'document': return 'Dokument';
        case 'note': return 'Notiz';
        case 'link': return 'Link';
        case 'folder': return 'Ordner';
        case 'image': return 'Bild';
        case 'video': return 'Video';
        case 'audio': return 'Audio';
        default: return 'Datei';
    }
}

// ── Size map ──────────────────────────────────────────────────────────────────
const SIZE_MAP = {
    xs: { diameter: 8, glowRadius: 14 },
    sm: { diameter: 12, glowRadius: 20 },
};

export const NodeStar: React.FC<NodeStarProps> = ({
    node,
    position,
    delay = 0,
    size = 'xs',
    onHover,
    onClick,
    isPromoted = false,
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const [showPortal, setShowPortal] = useState(false);
    const [portalPos, setPortalPos] = useState({ x: 0, y: 0 });
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => { setIsMounted(true); }, []);

    const color = getNodeColor(node.type);
    const Icon = getNodeIcon(node.type);
    const tags: string[] = (node.metadata?.tags as string[]) || [];
    const isImportant =
        node.metadata?.is_pinned === true ||
        node.metadata?.is_important === true ||
        tags.some((t: string) => ['important', 'urgent', 'priority'].includes(t.toLowerCase()));

    // Seed-based pseudo-random drift for twinkling
    const seed = (node.id?.charCodeAt(0) || 0) + (node.id?.charCodeAt((node.id?.length ?? 1) - 1) || 0);
    const pulseDuration = isImportant ? 2.2 : 3.0 + (seed % 4);

    const { diameter, glowRadius } = SIZE_MAP[size];
    const finalDiameter = isPromoted ? diameter * 1.7 : isImportant ? diameter * 1.5 : diameter;

    const handleMouseEnter = (e: React.MouseEvent) => {
        setIsHovered(true);
        onHover?.(true);
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setPortalPos({ x: rect.right + 10, y: rect.top + rect.height / 2 });
        setShowPortal(true);
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        onHover?.(false);
        setShowPortal(false);
    };

    // Mora insight label
    const getMoraInsight = () => {
        if (isImportant) return '⭐ Als wichtig markiert — hohe semantische Relevanz';
        if (tags.length >= 3) return `🔗 Stark vernetzt — ${tags.length} Themen`;
        if (node.metadata?.weight && (node.metadata.weight as number) > 0.7) return '📈 Hohe Aktivitätsrelevanz';
        return '📄 Wissenspunkt';
    };

    return (
        <motion.div
            className="absolute pointer-events-auto cursor-pointer"
            style={{
                left: position.x,
                top: position.y,
                transform: 'translate(-50%, -50%)',
                width: finalDiameter + 16,
                height: finalDiameter + 16,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
                scale: isHovered ? 1.06 : 1,
                opacity: isImportant ? 1 : isPromoted ? 0.92 : 0.82,
            }}
            transition={{
                delay,
                duration: 0.18,
                ease: 'easeOut',
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={onClick}
        >
            {/* ── Atmospheric glow ─── */}
            <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{
                    width: glowRadius * (isPromoted ? 2.2 : isImportant ? 2.0 : 1.6),
                    height: glowRadius * (isPromoted ? 2.2 : isImportant ? 2.0 : 1.6),
                    background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
                    filter: 'blur(4px)',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                }}
                animate={{
                    opacity: isHovered ? 0.65 : isImportant ? 0.45 : isPromoted ? 0.35 : 0.22,
                    scale: isHovered ? 1.4 : 1,
                }}
                transition={{ duration: 0.3 }}
            />

            {/* ── Promoted: cross-sparkle ─── */}
            {(isPromoted || isImportant) && (
                <>
                    {/* Horizontal bar */}
                    <motion.div
                        className="absolute rounded-full pointer-events-none"
                        style={{
                            width: finalDiameter * 2.5,
                            height: 1,
                            background: `linear-gradient(90deg, transparent, ${color}80, transparent)`,
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                        }}
                        animate={{ opacity: isHovered ? 0.6 : 0.35, scaleX: isHovered ? 1.05 : 1 }}
                        transition={{ duration: 0.2 }}
                    />
                    {/* Vertical bar */}
                    <motion.div
                        className="absolute rounded-full pointer-events-none"
                        style={{
                            width: 1,
                            height: finalDiameter * 2.5,
                            background: `linear-gradient(180deg, transparent, ${color}80, transparent)`,
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                        }}
                        animate={{ opacity: isHovered ? 0.6 : 0.35, scaleY: isHovered ? 1.05 : 1 }}
                        transition={{ duration: 0.2 }}
                    />
                </>
            )}

            {/* ── Importance ripple ring ─── */}
            {isImportant && (
                <motion.div
                    className="absolute rounded-full border pointer-events-none"
                    style={{
                        width: finalDiameter + 8,
                        height: finalDiameter + 8,
                        borderColor: `${color}60`,
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                    }}
                    animate={{ scale: isHovered ? 1.22 : 1.08, opacity: isHovered ? 0.45 : 0.22 }}
                    transition={{ duration: 0.2 }}
                />
            )}

            {/* ── Glass micro-orb core ─── */}
            <motion.div
                className="absolute rounded-full pointer-events-none overflow-hidden"
                style={{
                    width: finalDiameter,
                    height: finalDiameter,
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: isHovered || isImportant || isPromoted
                        ? `radial-gradient(140% 140% at 28% 28%, rgba(255,255,255,0.25) 0%, ${color}55 50%, rgba(0,0,0,0.2) 100%)`
                        : `radial-gradient(140% 140% at 28% 28%, rgba(255,255,255,0.12) 0%, ${color}33 50%, rgba(0,0,0,0.15) 100%)`,
                    boxShadow: isHovered
                        ? `0 0 12px ${color}90, inset 1px 1px 2px rgba(255,255,255,0.4)`
                        : isImportant
                            ? `0 0 8px ${color}70, inset 1px 1px 1px rgba(255,255,255,0.25)`
                            : `0 0 4px ${color}50, inset 0.5px 0.5px 1px rgba(255,255,255,0.15)`,
                    border: `0.5px solid ${color}40`,
                    transition: 'all 0.25s ease',
                }}
            >
                {/* Specular micro-highlight */}
                <div
                    className="absolute bg-white rounded-full opacity-70"
                    style={{
                        width: '28%',
                        height: '14%',
                        top: '18%',
                        left: '18%',
                        filter: 'blur(0.5px)',
                        transform: 'rotate(-45deg)',
                    }}
                />
            </motion.div>

            {/* ── Hover particles ─── */}
            {isHovered && (
                <div className="absolute inset-0 pointer-events-none">
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            className="absolute rounded-full"
                            style={{
                                width: 2,
                                height: 2,
                                backgroundColor: color,
                                left: '50%',
                                top: '50%',
                            }}
                            initial={{ x: 0, y: 0, opacity: 0 }}
                            animate={{
                                x: [0, ((seed * (i + 1)) % 24) - 12],
                                y: [0, ((seed * (i + 2)) % 24) - 12],
                                opacity: [0, 0.9, 0],
                                scale: [0, 1.5, 0],
                            }}
                            transition={{ duration: 0.7, delay: i * 0.08 }}
                        />
                    ))}
                </div>
            )}

            {/* ── Portal hover card ────────────────────────────────────────── */}
            {isMounted && showPortal && createPortal(
                <AnimatePresence>
                    <motion.div
                        key={`node-portal-${node.id}`}
                        initial={{ opacity: 0, x: -6, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -6, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 460, damping: 28 }}
                        className="fixed z-[9999] pointer-events-none"
                        style={{ left: portalPos.x, top: portalPos.y, transform: 'translateY(-50%)' }}
                    >
                        <div
                            className="relative px-3.5 py-2.5 rounded-xl backdrop-blur-xl border border-white/15 shadow-xl min-w-[180px] max-w-[260px]"
                            style={{
                                background: 'linear-gradient(135deg, rgba(0,0,0,0.80) 0%, rgba(10,14,20,0.92) 100%)',
                                boxShadow: `0 8px 28px rgba(0,0,0,0.55), 0 0 20px ${color}12, inset 0 1px 0 rgba(255,255,255,0.07)`,
                            }}
                        >
                            {/* Type accent bar */}
                            <div
                                className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full"
                                style={{ background: `linear-gradient(180deg, ${color}, ${color}30)` }}
                            />
                            <div className="ml-3">
                                {/* Title */}
                                <p className="text-xs font-semibold text-white/90 mb-1.5 truncate leading-tight">
                                    {node.title || node.name || 'Unbekannt'}
                                </p>
                                {/* Type badge */}
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span
                                        className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1"
                                        style={{
                                            backgroundColor: `${color}18`,
                                            color,
                                            border: `1px solid ${color}35`,
                                        }}
                                    >
                                        <Icon size={8} />
                                        {getNodeTypeLabel(node.type)}
                                    </span>
                                    {isImportant && (
                                        <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                                            <Star size={7} />
                                            Wichtig
                                        </span>
                                    )}
                                </div>
                                {/* Mora insight */}
                                <p className="text-[10px] text-white/40 italic border-t border-white/8 pt-1.5">
                                    {getMoraInsight()}
                                </p>
                                {/* Tags */}
                                {tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                        {tags.slice(0, 3).map((tag, i) => (
                                            <span key={i} className="text-[8px] text-white/35 bg-white/5 px-1.5 py-0.5 rounded">
                                                #{tag}
                                            </span>
                                        ))}
                                        {tags.length > 3 && (
                                            <span className="text-[8px] text-white/25">+{tags.length - 3}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                            {/* Arrow */}
                            <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2"
                                style={{ width: 0, height: 0, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderRight: '4px solid rgba(255,255,255,0.08)' }}
                            />
                        </div>
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}
        </motion.div>
    );
};

export default NodeStar;
