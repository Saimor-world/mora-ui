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
}

export const StarField: React.FC<StarFieldProps> = ({ warp = false, density = 'medium', opacity = 0.9 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const speedRef = useRef(0.04);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let stars: Star[] = [];
        let animationFrameId: number;
        let width = window.innerWidth;
        let height = window.innerHeight;

        const init = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;

            const densityMap = { low: 260, medium: 700, high: 1200 };
            const STAR_COUNT = densityMap[density] || 700;
            const colors = [
                '#FFFFFF', // White
                '#FFFFFF',
                '#E0F2FE', // Pale Blue
                '#FFFBEB', // Pale Gold
                '#F0FDFA', // Pale Cyan
            ];

            stars = Array.from({ length: STAR_COUNT }, () => {
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

        const render = () => {
            if (!ctx || !canvas) return;

            ctx.clearRect(0, 0, width, height);

            const targetSpeed = warp ? 15 : 0.005; // Much slower drift
            speedRef.current += (targetSpeed - speedRef.current) * 0.03;

            // DRAW NEBULAS (Background Atmosphere - VITALITY BOOST)
            const time = Date.now() * 0.0001;
            const nebulas = [
                { x: width * 0.2, y: height * 0.3, r: 650, color: 'rgba(16, 185, 129, 0.14)' }, // Primary Emerald
                { x: width * 0.8, y: height * 0.7, r: 750, color: 'rgba(5, 150, 105, 0.12)' }, // Deep Green
                { x: width * 0.5, y: height * 0.5, r: 900, color: 'rgba(6, 182, 212, 0.10)' }, // Subtle Cyan (Connective)
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


            // DRAW CONSTELLATION LINES (First, behind stars)
            // Group stars by clusterId and draw faint lines
            const clusters: Record<number, Star[]> = {};
            stars.forEach(s => {
                if (s.clusterId !== undefined) {
                    if (!clusters[s.clusterId]) clusters[s.clusterId] = [];
                    clusters[s.clusterId].push(s);
                }
            });

            ctx.lineWidth = 0.45; // Lighter, less geometric
            ctx.setLineDash([2, 6]);
            ctx.shadowBlur = 0;
            ctx.shadowColor = "transparent";

            if (density !== 'low') {
                Object.values(clusters).forEach(clusterStars => {
                    if (clusterStars.length < 3) return; // Need at least 3 for a shape

                    ctx.beginPath();
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)'; // Softer constellation lines

                    // Draw lines between stars in cluster with distance check
                    ctx.moveTo(clusterStars[0].x, clusterStars[0].y);
                    for (let i = 1; i < clusterStars.length; i++) {
                        const dx = clusterStars[i].x - clusterStars[i - 1].x;
                        const dy = clusterStars[i].y - clusterStars[i - 1].y;
                        if ((dx * dx + dy * dy) < 80000) { // Increased distance slightly
                            ctx.lineTo(clusterStars[i].x, clusterStars[i].y);
                        } else {
                            ctx.moveTo(clusterStars[i].x, clusterStars[i].y);
                        }
                    }
                    ctx.stroke();
                });
            }

            ctx.shadowBlur = 0; // Reset shadow for stars
            ctx.setLineDash([]);

            // DRAW STARS
            stars.forEach(star => {
                star.twinklePhase += star.twinkleSpeed * 0.8; // Slightly faster twinkle
                const twinkleAlpha = 0.4 + (Math.sin(star.twinklePhase) * 0.6);
                const finalAlpha = twinkleAlpha * star.brightness;

                ctx.fillStyle = star.color;
                ctx.globalAlpha = finalAlpha * 0.9;

                // WARP EFFECT
                if (warp) {
                    const streakLen = 40 * star.brightness;
                    ctx.beginPath();
                    // Draw Streak
                    ctx.ellipse(star.x + streakLen / 2, star.y, streakLen, star.size / 2, 0, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.beginPath();
                    ctx.arc(star.x, star.y, star.size * 0.9, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Enhanced Horizontal Drift & Vertical Float
                const driftSpeed = warp ? 20 : 0.05;
                // Actually previous code used speedRef.current which ramped to 0.005. 0.08 is 16x faster.
                star.x -= driftSpeed * (star.size * 0.5); // Parallax based on size

                // Vertical float
                star.y += Math.sin(Date.now() * 0.0005 + star.x * 0.01) * 0.05;

                if (star.x < 0) {
                    star.x = width; // wrap around
                    star.y = Math.random() * height;
                }
            });

            // SHOOTING STARS (Rare, White/Cyan, not Green)
            if (!warp && Math.random() > 0.995) { // Slightly rarer
                ctx.beginPath();
                const sx = Math.random() * width;
                const sy = Math.random() * height * 0.5;
                const length = Math.random() * 200 + 100;
                // Draw simple streak
                const gradient = ctx.createLinearGradient(sx, sy, sx - length, sy + length);
                gradient.addColorStop(0, "rgba(255,255,255,0)");
                gradient.addColorStop(0.5, "rgba(220,250,255,0.6)"); // Brighter
                gradient.addColorStop(1, "rgba(255,255,255,0)");
                ctx.strokeStyle = gradient;
                ctx.lineWidth = 1.5;
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx - length, sy + length); // Diagonal down-left
                ctx.stroke();
            }

            ctx.globalAlpha = 1.0;
            animationFrameId = requestAnimationFrame(render);
        };

        init();
        render();

        const handleResize = () => {
            init();
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [warp]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-[-9] mix-blend-screen"
            style={{ opacity }}
        />
    );
};
