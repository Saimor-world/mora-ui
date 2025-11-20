"use client";

import React, { useEffect, useRef } from 'react';

interface OrganicBackgroundProps {
    intensity?: number;
    breathingSpeed?: number;
}

export const OrganicBackground: React.FC<OrganicBackgroundProps> = ({ intensity = 1, breathingSpeed = 3300 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Array<{
            x: number;
            y: number;
            vx: number;
            vy: number;
            size: number;
            baseAlpha: number;
            phase: number;
            biolumPhase: number;
        }> = [];
        let time = 0;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', resize);
        resize();

        // Create particles (spores)
        const createParticles = () => {
            const count = 80 * intensity;
            particles = [];
            for (let i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * 0.15,
                    vy: (Math.random() - 0.5) * 0.15,
                    size: Math.random() * 2 + 0.5,
                    baseAlpha: Math.random() * 0.4 + 0.1,
                    phase: Math.random() * Math.PI * 2,
                    biolumPhase: Math.random() * 100
                });
            }
        };

        createParticles();

        const draw = () => {
            time += 16; // approx 60fps
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Deep Gradient Background (Breathing)
            const breathe = (Math.sin(time / breathingSpeed) + 1) / 2; // 0 to 1
            const gradientRadius = canvas.width * (0.8 + breathe * 0.05);

            const gradient = ctx.createRadialGradient(
                canvas.width / 2, canvas.height / 2, 0,
                canvas.width / 2, canvas.height / 2, gradientRadius
            );
            gradient.addColorStop(0, '#1a3c34'); // Lighter forest green
            gradient.addColorStop(0.6, '#0E1F18'); // Deep forest
            gradient.addColorStop(1, '#050f0b'); // Almost black
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw Mycelium Connections (Subtle background webs)
            ctx.strokeStyle = 'rgba(206, 182, 118, 0.05)'; // faint gold
            ctx.lineWidth = 0.5;
            ctx.beginPath();

            // Optimization: Only connect nearby particles
            for (let i = 0; i < particles.length; i++) {
                const p1 = particles[i];

                // Update position
                p1.x += p1.vx;
                p1.y += p1.vy;

                // Bioluminescence
                const biolum = (Math.sin((time / 2000) + p1.biolumPhase) + 1) / 2;
                const currentAlpha = p1.baseAlpha * (0.6 + 0.4 * biolum);

                // Wrap around screen
                if (p1.x < 0) p1.x = canvas.width;
                if (p1.x > canvas.width) p1.x = 0;
                if (p1.y < 0) p1.y = canvas.height;
                if (p1.y > canvas.height) p1.y = 0;

                // Draw Spore
                // Draw Spore with glow
                const glow = ctx.createRadialGradient(p1.x, p1.y, 0, p1.x, p1.y, p1.size * 4);
                glow.addColorStop(0, `rgba(206, 182, 118, ${currentAlpha})`);
                glow.addColorStop(1, 'transparent');
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(p1.x, p1.y, p1.size * 4, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha * 1.5})`;
                ctx.beginPath();
                ctx.arc(p1.x, p1.y, p1.size, 0, Math.PI * 2);
                ctx.fill();

                // Connections
                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dx = p1.x - p2.x;
                    const dy = p1.y - p2.y;
                    const distSq = dx * dx + dy * dy;

                    if (distSq < 22500) { // 150^2
                        // Draw connection line between nearby particles
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                    }
                }
            }
            ctx.stroke();

            animationFrameId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [intensity, breathingSpeed]);

    return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" />;
};
