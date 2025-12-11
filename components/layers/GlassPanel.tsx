"use client";

import React, { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
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
    title?: string;
    /** Custom className for additional styling */
    className?: string;
    /** UPGRADE 6.2: Is the panel currently focused? */
    isActive?: boolean;
    /** UPGRADE 6.2: Callback when panel is clicked (to focus) */
    onFocus?: () => void;
    /** UPGRADE 6.2: Disable internal entry/exit animations (for use inside ViewPort transactions) */
    disableAnimations?: boolean;
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
    opacity = 0.85,
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
    disableAnimations = false
}) => {
    // UPGRADE C1: Drag and resize state
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [panelPosition, setPanelPosition] = useState({ x: 0, y: 0 });
    const [panelSize, setPanelSize] = useState({ width: typeof width === 'number' ? width : 800, height: typeof height === 'number' ? height : 600 });
    const panelRef = useRef<HTMLDivElement>(null);

    // UPGRADE C1: Drag handlers
    const handleDragStart = useCallback(() => {
        setIsDragging(true);
        onFocus?.();
    }, [onFocus]);

    const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        setIsDragging(false);
        setPanelPosition(prev => ({
            x: prev.x + info.offset.x,
            y: prev.y + info.offset.y
        }));
    }, []);

    // UPGRADE C1: Resize handlers
    const handleResizeStart = useCallback(() => {
        setIsResizing(true);
        onFocus?.();
    }, [onFocus]);

    const handleResizeEnd = useCallback(() => {
        setIsResizing(false);
        if (onResize) {
            onResize(panelSize.width, panelSize.height);
        }
    }, [panelSize, onResize]);

    // Handle keyboard shortcuts
    React.useEffect(() => {
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
                dragMomentum={false}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onClick={onFocus}
                initial={disableAnimations ? false : { opacity: 0, scale: 0.9, y: 20, filter: 'blur(10px)' }} // Deep Dive Entry
                animate={{
                    opacity: 1,
                    scale: 1,
                    filter: 'blur(0px)',
                    x: panelPosition.x,
                    y: panelPosition.y,
                    width: panelSize.width,
                    height: panelSize.height,
                    boxShadow: isActive
                        ? '0 0 40px rgba(16, 185, 129, 0.15), 0 0 0 1px rgba(16, 185, 129, 0.3)'
                        : 'var(--mora-shadow-strong)'
                }}
                exit={disableAnimations ? undefined : {
                    opacity: 0,
                    scale: 0.85, // Deep Dive Reversal (Zoom Out)
                    filter: 'blur(10px)',
                    transition: { duration: 0.3 }
                }}
                transition={{
                    duration: 0.4,
                    ease: [0.4, 0, 0.2, 1] // cubic-bezier ease-out
                }}
                className={`fixed flex flex-col ${className} ${isDragging ? 'cursor-grabbing' : draggable ? 'cursor-grab' : ''}`}
                style={{
                    zIndex: zIndex + (isActive ? 1 : 0),
                    // PORTAL FIX: Now we can safely use 50% / translate because we are in body
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: panelWidth,
                    height: panelHeight,
                    maxWidth: 'calc(100vw - 32px)',
                    maxHeight: 'calc(100vh - 64px)',
                    backgroundColor: `rgba(3, 8, 6, ${opacity})`,
                    backdropFilter: `blur(${blurIntensity}px)`,
                    WebkitBackdropFilter: `blur(${blurIntensity}px)`, // Safari support
                    overflow: 'hidden'
                }}
            >
                {/* UPGRADE A1: Noise Texture Overlay */}
                <div className="absolute inset-0 bg-noise pointer-events-none opacity-50 mix-blend-overlay" />

                {/* UPGRADE A1: Gradient Border */}
                <div className="absolute inset-0 rounded-[inherit] pointer-events-none border border-white/10" />
                <div className="absolute inset-0 rounded-[inherit] pointer-events-none border border-t-white/20 border-l-white/10 border-b-black/40 border-r-black/40 mix-blend-overlay" />
                {/* UPGRADE C1: Enhanced Header with minimize and tabs */}
                {(title || showBackButton || showCloseButton || showMinimizeButton || tabs.length > 0) && (
                    <div className="shrink-0 border-b" style={{ borderColor: 'var(--mora-glass-border)' }}>
                        {/* Title Bar */}
                        {(title || showBackButton || showCloseButton || showMinimizeButton) && (
                            <div
                                className="flex items-center justify-between"
                                style={{ padding: paddingValue }}
                            >
                                {/* Back Button */}
                                {showBackButton && onBack && (
                                    <button
                                        onClick={onBack}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-emerald-100/80 transition-all group"
                                    >
                                        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                                        <span className="text-sm">Back</span>
                                    </button>
                                )}

                                {!showBackButton && <div />}

                                {/* Title */}
                                {title && (
                                    <h2 className="text-lg font-medium tracking-wide text-emerald-50 uppercase">
                                        {title}
                                    </h2>
                                )}

                                {/* Action Buttons */}
                                <div className="flex items-center gap-1">
                                    {showMinimizeButton && onMinimize && (
                                        <button
                                            onClick={onMinimize}
                                            className="p-2 rounded-lg bg-white/5 hover:bg-yellow-500/20 text-emerald-100/60 hover:text-yellow-400 transition-all"
                                            aria-label="Minimize panel"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                    )}
                                    {showCloseButton && onClose && (
                                        <button
                                            onClick={onClose}
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
