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

const GRID_SIZE = 150;                      // Spatial hash cell size
const MAX_CONNECTIONS_PER_PARTICLE = 4;     // Lighter network (let stars breathe)
const CONNECTION_DISTANCE = 140;            // Tighter, less dominant connections
const BASE_PARTICLE_DENSITY = 24000;        // Lower density for clearer starfield

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
    // Sprint Tag 5-7: Add activeFolderId for Folder-Pulse
    const { departments, activeSpaceId, activeFolderId, activeNode, orbState } = useMoraStore();

    // Reactive visual states
    const [shimmerIntensity, setShimmerIntensity] = useState(0);
    const [growthPulse, setGrowthPulse] = useState(0);
    // Sprint Tag 5-7: Intel-Report Blitz State
    const [intelBlitz, setIntelBlitz] = useState(false);

    // React to Department growth (Pilze sprießen - Mushrooms sprouting)
    // Safe length calculation - handle null, undefined, and empty arrays
    const departmentCount = Array.isArray(departments) ? departments.length : 0;

    useEffect(() => {
        // Guard against null departments from store
        if (departmentCount > 0) {
            setGrowthPulse(0.6);
            setTimeout(() => setGrowthPulse(0), 1200);
        }
    }, [departmentCount]);


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

    // Sprint Tag 5-7: React to Folder selection (Folder Pulse)
    useEffect(() => {
        if (activeFolderId) {
            setShimmerIntensity(0.3);
            setGrowthPulse(0.4);
            setTimeout(() => {
                setShimmerIntensity(0);
                setGrowthPulse(0);
            }, 600);
        }
    }, [activeFolderId]);

    // React to Orb state shifts (light pulse)
    useEffect(() => {
        if (orbState === 'insight' || orbState === 'focus') {
            setShimmerIntensity(0.6);
            setTimeout(() => setShimmerIntensity(0), 900);
        }
        if (orbState === 'alert') {
            setGrowthPulse(0.5);
            setTimeout(() => setGrowthPulse(0), 700);
        }
    }, [orbState]);

    // Sprint Tag 5-7: Listen for Intel-Report creation (Synapsen-Blitz)
    useEffect(() => {
        const handleIntelReport = (event: Event) => {
            console.log('[Mycelium] Intel-Report-Blitz triggered');
            setIntelBlitz(true);
            setShimmerIntensity(0.8); // Strong flash
            setGrowthPulse(0.6);
            setTimeout(() => {
                setIntelBlitz(false);
                setShimmerIntensity(0);
                setGrowthPulse(0);
            }, 500); // Half-second blitz
        };

        window.addEventListener('intel-report-created', handleIntelReport);
        return () => window.removeEventListener('intel-report-created', handleIntelReport);
    }, []);

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
                    vx: (Math.random() - 0.5) * 0.2,  // Slower, more organic drift
                    vy: (Math.random() - 0.5) * 0.2,
                    size: Math.random() * 2.6 + 1.2,   // Organic spores, but lighter
                    alpha: Math.random() * 0.35 + 0.12, // Softer base visibility
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

            const baseVisibility = 0.04;

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
                                const opacity = 0.22 * (1 - dist / CONNECTION_DISTANCE) + baseVisibility;
                                const shimmer = shimmerIntensity * 0.4;

                                // Hyphen-like organic connections with gradient (orb-reactive)
                                const gradient = ctx.createLinearGradient(p.x, p.y, p2.x, p2.y);
                                const coreColor = orbState === 'insight'
                                    ? 'rgba(245, 158, 11, '
                                    : orbState === 'thinking'
                                        ? 'rgba(59, 130, 246, '
                                        : orbState === 'alert'
                                            ? 'rgba(239, 68, 68, '
                                            : 'rgba(16, 185, 129, ';
                                const glow = Math.min(1, opacity + shimmer);
                                gradient.addColorStop(0, `${coreColor}${glow})`);
                                gradient.addColorStop(0.5, `rgba(234, 179, 8, ${Math.min(1, opacity * 0.7 + shimmer)})`);
                                gradient.addColorStop(1, `${coreColor}${glow})`);

                                ctx.beginPath();
                                ctx.strokeStyle = gradient;
                                ctx.lineWidth = 0.9 + shimmer * 1.8;
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

            // Draw particles (spore-like)
            particles.forEach(p => {
                const currentAlpha = Math.min(
                    1,
                    p.alpha +
                    Math.sin(p.pulse) * 0.09 +
                    (shimmerIntensity * 0.25) +
                    baseVisibility
                );
                const currentSize = p.size + (growthPulse * 1.1);

                // Outer glow (always visible, organic halo)
                ctx.beginPath();
                ctx.arc(p.x, p.y, currentSize * 1.5, 0, Math.PI * 2);
                const outerGradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, currentSize * 1.5);
                outerGradient.addColorStop(0, `rgba(234, 179, 8, ${currentAlpha * 0.45})`);
                outerGradient.addColorStop(1, 'rgba(234, 179, 8, 0)');
                ctx.fillStyle = outerGradient;
                ctx.fill();

                // Core particle (spore)
                ctx.beginPath();
                ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
                const coreGradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, currentSize);
                coreGradient.addColorStop(0, `rgba(234, 179, 8, ${currentAlpha})`);
                coreGradient.addColorStop(1, `rgba(16, 185, 129, ${currentAlpha * 0.8})`);
                ctx.fillStyle = coreGradient;
                ctx.fill();

                // Add extra glow on shimmer (intel-report blitz)
                if (shimmerIntensity > 0) {
                    ctx.shadowBlur = 15 * shimmerIntensity;
                    ctx.shadowColor = 'rgba(234, 179, 8, 0.8)';
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
    }, [shimmerIntensity, growthPulse, intelBlitz]); // Sprint Tag 5-7: Added intelBlitz dependency

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-0 opacity-35"
            style={{ mixBlendMode: 'screen' }}
        />
    );
};
