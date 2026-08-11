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

            // Department Planet positions relative to central corridor
            const deptList = Array.isArray(departments) && departments.length > 0 ? departments : [
                { id: 'intelligence', name: 'INTELLIGENCE', color: 'rgba(6, 182, 212, 0.85)' },
                { id: 'product', name: 'PRODUCT', color: 'rgba(168, 85, 247, 0.85)' },
                { id: 'rd', name: 'R&D', color: 'rgba(59, 130, 246, 0.85)' },
                { id: 'growth', name: 'GROWTH', color: 'rgba(234, 179, 8, 0.85)' },
            ];

            const deptAnchors = deptList.map((dept, index) => {
                const angle = (index / deptList.length) * Math.PI * 2 - Math.PI / 2;
                const rx = width * 0.18;
                const ry = height * 0.28;
                return {
                    id: dept.id,
                    x: centerX + Math.cos(angle) * rx,
                    y: centerY + Math.sin(angle) * ry,
                    name: dept.name,
                    color: (dept as any).color || 'rgba(16, 185, 129, 0.85)',
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
                    weight: 1.4,
                    targetName: dept.name,
                    deptId: dept.id,
                });

                // Add active action potential pulses along main hyphae
                pulses.push({
                    progress: Math.random(),
                    speed: 0.003 + Math.random() * 0.005,
                    color: dept.color,
                    fromX: anchors.core.x,
                    fromY: anchors.core.y,
                    toX: dept.x,
                    toY: dept.y,
                    controlX: midX,
                    controlY: midY,
                });
            });

            // 2. Connect Department Planets to adjacent Planets (Inter-Department Synapses)
            for (let i = 0; i < anchors.departments.length; i++) {
                const nextI = (i + 1) % anchors.departments.length;
                const d1 = anchors.departments[i];
                const d2 = anchors.departments[nextI];
                const midX = (d1.x + d2.x) * 0.5 + (Math.cos(i * 2) * 35);
                const midY = (d1.y + d2.y) * 0.5 + (Math.sin(i * 2) * 35);

                hyphaeBranches.push({
                    startX: d1.x,
                    startY: d1.y,
                    endX: d2.x,
                    endY: d2.y,
                    controlX: midX,
                    controlY: midY,
                    color: 'rgba(6, 182, 212, 0.45)',
                    weight: 0.9,
                    targetName: `${d1.name}-${d2.name}`,
                    deptId: d1.id,
                });
            }

            // 3. Connect Planets to Widget Anchors (OS Widget Integration)
            anchors.departments.forEach((dept, i) => {
                const widget = anchors.widgets[i % anchors.widgets.length];
                const midX = (dept.x + widget.x) * 0.5;
                const midY = (dept.y + widget.y) * 0.5;

                hyphaeBranches.push({
                    startX: dept.x,
                    startY: dept.y,
                    endX: widget.x,
                    endY: widget.y,
                    controlX: midX,
                    controlY: midY,
                    color: 'rgba(16, 185, 129, 0.35)',
                    weight: 0.7,
                    targetName: `Widget-${i}`,
                    deptId: dept.id,
                });
            });

            // 4. Floating Neural Spores (Spores that orbit the hyphae root anchors)
            particles = [];
            const sporeCount = 110;
            for (let i = 0; i < sporeCount; i++) {
                const targetDept = anchors.departments[i % anchors.departments.length];
                particles.push({
                    x: targetDept.x + (Math.random() - 0.5) * 180,
                    y: targetDept.y + (Math.random() - 0.5) * 180,
                    vx: (Math.random() - 0.5) * 0.3,
                    vy: (Math.random() - 0.5) * 0.3,
                    size: Math.random() * 2.2 + 0.8,
                    alpha: Math.random() * 0.6 + 0.25,
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

    return (
        <div className="fixed inset-0 pointer-events-none z-[9]">
            <canvas
                ref={canvasRef}
                className="w-full h-full opacity-95 transition-opacity duration-700"
                style={{ mixBlendMode: 'screen' }}
            />
        </div>
    );
};
