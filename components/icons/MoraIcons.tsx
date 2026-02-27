"use client";

import React from "react";
import { motion } from "framer-motion";

/**
 * MORA ICON SYSTEM
 * Custom SVG icons designed for the Saimor OS aesthetic.
 * Each icon: 24×24 viewport, organic curves, optional glow animation.
 */

interface IconProps {
    size?: number;
    color?: string;
    glow?: boolean;
    className?: string;
    strokeWidth?: number;
}

const defaultColor = "currentColor";

// ─── Home / Universe ──────────────────────────────────────────────────────────
export const HomeOrbitIcon: React.FC<IconProps> = ({ size = 24, color = defaultColor, glow, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
        style={glow ? { filter: `drop-shadow(0 0 4px ${color})` } : undefined}>
        {/* Orbital rings */}
        <ellipse cx="12" cy="12" rx="9" ry="4.5" stroke={color} strokeWidth="1" strokeOpacity="0.35"
            strokeDasharray="2 3" transform="rotate(-20 12 12)" />
        <ellipse cx="12" cy="12" rx="9" ry="4.5" stroke={color} strokeWidth="1" strokeOpacity="0.25"
            strokeDasharray="2 3" transform="rotate(60 12 12)" />
        {/* Core planet */}
        <circle cx="12" cy="12" r="3.5" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.5" />
        {/* Highlight */}
        <circle cx="10.8" cy="10.8" r="0.8" fill={color} fillOpacity="0.7" />
        {/* Orbiting dot */}
        <circle cx="20.5" cy="10" r="1.2" fill={color} />
    </svg>
);

// ─── Mora Brain / Neural ──────────────────────────────────────────────────────
export const MoraBrainIcon: React.FC<IconProps> = ({ size = 24, color = defaultColor, glow, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
        style={glow ? { filter: `drop-shadow(0 0 5px ${color})` } : undefined}>
        {/* Neural web */}
        <circle cx="12" cy="12" r="4" fill={color} fillOpacity="0.12" stroke={color} strokeWidth="1.5" />
        <circle cx="12" cy="12" r="7.5" stroke={color} strokeWidth="0.75" strokeOpacity="0.3" strokeDasharray="1.5 2.5" />
        {/* Nodes */}
        <circle cx="4.5" cy="8" r="1.4" fill={color} fillOpacity="0.8" />
        <circle cx="19.5" cy="8" r="1.4" fill={color} fillOpacity="0.8" />
        <circle cx="4.5" cy="16" r="1.4" fill={color} fillOpacity="0.6" />
        <circle cx="19.5" cy="16" r="1.4" fill={color} fillOpacity="0.6" />
        <circle cx="12" cy="3" r="1.2" fill={color} fillOpacity="0.5" />
        <circle cx="12" cy="21" r="1.2" fill={color} fillOpacity="0.5" />
        {/* Connections */}
        <line x1="4.5" y1="8" x2="12" y2="12" stroke={color} strokeWidth="0.75" strokeOpacity="0.4" />
        <line x1="19.5" y1="8" x2="12" y2="12" stroke={color} strokeWidth="0.75" strokeOpacity="0.4" />
        <line x1="4.5" y1="16" x2="12" y2="12" stroke={color} strokeWidth="0.75" strokeOpacity="0.3" />
        <line x1="19.5" y1="16" x2="12" y2="12" stroke={color} strokeWidth="0.75" strokeOpacity="0.3" />
        <line x1="12" y1="3" x2="12" y2="8" stroke={color} strokeWidth="0.75" strokeOpacity="0.3" />
        <line x1="12" y1="16" x2="12" y2="21" stroke={color} strokeWidth="0.75" strokeOpacity="0.3" />
        {/* Core pulse */}
        <circle cx="12" cy="12" r="1.8" fill={color} />
    </svg>
);

// ─── Chat / Speak ─────────────────────────────────────────────────────────────
export const ChatOrbitIcon: React.FC<IconProps> = ({ size = 24, color = defaultColor, glow, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
        style={glow ? { filter: `drop-shadow(0 0 4px ${color})` } : undefined}>
        {/* Bubble */}
        <path d="M4 5C4 3.9 4.9 3 6 3h12c1.1 0 2 .9 2 2v9c0 1.1-.9 2-2 2H9l-5 4V5z"
            fill={color} fillOpacity="0.1" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
        {/* Typing dots */}
        <circle cx="9" cy="9.5" r="1.1" fill={color} />
        <circle cx="12" cy="9.5" r="1.1" fill={color} fillOpacity="0.7" />
        <circle cx="15" cy="9.5" r="1.1" fill={color} fillOpacity="0.4" />
    </svg>
);

// ─── Search / Scan ────────────────────────────────────────────────────────────
export const SearchScanIcon: React.FC<IconProps> = ({ size = 24, color = defaultColor, glow, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
        style={glow ? { filter: `drop-shadow(0 0 4px ${color})` } : undefined}>
        {/* Circle */}
        <circle cx="10.5" cy="10.5" r="6.5" stroke={color} strokeWidth="1.5" strokeOpacity="0.9" />
        {/* Inner ring */}
        <circle cx="10.5" cy="10.5" r="3.5" stroke={color} strokeWidth="0.75" strokeOpacity="0.35" strokeDasharray="2 2" />
        {/* Crosshair */}
        <line x1="10.5" y1="5.5" x2="10.5" y2="7" stroke={color} strokeWidth="1.2" />
        <line x1="10.5" y1="14" x2="10.5" y2="15.5" stroke={color} strokeWidth="1.2" />
        <line x1="5.5" y1="10.5" x2="7" y2="10.5" stroke={color} strokeWidth="1.2" />
        <line x1="14" y1="10.5" x2="15.5" y2="10.5" stroke={color} strokeWidth="1.2" />
        {/* Handle */}
        <line x1="15.5" y1="15.5" x2="20.5" y2="20.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
        {/* Star at center */}
        <circle cx="10.5" cy="10.5" r="1.2" fill={color} />
    </svg>
);

// ─── Folder / Space ───────────────────────────────────────────────────────────
export const FolderStarIcon: React.FC<IconProps> = ({ size = 24, color = defaultColor, glow, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
        style={glow ? { filter: `drop-shadow(0 0 4px ${color})` } : undefined}>
        {/* Folder body */}
        <path d="M3 8C3 6.9 3.9 6 5 6h4.5L11 8H19c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V8z"
            fill={color} fillOpacity="0.1" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
        {/* Star inside */}
        <path d="M12 11l.8 2.4H15l-1.9 1.4.7 2.2L12 15.7l-1.8 1.3.7-2.2L9 13.4h2.2z"
            fill={color} fillOpacity="0.7" />
    </svg>
);

// ─── Team / Network ───────────────────────────────────────────────────────────
export const TeamNetworkIcon: React.FC<IconProps> = ({ size = 24, color = defaultColor, glow, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
        style={glow ? { filter: `drop-shadow(0 0 4px ${color})` } : undefined}>
        {/* Connections */}
        <line x1="12" y1="7" x2="6" y2="15" stroke={color} strokeWidth="1" strokeOpacity="0.35" />
        <line x1="12" y1="7" x2="18" y2="15" stroke={color} strokeWidth="1" strokeOpacity="0.35" />
        <line x1="6" y1="15" x2="18" y2="15" stroke={color} strokeWidth="1" strokeOpacity="0.25" />
        {/* Center node */}
        <circle cx="12" cy="7" r="3" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.5" />
        <circle cx="12" cy="7" r="1.2" fill={color} />
        {/* Leaf nodes */}
        <circle cx="6" cy="15" r="2.5" fill={color} fillOpacity="0.1" stroke={color} strokeWidth="1.3" />
        <circle cx="18" cy="15" r="2.5" fill={color} fillOpacity="0.1" stroke={color} strokeWidth="1.3" />
        <circle cx="6" cy="15" r="1" fill={color} fillOpacity="0.7" />
        <circle cx="18" cy="15" r="1" fill={color} fillOpacity="0.7" />
    </svg>
);

// ─── Notes / Rune ─────────────────────────────────────────────────────────────
export const NotesRuneIcon: React.FC<IconProps> = ({ size = 24, color = defaultColor, glow, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
        style={glow ? { filter: `drop-shadow(0 0 4px ${color})` } : undefined}>
        {/* Page */}
        <path d="M5 3h10l4 4v14H5V3z" fill={color} fillOpacity="0.1" stroke={color} strokeWidth="1.5"
            strokeLinejoin="round" />
        <path d="M15 3v4h4" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
        {/* Lines */}
        <line x1="8.5" y1="10" x2="15.5" y2="10" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.8" />
        <line x1="8.5" y1="13" x2="15.5" y2="13" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.6" />
        <line x1="8.5" y1="16" x2="12.5" y2="16" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.4" />
        {/* Star accent */}
        <circle cx="7" cy="10" r="0.8" fill={color} />
    </svg>
);

// ─── Settings / Rings ─────────────────────────────────────────────────────────
export const SettingsRingIcon: React.FC<IconProps> = ({ size = 24, color = defaultColor, glow, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
        style={glow ? { filter: `drop-shadow(0 0 4px ${color})` } : undefined}>
        {/* Outer ring */}
        <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1" strokeOpacity="0.3"
            strokeDasharray="3 2.5" />
        {/* Middle gear shape */}
        <path d="M12 6.5V4M12 20v-2.5M4 12H6.5M17.5 12H20M6.4 6.4l1.8 1.8M15.8 15.8l1.8 1.8M17.6 6.4l-1.8 1.8M8.2 15.8l-1.8 1.8"
            stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeOpacity="0.6" />
        {/* Core */}
        <circle cx="12" cy="12" r="3" fill={color} fillOpacity="0.1" stroke={color} strokeWidth="1.5" />
        <circle cx="12" cy="12" r="1.3" fill={color} />
    </svg>
);

// ─── Terminal / Code ──────────────────────────────────────────────────────────
export const TerminalGlyphIcon: React.FC<IconProps> = ({ size = 24, color = defaultColor, glow, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
        style={glow ? { filter: `drop-shadow(0 0 4px ${color})` } : undefined}>
        {/* Frame */}
        <rect x="2" y="4" width="20" height="16" rx="2" fill={color} fillOpacity="0.08"
            stroke={color} strokeWidth="1.5" />
        {/* Top bar dots */}
        <circle cx="5.5" cy="7.5" r="0.8" fill={color} fillOpacity="0.5" />
        <circle cx="8" cy="7.5" r="0.8" fill={color} fillOpacity="0.35" />
        <circle cx="10.5" cy="7.5" r="0.8" fill={color} fillOpacity="0.2" />
        {/* Prompt */}
        <path d="M5.5 13.5L8.5 12L5.5 10.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Cursor line */}
        <line x1="10" y1="13.5" x2="15" y2="13.5" stroke={color} strokeWidth="1.5"
            strokeLinecap="round" strokeOpacity="0.7" />
        <rect x="15.2" y="12.2" width="2.5" height="2.5" rx="0.4" fill={color} fillOpacity="0.6" />
    </svg>
);

// ─── Memory / Crystal ─────────────────────────────────────────────────────────
export const MemoryCrystalIcon: React.FC<IconProps> = ({ size = 24, color = defaultColor, glow, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
        style={glow ? { filter: `drop-shadow(0 0 5px ${color})` } : undefined}>
        {/* Crystal facets */}
        <path d="M12 3L19.5 9L12 21L4.5 9L12 3z"
            fill={color} fillOpacity="0.1" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M4.5 9L12 12L19.5 9" stroke={color} strokeWidth="0.8" strokeOpacity="0.5" />
        <path d="M12 3L12 12" stroke={color} strokeWidth="0.8" strokeOpacity="0.4" />
        <path d="M12 12L12 21" stroke={color} strokeWidth="0.8" strokeOpacity="0.3" />
        {/* Facet highlights */}
        <path d="M12 3L15.5 8L12 12L8.5 8L12 3z" fill={color} fillOpacity="0.15" />
        {/* Core gem */}
        <circle cx="12" cy="10" r="1.5" fill={color} fillOpacity="0.8" />
    </svg>
);

// ─── Back / Navigation ────────────────────────────────────────────────────────
export const BackOrbitIcon: React.FC<IconProps> = ({ size = 24, color = defaultColor, glow, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
        style={glow ? { filter: `drop-shadow(0 0 4px ${color})` } : undefined}>
        {/* Orbit arc */}
        <path d="M18 5.5A8.5 8.5 0 1 1 6.5 17" stroke={color} strokeWidth="1.3"
            strokeOpacity="0.4" strokeDasharray="2 2.5" strokeLinecap="round" />
        {/* Arrow */}
        <path d="M4 12l3.5-4v2.5H12" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 12l3.5 4V13.5H12" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

// ─── Activity / Pulse ─────────────────────────────────────────────────────────
export const PulseWaveIcon: React.FC<IconProps> = ({ size = 24, color = defaultColor, glow, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
        style={glow ? { filter: `drop-shadow(0 0 4px ${color})` } : undefined}>
        {/* Flat line + spike */}
        <path d="M2 12h3.5l2-6 3 12 2.5-9 2 5H22"
            stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

// ─── Bell / Alert ─────────────────────────────────────────────────────────────
export const BellOrbitIcon: React.FC<IconProps> = ({ size = 24, color = defaultColor, glow, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
        style={glow ? { filter: `drop-shadow(0 0 4px ${color})` } : undefined}>
        {/* Orbit ring */}
        <circle cx="12" cy="12" r="9.5" stroke={color} strokeWidth="0.75" strokeOpacity="0.2"
            strokeDasharray="1.5 3" />
        {/* Bell */}
        <path d="M8 10.5C8 7.5 9.3 6 12 6s4 1.5 4 4.5V15H8v-4.5z"
            fill={color} fillOpacity="0.12" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M9.5 15c0 1.4 1.1 2.5 2.5 2.5s2.5-1.1 2.5-2.5"
            stroke={color} strokeWidth="1.3" strokeLinecap="round" />
        <line x1="12" y1="3.5" x2="12" y2="6" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
);

// ─── Grid / Apps ──────────────────────────────────────────────────────────────
export const GridConstellationIcon: React.FC<IconProps> = ({ size = 24, color = defaultColor, glow, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
        style={glow ? { filter: `drop-shadow(0 0 4px ${color})` } : undefined}>
        {/* Constellation lines */}
        <line x1="7" y1="7" x2="17" y2="7" stroke={color} strokeWidth="0.7" strokeOpacity="0.25" />
        <line x1="7" y1="7" x2="12" y2="17" stroke={color} strokeWidth="0.7" strokeOpacity="0.25" />
        <line x1="17" y1="7" x2="12" y2="17" stroke={color} strokeWidth="0.7" strokeOpacity="0.25" />
        <line x1="7" y1="7" x2="5" y2="17" stroke={color} strokeWidth="0.7" strokeOpacity="0.2" />
        <line x1="17" y1="7" x2="19" y2="17" stroke={color} strokeWidth="0.7" strokeOpacity="0.2" />
        {/* Stars */}
        <circle cx="7" cy="7" r="2" fill={color} />
        <circle cx="17" cy="7" r="2" fill={color} fillOpacity="0.8" />
        <circle cx="12" cy="17" r="2" fill={color} fillOpacity="0.9" />
        <circle cx="5" cy="17" r="1.4" fill={color} fillOpacity="0.5" />
        <circle cx="19" cy="17" r="1.4" fill={color} fillOpacity="0.5" />
        <circle cx="12" cy="4" r="1" fill={color} fillOpacity="0.4" />
    </svg>
);

// ─── Plus / Create ────────────────────────────────────────────────────────────
export const CreateStarIcon: React.FC<IconProps> = ({ size = 24, color = defaultColor, glow, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
        style={glow ? { filter: `drop-shadow(0 0 4px ${color})` } : undefined}>
        {/* Circle */}
        <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.3" strokeOpacity="0.5" />
        {/* Plus */}
        <line x1="12" y1="7.5" x2="12" y2="16.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        <line x1="7.5" y1="12" x2="16.5" y2="12" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        {/* Sparkle accents */}
        <circle cx="18.5" cy="5.5" r="1" fill={color} fillOpacity="0.5" />
        <circle cx="5.5" cy="18.5" r="0.7" fill={color} fillOpacity="0.35" />
    </svg>
);

// ─── Animated wrapper for dock icons ──────────────────────────────────────────
interface AnimatedIconProps extends IconProps {
    children: React.ReactNode;
    isActive?: boolean;
    accent?: string;
}

export const DockIconWrapper: React.FC<AnimatedIconProps> = ({
    children, isActive, accent = '#10b981', size = 22
}) => (
    <motion.div
        className="relative flex items-center justify-center"
        style={{ width: size + 8, height: size + 8 }}
        whileHover={{ scale: 1.18 }}
        whileTap={{ scale: 0.92 }}
        animate={isActive ? {
            filter: [`drop-shadow(0 0 0px ${accent})`, `drop-shadow(0 0 8px ${accent})`, `drop-shadow(0 0 0px ${accent})`],
        } : {}}
        transition={isActive ? { duration: 2.5, repeat: Infinity, ease: 'easeInOut' } : { type: 'spring', stiffness: 400, damping: 20 }}
    >
        {isActive && (
            <motion.div
                className="absolute inset-0 rounded-full"
                style={{ background: `radial-gradient(circle, ${accent}20 0%, transparent 70%)` }}
                animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0.15, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
        )}
        {children}
    </motion.div>
);
