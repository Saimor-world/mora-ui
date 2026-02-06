"use client";

import { useRef, useCallback, useEffect, useState } from 'react';

interface UseOrbitalAnimationOptions {
    /** Orbit speed in radians per second (default: 0.05) */
    orbitSpeed?: number;
    /** Update throttle in ms (default: 50 = 20fps) */
    throttleMs?: number;
    /** Pause animation */
    paused?: boolean;
}

interface OrbitalAnimationState {
    /** Current animation time in seconds */
    time: number;
    /** Delta time since last frame */
    deltaTime: number;
    /** Is animation running */
    isRunning: boolean;
}

/**
 * useOrbitalAnimation - Performance-optimized animation hook
 * 
 * Instead of updating React state every frame (causing re-renders),
 * this hook provides:
 * 1. A throttled time value for React state (20fps default)
 * 2. A high-precision time ref for direct DOM manipulation
 * 3. Callbacks for registering elements to animate
 */
export function useOrbitalAnimation(options: UseOrbitalAnimationOptions = {}) {
    const {
        orbitSpeed = 0.05,
        throttleMs = 50,
        paused = false
    } = options;

    // High-precision time (not in React state to avoid re-renders)
    const timeRef = useRef(0);
    const startTimeRef = useRef<number | null>(null);
    const animationRef = useRef<number>();
    const lastThrottleRef = useRef(0);

    // Throttled state for React components that need it
    const [state, setState] = useState<OrbitalAnimationState>({
        time: 0,
        deltaTime: 0,
        isRunning: !paused
    });

    // Registered animation callbacks
    const callbacksRef = useRef<Map<string, (time: number, deltaTime: number) => void>>(new Map());

    // Animation loop
    const animate = useCallback((timestamp: number) => {
        if (startTimeRef.current === null) {
            startTimeRef.current = timestamp;
        }

        const elapsed = (timestamp - startTimeRef.current) / 1000;
        const deltaTime = elapsed - timeRef.current;
        timeRef.current = elapsed;

        // Execute all registered callbacks (direct DOM manipulation)
        callbacksRef.current.forEach(callback => {
            callback(elapsed * orbitSpeed, deltaTime);
        });

        // Throttled React state update
        if (timestamp - lastThrottleRef.current > throttleMs) {
            lastThrottleRef.current = timestamp;
            setState({
                time: elapsed,
                deltaTime,
                isRunning: true
            });
        }

        animationRef.current = requestAnimationFrame(animate);
    }, [orbitSpeed, throttleMs]);

    // Start/stop animation based on paused prop
    useEffect(() => {
        if (paused) {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            setState(prev => ({ ...prev, isRunning: false }));
        } else {
            animationRef.current = requestAnimationFrame(animate);
        }

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [paused, animate]);

    // Register an animation callback for direct DOM manipulation
    const registerAnimationCallback = useCallback((
        id: string,
        callback: (time: number, deltaTime: number) => void
    ) => {
        callbacksRef.current.set(id, callback);
        return () => {
            callbacksRef.current.delete(id);
        };
    }, []);

    // Get current high-precision time (no re-render)
    const getTime = useCallback(() => timeRef.current, []);

    // Calculate position on orbit
    const getOrbitPosition = useCallback((
        centerX: number,
        centerY: number,
        radiusX: number,
        radiusY: number,
        phase: number = 0
    ) => {
        const time = timeRef.current * orbitSpeed + phase;
        return {
            x: centerX + Math.cos(time) * radiusX,
            y: centerY + Math.sin(time) * radiusY
        };
    }, [orbitSpeed]);

    return {
        // Throttled state for React (20fps)
        time: state.time,
        deltaTime: state.deltaTime,
        isRunning: state.isRunning,

        // High-precision utilities (60fps)
        getTime,
        getOrbitPosition,
        registerAnimationCallback,

        // Direct ref access for advanced usage
        timeRef
    };
}

export default useOrbitalAnimation;
