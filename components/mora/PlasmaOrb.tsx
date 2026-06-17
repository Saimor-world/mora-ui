/**
 * PlasmaOrb - Jupiter/Sun-like liquid hot orb
 * 
 * Canvas 2D implementation with plasma noise effect for large hero usage.
 * Small/medium always-visible orbs use a lighter GPU-friendly CSS render path.
 * 
 * Inspired by:
 * - Jupiter's swirling atmosphere
 * - Solar plasma surface
 * - Lava lamp viscosity
 * 
 * POLISHED: Enhanced glow effects, smoother animations, breathing effect
 */

import React, { useRef, useEffect, useMemo } from 'react';

interface PlasmaOrbProps {
    color: string;
    state: 'idle' | 'thinking' | 'alert' | 'focus' | 'demo' | 'curious' | 'learning' | 'insight';
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
    const lastRenderRef = useRef(0);
    const isPageVisibleRef = useRef(true);

    // Parse color to RGB
    const baseColor = useMemo(() => {
        const hex = color.replace('#', '');
        return {
            r: parseInt(hex.substr(0, 2), 16),
            g: parseInt(hex.substr(2, 2), 16),
            b: parseInt(hex.substr(4, 2), 16)
        };
    }, [color]);
    const useStaticOrb = size <= 20; // Use static orb only for very small sizes

    // State-based parameters — tuned for clean plasma-heart (less turbulence = more premium)
    const params = useMemo(() => {
        switch (state) {
            case 'thinking':
                return { speed: 0.5, turbulence: 0.9, glow: 2.2, breathe: 0.025 };
            case 'alert':
                return { speed: 0.9, turbulence: 1.1, glow: 3.0, breathe: 0.04 };
            case 'focus':
                return { speed: 0.2, turbulence: 0.45, glow: 1.6, breathe: 0.015 };
            case 'curious':
                return { speed: 0.65, turbulence: 0.75, glow: 2.4, breathe: 0.03 };
            case 'learning':
                return { speed: 0.35, turbulence: 1.0, glow: 1.9, breathe: 0.02 };
            case 'insight':
                return { speed: 0.25, turbulence: 0.35, glow: 3.8, breathe: 0.055 };
            default: // idle
                return { speed: 0.3, turbulence: 0.55, glow: 1.8, breathe: 0.012 };
        }
    }, [state]);

