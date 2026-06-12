"use client";

import React, { useEffect, useRef } from 'react';

/**
 * CURSOR TRAIL EFFECT (The Firefly)
 * 
 * High-performance Canvas rendering for the "Living Cursor" trail.
 * - Tracks user mouse
 * - Tracks Agency Cursor (Mora) when active
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

const getSceneTrailColor = (): string => {
    if (typeof document === 'undefined') return 'rgba(16, 185, 129, ';
    const rgb = getComputedStyle(document.documentElement).getPropertyValue('--scene-rgb').trim();
    return rgb ? `rgba(${rgb}, ` : 'rgba(16, 185, 129, ';
};

export const CursorTrailEffect: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particles = useRef<Point[]>([]);
    const animationFrame = useRef<number>(0);
    const mousePos = useRef({ x: -100, y: -100 });
    const lastMousePos = useRef({ x: -100, y: -100 });
    const isAgencyActive = useRef(false);
    const isRunning = useRef(false);
    const fadeFrameRef = useRef(0);
    const isDocumentVisible = useRef(true);

    // Listen for Mouse Movement
    useEffect(() => {
        const handleAgencyMove = (e: CustomEvent<{ x: number, y: number }>) => {
            isAgencyActive.current = true;
            mousePos.current = { x: e.detail.x, y: e.detail.y };
        };

        const handleAgencyStop = () => {
            isAgencyActive.current = false;
        };

        window.addEventListener('agency:cursor_move', handleAgencyMove as EventListener); // Custom event from AgencyCursor
        window.addEventListener('agency:stop', handleAgencyStop);

        return () => {
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

        const stop = () => {
            isRunning.current = false;
            if (animationFrame.current) {
                cancelAnimationFrame(animationFrame.current);
            }
            animationFrame.current = 0;
        };

        const render = () => {
            if (!isDocumentVisible.current) {
                stop();
                return;
            }

            // Fade out effect
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.globalCompositeOperation = 'lighter';

            // Spawn particles if moving
            const dx = mousePos.current.x - lastMousePos.current.x;
            const dy = mousePos.current.y - lastMousePos.current.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 1 && isAgencyActive.current) {
                // Number of particles based on speed
                const count = Math.min(4, Math.max(1, Math.floor(dist / 2)));

                for (let i = 0; i < count; i++) {
                    const life = 0.5 + Math.random() * 0.5;
                    particles.current.push({
                        x: mousePos.current.x + (Math.random() - 0.5) * 10,
                        y: mousePos.current.y + (Math.random() - 0.5) * 10,
                        vx: (Math.random() - 0.5) * 2,
                        vy: (Math.random() - 0.5) * 2,
                        life: life,
                        size: 1 + Math.random() * 2,
                        color: getSceneTrailColor()
                    });
                }
            }

            lastMousePos.current = { ...mousePos.current };

            // Update & Draw Particles
            for (let i = particles.current.length - 1; i >= 0; i--) {
                const p = particles.current[i];
                p.x += p.vx;
                p.y += p.vy;
                p.life -= 0.028;

                if (p.life <= 0) {
                    particles.current.splice(i, 1);
                    continue;
                }

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
                ctx.fillStyle = p.color + p.life + ')';
                ctx.fill();
            }

            const hasWork = isAgencyActive.current || particles.current.length > 0;
            if (!hasWork) {
                fadeFrameRef.current += 1;
                if (fadeFrameRef.current > 8) {
                    stop();
                    return;
                }
            } else {
                fadeFrameRef.current = 0;
            }

            animationFrame.current = requestAnimationFrame(render);
        };

        const start = () => {
            if (isRunning.current || !isDocumentVisible.current) return;
            isRunning.current = true;
            fadeFrameRef.current = 0;
            animationFrame.current = requestAnimationFrame(render);
        };

        const handleAgencyMove = () => start();
        const handleAgencyStop = () => {
            isAgencyActive.current = false;
            start();
        };
        const handleVisibilityChange = () => {
            isDocumentVisible.current = !document.hidden;
            if (document.hidden) {
                stop();
                return;
            }
            if (isAgencyActive.current || particles.current.length > 0) {
                start();
            }
        };

        window.addEventListener('agency:cursor_move', handleAgencyMove as EventListener);
        window.addEventListener('agency:stop', handleAgencyStop);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('agency:cursor_move', handleAgencyMove as EventListener);
            window.removeEventListener('agency:stop', handleAgencyStop);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            stop();
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-[9990]" // Just below AgencyCursor (9999)
        />
    );
};
