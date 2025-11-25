"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useMoraStore } from '@/lib/store/moraState';

// ============================================================================
// MYCELIUM LAYER - "2026 LEVEL" OPTIMIZATION
// ============================================================================
// Performance: O(n) spatial grid hashing replaces O(n²) naive approach
// Reactivity: Real shimmer/pulse on department growth, space/node interaction
// Future: AI-orchestration ready - Môra will generate this based on semantic graph
// Vision: Departments = mushrooms sprouting, Mycelium = living network beneath
// ============================================================================

const GRID_SIZE = 120;                      // Spatial hash cell size
const MAX_CONNECTIONS_PER_PARTICLE = 4;     // Performance limit
const CONNECTION_DISTANCE = 120;            // Max connection range
const BASE_PARTICLE_DENSITY = 20000;        // Pixels per particle

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    alpha: number;
    pulse: number;
    cellX: number;  // Grid cell coordinates
    cellY: number;
    connections: number; // Track connection count
}

export const MyceliumOverlay: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { departments, activeSpaceId, activeNode } = useMoraStore();

    // Reactive visual states
    const [shimmerIntensity, setShimmerIntensity] = useState(0);
    const [growthPulse, setGrowthPulse] = useState(0);

    // React to Department growth (Pilze sprießen - Mushrooms sprouting)
    useEffect(() => {
        if (departments.length > 0) {
            setGrowthPulse(0.6);
            setTimeout(() => setGrowthPulse(0), 1200);
        }
    }, [departments.length]);

    // React to Space selection (Network activation)
    useEffect(() => {
        if (activeSpaceId) {
            setShimmerIntensity(0.4);
            setTimeout(() => setShimmerIntensity(0), 800);
        }
    }, [activeSpaceId]);

    // React to Node interaction (Neural pulse)
    useEffect(() => {
        if (activeNode) {
            setShimmerIntensity(0.5);
            setTimeout(() => setShimmerIntensity(0), 600);
        }
    }, [activeNode?.id]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Particle[] = [];
        let width = window.innerWidth;
        let height = window.innerHeight;

        const initParticles = () => {
            particles = [];
            const particleCount = Math.floor((width * height) / BASE_PARTICLE_DENSITY);

            for (let i = 0; i < particleCount; i++) {
                const x = Math.random() * width;
                const y = Math.random() * height;

                particles.push({
                    x,
                    y,
                    vx: (Math.random() - 0.5) * 0.3,
                    vy: (Math.random() - 0.5) * 0.3,
                    size: Math.random() * 2.5 + 1,
                    alpha: Math.random() * 0.35 + 0.15,
                    pulse: Math.random() * Math.PI * 2,
                    cellX: Math.floor(x / GRID_SIZE),
                    cellY: Math.floor(y / GRID_SIZE),
                    connections: 0
                });
            }
        };

        const resize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
            initParticles();
        };

        window.addEventListener('resize', resize);
        resize();

        const draw = () => {
            ctx.clearRect(0, 0, width, height);

            // Build spatial grid - O(n) operation
            const grid = new Map<string, Particle[]>();

            particles.forEach(p => {
                // Update position
                p.x += p.vx;
                p.y += p.vy;

                // Wrap around screen
                if (p.x < 0) p.x = width;
                if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height;
                if (p.y > height) p.y = 0;

                // Update grid cell
                p.cellX = Math.floor(p.x / GRID_SIZE);
                p.cellY = Math.floor(p.y / GRID_SIZE);

                // Add to grid
                const key = `${p.cellX},${p.cellY}`;
                if (!grid.has(key)) grid.set(key, []);
                grid.get(key)!.push(p);

                // Reset connection counter
                p.connections = 0;

                // Update pulse
                p.pulse += 0.02 + (growthPulse * 0.05);
            });

            // Draw connections using spatial optimization
            particles.forEach(p => {
                if (p.connections >= MAX_CONNECTIONS_PER_PARTICLE) return;

                // Check only adjacent 9 cells (3x3 grid around particle)
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        const key = `${p.cellX + dx},${p.cellY + dy}`;
                        const neighbors = grid.get(key) || [];

                        for (const p2 of neighbors) {
                            if (p === p2) continue;
                            if (p.connections >= MAX_CONNECTIONS_PER_PARTICLE) break;
                            if (p2.connections >= MAX_CONNECTIONS_PER_PARTICLE) continue;

                            const dx2 = p.x - p2.x;
                            const dy2 = p.y - p2.y;
                            const distSq = dx2 * dx2 + dy2 * dy2;

                            if (distSq < CONNECTION_DISTANCE * CONNECTION_DISTANCE) {
                                const dist = Math.sqrt(distSq);
                                const opacity = 0.15 * (1 - dist / CONNECTION_DISTANCE);
                                const shimmer = shimmerIntensity * 0.3;

                                ctx.beginPath();
                                ctx.strokeStyle = `rgba(234, 179, 8, ${opacity + shimmer})`;
                                ctx.lineWidth = 0.5 + shimmer;
                                ctx.moveTo(p.x, p.y);
                                ctx.lineTo(p2.x, p2.y);
                                ctx.stroke();

                                p.connections++;
                                p2.connections++;
                            }
                        }
                    }
                }
            });

            // Draw particles
            particles.forEach(p => {
                const currentAlpha = p.alpha + Math.sin(p.pulse) * 0.06 + (shimmerIntensity * 0.2);
                const currentSize = p.size + (growthPulse * 0.8);

                ctx.beginPath();
                ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(16, 185, 129, ${currentAlpha})`;
                ctx.fill();

                // Add glow on shimmer
                if (shimmerIntensity > 0) {
                    ctx.shadowBlur = 8 * shimmerIntensity;
                    ctx.shadowColor = 'rgba(16, 185, 129, 0.6)';
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            });

            animationFrameId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [shimmerIntensity, growthPulse]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-0 opacity-40"
            style={{ mixBlendMode: 'screen' }}
        />
    );
};
