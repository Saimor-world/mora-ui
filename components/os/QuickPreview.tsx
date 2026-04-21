"use client";

/**
 * QUICK PREVIEW / QUICK LOOK
 *
 * macOS-style preview system for files and nodes.
 * Features:
 * - Space bar to preview selected item
 * - Escape to close
 * - Arrow keys to navigate between items
 * - Supports: Documents, Notes, Images, Folders
 * - Animated transitions
 *
 * @since 2026-02-07
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    FileText,
    Folder,
    Image as ImageIcon,
    FileCode,
    File,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    Download,
    Maximize2
} from 'lucide-react';
import { create } from 'zustand';
import { usePaneStore } from '@/lib/store/paneStore';
import { coreGet } from '@/lib/api/coreClient';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface PreviewableItem {
    id: string;
    type: 'document' | 'note' | 'folder' | 'image' | 'file' | 'node';
    name: string;
    content?: string;
    url?: string;
    metadata?: {
        size?: number;
        created_at?: string;
        updated_at?: string;
        mime_type?: string;
        children_count?: number;
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// QUICK PREVIEW STORE
// ═══════════════════════════════════════════════════════════════════════════

interface QuickPreviewState {
    isOpen: boolean;
    currentItem: PreviewableItem | null;
    items: PreviewableItem[]; // For navigation
    currentIndex: number;
    isLoading: boolean;

    // Actions
    open: (item: PreviewableItem, allItems?: PreviewableItem[]) => void;
    close: () => void;
    next: () => void;
    previous: () => void;
    setLoading: (loading: boolean) => void;
}

export const useQuickPreviewStore = create<QuickPreviewState>((set, get) => ({
    isOpen: false,
    currentItem: null,
    items: [],
    currentIndex: 0,
    isLoading: false,

    open: (item, allItems = []) => {
        const items = allItems.length > 0 ? allItems : [item];
        const index = items.findIndex(i => i.id === item.id);

        set({
            isOpen: true,
            currentItem: item,
            items,
            currentIndex: index >= 0 ? index : 0,
            isLoading: false
        });
    },

    close: () => {
        set({
            isOpen: false,
            currentItem: null,
            items: [],
            currentIndex: 0
        });
    },

    next: () => {
        const state = get();
        if (state.items.length <= 1) return;

        const nextIndex = (state.currentIndex + 1) % state.items.length;
        set({
            currentIndex: nextIndex,
            currentItem: state.items[nextIndex]
        });
    },

    previous: () => {
        const state = get();
        if (state.items.length <= 1) return;

        const prevIndex = (state.currentIndex - 1 + state.items.length) % state.items.length;
        set({
            currentIndex: prevIndex,
            currentItem: state.items[prevIndex]
        });
    },

    setLoading: (loading) => {
        set({ isLoading: loading });
    }
}));

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

const getItemIcon = (type: string) => {
    switch (type) {
        case 'document': return FileText;
        case 'note': return FileText;
        case 'folder': return Folder;
        case 'image': return ImageIcon;
        case 'file': return File;
        default: return FileCode;
    }
};

const getItemColor = (type: string) => {
    switch (type) {
        case 'document': return 'blue';
        case 'note': return 'yellow';
        case 'folder': return 'emerald';
        case 'image': return 'pink';
        default: return 'white';
    }
};

const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// ═══════════════════════════════════════════════════════════════════════════
// PREVIEW CONTENT RENDERERS
// ═══════════════════════════════════════════════════════════════════════════

const DocumentPreview: React.FC<{ item: PreviewableItem }> = ({ item }) => {
    return (
        <div className="h-full overflow-auto p-6">
            <div className="max-w-2xl mx-auto">
                <h2 className="text-xl font-light text-white mb-4">{item.name}</h2>
                {item.content ? (
                    <div className="prose prose-invert prose-sm max-w-none">
                        <pre className="whitespace-pre-wrap text-white/70 font-sans text-sm leading-relaxed">
                            {item.content}
                        </pre>
                    </div>
                ) : (
                    <div className="text-center py-12 text-white/30">
                        <FileText size={48} className="mx-auto mb-4 opacity-30" />
                        <p>Keine Vorschau verfügbar</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const FolderPreview: React.FC<{ item: PreviewableItem }> = ({ item }) => {
    const [children, setChildren] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadChildren = async () => {
            setLoading(true);
            try {
                const data = await coreGet(`/v3/nodes?parent_id=${item.id}&limit=20`, { isOptional: true });
                if (data && Array.isArray(data)) {
                    setChildren(data);
                }
            } catch (e) {
                console.error('Failed to load folder children', e);
            } finally {
                setLoading(false);
            }
        };
        loadChildren();
    }, [item.id]);

    return (
        <div className="h-full overflow-auto p-6">
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                        <Folder size={24} className="text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-light text-white">{item.name}</h2>
                        <p className="text-xs text-white/40">
                            {item.metadata?.children_count || children.length} Elemente
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-8 text-white/30">
                        Lade Inhalt...
                    </div>
                ) : children.length === 0 ? (
                    <div className="text-center py-8 text-white/30">
                        <Folder size={32} className="mx-auto mb-2 opacity-30" />
                        <p>Leerer Ordner</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        {children.map((child) => {
                            const Icon = getItemIcon(child.type);
                            return (
                                <div
                                    key={child.id}
                                    className="p-3 rounded-lg bg-white/[0.02] border border-white/5 flex items-center gap-3"
                                >
                                    <Icon size={16} className="text-white/40" />
                                    <span className="text-sm text-white/70 truncate">{child.name}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

const ImagePreview: React.FC<{ item: PreviewableItem }> = ({ item }) => {
    return (
        <div className="h-full flex items-center justify-center p-6">
            {item.url ? (
                <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- preview supports blob/object URLs from local quick-look sources */}
                    <img
                        src={item.url}
                        alt={item.name}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                    />
                </>
            ) : (
                <div className="text-center text-white/30">
                    <ImageIcon size={48} className="mx-auto mb-4 opacity-30" />
                    <p>Bild nicht verfügbar</p>
                </div>
            )}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN QUICK PREVIEW COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const QuickPreview: React.FC = () => {
    const {
        isOpen,
        currentItem,
        items,
        currentIndex,
        isLoading,
        close,
        next,
        previous
    } = useQuickPreviewStore();

    const { openPane } = usePaneStore();

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Space to toggle (only if not typing in an input)
            if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
                // Space is handled by the component that initiates preview
            }

            if (!isOpen) return;

            switch (e.key) {
                case 'Escape':
                    e.preventDefault();
                    close();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    previous();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    next();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, close, next, previous]);

    // Open full pane for item
    const openFullPane = () => {
        if (!currentItem) return;

        switch (currentItem.type) {
            case 'document':
            case 'note':
                openPane({
                    id: `document-${currentItem.id}`,
                    type: 'document',
                    title: currentItem.name,
                    size: { width: 800, height: 600 },
                    data: { nodeId: currentItem.id }
                });
                break;
            case 'folder':
                openPane({
                    id: `finder-${currentItem.id}`,
                    type: 'finder',
                    title: currentItem.name,
                    size: { width: 900, height: 600 },
                    data: { folderId: currentItem.id }
                });
                break;
        }
        close();
    };

    const renderContent = () => {
        if (!currentItem) return null;

        switch (currentItem.type) {
            case 'document':
            case 'note':
            case 'node':
                return <DocumentPreview item={currentItem} />;
            case 'folder':
                return <FolderPreview item={currentItem} />;
            case 'image':
                return <ImagePreview item={currentItem} />;
            default:
                return <DocumentPreview item={currentItem} />;
        }
    };

    const Icon = currentItem ? getItemIcon(currentItem.type) : FileText;
    const color = currentItem ? getItemColor(currentItem.type) : 'white';

    return (
        <AnimatePresence>
            {isOpen && currentItem && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={close}
                        className="fixed inset-0 z-[600] bg-black/60 backdrop-blur-md"
                    />

                    {/* Preview Panel */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed inset-8 z-[601] bg-black/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl bg-${color}-500/20 flex items-center justify-center`}>
                                    <Icon size={20} className={`text-${color}-400`} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-white">{currentItem.name}</h3>
                                    <div className="flex items-center gap-2 text-[10px] text-white/40">
                                        <span className="uppercase">{currentItem.type}</span>
                                        {currentItem.metadata?.size && (
                                            <>
                                                <span>·</span>
                                                <span>{formatFileSize(currentItem.metadata.size)}</span>
                                            </>
                                        )}
                                        {currentItem.metadata?.updated_at && (
                                            <>
                                                <span>·</span>
                                                <span>{formatDate(currentItem.metadata.updated_at)}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-1">
                                {/* Open Full */}
                                <button
                                    onClick={openFullPane}
                                    className="p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
                                    title="Vollständig öffnen"
                                >
                                    <Maximize2 size={16} />
                                </button>

                                {/* Close */}
                                <button
                                    onClick={close}
                                    className="p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
                                    title="Schliessen (Esc)"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-hidden">
                            {isLoading ? (
                                <div className="h-full flex items-center justify-center text-white/30">
                                    <div className="text-center">
                                        <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto mb-4" />
                                        <p className="text-sm">Lade Vorschau...</p>
                                    </div>
                                </div>
                            ) : (
                                renderContent()
                            )}
                        </div>

                        {/* Navigation Footer (if multiple items) */}
                        {items.length > 1 && (
                            <div className="flex items-center justify-between p-3 border-t border-white/5">
                                <button
                                    onClick={previous}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    <ChevronLeft size={16} />
                                    <span className="text-xs">Vorherige</span>
                                </button>

                                <div className="text-xs text-white/30">
                                    {currentIndex + 1} von {items.length}
                                </div>

                                <button
                                    onClick={next}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    <span className="text-xs">Naechste</span>
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}

                        {/* Keyboard Hints */}
                        <div className="flex items-center justify-center gap-4 p-2 bg-white/[0.02] text-[10px] text-white/20">
                            <span><kbd className="px-1 py-0.5 bg-white/10 rounded">Esc</kbd> Schliessen</span>
                            {items.length > 1 && (
                                <>
                                    <span><kbd className="px-1 py-0.5 bg-white/10 rounded">←</kbd><kbd className="px-1 py-0.5 bg-white/10 rounded">→</kbd> Navigieren</span>
                                </>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// HOOK FOR SPACE BAR PREVIEW
// ═══════════════════════════════════════════════════════════════════════════

export const useQuickPreview = () => {
    const { open, close, isOpen } = useQuickPreviewStore();

    const preview = useCallback((item: PreviewableItem, allItems?: PreviewableItem[]) => {
        open(item, allItems);
    }, [open]);

    const toggle = useCallback((item: PreviewableItem, allItems?: PreviewableItem[]) => {
        if (isOpen) {
            close();
        } else {
            open(item, allItems);
        }
    }, [isOpen, open, close]);

    return { preview, toggle, close, isOpen };
};

export default QuickPreview;
