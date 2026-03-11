"use client";

import React, { useEffect, useRef } from 'react';

/**
 * STAR FIELD - V10 COLORFUL CONSTELLATIONS
 *
 * Features:
 * - Denser, more colorful stars (Green, Blue, Gold, White)
 * - Faint semantic constellation lines (automatic clustering)
 * - Parallax horizontal drift
 * - Organic twinkling
 */

interface Star {
    x: number;
    y: number;
    size: number;
    brightness: number;
    twinkleSpeed: number;
    twinklePhase: number;
    color: string;
    clusterId?: number;
}

interface StarFieldProps {
    warp?: boolean;
    density?: 'low' | 'medium' | 'high';
    opacity?: number;
    /**
     * When true, the rAF render loop is fully stopped.
     * Use this to pause the starfield when it is visually occluded
     * or when higher-priority interaction layers are active.
     */
    paused?: boolean;
}

export const StarField: React.FC<StarFieldProps> = ({ warp = false, density = 'medium', opacity = 0.9, paused = false }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const speedRef = useRef(0.04);
    const starsRef = useRef<Star[]>([]);
    const sizeRef = useRef({ width: 0, height: 0 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const init = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
            sizeRef.current = { width, height };

            const densityMap = { low: 260, medium: 700, high: 1200 };
            const starCount = densityMap[density] || 700;
            const colors = [
                '#FFFFFF',
                '#FFFFFF',
                '#E0F2FE',
                '#FFFBEB',
                '#F0FDFA',
            ];

            starsRef.current = Array.from({ length: starCount }, () => {
                const clusterId = Math.random() > 0.965 ? Math.floor(Math.random() * 40) : undefined;
                return {
                    x: Math.random() * width,
                    y: Math.random() * height,
                    size: Math.random() * 2.0 + 0.3,
                    brightness: Math.random() * 0.9 + 0.1,
                    twinkleSpeed: Math.random() * 0.02 + 0.002,
                    twinklePhase: Math.random() * Math.PI * 2,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    clusterId
                };
            });
        };

        init();
        window.addEventListener('resize', init);
        return () => window.removeEventListener('resize', init);
    }, [density]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId = 0;
        let isPaused = paused || document.hidden;

        const stop = () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = 0;
            }
        };

        const render = () => {
            if (isPaused) {
                stop();
                return;
            }

            const { width, height } = sizeRef.current;
            const stars = starsRef.current;
            if (!width || !height || stars.length === 0) {
                animationFrameId = requestAnimationFrame(render);
                return;
            }

            ctx.clearRect(0, 0, width, height);

            const targetSpeed = warp ? 15 : 0.005;
            speedRef.current += (targetSpeed - speedRef.current) * 0.03;

            const time = Date.now() * 0.0001;
            const nebulas = [
                { x: width * 0.2, y: height * 0.3, r: 650, color: 'rgba(16, 185, 129, 0.14)' },
                { x: width * 0.8, y: height * 0.7, r: 750, color: 'rgba(5, 150, 105, 0.12)' },
                { x: width * 0.5, y: height * 0.5, r: 900, color: 'rgba(6, 182, 212, 0.10)' },
            ];

            nebulas.forEach((neb, i) => {
                const moveX = Math.sin(time + i) * 100;
                const moveY = Math.cos(time + i * 1.5) * 50;
                const gradient = ctx.createRadialGradient(neb.x + moveX, neb.y + moveY, 0, neb.x + moveX, neb.y + moveY, neb.r);
                gradient.addColorStop(0, neb.color);
                gradient.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, width, height);
            });

            const clusters: Record<number, Star[]> = {};
            stars.forEach((star) => {
                if (star.clusterId === undefined) return;
                if (!clusters[star.clusterId]) clusters[star.clusterId] = [];
                clusters[star.clusterId].push(star);
            });

            ctx.lineWidth = 0.45;
            ctx.setLineDash([2, 6]);
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';

            if (density !== 'low') {
                Object.values(clusters).forEach((clusterStars) => {
                    if (clusterStars.length < 3) return;

                    ctx.beginPath();
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
                    ctx.moveTo(clusterStars[0].x, clusterStars[0].y);

                    for (let i = 1; i < clusterStars.length; i += 1) {
                        const dx = clusterStars[i].x - clusterStars[i - 1].x;
                        const dy = clusterStars[i].y - clusterStars[i - 1].y;
                        if ((dx * dx + dy * dy) < 80000) {
                            ctx.lineTo(clusterStars[i].x, clusterStars[i].y);
                        } else {
                            ctx.moveTo(clusterStars[i].x, clusterStars[i].y);
                        }
                    }

                    ctx.stroke();
                });
            }

            ctx.shadowBlur = 0;
            ctx.setLineDash([]);

            stars.forEach((star) => {
                star.twinklePhase += star.twinkleSpeed * 0.8;
                const twinkleAlpha = 0.4 + (Math.sin(star.twinklePhase) * 0.6);
                const finalAlpha = twinkleAlpha * star.brightness;

                ctx.fillStyle = star.color;
                ctx.globalAlpha = finalAlpha * 0.9;

                if (warp) {
                    const streakLen = 40 * star.brightness;
                    ctx.beginPath();
                    ctx.ellipse(star.x + streakLen / 2, star.y, streakLen, star.size / 2, 0, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.beginPath();
                    ctx.arc(star.x, star.y, star.size * 0.9, 0, Math.PI * 2);
                    ctx.fill();
                }

                const driftSpeed = warp ? 20 : 0.05;
                star.x -= driftSpeed * (star.size * 0.5);
                star.y += Math.sin(Date.now() * 0.0005 + star.x * 0.01) * 0.05;

                if (star.x < 0) {
                    star.x = width;
                    star.y = Math.random() * height;
                }
            });

            if (!warp && Math.random() > 0.995) {
                ctx.beginPath();
                const sx = Math.random() * width;
                const sy = Math.random() * height * 0.5;
                const length = Math.random() * 200 + 100;
                const gradient = ctx.createLinearGradient(sx, sy, sx - length, sy + length);
                gradient.addColorStop(0, 'rgba(255,255,255,0)');
                gradient.addColorStop(0.5, 'rgba(220,250,255,0.6)');
                gradient.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.strokeStyle = gradient;
                ctx.lineWidth = 1.5;
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx - length, sy + length);
                ctx.stroke();
            }

            ctx.globalAlpha = 1.0;
            animationFrameId = requestAnimationFrame(render);
        };

        const start = () => {
            if (animationFrameId || isPaused) return;
            animationFrameId = requestAnimationFrame(render);
        };

        const handleVisibilityChange = () => {
            isPaused = paused || document.hidden;
            if (isPaused) {
                stop();
                return;
            }
            start();
        };

        handleVisibilityChange();
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            stop();
        };
    }, [warp, density, paused]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-[-9] mix-blend-screen"
            style={{ opacity }}
        />
    );
};
