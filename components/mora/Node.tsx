"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Image, Video, Music, Archive, Link, MessageSquare, CheckSquare } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface NodeProps {
    /** Node data */
    node: {
        id: string;
        title: string;
        folder_id?: string;
        content_type?: string;
        type?: 'link' | 'document' | 'note' | 'task' | 'other';
        color?: string;
        description?: string;
        relations_count?: number;
    };
    /** Node position relative to folder */
    position: { x: number; y: number };
    /** Animation delay */
    delay?: number;
    /** Is this node currently active/selected */
    isActive?: boolean;
    /** Node size variation */
    size?: 'xs' | 'sm';
    /** Enable mycelium animation */
    myceliumActive?: boolean;
    /** Click handler */
    onClick?: () => void;
    /** Hover handler */
    onHover?: (hovered: boolean) => void;
}

/**
 * NODE COMPONENT — MASTERBIBEL COMPLIANT
 *
 * Knowledge nodes as mycelium connections in the neural network.
 * Connected entities showing relationships and content flow.
 *
 * MASTERBIBEL 4.2.1: "Nodes appear as connected mycelium points in knowledge networks"
 */
export const KnowledgeNode: React.FC<NodeProps> = ({
    node,
    position,
    delay = 0,
    isActive = false,
    size = 'xs',
    myceliumActive = false,
    onClick,
    onHover
}) => {
    // Node size mapping
    const sizeMap = {
        xs: { diameter: 8, iconSize: 6 },
        sm: { diameter: 12, iconSize: 8 }
    };

    const nodeSize = sizeMap[size];

    // Node type icon mapping
    const getNodeIcon = (type?: string): LucideIcon => {
        switch (type) {
            case 'document': return FileText;
            case 'image': return Image;
            case 'video': return Video;
            case 'audio': return Music;
            case 'archive': return Archive;
            case 'link': return Link;
            case 'note': return MessageSquare;
            case 'task': return CheckSquare;
            default: return FileText;
        }
    };

    const Icon = getNodeIcon(node.type);

    // Node visual properties
    const nodeColor = node.color || '#8B5CF6'; // Default purple for knowledge nodes
    const glowColor = isActive ? '#8B5CF6' : nodeColor;

    // Neural activity based on relations
    const neuralIntensity = Math.min((node.relations_count || 0) / 5, 1);

    return (
        <motion.div
            className="absolute cursor-pointer group"
            style={{
                left: position.x,
                top: position.y,
                transform: 'translate(-50%, -50%)'
            }}
            initial={{ scale: 0, opacity: 0, rotate: 180 }}
            animate={{
                scale: 1,
                opacity: 0.8,
                rotate: 0,
                x: myceliumActive ? [0, 2, 0, -2, 0] : 0,
                y: myceliumActive ? [0, -1, 0, 1, 0] : 0
            }}
            transition={{
                delay,
                type: 'spring',
                stiffness: 500,
                damping: 40,
                x: myceliumActive ? {
                    duration: 4,
                    repeat: Infinity,
                    ease: 'easeInOut'
                } : undefined,
                y: myceliumActive ? {
                    duration: 4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 0.2
                } : undefined
            }}
            whileHover={{ scale: 1.5, opacity: 1 }}
            whileTap={{ scale: 0.7 }}
            onClick={onClick}
            onMouseEnter={() => onHover?.(true)}
            onMouseLeave={() => onHover?.(false)}
        >
            {/* Node Core */}
            <motion.div
                className="relative rounded-full flex items-center justify-center backdrop-blur-sm border"
                style={{
                    width: nodeSize.diameter,
                    height: nodeSize.diameter,
                    backgroundColor: `${nodeColor}30`,
                    borderColor: isActive ? `${glowColor}90` : `${nodeColor}60`
                }}
                animate={isActive ? {
                    boxShadow: [
                        `0 0 8px ${glowColor}60`,
                        `0 0 16px ${glowColor}90`,
                        `0 0 8px ${glowColor}60`
                    ]
                } : {}}
                transition={{
                    duration: 1.5,
                    repeat: isActive ? Infinity : 0,
                    ease: 'easeInOut'
                }}
            >
                {/* Node Icon */}
                <Icon
                    size={nodeSize.iconSize}
                    className={`relative z-10 ${isActive ? 'text-white' : 'text-purple-400'}`}
                    style={{ color: isActive ? undefined : nodeColor }}
                />
            </motion.div>

            {/* Mycelium Neural Network (connection points) */}
            {neuralIntensity > 0 && (
                <motion.div
                    className="absolute inset-0"
                    animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.3, 0.6, 0.3]
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: delay
                    }}
                >
                    {/* Neural connection points */}
                    {Array.from({ length: 4 }, (_, i) => {
                        const angle = (i / 4) * 2 * Math.PI;
                        const distance = nodeSize.diameter * 0.8;
                        return (
                            <motion.div
                                key={i}
                                className="absolute w-1 h-1 rounded-full"
                                style={{
                                    backgroundColor: nodeColor,
                                    left: distance * Math.cos(angle) + nodeSize.diameter / 2 - 2,
                                    top: distance * Math.sin(angle) + nodeSize.diameter / 2 - 2,
                                    boxShadow: `0 0 2px ${nodeColor}80`
                                }}
                                animate={{
                                    scale: [0.5, 1, 0.5],
                                    opacity: [0.3, 0.8, 0.3]
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    delay: i * 0.2,
                                    ease: 'easeInOut'
                                }}
                            />
                        );
                    })}
                </motion.div>
            )}

            {/* Node Label (appears on hover) */}
            <motion.div
                className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                initial={{ y: 5 }}
                animate={{ y: 0 }}
            >
                <div className="bg-black/80 backdrop-blur-sm px-2 py-1 rounded-lg border border-purple-500/30 max-w-24">
                    <div className="text-xs text-white font-medium whitespace-nowrap truncate">
                        {node.title}
                    </div>
                    {node.description && (
                        <div className="text-[9px] text-purple-200/70 mt-0.5 truncate">
                            {node.description}
                        </div>
                    )}
                    {node.relations_count && node.relations_count > 0 && (
                        <div className="text-[8px] text-purple-300/50 mt-0.5">
                            {node.relations_count} links
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Mycelium Trail Effect */}
            <motion.div
                className="absolute inset-0 rounded-full pointer-events-none opacity-30"
                animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.1, 0.3, 0.1]
                }}
                transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: delay
                }}
                style={{
                    background: `radial-gradient(circle, ${nodeColor}40, transparent 70%)`,
                    filter: 'blur(3px)'
                }}
            />
        </motion.div>
    );
};

export default KnowledgeNode;
