"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useNavStore } from '@/lib/store/navStore';
import { useDepartments } from '@/lib/queries/useDepartments';
import { useOrbStore } from '@/lib/store/orbStore';
import { usePageVisibility } from '@/lib/hooks/usePageVisibility';
import { getMyceliumOverview, type MyceliumOverview } from '@/lib/api/relationsClient';

/**
 * MYCELIUM NEURAL OVERLAY (V9 Cinematic Reference)
 * 
 * Representation of the hidden neural connections between departments.
 * Visualized as a living, glowing network of cyan silk threads.
 */

const GRID_SIZE = 120;
const MAX_CONNECTIONS_PER_PARTICLE = 3;
const CONNECTION_DISTANCE = 160;
const BASE_PARTICLE_DENSITY = 24000; // Fewer particles — connections are O(n·neighbors)

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    alpha: number;
    pulse: number;
    cellX: number;
    cellY: number;
    connections: number;
}

export const MyceliumOverlay: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pageVisible = usePageVisibility();
    const activeCompanyId = useNavStore((s) => s.activeCompanyId);
    const { data: departments = [] } = useDepartments(activeCompanyId);
    const activeSpaceId = useNavStore((s) => s.activeSpaceId);
    const activeFolderId = useNavStore((s) => s.activeFolderId);
    const orbState = useOrbStore((s) => s.orbState);

    const [shimmerIntensity, setShimmerIntensity] = useState(0);
    const [overview, setOverview] = useState<MyceliumOverview | null>(null);
    const departmentCount = Array.isArray(departments) ? departments.length : 0;

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const next = await getMyceliumOverview(activeCompanyId);
                if (!cancelled) setOverview(next);
            } catch {
                if (!cancelled) setOverview(null);
            }
        };
        load();
        const interval = window.setInterval(load, 30_000);
        return () => {
            cancelled = true;
            window.clearInterval(interval);
        };
    }, [activeCompanyId]);

    useEffect(() => {
        if (departmentCount > 0 || (overview?.edges || 0) > 0) {
            setShimmerIntensity(0.5);
            setTimeout(() => setShimmerIntensity(0), 1000);
        }
    }, [departmentCount, overview?.edges]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !pageVisible) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId = 0;
        let running = false;
        let particles: Particle[] = [];
        let width = window.innerWidth;
        let height = window.innerHeight;

        const initParticles = () => {
            particles = [];
            const graphScale = Math.min(1.8, 0.8 + Math.sqrt(overview?.nodes || 0) / 18);
            const particleCount = Math.floor((width * height) / BASE_PARTICLE_DENSITY * graphScale);

            for (let i = 0; i < particleCount; i++) {
                const x = Math.random() * width;
                const y = Math.random() * height;

                particles.push({
                    x,
                    y,
                    vx: (Math.random() - 0.5) * 0.4, // Faster horizontal drift
                    vy: (Math.random() - 0.5) * 0.1,
                    size: Math.random() * 2 + 0.8,
                    alpha: Math.random() * 0.4 + 0.1,
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
            if (!running) return;
            ctx.clearRect(0, 0, width, height);

            const grid = new Map<string, Particle[]>();

            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0) p.x = width;
                if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height;
                if (p.y > height) p.y = 0;

                p.cellX = Math.floor(p.x / GRID_SIZE);
                p.cellY = Math.floor(p.y / GRID_SIZE);

                const key = `${p.cellX},${p.cellY}`;
                if (!grid.has(key)) grid.set(key, []);
                grid.get(key)!.push(p);

                p.connections = 0;
                p.pulse += 0.015;
            });

            // Draw connections (Silken Threads)
            particles.forEach(p => {
                if (p.connections >= MAX_CONNECTIONS_PER_PARTICLE) return;

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
                                const opacity = (0.3 * (1 - dist / CONNECTION_DISTANCE)) + (shimmerIntensity * 0.2);

                                ctx.beginPath();
                                ctx.strokeStyle = `rgba(6, 182, 212, ${opacity * 0.6})`;
                                ctx.lineWidth = 0.5;
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

            // Draw particles (Neural Spores)
            particles.forEach(p => {
                const alpha = Math.min(1, p.alpha + Math.sin(p.pulse) * 0.1 + shimmerIntensity);

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);

                const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
                grad.addColorStop(0, `rgba(6, 182, 212, ${alpha})`);
                grad.addColorStop(1, 'rgba(6, 182, 212, 0)');

                ctx.fillStyle = grad;
                ctx.fill();
            });

            animationFrameId = requestAnimationFrame(draw);
        };

        const start = () => {
            if (running) return;
            running = true;
            animationFrameId = requestAnimationFrame(draw);
        };

        const stop = () => {
            running = false;
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = 0;
            }
        };

        const handleVisibility = () => {
            if (document.hidden) stop();
            else start();
        };

        handleVisibility();
        document.addEventListener('visibilitychange', handleVisibility);
        start();

        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('resize', resize);
            stop();
        };
    }, [shimmerIntensity, pageVisible, overview?.nodes]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-[1] opacity-50"
            style={{ mixBlendMode: 'screen' }}
            aria-label={`Myzelium aktiv: ${overview?.nodes || 0} Objekte, ${overview?.edges || 0} Verbindungen`}
            data-mycelium-status={overview?.status || 'unavailable'}
            data-mycelium-nodes={overview?.nodes || 0}
            data-mycelium-edges={overview?.edges || 0}
        />
    );
};
