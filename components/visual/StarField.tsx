"use client";

import React, { useEffect, useRef } from 'react';

/**
 * StarField — Living Ambient Deep Space Background
 *
 * Three parallax depth layers give genuine 3D depth:
 *   far   — 500 tiny dim stars, near-zero drift  (depth illusion: very distant)
 *   mid   — 280 medium stars, slow drift
 *   near  — 120 bright large stars, faster drift  (depth illusion: close-in)
 *
 * Each layer scrolls at a different speed so the field breathes as a volume,
 * not a flat plane.  Stars wrap at edges.
 *
 * Nebula: 4 slow-moving radial gradients in deep-space palette
 * (indigo / violet / teal / black).  They oscillate on different phase
 * offsets so the colour field shifts over ~90-second cycles.
 *
 * Shooting stars: random, short-lived streaks across the upper half.
 *
 * Performance: single Canvas, one rAF loop, paused when tab is hidden
 * or when the paused prop is true.
 */

interface StarLayer {
    x: number;
    y: number;
    size: number;
    brightness: number;
    twinkleSpeed: number;
    twinklePhase: number;
    color: string;
    driftX: number;   // pixels per frame
    driftY: number;
}

interface ShootingStar {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;      // 0..1
    maxLife: number;
    length: number;
}

interface StarFieldProps {
    warp?: boolean;
    density?: 'low' | 'medium' | 'high';
    opacity?: number;
    paused?: boolean;
}

// Deep space palette — avoid green, lean into indigo/violet/teal
const FAR_COLORS  = ['#FFFFFF', '#E8E8FF', '#D4D4F8', '#C8D8FF'];
const MID_COLORS  = ['#FFFFFF', '#F0F0FF', '#B8C8FF', '#E0D8FF', '#C8F0F8'];
const NEAR_COLORS = ['#FFFFFF', '#FFFFFF', '#FFE8C8', '#C8E8FF', '#E8C8FF'];

const NEBULA_DEFS = [
    { rx: 0.15, ry: 0.25, color: [110,  38, 160] as [number,number,number], phase: 0    },  // deep violet
    { rx: 0.82, ry: 0.65, color: [20,   33, 140] as [number,number,number], phase: 1.3  },  // indigo navy
    { rx: 0.45, ry: 0.55, color: [10,  110, 160] as [number,number,number], phase: 2.6  },  // deep teal
    { rx: 0.78, ry: 0.22, color: [100,  10, 130] as [number,number,number], phase: 0.8  },  // dark magenta
];

function makeLayer(
    width: number,
    height: number,
    count: number,
    sizeMin: number,
    sizeMax: number,
    briMin: number,
    briMax: number,
    driftXBase: number,
    colors: string[],
): StarLayer[] {
    return Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * (sizeMax - sizeMin) + sizeMin,
        brightness: Math.random() * (briMax - briMin) + briMin,
        twinkleSpeed: Math.random() * 0.018 + 0.002,
        twinklePhase: Math.random() * Math.PI * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        driftX: driftXBase * (0.7 + Math.random() * 0.6),
        driftY: (Math.random() - 0.5) * 0.012,
    }));
}

