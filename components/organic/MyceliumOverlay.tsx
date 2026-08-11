"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useNavStore } from '@/lib/store/navStore';
import { useDepartments } from '@/lib/queries/useDepartments';
import { useOrbStore } from '@/lib/store/orbStore';
import { usePageVisibility } from '@/lib/hooks/usePageVisibility';
import { getMyceliumOverview, type MyceliumOverview } from '@/lib/api/relationsClient';

/**
 * MYCELIUM OS NEURAL BACKBONE
 * 
 * The living, bio-neural relational backbone of SAIMÔR OS.
 * It physically anchors to the central Saimôr Core, Department Planets, and UI Widgets.
 * Silken hyphae threads transmit glowing action potential pulses and react dynamically to mouse gravitation.
 */

interface HyphaePulse {
    progress: number;
    speed: number;
    color: string;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    controlX: number;
    controlY: number;
}

interface HyphaeBranch {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    controlX: number;
    controlY: number;
    color: string;
    weight: number;
    targetName: string;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    alpha: number;
    pulse: number;
    color: string;
    anchorX?: number;
    anchorY?: number;
}

export const MyceliumOverlay: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pageVisible = usePageVisibility();
    const activeCompanyId = useNavStore((s) => s.activeCompanyId);
    const hoverDepartmentId = useNavStore((s) => s.hoverDepartmentId);
    const viewLevel = useNavStore((s) => s.viewLevel);
    const coreMode = useNavStore((s) => s.coreMode);
    const { data: departments = [] } = useDepartments(activeCompanyId);
    const orbState = useOrbStore((s) => s.orbState);

    const [overview, setOverview] = useState<MyceliumOverview | null>(null);
    const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: -1000, y: -1000, active: false });

    // Fetch Mycelium Overview stats from API
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
        const interval = window.setInterval(load, 20_000);
        return () => {
            cancelled = true;
            window.clearInterval(interval);
        };
    }, [activeCompanyId]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            mouseRef.current = { x: e.clientX, y: e.clientY, active: true };
        };
        const handleMouseLeave = () => {
            mouseRef.current.active = false;
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseleave', handleMouseLeave);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !pageVisible) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId = 0;
        let running = false;
        let width = window.innerWidth;
        let height = window.innerHeight;

        // Dynamic anchors based on actual screen geometry
        const getAnchors = () => {
            const centerX = width * 0.5;
            const centerY = height * 0.5;

            // Department Planet positions matching exact UniverseView topology
            const deptPosMap: Record<string, { xPct: number; yPct: number; color: string }> = {
                product:      { xPct: 0.50, yPct: 0.18, color: 'rgba(168, 85, 247, 0.88)' },
                intelligence: { xPct: 0.31, yPct: 0.55, color: 'rgba(6, 182, 212, 0.88)' },
                rd:           { xPct: 0.69, yPct: 0.55, color: 'rgba(59, 130, 246, 0.88)' },
                growth:       { xPct: 0.50, yPct: 0.82, color: 'rgba(234, 179, 8, 0.88)' },
            };

            const deptList = Array.isArray(departments) && departments.length > 0 ? departments : [
                { id: 'intelligence', name: 'INTELLIGENCE' },
                { id: 'product',      name: 'PRODUCT' },
                { id: 'rd',           name: 'R&D' },
                { id: 'growth',       name: 'GROWTH' },
            ];

            const deptAnchors = deptList.map((dept, index) => {
                const pos = deptPosMap[dept.id.toLowerCase()] || {
                    xPct: 0.50 + Math.cos((index / deptList.length) * Math.PI * 2 - Math.PI / 2) * 0.22,
                    yPct: 0.50 + Math.sin((index / deptList.length) * Math.PI * 2 - Math.PI / 2) * 0.28,
                    color: 'rgba(16, 185, 129, 0.85)',
                };
                return {
                    id: dept.id,
                    x: width * pos.xPct,
                    y: height * pos.yPct,
                    name: dept.name,
                    color: pos.color,
                };
            });

            return {
                core: { x: centerX, y: centerY, color: 'rgba(52, 211, 153, 0.95)' },
                departments: deptAnchors,
                widgets: [
                    { x: width * 0.12, y: height * 0.25, color: 'rgba(6, 182, 212, 0.6)' },
                    { x: width * 0.12, y: height * 0.75, color: 'rgba(16, 185, 129, 0.6)' },
                    { x: width * 0.88, y: height * 0.25, color: 'rgba(59, 130, 246, 0.6)' },
                    { x: width * 0.88, y: height * 0.75, color: 'rgba(234, 179, 8, 0.6)' },
                ]
            };
        };

        let anchors = getAnchors();

        // Generate organic curved hyphae branches connecting core to planets and widgets
        let hyphaeBranches: (HyphaeBranch & { deptId?: string })[] = [];
        let pulses: HyphaePulse[] = [];
        let particles: Particle[] = [];
        const mouseTrailParticles: { x: number; y: number; vx: number; vy: number; alpha: number; size: number; color: string }[] = [];

        const initHyphaeMesh = () => {
            hyphaeBranches = [];
            pulses = [];

            // 1. Connect Saimôr Core to every Department Planet with organic curved Bezier hyphae
            anchors.departments.forEach((dept, i) => {
                const midX = (anchors.core.x + dept.x) * 0.5 + (Math.sin(i * 1.5) * 40);
                const midY = (anchors.core.y + dept.y) * 0.5 + (Math.cos(i * 1.5) * 40);

                hyphaeBranches.push({
                    startX: anchors.core.x,
                    startY: anchors.core.y,
                    endX: dept.x,
                    endY: dept.y,
                    controlX: midX,
                    controlY: midY,
                    color: dept.color,
                    weight: 2.2,
                    targetName: dept.name,
                    deptId: dept.id,
                });

                // Add 2 active action potential pulses per main hypha
                for (let pIdx = 0; pIdx < 2; pIdx++) {
                    pulses.push({
                        progress: Math.random(),
                        speed: 0.004 + Math.random() * 0.008,
                        color: dept.color,
                        fromX: anchors.core.x,
                        fromY: anchors.core.y,
                        toX: dept.x,
                        toY: dept.y,
                        controlX: midX,
                        controlY: midY,
                    });
                }
            });

            // 2. Organic Curved Synaptic Ring (Connecting planets in a glowing bio-neural ring)
            const depts = anchors.departments;
            if (depts.length >= 4) {
                // Ring order: PRODUCT (top) -> R&D (right) -> GROWTH (bottom) -> INTELLIGENCE (left) -> PRODUCT
                const ringOrder = [
                    depts.find(d => d.id === 'product') || depts[0],
                    depts.find(d => d.id === 'rd') || depts[1],
                    depts.find(d => d.id === 'growth') || depts[2],
                    depts.find(d => d.id === 'intelligence') || depts[3],
                ];

                for (let i = 0; i < ringOrder.length; i++) {
                    const d1 = ringOrder[i];
                    const d2 = ringOrder[(i + 1) % ringOrder.length];
                    const midX = (d1.x + d2.x) * 0.5;
                    const midY = (d1.y + d2.y) * 0.5;

                    // Smooth outward bulge away from Saimôr Core center
                    const dirX = midX - anchors.core.x;
                    const dirY = midY - anchors.core.y;
                    const len = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
                    const bulge = 40;
                    const ctrlX = midX + (dirX / len) * bulge;
                    const ctrlY = midY + (dirY / len) * bulge;

                    hyphaeBranches.push({
                        startX: d1.x,
                        startY: d1.y,
                        endX: d2.x,
                        endY: d2.y,
                        controlX: ctrlX,
                        controlY: ctrlY,
                        color: d1.color.replace(/[\d\.]+\)$/, '0.45)'),
                        weight: 0.85,
                        targetName: `${d1.name}-${d2.name}`,
                        deptId: d1.id,
                    });

                    // Add pulse along the synaptic ring
                    pulses.push({
                        progress: Math.random(),
                        speed: 0.003 + Math.random() * 0.006,
                        color: 'rgba(255, 255, 255, 0.95)',
                        fromX: d1.x,
                        fromY: d1.y,
                        toX: d2.x,
                        toY: d2.y,
                        controlX: ctrlX,
                        controlY: ctrlY,
                    });
                }
            }

            // Floating Neural Spores (Spores that orbit the hyphae root anchors)
            particles = [];
            const sporeCount = 160;
            for (let i = 0; i < sporeCount; i++) {
                const targetDept = anchors.departments[i % anchors.departments.length];
                particles.push({
                    x: targetDept.x + (Math.random() - 0.5) * 220,
                    y: targetDept.y + (Math.random() - 0.5) * 220,
                    vx: (Math.random() - 0.5) * 0.4,
                    vy: (Math.random() - 0.5) * 0.4,
                    size: Math.random() * 2.8 + 1.0,
                    alpha: Math.random() * 0.7 + 0.3,
                    pulse: Math.random() * Math.PI * 2,
                    color: targetDept.color,
                    anchorX: targetDept.x,
                    anchorY: targetDept.y,
                });
            }
        };

        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.scale(dpr, dpr);
            anchors = getAnchors();
            initHyphaeMesh();
        };

        window.addEventListener('resize', resize);
        resize();

        // Quadratic Bezier point calculation
        const getBezierPoint = (t: number, p0: number, p1: number, p2: number) => {
            const oneMinusT = 1 - t;
            return oneMinusT * oneMinusT * p0 + 2 * oneMinusT * t * p1 + t * t * p2;
        };

        const draw = () => {
            if (!running) return;
            const dpr = window.devicePixelRatio || 1;
            ctx.clearRect(0, 0, width * dpr, height * dpr);

            const mouse = mouseRef.current;

            // 1. Draw Hyphae Root Mesh
            hyphaeBranches.forEach((branch) => {
                let ctrlX = branch.controlX;
                let ctrlY = branch.controlY;
                const isHoverSurge = hoverDepartmentId && (branch.deptId === hoverDepartmentId || branch.targetName.includes(hoverDepartmentId));

                // Mouse gravitational attraction bending hyphae threads toward cursor
                if (mouse.active) {
                    const dx = mouse.x - ctrlX;
                    const dy = mouse.y - ctrlY;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < 280 * 280) {
                        const dist = Math.sqrt(distSq);
                        const pull = (1 - dist / 280) * 45;
                        ctrlX += (dx / dist) * pull;
                        ctrlY += (dy / dist) * pull;
                    }
                }

                ctx.beginPath();
                ctx.moveTo(branch.startX, branch.startY);
                ctx.quadraticCurveTo(ctrlX, ctrlY, branch.endX, branch.endY);
                ctx.strokeStyle = isHoverSurge ? '#34d399' : branch.color;
                ctx.lineWidth = isHoverSurge ? branch.weight * 2.6 : branch.weight;
                ctx.shadowColor = isHoverSurge ? '#34d399' : branch.color;
                ctx.shadowBlur = isHoverSurge ? 24 : 12;
                ctx.stroke();
                ctx.shadowBlur = 0;
            });

            // 2. Draw Action Potential Light Pulses along Hyphae
            pulses.forEach((pulse) => {
                pulse.progress += pulse.speed;
                if (pulse.progress > 1) pulse.progress = 0;

                const px = getBezierPoint(pulse.progress, pulse.fromX, pulse.controlX, pulse.toX);
                const py = getBezierPoint(pulse.progress, pulse.fromY, pulse.controlY, pulse.toY);

                ctx.beginPath();
                ctx.arc(px, py, 3.5, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = pulse.color;
                ctx.shadowBlur = 16;
                ctx.fill();
                ctx.shadowBlur = 0;
            });

            // 3. Draw Neural Spores
            particles.forEach((p) => {
                p.x += p.vx;
                p.y += p.vy;

                // Restraining force pulling spores back toward their department anchor
                if (p.anchorX && p.anchorY) {
                    const dx = p.anchorX - p.x;
                    const dy = p.anchorY - p.y;
                    p.vx += dx * 0.00008;
                    p.vy += dy * 0.00008;
                }

                p.pulse += 0.02;
                const alpha = Math.min(1, p.alpha + Math.sin(p.pulse) * 0.2);

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = p.color.replace(/[\d\.]+\)$/, `${alpha})`);
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 8;
                ctx.fill();
                ctx.shadowBlur = 0;
            });

            // 4. Mouse Trail Particles — bio-luminescent cursor trail
            if (mouse.active && mouseTrailParticles.length < 50) {
                mouseTrailParticles.push({
                    x: mouse.x + (Math.random() - 0.5) * 12,
                    y: mouse.y + (Math.random() - 0.5) * 12,
                    vx: (Math.random() - 0.5) * 0.8,
                    vy: (Math.random() - 0.5) * 0.8 - 0.4,
                    alpha: 0.9,
                    size: Math.random() * 2.8 + 1.2,
                    color: ['rgba(6,182,212,0.95)', 'rgba(52,211,153,0.95)', 'rgba(168,85,247,0.95)', 'rgba(251,191,36,0.95)'][Math.floor(Math.random() * 4)],
                });
            }

            for (let i = mouseTrailParticles.length - 1; i >= 0; i--) {
                const tp = mouseTrailParticles[i];
                tp.x += tp.vx;
                tp.y += tp.vy;
                tp.alpha -= 0.025;
                if (tp.alpha <= 0) {
                    mouseTrailParticles.splice(i, 1);
                    continue;
                }
                ctx.beginPath();
                ctx.arc(tp.x, tp.y, tp.size, 0, Math.PI * 2);
                ctx.fillStyle = tp.color.replace(/[\d\.]+\)$/, `${tp.alpha})`);
                ctx.shadowColor = tp.color;
                ctx.shadowBlur = 10;
                ctx.fill();
                ctx.shadowBlur = 0;
            }

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
    }, [pageVisible, departments, hoverDepartmentId]);

    // Hide Mycelium constellation overlay on HOME operational dashboard
    if (viewLevel === 'core' && coreMode === 'home') {
        return null;
    }

    return (
        <div className="fixed inset-0 pointer-events-none z-[12]">
            <canvas
                ref={canvasRef}
                className="w-full h-full opacity-100 transition-opacity duration-700"
                style={{ mixBlendMode: 'screen' }}
            />
        </div>
    );
};
