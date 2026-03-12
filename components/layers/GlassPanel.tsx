"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, PanInfo, useDragControls } from 'framer-motion';
import { X, ChevronLeft, Minus, Maximize2, Minimize2 } from 'lucide-react';
import { useMoraStore } from '@/lib/store/moraState';
import { usePaneStore } from '@/lib/store/paneStore';

interface GlassPanelProps {
    /** Child content to render inside the panel */
    children: React.ReactNode;
    /** Width in pixels or 'full' */
    width?: number | 'full';
    /** Height in pixels, 'auto', or 'full' */
    height?: number | 'auto' | 'full';
    /** Backdrop blur intensity (8-24px) */
    blurIntensity?: number;
    /** Panel opacity (0.8-0.95) */
    opacity?: number;
    /** Padding multiplier (uses --mora-space-md as base) */
    padding?: number;
    /** Border radius (sm, md, lg, xl) */
    borderRadius?: 'sm' | 'md' | 'lg' | 'xl';
    /** Z-index for layering */
    zIndex?: number;
    /** Dim background behind this panel */
    dimBackground?: boolean;
    /** Background dim opacity */
    dimOpacity?: number;
    /** Show close button (X) */
    showCloseButton?: boolean;
    /** Show back button (chevron) */
    showBackButton?: boolean;
    /** UPGRADE C1: Show minimize button */
    showMinimizeButton?: boolean;
    /** Show maximize / restore button */
    showMaximizeButton?: boolean;
    /** UPGRADE C1: Draggable panel */
    draggable?: boolean;
    /** UPGRADE C1: Resizable panel */
    resizable?: boolean;
    /** UPGRADE C1: Panel tabs */
    tabs?: Array<{ id: string, title: string, active?: boolean }>;
    /** UPGRADE C1: Active tab ID */
    activeTabId?: string;
    /** Minimum width when panel is resizable */
    minWidth?: number;
    /** Minimum height when panel is resizable */
    minHeight?: number;
    /** Maximum width when panel is resizable */
    maxWidth?: number;
    /** Maximum height when panel is resizable */
    maxHeight?: number;
    /** Close callback */
    onClose?: () => void;
    /** Back callback */
    onBack?: () => void;
    /** UPGRADE C1: Minimize callback */
    onMinimize?: () => void;
    /** UPGRADE C1: Tab change callback */
    onTabChange?: (tabId: string) => void;
    /** UPGRADE C1: Resize callback */
    onResize?: (width: number, height: number) => void;
    /** Panel title (optional header) */
    title?: React.ReactNode;
    /** Custom className for additional styling */
    className?: string;
    /** UPGRADE 6.2: Is the panel currently focused? */
    isActive?: boolean;
    /** UPGRADE 6.2: Callback when panel is clicked (to focus) */
    onFocus?: () => void;
    /** UPGRADE 6.2: Disable internal entry/exit animations (for use inside ViewPort transactions) */
    disableAnimations?: boolean;
    /** NEW: Initial X position */
    initialX?: number;
    /** NEW: Initial Y position */
    initialY?: number;
    /** NEW: Position change callback */
    onPositionChange?: (x: number, y: number) => void;
    /** NEW: Pane ID for window snapping */
    paneId?: string;
    /** Standard mode: boring solid dark design without glass effects */
    isStandardMode?: boolean;
}

/**
 * GLASS PANEL
 * 
 * Core component of the glass pane architecture.
 * Creates translucent overlay panels with backdrop blur.
 * Features React Portal rendering to escape parent transforms.
 */
