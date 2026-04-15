"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useMoraStore } from '@/lib/store/moraState';
import { useNavStore } from '@/lib/store/navStore';
import { useOrbStore } from '@/lib/store/orbStore';

/**
 * MYCELIUM NEURAL OVERLAY (V9 Cinematic Reference)
 * 
 * Representation of the hidden neural connections between departments.
 * Visualized as a living, glowing network of cyan silk threads.
 */

const GRID_SIZE = 120;
const MAX_CONNECTIONS_PER_PARTICLE = 3;
const CONNECTION_DISTANCE = 160;
const BASE_PARTICLE_DENSITY = 18000; // More particles for V9 depth

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
    const departments = useMoraStore((s) => s.departments);
    const activeSpaceId = useNavStore((s) => s.activeSpaceId);
    const activeFolderId = useNavStore((s) => s.activeFolderId);
    const orbState = useOrbStore((s) => s.orbState);

    const [shimmerIntensity, setShimmerIntensity] = useState(0);
    const departmentCount = Array.isArray(departments) ? departments.length : 0;

    useEffect(() => {
        if (departmentCount > 0) {
            setShimmerIntensity(0.5);
            setTimeout(() => setShimmerIntensity(0), 1000);
        }
    }, [departmentCount]);

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

        draw();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [shimmerIntensity]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-[-5] opacity-50"
            style={{ mixBlendMode: 'screen' }}
        />
    );
};
