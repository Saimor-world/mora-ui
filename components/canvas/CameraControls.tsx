'use client';

import { useEffect, useCallback, useRef } from 'react';

export interface CameraState {
    x: number;
    y: number;
    zoom: number;
}

export interface CameraControls {
    reset: () => void;
    zoomIn: () => void;
    zoomOut: () => void;
    panTo: (x: number, y: number) => void;
    focusNode: (nodeId: string) => void;
}

interface UseCameraOptions {
    initialZoom?: number;
    minZoom?: number;
    maxZoom?: number;
    smoothing?: number; // 0-1, higher = smoother
}

/**
 * Custom hook for smooth camera controls in the Mycelium graph
 * Handles zoom, pan, and focus animations
 */
export function useCamera({
    initialZoom = 1,
    minZoom = 0.3,
    maxZoom = 3,
    smoothing = 0.15,
}: UseCameraOptions = {}): [CameraState, CameraControls] {
    const cameraRef = useRef<CameraState>({
        x: 0,
        y: 0,
        zoom: initialZoom,
    });

    const targetRef = useRef<CameraState>({
        x: 0,
        y: 0,
        zoom: initialZoom,
    });

    const animationFrameRef = useRef<number>();

    // Smooth animation loop
    const animate = useCallback(() => {
        const camera = cameraRef.current;
        const target = targetRef.current;

        // Lerp towards target
        camera.x += (target.x - camera.x) * smoothing;
        camera.y += (target.y - camera.y) * smoothing;
        camera.zoom += (target.zoom - camera.zoom) * smoothing;

        // Continue animating if not at target
        const threshold = 0.001;
        if (
            Math.abs(target.x - camera.x) > threshold ||
            Math.abs(target.y - camera.y) > threshold ||
            Math.abs(target.zoom - camera.zoom) > threshold
        ) {
            animationFrameRef.current = requestAnimationFrame(animate);
        }
    }, [smoothing]);

    // Control functions
    const reset = useCallback(() => {
        targetRef.current = { x: 0, y: 0, zoom: initialZoom };
        animate();
    }, [initialZoom, animate]);

    const zoomIn = useCallback(() => {
        targetRef.current.zoom = Math.min(maxZoom, targetRef.current.zoom * 1.3);
        animate();
    }, [maxZoom, animate]);

    const zoomOut = useCallback(() => {
        targetRef.current.zoom = Math.max(minZoom, targetRef.current.zoom / 1.3);
        animate();
    }, [minZoom, animate]);

    const panTo = useCallback(
        (x: number, y: number) => {
            targetRef.current.x = x;
            targetRef.current.y = y;
            animate();
        },
        [animate]
    );

    const focusNode = useCallback(
        (nodeId: string) => {
            console.log('🎯 Focusing on node:', nodeId);
            // TODO: Calculate node position and zoom to it
            // This requires access to the graph layout data
            animate();
        },
        [animate]
    );

    // Cleanup
    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    return [
        cameraRef.current,
        { reset, zoomIn, zoomOut, panTo, focusNode },
    ];
}

/**
 * Camera controls UI overlay
 */
interface CameraControlsUIProps {
    controls: CameraControls;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export const CameraControlsUI: React.FC<CameraControlsUIProps> = ({
    controls,
    position = 'bottom-right',
}) => {
    const positionClasses = {
        'top-left': 'top-4 left-4',
        'top-right': 'top-4 right-4',
        'bottom-left': 'bottom-4 left-4',
        'bottom-right': 'bottom-4 right-4',
    };

    return (
        <div className={`absolute ${positionClasses[position]} z-10 flex flex-col gap-2`}>
            {/* Zoom controls */}
            <div className="flex flex-col gap-1 bg-black/40 backdrop-blur-md border border-emerald-900/30 rounded-lg p-2">
                <button
                    onClick={controls.zoomIn}
                    className="w-10 h-10 flex items-center justify-center text-emerald-400 hover:text-mora-gold hover:bg-white/10 rounded transition-colors"
                    title="Zoom In (or scroll up)"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </button>

                <div className="w-full h-px bg-emerald-900/30" />

                <button
                    onClick={controls.zoomOut}
                    className="w-10 h-10 flex items-center justify-center text-emerald-400 hover:text-mora-gold hover:bg-white/10 rounded transition-colors"
                    title="Zoom Out (or scroll down)"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                </button>
            </div>

            {/* Reset button */}
            <button
                onClick={controls.reset}
                className="w-10 h-10 flex items-center justify-center bg-black/40 backdrop-blur-md border border-emerald-900/30 rounded-lg text-emerald-400 hover:text-mora-gold hover:bg-white/10 transition-colors"
                title="Reset View (or press R)"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                </svg>
            </button>
        </div>
    );
};
