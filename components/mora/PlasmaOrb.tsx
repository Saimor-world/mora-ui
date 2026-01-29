/**
 * PlasmaOrb - Jupiter/Sun-like liquid hot orb
 * 
 * Canvas 2D implementation with plasma noise effect.
 * NO CSS fallback - forces proper canvas rendering.
 * 
 * Inspired by:
 * - Jupiter's swirling atmosphere
 * - Solar plasma surface
 * - Lava lamp viscosity
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';

interface PlasmaOrbProps {
    color: string;
    state: 'idle' | 'thinking' | 'alert' | 'focus' | 'demo';
    size?: number;
    onClick?: () => void;
}

// Simplex noise function (minimal implementation)
class SimplexNoise {
    private grad3 = [
        [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
        [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
        [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
    ];
    private p: number[] = [];
    private perm: number[] = [];

    constructor(seed: number = Math.random()) {
        // Initialize permutation table
        for (let i = 0; i < 256; i++) {
            this.p[i] = Math.floor(seed * 256 * (i + 1)) % 256;
        }
        for (let i = 0; i < 512; i++) {
            this.perm[i] = this.p[i & 255];
        }
    }

    noise2D(xin: number, yin: number): number {
        const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
        const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

        const s = (xin + yin) * F2;
        const i = Math.floor(xin + s);
        const j = Math.floor(yin + s);

        const t = (i + j) * G2;
        const X0 = i - t;
        const Y0 = j - t;
        const x0 = xin - X0;
        const y0 = yin - Y0;

        const i1 = x0 > y0 ? 1 : 0;
        const j1 = x0 > y0 ? 0 : 1;

        const x1 = x0 - i1 + G2;
        const y1 = y0 - j1 + G2;
        const x2 = x0 - 1.0 + 2.0 * G2;
        const y2 = y0 - 1.0 + 2.0 * G2;

        const ii = i & 255;
        const jj = j & 255;
        const gi0 = this.perm[ii + this.perm[jj]] % 12;
        const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12;
        const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12;

        const dot = (g: number[], x: number, y: number) => g[0] * x + g[1] * y;

        let t0 = 0.5 - x0 * x0 - y0 * y0;
        let n0 = t0 < 0 ? 0 : Math.pow(t0, 4) * dot(this.grad3[gi0], x0, y0);

        let t1 = 0.5 - x1 * x1 - y1 * y1;
        let n1 = t1 < 0 ? 0 : Math.pow(t1, 4) * dot(this.grad3[gi1], x1, y1);

        let t2 = 0.5 - x2 * x2 - y2 * y2;
        let n2 = t2 < 0 ? 0 : Math.pow(t2, 4) * dot(this.grad3[gi2], x2, y2);

        return 70.0 * (n0 + n1 + n2);
    }
}

export const PlasmaOrb: React.FC<PlasmaOrbProps> = ({
    color,
    state,
    size = 120,
    onClick
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number>();
    const timeRef = useRef(0);
    const noiseRef = useRef<SimplexNoise>(new SimplexNoise());

    // Parse color to RGB
    const baseColor = useMemo(() => {
        const hex = color.replace('#', '');
        return {
            r: parseInt(hex.substr(0, 2), 16),
            g: parseInt(hex.substr(2, 2), 16),
            b: parseInt(hex.substr(4, 2), 16)
        };
    }, [color]);

    // State-based parameters
    const params = useMemo(() => {
        switch (state) {
            case 'thinking':
                return { speed: 0.8, turbulence: 1.5, glow: 2.0 };
            case 'alert':
                return { speed: 1.5, turbulence: 2.0, glow: 3.0 };
            case 'focus':
                return { speed: 0.3, turbulence: 0.8, glow: 1.2 };
            default:
                return { speed: 0.5, turbulence: 1.0, glow: 1.5 };
        }
    }, [state]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) {
            console.error('[PlasmaOrb] Canvas 2D context not available');
            return;
        }

        // Set canvas size (HiDPI support)
        const dpr = window.devicePixelRatio || 1;
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        canvas.style.width = `${size}px`;
        canvas.style.height = `${size}px`;
        ctx.scale(dpr, dpr);

        const centerX = size / 2;
        const centerY = size / 2;
        const radius = size * 0.46;

        const noise = noiseRef.current;

        const render = () => {
            timeRef.current += 0.01 * params.speed;

            // Clear canvas
            ctx.clearRect(0, 0, size, size);

            // Create image data for pixel manipulation
            const imageData = ctx.createImageData(size, size);
            const data = imageData.data;

            // Render plasma effect
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    const dx = x - centerX;
                    const dy = y - centerY;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    // Only render inside orb
                    if (dist > radius) continue;

                    // Normalized coordinates
                    const nx = dx / radius;
                    const ny = dy / radius;

                    // Multi-octave noise for plasma effect
                    const noise1 = noise.noise2D(nx * 2 + timeRef.current, ny * 2 + timeRef.current);
                    const noise2 = noise.noise2D(nx * 4 + timeRef.current * 0.5, ny * 4 - timeRef.current * 0.5);
                    const noise3 = noise.noise2D(nx * 8 - timeRef.current * 0.3, ny * 8 + timeRef.current * 0.3);

                    // Distance-based darkening (sphere shading)
                    const falloffRaw = dist / radius;
                    const falloff = 1 - falloffRaw;

                    // NESTED BRAIN: Secondary high-frequency noise for 'thinking' state
                    let thinkingNoise = 0;
                    if (state === 'thinking') {
                        const tn1 = noise.noise2D(nx * 15 + timeRef.current * 2, ny * 15 + timeRef.current * 2);
                        const tn2 = noise.noise2D(nx * 30 - timeRef.current * 3, ny * 30 - timeRef.current * 3);
                        thinkingNoise = (tn1 * 0.6 + tn2 * 0.4) * falloff;
                    }

                    // Combine noise layers
                    const plasma = (noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2 + thinkingNoise * 0.25) * params.turbulence;

                    // LIQUID HOT SUN: Ultra-bright core, Jupiter-like surface
                    const brightness = (plasma * 0.4 + 2.8) * Math.pow(falloff, 0.8);

                    // Color with plasma variation - lighter mixes
                    const idx = (y * size + x) * 4;
                    const colorVariation = Math.sin(plasma * Math.PI) * 0.15 + 1.15;

                    // IMPERIAL MILK: More white for that molten sun look
                    const milk = 180 * Math.pow(falloff, 1.2);

                    // ADD TACTILE NOISE (Grain)
                    const grain = (Math.random() - 0.5) * 8 * (1 - falloff * 0.5);

                    data[idx] = Math.min(255, baseColor.r * brightness * colorVariation + milk + grain);
                    data[idx + 1] = Math.min(255, baseColor.g * brightness * colorVariation + milk + grain);
                    data[idx + 2] = Math.min(255, baseColor.b * brightness * colorVariation + milk + grain);
                    // HIGHER OPACITY: Make it look solid
                    data[idx + 3] = Math.min(255, 255 * Math.pow(falloff, 0.15) * 2.2);
                }
            }

            ctx.putImageData(imageData, 0, 0);

            // NESTED LEARNING: "Magnetic Field" lines for thinking state
            if (state === 'thinking') {
                ctx.beginPath();
                ctx.strokeStyle = color + '44';
                ctx.lineWidth = 0.5;
                for (let i = 0; i < 5; i++) {
                    const r = radius * (0.4 + i * 0.15);
                    const phase = timeRef.current * 2 + i;
                    ctx.ellipse(centerX, centerY, r, r * 0.8, phase, 0, Math.PI * 2);
                }
                ctx.stroke();
            }

            // Add glow layer (Bloom)
            ctx.shadowBlur = 40 * params.glow;
            ctx.shadowColor = color;
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.5;

            const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
            gradient.addColorStop(0, color + 'FF');
            gradient.addColorStop(0.4, color + 'CC');
            gradient.addColorStop(0.8, color + '44');
            gradient.addColorStop(1, color + '00');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();

            // Reset composite
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;

            animationFrameRef.current = requestAnimationFrame(render);
        };

        render();

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [size, baseColor, params, color]);

    return (
        <div
            className="relative cursor-pointer"
            style={{ width: size, height: size }}
            onClick={onClick}
        >
            {/* Canvas orb */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0"
            />

            {/* Solar Flares - rotating asymmetric glow */}
            <div
                className="absolute inset-[-25%] rounded-full pointer-events-none animate-spin"
                style={{
                    background: `conic-gradient(from 0deg,
                        ${color}00 0%, ${color}30 5%, ${color}00 10%,
                        ${color}00 25%, ${color}20 30%, ${color}00 35%,
                        ${color}00 55%, ${color}25 60%, ${color}00 65%,
                        ${color}00 85%, ${color}15 90%, ${color}00 95%
                    )`,
                    filter: 'blur(15px)',
                    animationDuration: '30s'
                }}
            />

            {/* Outer glow ring - Corona */}
            <div
                className="absolute inset-[-30%] rounded-full animate-pulse pointer-events-none"
                style={{
                    background: `radial-gradient(circle at center, ${color}40 0%, ${color}20 30%, transparent 70%)`,
                    filter: 'blur(30px)',
                    animationDuration: state === 'thinking' ? '2s' : state === 'alert' ? '1s' : '4s'
                }}
            />
        </div>
    );
};
