"use client";

import { useEffect, useRef } from 'react';
import { hexToRgb } from '@/lib/universe/color';

/**
 * Die eine Geste: etwas faellt ins Feld und findet seinen Bereich.
 *
 * Kein Dialog, kein Ladebalken - ein Punkt loest sich vom Loslassen-Ort,
 * kruemmt sich auf dem Weg zunehmend zum Ziel (er wird "eingefangen", nicht
 * gezogen) und schlaegt dort als Ring auf. computeFallTarget in fall.ts hat
 * bereits entschieden, wohin - diese Komponente zeigt nur, was entschieden
 * wurde.
 */

export interface FallState {
    from: { x: number; y: number };
    to: { x: number; y: number };
    color: string;
}

interface Props {
    fall: FallState | null;
    onLanded: () => void;
}

const FALL_MS = 1450;
const LANDING_MS = 420;
const TRAIL_LENGTH = 14;

function bezier(t: number, p0: number, p1: number, p2: number): number {
    const inv = 1 - t;
    return inv * inv * p0 + 2 * inv * t * p1 + t * t * p2;
}

export function FallCapture({ fall, onLanded }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const onLandedRef = useRef(onLanded);
    onLandedRef.current = onLanded;

    useEffect(() => {
        if (!fall) return;

        // Der Abschluss haengt an einer eigenen Uhr, nicht an den gezeichneten
        // Bildern: rAF-Framedrops duerfen verzoegern, wie fluessig es aussieht,
        // aber nie, ob und wann der Bereich als getroffen gilt.
        const total = FALL_MS + LANDING_MS;
        const finishTimer = window.setTimeout(() => onLandedRef.current(), total);

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d') ?? null;
        let frame = 0;
        let width = window.innerWidth;
        let height = window.innerHeight;
        const start = performance.now();
        const [r, g, b] = hexToRgb(fall.color);

        // Ein fester Kreuemmungssinn aus der Zielposition, damit derselbe Fall
        // bei einem erneuten Versuch dieselbe Kurve nimmt statt zufaellig zu
        // spiegeln.
        const dx = fall.to.x - fall.from.x;
        const dy = fall.to.y - fall.from.y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const bendSign = dx * dy >= 0 ? 1 : -1;
        const bend = Math.min(160, distance * 0.3) * bendSign;
        const midpoint = { x: (fall.from.x + fall.to.x) / 2, y: (fall.from.y + fall.to.y) / 2 };
        const control = {
            x: midpoint.x - (dy / distance) * bend,
            y: midpoint.y + (dx / distance) * bend,
        };

        const trail: { x: number; y: number }[] = [];

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = window.innerWidth;
            height = window.innerHeight;
            if (!canvas) return;
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';
            ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();
        window.addEventListener('resize', resize);

        const draw = (now: number) => {
            if (!ctx) return;
            ctx.clearRect(0, 0, width, height);
            ctx.globalCompositeOperation = 'lighter';

            const elapsed = now - start;

            if (elapsed <= FALL_MS) {
                const t = elapsed / FALL_MS;
                // Ease-in: der Fall beginnt langsam und zieht an, wie echter
                // Fall - kein linearer Transport von A nach B.
                const eased = t * t;
                // Die Kruemmung nimmt zum Ziel hin ab: der wirksame Steuerpunkt
                // wandert vom seitlichen Bogen (t=0) zur geraden Linie (t=1) -
                // am Anfang treibt es seitlich, am Ende wird es eingefangen
                // statt vorbeizuziehen.
                const cx = control.x + (midpoint.x - control.x) * eased;
                const cy = control.y + (midpoint.y - control.y) * eased;
                const px = bezier(eased, fall.from.x, cx, fall.to.x);
                const py = bezier(eased, fall.from.y, cy, fall.to.y);

                trail.push({ x: px, y: py });
                if (trail.length > TRAIL_LENGTH) trail.shift();

                trail.forEach((point, index) => {
                    const age = index / trail.length;
                    const radius = 1 + age * 3.2;
                    const alpha = age * age * 0.5;
                    ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
                    ctx.fill();
                });

                const head = ctx.createRadialGradient(px, py, 0, px, py, 10);
                head.addColorStop(0, `rgba(${r},${g},${b},0.95)`);
                head.addColorStop(0.4, `rgba(${r},${g},${b},0.5)`);
                head.addColorStop(1, `rgba(${r},${g},${b},0)`);
                ctx.fillStyle = head;
                ctx.beginPath();
                ctx.arc(px, py, 10, 0, Math.PI * 2);
                ctx.fill();
            } else {
                const landT = Math.min(1, (elapsed - FALL_MS) / LANDING_MS);
                const radius = 6 + landT * 46;
                const alpha = (1 - landT) * 0.7;
                ctx.strokeStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
                ctx.lineWidth = 2.4 * (1 - landT) + 0.6;
                ctx.beginPath();
                ctx.arc(fall.to.x, fall.to.y, radius, 0, Math.PI * 2);
                ctx.stroke();

                const core = ctx.createRadialGradient(fall.to.x, fall.to.y, 0, fall.to.x, fall.to.y, 14);
                core.addColorStop(0, `rgba(${r},${g},${b},${(alpha * 0.8).toFixed(3)})`);
                core.addColorStop(1, `rgba(${r},${g},${b},0)`);
                ctx.fillStyle = core;
                ctx.beginPath();
                ctx.arc(fall.to.x, fall.to.y, 14, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.globalCompositeOperation = 'source-over';

            if (elapsed <= total) frame = requestAnimationFrame(draw);
        };
        frame = requestAnimationFrame(draw);

        return () => {
            window.clearTimeout(finishTimer);
            if (frame) cancelAnimationFrame(frame);
            window.removeEventListener('resize', resize);
        };
        // fall wechselt bei jedem Loslassen auf ein neues Objekt - genau dann
        // soll ein neuer Fall beginnen.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fall]);

    if (!fall) return null;

    return (
        <div className="pointer-events-none fixed inset-0 z-[70]" aria-hidden="true">
            <canvas ref={canvasRef} className="h-full w-full" />
        </div>
    );
}