export const GlassPanel: React.FC<GlassPanelProps> = ({
    children,
    width = 800,
    height = 'auto',
    blurIntensity = 20,
    opacity = 0.5,
    padding = 2,
    borderRadius = 'lg',
    zIndex = 20,
    dimBackground = false,
    dimOpacity = 0.4,
    showCloseButton = false,
    showBackButton = false,
    showMinimizeButton = false,
    showMaximizeButton,
    draggable = false,
    resizable = false,
    tabs = [],
    activeTabId,
    minWidth = 300,
    minHeight = 200,
    maxWidth,
    maxHeight,
    isActive = true, // Default to true if not managed
    onClose,
    onBack,
    onMinimize,
    onTabChange,
    onResize,
    onFocus,
    title,
    className = '',
    disableAnimations = false,
    initialX,
    initialY,
    onPositionChange,
    paneId,
    isStandardMode: isStandardModeProp = false
}) => {
    // Use global standard mode from store, fallback to prop
    const globalStandardMode = useMoraStore(state => state.isStandardMode);
    const isStandardMode = isStandardModeProp || globalStandardMode;
    const allowMaximize = showMaximizeButton ?? (showCloseButton || showMinimizeButton);
    const activePaneId = usePaneStore((state) => state.activePaneId);
    const visiblePaneCount = usePaneStore((state) => state.panes.reduce((count, pane) => count + (pane.minimized ? 0 : 1), 0));
    const effectiveIsActive = paneId ? activePaneId === paneId : isActive;
    const hasPaneStack = visiblePaneCount > 1;
    const hasDensePaneStack = visiblePaneCount > 2;

    // UPGRADE C1: Drag and resize state
    const dragControls = useDragControls();
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const preMaximizeRef = useRef<{ position: { x: number; y: number }; size: { width: number; height: number } } | null>(null);

    // Determine center position if not provided
    const getInitialX = () => {
        if (initialX !== undefined) return initialX;
        if (typeof window === 'undefined') return 100;
        return window.innerWidth / 2 - (typeof width === 'number' ? width : 800) / 2;
    };

    const getInitialY = () => {
        if (initialY !== undefined) return initialY;
        if (typeof window === 'undefined') return 100;
        return window.innerHeight / 2 - (typeof height === 'number' ? height : 600) / 2;
    };

    const [panelPosition, setPanelPosition] = useState({ x: getInitialX(), y: getInitialY() });
    const [panelSize, setPanelSize] = useState({ width: typeof width === 'number' ? width : 800, height: typeof height === 'number' ? height : 600 });
    const panelRef = useRef<HTMLDivElement>(null);
    const getEffectiveMaxWidth = useCallback(() => {
        if (typeof maxWidth === 'number' && Number.isFinite(maxWidth)) return maxWidth;
        if (typeof window !== 'undefined') return window.innerWidth - 20;
        return Number.POSITIVE_INFINITY;
    }, [maxWidth]);
    const getEffectiveMaxHeight = useCallback(() => {
        if (typeof maxHeight === 'number' && Number.isFinite(maxHeight)) return maxHeight;
        if (typeof window !== 'undefined') return window.innerHeight - 20;
        return Number.POSITIVE_INFINITY;
    }, [maxHeight]);

    const emitFullscreenEvent = useCallback((isFullscreen: boolean) => {
        if (typeof window === 'undefined') return;
        window.dispatchEvent(new CustomEvent('mora-pane-fullscreen-change', {
            detail: { paneId, isFullscreen }
        }));
    }, [paneId]);

    // Sync position if initialX/Y change (e.g. from store)
    useEffect(() => {
        if (!isMaximized && initialX !== undefined && initialY !== undefined) {
            setPanelPosition({ x: initialX, y: initialY });
        }
    }, [initialX, initialY, isMaximized]);

    // Keep maximized panes pinned to viewport.
    useEffect(() => {
        if (!isMaximized) return;
        const handleResize = () => {
            setPanelPosition({ x: 0, y: 0 });
            setPanelSize({ width: window.innerWidth, height: window.innerHeight });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isMaximized]);

    useEffect(() => {
        return () => {
            if (isMaximized) {
                emitFullscreenEvent(false);
            }
        };
    }, [emitFullscreenEvent, isMaximized]);

    const toggleMaximize = useCallback(() => {
        if (typeof window === 'undefined') return;

        if (!isMaximized) {
            preMaximizeRef.current = {
                position: panelPosition,
                size: panelSize
            };
            const nextPosition = { x: 0, y: 0 };
            const nextSize = { width: window.innerWidth, height: window.innerHeight };
            setPanelPosition(nextPosition);
            setPanelSize(nextSize);
            onPositionChange?.(nextPosition.x, nextPosition.y);
            onResize?.(nextSize.width, nextSize.height);
            setIsMaximized(true);
            emitFullscreenEvent(true);
            return;
        }

        const restore = preMaximizeRef.current;
        if (restore) {
            setPanelPosition(restore.position);
            setPanelSize(restore.size);
            onPositionChange?.(restore.position.x, restore.position.y);
            onResize?.(restore.size.width, restore.size.height);
        }
        setIsMaximized(false);
        emitFullscreenEvent(false);
    }, [emitFullscreenEvent, isMaximized, onPositionChange, onResize, panelPosition, panelSize]);

    // UPGRADE C1: Drag handlers with Window Snapping support
    const handleDragStart = useCallback((e: any) => {
        setIsDragging(true);
        onFocus?.();
        // Dispatch event for global snap detection
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('mora-pane-drag-start', { detail: { paneId } }));
        }
    }, [onFocus, paneId]);

    const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        setIsDragging(false);
        const newX = panelPosition.x + info.offset.x;
        const newY = panelPosition.y + info.offset.y;

        // Dispatch event for snap application
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('mora-pane-drag-end', { detail: { paneId, x: newX, y: newY } }));
        }

        setPanelPosition({ x: newX, y: newY });
        onPositionChange?.(newX, newY);
    }, [panelPosition, onPositionChange, paneId]);

    // UPGRADE C1: Resize handlers
    const handleResizeStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);
        onFocus?.();

        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = panelSize.width;
        const startHeight = panelSize.height;

        const handleResizeMouseMove = (moveEvent: MouseEvent) => {
            const requestedWidth = startWidth + (moveEvent.clientX - startX);
            const requestedHeight = startHeight + (moveEvent.clientY - startY);
            const newWidth = Math.max(minWidth, Math.min(requestedWidth, getEffectiveMaxWidth()));
            const newHeight = Math.max(minHeight, Math.min(requestedHeight, getEffectiveMaxHeight()));
            setPanelSize({ width: newWidth, height: newHeight });
        };

        const handleResizeMouseUp = (upEvent: MouseEvent) => {
            document.removeEventListener('mousemove', handleResizeMouseMove);
            document.removeEventListener('mouseup', handleResizeMouseUp);
            setIsResizing(false);

            // Re-fetch current state to ensure we have the latest width/height
            // Actually, we can just use the values we just set if we are careful, 
            // but since setState is async, we need the actual values.
            // A better way is to pass them to handleResizeEnd if it was outside,
            // but here we have them in scope.
        };

        document.addEventListener('mousemove', handleResizeMouseMove);
        document.addEventListener('mouseup', handleResizeMouseUp);
    }, [getEffectiveMaxHeight, getEffectiveMaxWidth, minHeight, minWidth, onFocus, panelSize]);

    // Update onResize when resizing ends
    useEffect(() => {
        if (!isResizing && (panelSize.width !== width || panelSize.height !== height)) {
            onResize?.(panelSize.width, panelSize.height);
        }
    }, [isResizing, panelSize, onResize, width, height]);

    const handleResizeEnd = useCallback(() => {
        setIsResizing(false);
    }, []);

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && onClose && effectiveIsActive) {
                onClose();
                return;
            }
            // Native-style maximize toggle for active pane
            if (effectiveIsActive && (e.key === 'F11' || ((e.ctrlKey || e.metaKey) && e.key === 'ArrowUp'))) {
                e.preventDefault();
                if (allowMaximize) {
                    toggleMaximize();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [allowMaximize, effectiveIsActive, onClose, toggleMaximize]);

    // Border radius mapping
    const radiusMap = {
        sm: 'var(--mora-radius-sm)',
        md: 'var(--mora-radius-md)',
        lg: 'var(--mora-radius-lg)',
        xl: 'var(--mora-radius-xl)'
    };

    const panelRadius = radiusMap[borderRadius];
    const panelWidth = width === 'full' ? '100%' : `${width}px`;
    const panelHeight = height === 'full' ? '100%' : (height === 'auto' ? 'auto' : `${height}px`);
    const paddingValue = `calc(var(--mora-space-md) * ${padding})`;
    const effectiveBlur = isStandardMode
        ? 0
        : effectiveIsActive
            ? Math.min(blurIntensity, hasDensePaneStack ? 10 : hasPaneStack ? 12 : 16)
            : hasPaneStack
                ? 0
                : 4;
    const effectiveSaturation = isStandardMode ? 100 : (effectiveIsActive ? (hasPaneStack ? 112 : 118) : 100);
    const panelBackgroundColor = isStandardMode
        ? 'var(--mora-glass-bg, #FFFFFF)'
        : effectiveIsActive
            ? `rgba(4, 13, 10, ${Math.max(hasDensePaneStack ? 0.7 : 0.74, opacity - 0.05)})`
            : hasDensePaneStack
                ? 'rgba(2, 8, 6, 0.9)'
                : 'rgba(3, 10, 8, 0.84)';
    const panelBoxShadow = effectiveIsActive
        ? hasDensePaneStack
            ? '0 14px 34px rgba(0, 0, 0, 0.52), 0 0 0 1px rgba(16, 185, 129, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
            : '0 18px 56px rgba(0, 0, 0, 0.62), 0 0 0 1px rgba(16, 185, 129, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
        : hasPaneStack
            ? '0 6px 18px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(255, 255, 255, 0.035)'
            : '0 10px 28px rgba(0, 0, 0, 0.42), 0 0 0 1px rgba(255, 255, 255, 0.04)';

    // Safe Portal Rendering (Client-side only)
    const [mounted, setMounted] = useState(false);

    React.useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {/* Background Dim Layer (if enabled) */}
            {dimBackground && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: dimOpacity }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 bg-black pointer-events-none"
                    style={{ zIndex: zIndex - 1 }}
                />
            )}

            {/* UPGRADE C1: Enhanced Glass Panel with drag and resize */}
            <motion.div
                ref={panelRef}
                drag={draggable && !isMaximized}
                dragControls={dragControls}
                dragListener={false}
                dragMomentum={false}
                dragConstraints={{
                    top: 10,
                    left: 10,
                    right: typeof window !== 'undefined' ? window.innerWidth - 60 : 1000,
                    bottom: typeof window !== 'undefined' ? window.innerHeight - 100 : 800 // Safety for dock
                }}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onClick={onFocus}
                initial={disableAnimations ? false : {
                    opacity: 0,
                    scale: 0.05,
                    filter: 'blur(20px)',
                    x: typeof window !== 'undefined' ? window.innerWidth - 80 : 0,
                    y: typeof window !== 'undefined' ? window.innerHeight - 140 : 0
                }}
                animate={{
                    opacity: 1,
                    scale: 1,
                    filter: 'blur(0px)',
                    x: panelPosition.x,
                    y: panelPosition.y,
                    width: panelSize.width,
                    height: panelSize.height
                }}
                exit={disableAnimations ? undefined : {
                    opacity: 0,
                    scale: 0.1,
                    filter: 'blur(15px)',
                    x: typeof window !== 'undefined' ? window.innerWidth - 80 : 0,
                    y: typeof window !== 'undefined' ? window.innerHeight - 140 : 0,
                    transition: { duration: 0.5, ease: [0.4, 0, 1, 1] }
                }}
                transition={{
                    duration: 0.35,
                    ease: [0.23, 1, 0.32, 1] // Custom organic cubic-bezier for "releasing" feel
                }}
                className={`fixed flex flex-col glass-card glass-panel-runtime ${className} ${isDragging ? 'cursor-grabbing' : draggable ? 'cursor-grab' : ''}`}
                data-active={effectiveIsActive ? 'true' : 'false'}
                data-pane-stack={hasPaneStack ? 'true' : 'false'}
                data-pane-density={hasDensePaneStack ? 'dense' : 'normal'}
                style={{
                    zIndex: zIndex, // Use store-managed z-index directly
                    left: 0,
                    top: 0,
                    width: isMaximized ? '100vw' : panelWidth,
                    height: isMaximized ? '100vh' : panelHeight,
                    maxWidth: isMaximized ? '100vw' : 'calc(100vw - 32px)',
                    // Keep panels above dock (≈100px) and below top bar (≈48px) + breathing room
                    maxHeight: isMaximized ? '100vh' : 'calc(100vh - 160px)',
                    backgroundColor: panelBackgroundColor,
                    backdropFilter: isStandardMode || effectiveBlur === 0 ? 'none' : `blur(${effectiveBlur}px) saturate(${effectiveSaturation}%)`,
                    WebkitBackdropFilter: isStandardMode || effectiveBlur === 0 ? 'none' : `blur(${effectiveBlur}px) saturate(${effectiveSaturation}%)`,
                    boxShadow: panelBoxShadow,
                    borderRadius: isStandardMode ? '4px' : '24px',
                    overflow: 'hidden'
                    // borderRadius is now set conditionally above based on isStandardMode
                }}
            >
                {/* UPGRADE A1: Noise Texture Overlay - only in transparent mode */}
                {!isStandardMode && effectiveIsActive && !hasDensePaneStack && (
                    <div className="absolute inset-0 bg-noise pointer-events-none opacity-18 mix-blend-overlay" />
                )}

                {/* UPGRADE A1: Elegant Borders - reduced in standard mode */}
                <div className={`absolute inset-0 pointer-events-none border ${isStandardMode ? 'rounded-[4px] border-[#E1E1E1]' : 'rounded-[24px] border-white/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]'}`} />
                {!isStandardMode && effectiveIsActive && (
                    <div className="absolute inset-0 rounded-[24px] pointer-events-none border-t border-white/20 opacity-50" />
                )}
                {/* UPGRADE C1: Enhanced Header with minimize and tabs */}
                {(title || showBackButton || showCloseButton || showMinimizeButton || allowMaximize || tabs.length > 0) && (
                    <div className="shrink-0 border-b" style={{ borderColor: 'var(--mora-glass-border)' }}>
                        {/* Title Bar */}
                        {(title || showBackButton || showCloseButton || showMinimizeButton || allowMaximize) && (
                            <div
                                className="flex items-center justify-between pointer-events-auto"
                                style={{ padding: paddingValue, cursor: draggable && !isMaximized ? 'grab' : (allowMaximize ? 'pointer' : 'default') }}
                                onPointerDown={(e) => draggable && !isMaximized && dragControls.start(e)}
                                onDoubleClick={(e) => {
                                    if (!allowMaximize) return;
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggleMaximize();
                                }}
                            >
                                {/* Back Button */}
                                {showBackButton && onBack && (
                                    <button
                                        data-testid="nav-back-to-space"
                                        onClick={(e) => { e.stopPropagation(); onBack(); }}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-emerald-100/80 transition-all group"
                                    >
                                        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                                        <span className="text-sm">Back</span>
                                    </button>
                                )}

                                {!showBackButton && <div className="min-w-[40px] md:min-w-[80px]" />}

                                {/* Title */}
                                {title && (
                                    typeof title === 'string' ? (
                                        <h2 
                                            className="text-lg font-medium tracking-wide text-emerald-50 uppercase truncate flex-1 px-3 md:px-6 text-center"
                                            title={title}
                                        >
                                            {title}
                                        </h2>
                                    ) : (
                                        <div className="text-lg font-medium tracking-wide text-emerald-50 uppercase truncate flex-1 px-3 md:px-6 flex justify-center">
                                            {title}
                                        </div>
                                    )
                                )}

                                {/* Action Buttons */}
                                <div className="flex items-center gap-1 justify-end min-w-[40px] md:min-w-[80px]">
                                    {showMinimizeButton && onMinimize && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onMinimize(); }}
                                            className="p-2 rounded-lg bg-white/5 hover:bg-yellow-500/20 text-emerald-100/60 hover:text-yellow-400 transition-all"
                                            aria-label="Minimize panel"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                    )}
                                    {allowMaximize && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleMaximize(); }}
                                            className="p-2 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-emerald-100/60 hover:text-cyan-300 transition-all"
                                            aria-label={isMaximized ? "Restore panel" : "Maximize panel"}
                                        >
                                            {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                        </button>
                                    )}
                                    {showCloseButton && onClose && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onClose(); }}
                                            className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-emerald-100/60 hover:text-red-400 transition-all"
                                            aria-label="Close panel"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* UPGRADE C1: Tab Bar */}
                        {tabs.length > 0 && (
                            <div className="flex items-center border-t border-white/5" style={{ padding: `0 ${paddingValue}` }}>
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => onTabChange?.(tab.id)}
                                        className={`px-4 py-2 text-sm font-medium transition-all border-b-2 ${activeTabId === tab.id
                                            ? 'text-emerald-400 border-emerald-400 bg-emerald-400/5'
                                            : 'text-emerald-300/60 border-transparent hover:text-emerald-300 hover:border-emerald-300/50'
                                            }`}
                                    >
                                        {tab.title}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* UPGRADE C1: Resize Handle */}
                {resizable && !isMaximized && (
                    <div
                        className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize opacity-45 hover:opacity-80 transition-opacity"
                        onMouseDown={handleResizeStart}
                        onMouseUp={handleResizeEnd}
                        style={{
                            background: 'linear-gradient(-45deg, transparent 0%, transparent 40%, rgba(255,255,255,0.3) 50%, transparent 60%, transparent 100%)'
                        }}
                    />
                )}

                {/* Content */}
                <div
                    className="flex-1 overflow-auto custom-scrollbar"
                    style={{ padding: paddingValue }}
                >
                    {children}
                </div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
};

// Export type for external use
export type { GlassPanelProps };

