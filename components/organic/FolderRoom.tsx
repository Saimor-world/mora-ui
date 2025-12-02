"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Image as ImageIcon, Link as LinkIcon, CheckSquare, Box, Folder } from 'lucide-react';

// --- TYPES ---
export interface RoomItem {
    id: string;
    title: string;
    type: 'document' | 'image' | 'link' | 'task' | 'folder' | 'other';
    color?: string;
}

interface FolderRoomProps {
    isOpen: boolean;
    folderTitle: string;
    items: RoomItem[];
    onClose: () => void;
    onItemClick?: (id: string) => void;
}

// --- ICONS MAPPING ---
const TYPE_ICONS = {
    document: FileText,
    image: ImageIcon,
    link: LinkIcon,
    task: CheckSquare,
    folder: Folder,
    other: Box
};

const TYPE_COLORS = {
    document: 'text-emerald-400',
    image: 'text-purple-400',
    link: 'text-blue-400',
    task: 'text-amber-400',
    folder: 'text-white',
    other: 'text-gray-400'
};

/**
 * FOLDER ROOM (Calm OS)
 * The "inside" of a folder.
 * Visual Style: Apple Watch Grid / Premium Tile View.
 * Behavior: Modal-like overlay, but feels like entering a space.
 */
export function FolderRoom({
    isOpen,
    folderTitle,
    items,
    onClose,
    onItemClick
}: FolderRoomProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 z-50 flex items-center justify-center"
                >
                    {/* BACKDROP (Click to close) */}
                    <div
                        className="absolute inset-0 bg-[#050505]/60 backdrop-blur-md"
                        onClick={onClose}
                    />

                    {/* ROOM CONTAINER */}
                    <motion.div
                        initial={{ scale: 0.9, y: 20, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.9, y: 20, opacity: 0 }}
                        transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 30
                        }}
                        className="relative w-[800px] max-w-[90vw] h-[600px] max-h-[80vh] bg-[#0A0A0A]/90 border border-white/10 rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
                    >
                        {/* HEADER */}
                        <div className="flex justify-between items-center p-8 pb-4 border-b border-white/5">
                            <div>
                                <h2 className="text-3xl font-light text-white tracking-tight">{folderTitle}</h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
                                    <span className="text-white/40 text-xs font-mono uppercase tracking-widest">
                                        Folder Room • {items.length} Items
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 transition-colors group"
                            >
                                <span className="group-hover:text-white transition-colors">✕</span>
                            </button>
                        </div>

                        {/* CONTENT GRID (Apple Watch Style) */}
                        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                            {items.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-white/20 border-2 border-dashed border-white/5 rounded-2xl">
                                    <span className="text-5xl mb-4 opacity-50 font-thin">∅</span>
                                    <span className="font-mono text-xs tracking-widest">NO SPORES DETECTED</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-4 md:grid-cols-5 gap-6">
                                    {items.map((item) => {
                                        const Icon = TYPE_ICONS[item.type] || Box;
                                        const colorClass = TYPE_COLORS[item.type] || 'text-gray-400';

                                        return (
                                            <motion.button
                                                key={item.id}
                                                layoutId={`item-${item.id}`}
                                                onClick={() => onItemClick?.(item.id)}
                                                className="group flex flex-col items-center gap-3 p-4 rounded-2xl hover:bg-white/5 transition-colors"
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                {/* ICON BUBBLE */}
                                                <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-white/5 to-white/0 border border-white/10 flex items-center justify-center shadow-lg group-hover:shadow-emerald-900/20 group-hover:border-emerald-500/30 transition-all ${colorClass}`}>
                                                    <Icon size={28} strokeWidth={1.5} />
                                                </div>

                                                {/* LABEL */}
                                                <span className="text-xs text-white/60 text-center font-medium leading-tight line-clamp-2 group-hover:text-white transition-colors max-w-[100px]">
                                                    {item.title}
                                                </span>
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* FOOTER / STATUS */}
                        <div className="p-4 border-t border-white/5 bg-black/20 text-center">
                            <span className="text-[10px] text-white/20 font-mono uppercase tracking-[0.2em]">
                                MÔRA CONTEXT ACTIVE
                            </span>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