    useEffect(() => {
        if (useStaticOrb) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) {
            console.error('[PlasmaOrb] Canvas 2D context not available');
            return;
        }

        // Set canvas size (HiDPI support)
        const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        canvas.style.width = `${size}px`;
        canvas.style.height = `${size}px`;
        ctx.scale(dpr, dpr);

        const centerX = size / 2;
        const centerY = size / 2;
        const radius = size * 0.46;

        const noise = noiseRef.current;

        const MAX_FPS = state === 'thinking' || state === 'alert' ? 16 : 14;
        const MIN_FRAME_MS = 1000 / MAX_FPS;

        const render = (ts: number) => {
            if (!isPageVisibleRef.current) {
                animationFrameRef.current = requestAnimationFrame(render);
                return;
            }
            if (lastRenderRef.current && ts - lastRenderRef.current < MIN_FRAME_MS) {
                animationFrameRef.current = requestAnimationFrame(render);
                return;
            }
            lastRenderRef.current = ts;
            timeRef.current += 0.008 * params.speed;  // Smoother time step

            // Breathing effect - smooth sinusoidal scale
            const breathe = 1 + Math.sin(timeRef.current * 2) * params.breathe;

            // Clear canvas
            ctx.clearRect(0, 0, size, size);

            // Create image data for pixel manipulation
            const imageData = ctx.createImageData(size, size);
            const data = imageData.data;

            // Render plasma effect — original formula restored, targeted fixes
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    const dx = x - centerX;
                    const dy = y - centerY;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist > radius + 1) continue;

                    const nx = dx / radius;
                    const ny = dy / radius;
                    const falloff = 1 - dist / radius;

                    // 2-octave noise (cleaner than 3, less marbling)
                    const n1 = noise.noise2D(nx * 2 + timeRef.current, ny * 2 + timeRef.current);
                    const n2 = noise.noise2D(nx * 4 + timeRef.current * 0.45, ny * 4 - timeRef.current * 0.4);

                    let accentNoise = 0;
                    if (state === 'thinking') {
                        accentNoise = noise.noise2D(nx * 10 + timeRef.current * 1.5, ny * 10 + timeRef.current * 1.5) * 0.3;
                    } else if (state === 'learning') {
                        accentNoise = noise.noise2D(nx * 5 + timeRef.current * 0.35, ny * 5 - timeRef.current * 0.35) * 0.25;
                    } else if (state === 'curious') {
                        accentNoise = noise.noise2D(nx * 9 + timeRef.current * 1.6, ny * 9 + timeRef.current * 1.6) * 0.22;
                    }

                    const plasma = (n1 * 0.55 + n2 * 0.45 + accentNoise) * params.turbulence;

                    // Brightness formula like original — gives visible plasma texture in mid-region
                    const colorVariation = Math.sin(plasma * Math.PI) * 0.12 + 1.08;
                    const brightness = (plasma * 0.35 + 2.6) * Math.pow(falloff, 0.8);

                    const idx = (y * size + x) * 4;
                    // milk at 90 (was 180) — still adds whiteness at center but less wash
                    const milk = 90 * Math.pow(falloff, 1.1);
                    const grainSeed = ((x * 17 + y * 31) % 23) / 23 - 0.5;
                    const grain = grainSeed * 7 * (1 - falloff * 0.5);

                    data[idx]     = Math.min(255, baseColor.r * brightness * colorVariation + milk + grain);
                    data[idx + 1] = Math.min(255, baseColor.g * brightness * colorVariation + milk + grain);
                    data[idx + 2] = Math.min(255, baseColor.b * brightness * colorVariation + milk + grain);
                    // Alpha: opaque body, feathered 1px rim, breathe scale
                    const rimFade = Math.min(1, radius + 1 - dist);
                    data[idx + 3] = Math.min(255, 255 * Math.pow(falloff, 0.12) * rimFade * 2.2 * breathe);
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

            // CURIOUS: Fast scanning ring sweep
            if (state === 'curious') {
                ctx.beginPath();
                ctx.strokeStyle = color + '55';
                ctx.lineWidth = 0.8;
                const sweep = (timeRef.current * 3) % (Math.PI * 2);
                ctx.arc(centerX, centerY, radius * 0.7, sweep, sweep + Math.PI * 0.6);
                ctx.stroke();
            }

            // LEARNING: Slow concentric wave rings
            if (state === 'learning') {
                ctx.strokeStyle = color + '33';
                ctx.lineWidth = 0.6;
                for (let i = 0; i < 3; i++) {
                    const wave = Math.sin(timeRef.current * 0.8 + i * 1.2);
                    const r = radius * (0.35 + i * 0.22 + wave * 0.04);
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }

            // INSIGHT: Bright golden flash burst
            if (state === 'insight') {
                const burst = Math.abs(Math.sin(timeRef.current * 1.5));
                ctx.globalCompositeOperation = 'screen';
                ctx.globalAlpha = burst * 0.5;
                const flashGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 0.6);
                flashGrad.addColorStop(0, '#FCD34D');
                flashGrad.addColorStop(0.5, '#F59E0BCC');
                flashGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = flashGrad;
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius * 0.6, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
                ctx.globalCompositeOperation = 'source-over';
            }

            // ── BLOOM PASS ──
            ctx.globalCompositeOperation = 'screen';

            // 1. Emerald core — centred, enhances pixel render (not replaces)
            ctx.globalAlpha = 0.28;
            const coreGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 0.7);
            coreGrad.addColorStop(0,    color + 'EE');
            coreGrad.addColorStop(0.4,  color + '99');
            coreGrad.addColorStop(0.75, color + '33');
            coreGrad.addColorStop(1,    color + '00');
            ctx.fillStyle = coreGrad;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius * 0.7, 0, Math.PI * 2);
            ctx.fill();

            // 2. Wide colour corona ring
            ctx.globalAlpha = 0.25;
            const coronaGrad = ctx.createRadialGradient(centerX, centerY, radius * 0.2, centerX, centerY, radius * 1.05);
            coronaGrad.addColorStop(0,    color + '00');
            coronaGrad.addColorStop(0.45, color + '88');
            coronaGrad.addColorStop(0.82, color + '33');
            coronaGrad.addColorStop(1,    color + '00');
            ctx.fillStyle = coronaGrad;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius * 1.05, 0, Math.PI * 2);
            ctx.fill();

            // Reset to source-over for the crisp specular glint
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;

            // 3. Specular glint — sharp white dot top-left (glass premium feel)
            //    This is source-over so it cuts through, not blends into soup
            const specX = centerX - radius * 0.22;
            const specY = centerY - radius * 0.25;
            const specGrad = ctx.createRadialGradient(specX, specY, 0, specX, specY, radius * 0.18);
            specGrad.addColorStop(0,   'rgba(255,255,255,0.88)');
            specGrad.addColorStop(0.35,'rgba(255,255,255,0.30)');
            specGrad.addColorStop(0.7, 'rgba(255,255,255,0.06)');
            specGrad.addColorStop(1,   'rgba(255,255,255,0)');
            ctx.fillStyle = specGrad;
            ctx.beginPath();
            ctx.arc(specX, specY, radius * 0.18, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowBlur = 0;

            animationFrameRef.current = requestAnimationFrame(render);
        };

        const onVisibility = () => {
            isPageVisibleRef.current = !document.hidden;
        };
        document.addEventListener("visibilitychange", onVisibility);

        animationFrameRef.current = requestAnimationFrame(render);

        return () => {
            document.removeEventListener("visibilitychange", onVisibility);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [size, baseColor, params, color, state, useStaticOrb]);

    // Determine animation durations based on state
    const pulseDuration = state === 'thinking' ? '1.5s'
        : state === 'alert' ? '0.8s'
            : state === 'curious' ? '1.2s'
                : state === 'insight' ? '0.6s'
                    : '3s';

    if (useStaticOrb) {
        return (
            <div
                className="relative cursor-pointer"
                style={{ width: size, height: size }}
                onClick={onClick}
            >
                <div
                    className="absolute inset-[-34%] rounded-full pointer-events-none"
                    style={{
                        background: `radial-gradient(circle at center, ${color}65 0%, ${color}26 40%, transparent 76%)`,
                        filter: 'blur(24px)',
                    }}
                />
                <div
                    className="absolute inset-[-14%] rounded-full pointer-events-none"
                    style={{
                        background: `conic-gradient(from 0deg,
                            transparent 0%,
                            ${color}22 8%,
                            transparent 17%,
                            rgba(255,255,255,0.08) 24%,
                            transparent 31%,
                            ${color}16 47%,
                            transparent 58%,
                            rgba(255,255,255,0.06) 72%,
                            transparent 80%,
                            ${color}20 92%,
                            transparent 100%
                        )`,
                        filter: 'blur(9px)',
                        transform: 'rotate(18deg)',
                    }}
                />
                <div
                    className="absolute inset-0 rounded-full overflow-hidden"
                    style={{
                        background: `
                            radial-gradient(160% 150% at 28% 22%, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.18) 12%, transparent 22%),
                            radial-gradient(120% 120% at 68% 78%, rgba(0,0,0,0.40) 0%, transparent 34%),
                            radial-gradient(105% 110% at 38% 36%, ${color}F2 0%, ${color}D6 38%, rgba(0,0,0,0.22) 100%)
                        `,
                        boxShadow: `0 0 ${Math.round(size * 0.45)}px ${color}70, 0 0 ${Math.round(size * 0.95)}px ${color}28, inset 0 1px 0 rgba(255,255,255,0.34), inset 0 -8px 18px rgba(0,0,0,0.22)`,
                        border: `1px solid ${color}99`,
                    }}
                >
                    <div
                        className="absolute inset-[7%] rounded-full pointer-events-none"
                        style={{
                            background: `conic-gradient(from 220deg,
                                transparent 0%,
                                rgba(255,255,255,0.12) 9%,
                                transparent 18%,
                                ${color}55 33%,
                                ${color}14 52%,
                                ${color}68 71%,
                                transparent 100%
                            )`,
                            mixBlendMode: 'screen',
                            filter: 'blur(7px)',
                            opacity: 0.78,
                            transform: 'rotate(-12deg)',
                        }}
                    />
                    <div
                        className="absolute inset-[18%] rounded-full pointer-events-none"
                        style={{
                            background: `radial-gradient(circle at 42% 38%, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.20) 16%, ${color}88 34%, transparent 68%)`,
                            filter: 'blur(7px)',
                            opacity: 0.5,
                        }}
                    />
                    <div
                        className="absolute inset-[11%] rounded-full pointer-events-none"
                        style={{
                            background: `radial-gradient(90% 70% at 58% 62%, rgba(0,0,0,0.22) 0%, transparent 65%)`,
                            mixBlendMode: 'multiply',
                        }}
                    />
                    <div
                        className="absolute top-[15%] left-[16%] w-[20%] h-[10%] rounded-full bg-white/75 pointer-events-none"
                        style={{ transform: 'rotate(-45deg)', filter: 'blur(0.8px)' }}
                    />
                    <div
                        className="absolute top-[24%] left-[28%] w-[11%] h-[6%] rounded-full bg-white/35 pointer-events-none"
                        style={{ transform: 'rotate(-28deg)', filter: 'blur(1px)' }}
                    />
                </div>
            </div>
        );
    }

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

            {/* Outer glow ring - Corona - ENHANCED */}
            <div
                className="absolute inset-[-35%] rounded-full pointer-events-none"
                style={{
                    background: `radial-gradient(circle at center, ${color}50 0%, ${color}25 40%, transparent 70%)`,
                    filter: 'blur(35px)',
                    animation: `pulse ${pulseDuration} ease-in-out infinite`
                }}
            />

            {/* Inner hot core glow - NEW */}
            <div
                className="absolute inset-[15%] rounded-full pointer-events-none"
                style={{
                    background: `radial-gradient(circle at 40% 40%, white 0%, ${color}AA 30%, transparent 60%)`,
                    filter: 'blur(8px)',
                    opacity: 0.4,
                    mixBlendMode: 'screen'
                }}
            />
        </div>
    );
};
