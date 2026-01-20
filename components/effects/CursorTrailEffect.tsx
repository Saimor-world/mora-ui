"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useMoraStore } from '@/lib/store/moraState';

/**
 * CURSOR TRAIL EFFECT (The Firefly)
 * 
 * High-performance Canvas rendering for the "Living Cursor" trail.
 * - Tracks user mouse
 * - Tracks Agency Cursor (MÔRA) when active
 * - Creates a bioluminescent particle trail (Firefly effect)
 */
interface Point {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    size: number;
    color: string;
}

export const CursorTrailEffect: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particles = useRef<Point[]>([]);
    const animationFrame = useRef<number>(0);
    const mousePos = useRef({ x: -100, y: -100 });
    const lastMousePos = useRef({ x: -100, y: -100 });
    const isAgencyActive = useRef(false);

    // Color palette - Emerald to Gold
    const colors = [
        'rgba(16, 185, 129, ', // Emerald-500
        'rgba(52, 211, 153, ', // Emerald-400
        'rgba(206, 182, 118, ' // Mora-Gold
    ];

    // Listen for Mouse Movement
    useEffect(() => {
        /* const handleMouseMove = (e: MouseEvent) => {
            if (!isAgencyActive.current) {
                mousePos.current = { x: e.clientX, y: e.clientY };
            }
        }; */

        // Listen for Agency Cursor Movement
        const handleAgencyMove = (e: CustomEvent<{ x: number, y: number }>) => {
            isAgencyActive.current = true;
            mousePos.current = { x: e.detail.x, y: e.detail.y };

            // Auto-release agency control after delay if no updates
            // (Optional simplified logic)
        };

        // Listen for Agency STOP
        const handleAgencyStop = () => {
            isAgencyActive.current = false;
        }

        // Mouse tracking disabled (User requested AI-only trail)
        // window.addEventListener('mousemove', handleMouseMove);

        window.addEventListener('agency:cursor_move', handleAgencyMove as EventListener); // Custom event from AgencyCursor
        window.addEventListener('agency:stop', handleAgencyStop);

        return () => {
            // window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('agency:cursor_move', handleAgencyMove as EventListener);
            window.removeEventListener('agency:stop', handleAgencyStop);
        };
    }, []);

    // Canvas Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Resize handler
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();

        // Animation Loop
        const render = () => {
            // Fade out effect
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.globalCompositeOperation = 'lighter';

            // Spawn particles if moving
            const dx = mousePos.current.x - lastMousePos.current.x;
            const dy = mousePos.current.y - lastMousePos.current.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 1) {
                // Number of particles based on speed
                const count = Math.min(5, Math.floor(dist));

                for (let i = 0; i < count; i++) {
                    const life = 0.5 + Math.random() * 0.5;
                    particles.current.push({
                        x: mousePos.current.x + (Math.random() - 0.5) * 10,
                        y: mousePos.current.y + (Math.random() - 0.5) * 10,
                        vx: (Math.random() - 0.5) * 2,
                        vy: (Math.random() - 0.5) * 2,
                        life: life,
                        size: 1 + Math.random() * 2,
                        color: colors[Math.floor(Math.random() * colors.length)]
                    });
                }
            }

            lastMousePos.current = { ...mousePos.current };

            // Update & Draw Particles
            for (let i = particles.current.length - 1; i >= 0; i--) {
                const p = particles.current[i];
                p.x += p.vx;
                p.y += p.vy;
                p.life -= 0.02;

                if (p.life <= 0) {
                    particles.current.splice(i, 1);
                    continue;
                }

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
                ctx.fillStyle = p.color + p.life + ')';
                ctx.fill();
            }

            animationFrame.current = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrame.current);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-[9990]" // Just below AgencyCursor (9999)
        />
    );
};
