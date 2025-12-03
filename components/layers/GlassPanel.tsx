"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft } from 'lucide-react';

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
    /** Close callback */
    onClose?: () => void;
    /** Back callback */
    onBack?: () => void;
    /** Panel title (optional header) */
    title?: string;
    /** Custom className for additional styling */
    className?: string;
}

/**
 * GLASS PANEL
 * 
 * Core component of the glass pane architecture.
 * Creates translucent overlay panels with backdrop blur.
 * 
 * Usage:
 * - Each navigation level adds a new GlassPanel overlay
 * - Previous context remains visible but dimmed
 * - ESC key closes the panel
 * 
 * Design Principles:
 * - Glass over replacement (never hide previous context)
 * - Depth through layers (opacity + blur)
 * - Smooth animations (slide-up + fade)
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
    onClose,
    onBack,
    title,
    className = ''
}) => {
    // Handle keyboard shortcuts
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && onClose) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

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

    return (
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

            {/* Glass Panel */}
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{
                    duration: 0.4,
                    ease: [0.4, 0, 0.2, 1] // cubic-bezier ease-out
                }}
                className={`fixed flex flex-col ${className}`}
                style={{
                    zIndex,
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
                    border: '1px solid var(--mora-glass-border)',
                    borderRadius: panelRadius,
                    boxShadow: 'var(--mora-shadow-strong)',
                    overflow: 'hidden'
                }}
            >
                {/* Header (if title or buttons present) */}
                {(title || showBackButton || showCloseButton) && (
                    <div
                        className="flex items-center justify-between shrink-0 border-b"
                        style={{
                            padding: paddingValue,
                            borderColor: 'var(--mora-glass-border)'
                        }}
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

                        {/* Close Button */}
                        {showCloseButton && onClose && (
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-emerald-100/60 hover:text-red-400 transition-all"
                                aria-label="Close panel"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}

                        {!showCloseButton && <div />}
                    </div>
                )}

                {/* Content */}
                <div
                    className="flex-1 overflow-auto custom-scrollbar"
                    style={{ padding: paddingValue }}
                >
                    {children}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

// Export type for external use
export type { GlassPanelProps };
