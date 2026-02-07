"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, PanInfo, useDragControls } from 'framer-motion';
import { X, ChevronLeft, Minus } from 'lucide-react';

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
    /** UPGRADE C1: Draggable panel */
    draggable?: boolean;
    /** UPGRADE C1: Resizable panel */
    resizable?: boolean;
    /** UPGRADE C1: Panel tabs */
    tabs?: Array<{ id: string, title: string, active?: boolean }>;
    /** UPGRADE C1: Active tab ID */
    activeTabId?: string;
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
    showBackButton = true,
    showMinimizeButton = false,
    draggable = false,
    resizable = false,
    tabs = [],
    activeTabId,
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
    isStandardMode = false
}) => {
    // UPGRADE C1: Drag and resize state
    const dragControls = useDragControls();
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);

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

    // Sync position if initialX/Y change (e.g. from store)
    useEffect(() => {
        if (initialX !== undefined && initialY !== undefined) {
            setPanelPosition({ x: initialX, y: initialY });
        }
    }, [initialX, initialY]);

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
            const newWidth = Math.max(300, startWidth + (moveEvent.clientX - startX));
            const newHeight = Math.max(200, startHeight + (moveEvent.clientY - startY));
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
    }, [panelSize, onFocus]);

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
            if (e.key === 'Escape' && onClose && isActive) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose, isActive]);

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
                drag={draggable}
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
                    height: panelSize.height,
                    // Use CSS classes for base shadows, augment for active state
                    boxShadow: isActive
                        ? '0 24px 80px rgba(0, 0, 0, 0.7), -15px 0 50px rgba(16, 185, 129, 0.25), 0 0 0 1px rgba(16, 185, 129, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                        : '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)'
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
                    duration: 0.6,
                    ease: [0.23, 1, 0.32, 1] // Custom organic cubic-bezier for "releasing" feel
                }}
                // UPGRADE: Added glass-card and glow-pulse (when active)
                className={`fixed flex flex-col glass-card ${isActive ? 'glow-pulse' : ''} ${className} ${isDragging ? 'cursor-grabbing' : draggable ? 'cursor-grab' : ''}`}
                style={{
                    zIndex: zIndex, // Use store-managed z-index directly
                    left: 0,
                    top: 0,
                    width: panelWidth,
                    height: panelHeight,
                    maxWidth: 'calc(100vw - 32px)',
                    maxHeight: 'calc(100vh - 64px)',
                    // Standard mode: solid dark, no blur. Transparent: glass effect
                    backgroundColor: isStandardMode
                        ? 'rgb(10, 15, 13)'
                        : `rgba(4, 13, 10, ${opacity - 0.05})`,
                    backdropFilter: isStandardMode ? 'none' : `blur(${blurIntensity}px)`,
                    WebkitBackdropFilter: isStandardMode ? 'none' : `blur(${blurIntensity}px)`,
                    overflow: 'hidden',
                    borderRadius: '24px' // Hardcoded premium radius
                }}
            >
                {/* UPGRADE A1: Noise Texture Overlay - only in transparent mode */}
                {!isStandardMode && (
                    <div className="absolute inset-0 bg-noise pointer-events-none opacity-30 mix-blend-overlay" />
                )}

                {/* UPGRADE A1: Elegant Borders - reduced in standard mode */}
                <div className={`absolute inset-0 rounded-[24px] pointer-events-none border ${isStandardMode ? 'border-white/5' : 'border-white/10'} ${isStandardMode ? '' : 'shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]'}`} />
                <div className={`absolute inset-0 rounded-[24px] pointer-events-none border-t ${isStandardMode ? 'border-white/10 opacity-30' : 'border-white/20 opacity-50'}`} />
                {/* UPGRADE C1: Enhanced Header with minimize and tabs */}
                {(title || showBackButton || showCloseButton || showMinimizeButton || tabs.length > 0) && (
                    <div className="shrink-0 border-b" style={{ borderColor: 'var(--mora-glass-border)' }}>
                        {/* Title Bar */}
                        {(title || showBackButton || showCloseButton || showMinimizeButton) && (
                            <div
                                className="flex items-center justify-between pointer-events-auto"
                                style={{ padding: paddingValue, cursor: draggable ? 'grab' : 'default' }}
                                onPointerDown={(e) => draggable && dragControls.start(e)}
                            >
                                {/* Back Button */}
                                {showBackButton && onBack && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onBack(); }}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-emerald-100/80 transition-all group"
                                    >
                                        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                                        <span className="text-sm">Back</span>
                                    </button>
                                )}

                                {!showBackButton && <div />}

                                {/* Title */}
                                {title && (
                                    typeof title === 'string' ? (
                                        <h2 className="text-lg font-medium tracking-wide text-emerald-50 uppercase">
                                            {title}
                                        </h2>
                                    ) : (
                                        <div className="text-lg font-medium tracking-wide text-emerald-50 uppercase">
                                            {title}
                                        </div>
                                    )
                                )}

                                {/* Action Buttons */}
                                <div className="flex items-center gap-1">
                                    {showMinimizeButton && onMinimize && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onMinimize(); }}
                                            className="p-2 rounded-lg bg-white/5 hover:bg-yellow-500/20 text-emerald-100/60 hover:text-yellow-400 transition-all"
                                            aria-label="Minimize panel"
                                        >
                                            <Minus className="w-4 h-4" />
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
                {resizable && (
                    <div
                        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-30 hover:opacity-60 transition-opacity"
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
