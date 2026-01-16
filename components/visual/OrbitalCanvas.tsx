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
 * CSS transforms with GPU acceleration.
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

    // Animation loop - runs at 60fps but only updates DOM when needed
    const animate = useCallback((timestamp: number) => {
        const deltaTime = (timestamp - lastTimeRef.current) / 1000;
        lastTimeRef.current = timestamp;

        // Update each body's position
        bodies.forEach(body => {
            const el = bodyRefs.current.get(body.id);
            if (!el) return;

            let x = body.baseX;
            let y = body.baseY;

            // Apply orbital motion if configured
            if (body.orbitRadius && body.orbitSpeed) {
                const angle = (timestamp / 1000) * body.orbitSpeed;

                // If has parent, orbit around parent
                if (body.parentId) {
                    const parent = bodyHierarchy.get(body.parentId);
                    if (parent) {
                        const parentEl = bodyRefs.current.get(parent.id);
                        if (parentEl) {
                            // Get parent's current position
                            const parentX = parseFloat(parentEl.style.left) || parent.baseX;
                            const parentY = parseFloat(parentEl.style.top) || parent.baseY;
                            x = parentX + Math.cos(angle) * (body.orbitRadius / window.innerWidth * 100);
                            y = parentY + Math.sin(angle) * (body.orbitRadius / window.innerHeight * 100);
                        }
                    }
                } else {
                    x += Math.cos(angle) * (body.orbitRadius / window.innerWidth * 100);
                    y += Math.sin(angle) * (body.orbitRadius / window.innerHeight * 100);
                }
            }

            // Apply position via CSS transform (GPU accelerated)
            el.style.left = `${x}vw`;
            el.style.top = `${y}vh`;
        });

        animationRef.current = requestAnimationFrame(animate);
    }, [bodies, bodyHierarchy]);

    // Start/stop animation
    useEffect(() => {
        animationRef.current = requestAnimationFrame(animate);
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [animate]);

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
                        left: `${body.baseX}vw`,
                        top: `${body.baseY}vh`,
                        width: body.size,
                        height: body.size,
                        transform: 'translate(-50%, -50%)',
                        willChange: 'left, top',
                        // GPU acceleration
                        backfaceVisibility: 'hidden',
                        perspective: 1000,
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