export const StarField: React.FC<StarFieldProps> = ({
    warp = false,
    density = 'medium',
    opacity = 0.92,
    paused = false,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const densityScale = density === 'low' ? 0.28 : density === 'high' ? 1.8 : 1.0;
        const drawNebulaLayer = density !== 'low';
        const drawStarGlow = density !== 'low';

        let farLayer:  StarLayer[] = [];
        let midLayer:  StarLayer[] = [];
        let nearLayer: StarLayer[] = [];
        let shooters:  ShootingStar[] = [];
        let w = 0, h = 0;

        const init = () => {
            w = window.innerWidth;
            h = window.innerHeight;
            canvas.width  = w;
            canvas.height = h;

            const far  = Math.round(500 * densityScale);
            const mid  = Math.round(280 * densityScale);
            const near = Math.round(120 * densityScale);

            farLayer  = makeLayer(w, h, far,  0.3, 1.0, 0.15, 0.60, 0.008, FAR_COLORS);
            midLayer  = makeLayer(w, h, mid,  0.7, 1.6, 0.35, 0.85, 0.028, MID_COLORS);
            nearLayer = makeLayer(w, h, near, 1.4, 2.8, 0.60, 1.00, 0.065, NEAR_COLORS);
            shooters  = [];
        };

        init();
        window.addEventListener('resize', init);

        let rafId = 0;
        let running = false;

        const spawnShooter = () => {
            const angle = (Math.random() * 30 + 15) * (Math.PI / 180); // 15-45° downward
            const speed = Math.random() * 8 + 6;
            const life  = Math.random() * 40 + 30;
            shooters.push({
                x: Math.random() * w,
                y: Math.random() * h * 0.6,
                vx: -Math.cos(angle) * speed,
                vy:  Math.sin(angle) * speed,
                life,
                maxLife: life,
                length: Math.random() * 180 + 80,
            });
        };

        const drawNebula = (t: number) => {
            const nebulaR = Math.min(w, h) * 0.65;
            NEBULA_DEFS.forEach((n) => {
                const driftX = Math.sin(t * 0.00008 + n.phase) * 120;
                const driftY = Math.cos(t * 0.00006 + n.phase * 0.7) * 60;
                const cx = w * n.rx + driftX;
                const cy = h * n.ry + driftY;
                const alpha = 0.16 + Math.sin(t * 0.00004 + n.phase) * 0.06;
                const [r, g, b] = n.color;
                const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, nebulaR);
                grad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
                grad.addColorStop(0.5, `rgba(${r},${g},${b},${alpha * 0.4})`);
                grad.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, w, h);
            });
        };

        const drawLayer = (layer: StarLayer[], t: number, warpStreak: number, frameIndex: number) => {
            layer.forEach((s) => {
                s.twinklePhase += s.twinkleSpeed;
                const twinkle = 0.35 + Math.sin(s.twinklePhase) * 0.65;
                const alpha = twinkle * s.brightness;

                ctx.globalAlpha = Math.min(alpha, 1);
                ctx.fillStyle = s.color;

                if (warpStreak > 0) {
                    const streak = warpStreak * s.size * 18 * s.brightness;
                    ctx.beginPath();
                    ctx.ellipse(s.x + streak * 0.5, s.y, streak, s.size * 0.35, 0, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                    ctx.fill();

                    // Glow for bright near stars — skip on low density / every other frame
                    if (drawStarGlow && s.size > 1.2 && alpha > 0.45 && frameIndex % 2 === 0) {
                        const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 3.5);
                        glow.addColorStop(0, `${s.color}30`);
                        glow.addColorStop(1, 'transparent');
                        ctx.fillStyle = glow;
                        ctx.beginPath();
                        ctx.arc(s.x, s.y, s.size * 3.5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }

                // Drift + wrap
                const driftMul = warpStreak > 0 ? 12 : 1;
                s.x -= s.driftX * driftMul;
                s.y += s.driftY;
                if (s.x < -4) { s.x = w + 4; s.y = Math.random() * h; }
                if (s.x > w + 4) s.x = -4;
                if (s.y < 0) s.y = h;
                if (s.y > h) s.y = 0;
            });
        };

        const drawShooters = () => {
            shooters = shooters.filter((s) => s.life > 0);
            shooters.forEach((s) => {
                const progress = s.life / s.maxLife;
                const alpha = progress < 0.3 ? progress / 0.3 : progress > 0.7 ? (1 - progress) / 0.3 : 1;
                const tailX = s.x - (s.vx / Math.hypot(s.vx, s.vy)) * s.length * progress;
                const tailY = s.y - (s.vy / Math.hypot(s.vx, s.vy)) * s.length * progress;
                const grad = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
                grad.addColorStop(0, 'rgba(220,240,255,0)');
                grad.addColorStop(0.6, `rgba(220,240,255,${alpha * 0.5})`);
                grad.addColorStop(1, `rgba(255,255,255,${alpha * 0.9})`);
                ctx.globalAlpha = 1;
                ctx.strokeStyle = grad;
                ctx.lineWidth = 1.2;
                ctx.setLineDash([]);
                ctx.beginPath();
                ctx.moveTo(tailX, tailY);
                ctx.lineTo(s.x, s.y);
                ctx.stroke();
                s.x += s.vx;
                s.y += s.vy;
                s.life -= 1;
            });
        };

        let warpSpeed = 0;
        let frameCount = 0;

        const render = () => {
            if (!running) return;

            const t = Date.now();

            ctx.clearRect(0, 0, w, h);

            // Nebula first (background) — skipped on low density (Universe has its own nebula)
            if (drawNebulaLayer) {
                drawNebula(t);
            }

            // Warp interpolation
            const targetWarp = warp ? 1 : 0;
            warpSpeed += (targetWarp - warpSpeed) * 0.04;

            ctx.globalAlpha = 1;
            ctx.setLineDash([]);

            // Three depth layers — far drawn first (dimmest, slowest)
            drawLayer(farLayer,  t, warpSpeed, frameCount);
            drawLayer(midLayer,  t, warpSpeed, frameCount);
            drawLayer(nearLayer, t, warpSpeed, frameCount);

            // Shooting stars
            drawShooters();
            frameCount++;
            if (!warp && frameCount % 380 === 0 && Math.random() > 0.35) spawnShooter();

            ctx.globalAlpha = 1;
            rafId = requestAnimationFrame(render);
        };

        const start = () => {
            if (running) return;
            running = true;
            rafId = requestAnimationFrame(render);
        };

        const stop = () => {
            running = false;
            if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
        };

        const handleVisibility = () => {
            if (paused || document.hidden) stop(); else start();
        };

        handleVisibility();
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('resize', init);
            stop();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [warp, density, paused]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-[1] mix-blend-screen"
            style={{ opacity }}
        />
    );
};
