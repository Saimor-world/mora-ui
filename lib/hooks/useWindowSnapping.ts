import { useCallback, useMemo, useRef, useState } from 'react';
import { usePaneStore } from '@/lib/store/paneStore';

/**
 * WINDOW SNAPPING HOOK
 *
 * Provides macOS/Windows-style window snapping zones:
 * - Left edge: Snap to left half
 * - Right edge: Snap to right half
 * - Top edge: Maximize
 * - Corners: Quarter screen
 *
 * Usage:
 * const { snapZone, onDragEnd, getSnapPreview, isNearEdge } = useWindowSnapping(paneId);
 */

export type SnapZone = 'left' | 'right' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'maximize' | null;

interface SnapConfig {
    threshold: number; // pixels from edge to trigger snap
    cornerSize: number; // pixels for corner detection
}

const DEFAULT_CONFIG: SnapConfig = {
    threshold: 30,
    cornerSize: 80,
};

export interface WindowSnappingResult {
    snapZone: SnapZone;
    isNearEdge: boolean;
    detectSnapZone: (x: number, y: number) => SnapZone;
    getSnapDimensions: (zone: SnapZone) => { x: number; y: number; width: number; height: number };
    applySnap: (paneId: string, zone: SnapZone) => void;
    getPreviewStyle: (zone: SnapZone) => React.CSSProperties | null;
}

export function useWindowSnapping(config: Partial<SnapConfig> = {}): WindowSnappingResult {
    // Memoize cfg so detectSnapZone (and the whole return value) stays stable
    // across renders when config values haven't actually changed.
    const cfg = useMemo(
        () => ({ ...DEFAULT_CONFIG, ...config }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [config.threshold, config.cornerSize],
    );
    const { updatePanePosition, updatePaneSize } = usePaneStore();
    const [snapZone, setSnapZone] = useState<SnapZone>(null);

    const getViewportDimensions = useCallback(() => {
        if (typeof window === 'undefined') {
            return { width: 1920, height: 1080 };
        }
        return {
            width: window.innerWidth,
            height: window.innerHeight - 80, // Account for dock
        };
    }, []);

    const detectSnapZone = useCallback((x: number, y: number): SnapZone => {
        const { width: vw, height: vh } = getViewportDimensions();
        const { threshold, cornerSize } = cfg;

        const nearLeft = x < threshold;
        const nearRight = x > vw - threshold;
        const nearTop = y < threshold;
        const nearBottom = y > vh - threshold;

        const inLeftCorner = x < cornerSize;
        const inRightCorner = x > vw - cornerSize;
        const inTopCorner = y < cornerSize;
        const inBottomCorner = y > vh - cornerSize;

        // Corners first
        if (inLeftCorner && inTopCorner) return 'top-left';
        if (inRightCorner && inTopCorner) return 'top-right';
        if (inLeftCorner && inBottomCorner) return 'bottom-left';
        if (inRightCorner && inBottomCorner) return 'bottom-right';

        // Edges
        if (nearTop && !nearLeft && !nearRight) return 'maximize';
        if (nearLeft) return 'left';
        if (nearRight) return 'right';
        // if (nearBottom) return 'bottom'; // Usually not used

        return null;
    }, [cfg, getViewportDimensions]);

    const getSnapDimensions = useCallback((zone: SnapZone) => {
        const { width: vw, height: vh } = getViewportDimensions();
        const padding = 8;

        switch (zone) {
            case 'left':
                return { x: padding, y: 48, width: Math.floor(vw / 2) - padding * 1.5, height: vh - 48 - padding };
            case 'right':
                return { x: Math.floor(vw / 2) + padding / 2, y: 48, width: Math.floor(vw / 2) - padding * 1.5, height: vh - 48 - padding };
            case 'maximize':
                return { x: padding, y: 48, width: vw - padding * 2, height: vh - 48 - padding };
            case 'top-left':
                return { x: padding, y: 48, width: Math.floor(vw / 2) - padding * 1.5, height: Math.floor(vh / 2) - 48 };
            case 'top-right':
                return { x: Math.floor(vw / 2) + padding / 2, y: 48, width: Math.floor(vw / 2) - padding * 1.5, height: Math.floor(vh / 2) - 48 };
            case 'bottom-left':
                return { x: padding, y: Math.floor(vh / 2) + padding / 2, width: Math.floor(vw / 2) - padding * 1.5, height: Math.floor(vh / 2) - padding };
            case 'bottom-right':
                return { x: Math.floor(vw / 2) + padding / 2, y: Math.floor(vh / 2) + padding / 2, width: Math.floor(vw / 2) - padding * 1.5, height: Math.floor(vh / 2) - padding };
            default:
                return { x: 100, y: 100, width: 800, height: 600 };
        }
    }, [getViewportDimensions]);

    const applySnap = useCallback((paneId: string, zone: SnapZone) => {
        if (!zone) return;
        const dims = getSnapDimensions(zone);
        updatePanePosition(paneId, dims.x, dims.y);
        updatePaneSize(paneId, dims.width, dims.height);
    }, [getSnapDimensions, updatePanePosition, updatePaneSize]);

    const getPreviewStyle = useCallback((zone: SnapZone): React.CSSProperties | null => {
        if (!zone) return null;
        const dims = getSnapDimensions(zone);

        return {
            position: 'fixed',
            left: dims.x,
            top: dims.y,
            width: dims.width,
            height: dims.height,
            background: 'rgba(16, 185, 129, 0.15)',
            border: '2px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '12px',
            pointerEvents: 'none',
            zIndex: 9998,
            transition: 'all 150ms ease-out',
        };
    }, [getSnapDimensions]);

    return {
        snapZone,
        isNearEdge: snapZone !== null,
        detectSnapZone,
        getSnapDimensions,
        applySnap,
        getPreviewStyle,
    };
}

export default useWindowSnapping;
