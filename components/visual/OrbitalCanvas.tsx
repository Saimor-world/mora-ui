"use client";

import React, { useEffect, useRef, useMemo, useCallback } from 'react';

interface OrbitalBody {
    id: string;
    name: string;
    type: 'planet' | 'moon' | 'star';
    baseX: number;      // Base position in vw
    baseY: number;      // Base position in vh
    size: number;       // Diameter in px
    color: string;
    orbitRadius?: number;  // For animated orbit
    orbitSpeed?: number;   // Radians per second
    parentId?: string;     // Parent body ID for hierarchical orbits
}

interface OrbitalCanvasProps {
    bodies: OrbitalBody[];
    onBodyClick?: (id: string) => void;
    onBodyHover?: (id: string | null) => void;
    className?: string;
}

/**
 * ORBITAL CANVAS - HIGH PERFORMANCE RENDERING
 * 
 * Uses requestAnimationFrame with throttled state updates.
 * All positions are calculated in a single animation loop.
 * CSS transforms with GPU acceleration (no layout thrashing).
 */
export const OrbitalCanvas: React.FC<OrbitalCanvasProps> = ({
    bodies,
    onBodyClick,
    onBodyHover,
    className = ''
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<number>();
    const lastTimeRef = useRef<number>(0);
    const bodyRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    // Pre-compute body hierarchy
    const bodyHierarchy = useMemo(() => {
        const map = new Map<string, OrbitalBody>();
        bodies.forEach(b => map.set(b.id, b));
        return map;
    }, [bodies]);

    // Track computed positions for parent lookups
    const positionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

    // Animation loop - uses transform instead of left/top (no layout thrashing)
    const animate = useCallback((timestamp: number) => {
        if (!bodies.length) return;

        const deltaTime = (timestamp - lastTimeRef.current) / 1000;
        lastTimeRef.current = timestamp;

        // Update each body's position via CSS transform
        bodies.forEach(body => {
            const el = bodyRefs.current.get(body.id);
            if (!el) return;

            let x = body.baseX;
            let y = body.baseY;

            // Apply orbital motion if configured
            if (body.orbitRadius && body.orbitSpeed) {
                const angle = (timestamp / 1000) * body.orbitSpeed;

                if (body.parentId) {
                    const parentPos = positionsRef.current.get(body.parentId);
                    if (parentPos) {
                        x = parentPos.x + Math.cos(angle) * (body.orbitRadius / window.innerWidth * 100);
                        y = parentPos.y + Math.sin(angle) * (body.orbitRadius / window.innerHeight * 100);
                    }
                } else {
                    x += Math.cos(angle) * (body.orbitRadius / window.innerWidth * 100);
                    y += Math.sin(angle) * (body.orbitRadius / window.innerHeight * 100);
                }
            }

            positionsRef.current.set(body.id, { x, y });

            // Use transform for GPU-composited positioning (no layout thrashing)
            el.style.transform = `translate(calc(${x}vw - 50%), calc(${y}vh - 50%))`;
        });

        animationRef.current = requestAnimationFrame(animate);
    }, [bodies, bodyHierarchy]);

    // Start/stop animation — only runs when bodies are present
    useEffect(() => {
        if (bodies.length === 0) return;
        animationRef.current = requestAnimationFrame(animate);
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [animate, bodies.length]);

    // Register body refs
    const setBodyRef = useCallback((id: string, el: HTMLDivElement | null) => {
        if (el) {
            bodyRefs.current.set(id, el);
        } else {
            bodyRefs.current.delete(id);
        }
    }, []);

    return (
        <div
            ref={containerRef}
            className={`absolute inset-0 pointer-events-none ${className}`}
        >
            {bodies.map(body => (
                <div
                    key={body.id}
                    ref={(el) => setBodyRef(body.id, el)}
                    className="absolute pointer-events-auto cursor-pointer"
                    style={{
                        left: 0,
                        top: 0,
                        width: body.size,
                        height: body.size,
                        transform: `translate(calc(${body.baseX}vw - 50%), calc(${body.baseY}vh - 50%))`,
                        willChange: 'transform',
                        backfaceVisibility: 'hidden',
                    }}
                    onClick={() => onBodyClick?.(body.id)}
                    onMouseEnter={() => onBodyHover?.(body.id)}
                    onMouseLeave={() => onBodyHover?.(null)}
                    data-body-id={body.id}
                    data-body-type={body.type}
                >
                    {/* Body visual */}
                    <div
                        className="w-full h-full rounded-full"
                        style={{
                            background: `radial-gradient(circle at 30% 30%, ${body.color}80, ${body.color}40, ${body.color}20)`,
                            boxShadow: `
                                0 0 ${body.size / 2}px ${body.color}40,
                                inset 0 0 ${body.size / 4}px ${body.color}60
                            `,
                        }}
                    />

                    {/* Glow effect */}
                    <div
                        className="absolute inset-0 rounded-full opacity-50 blur-md"
                        style={{
                            background: `radial-gradient(circle, ${body.color}60, transparent 70%)`,
                            transform: 'scale(1.5)',
                        }}
                    />
                </div>
            ))}
        </div>
    );
};

export default OrbitalCanvas;
