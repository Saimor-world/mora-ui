"use client";

import React, { useEffect, useRef } from 'react';
import { usePageVisibility } from '@/lib/hooks/usePageVisibility';
import { useUniverseFieldStore } from '@/lib/store/universeFieldStore';
import { anchorsToViewport } from '@/lib/universe/anchors';

/**
 * Das lebende Netz unter dem Organisationsfeld.
 *
 * Was hier gezeichnet wird, ist Struktur, nicht Ereignis: dass ein Bereich zur
 * Organisation gehoert, ist wahr und braucht keinen Beleg. Belegte Signale
 * zeichnet RelationLayer im Feld selbst - gestrichelt, wenn sie nur vermutet
 * sind. Diese Trennung ist Absicht: das Myzel darf atmen, ohne etwas zu
 * behaupten.
 *
 * Die alte Fassung trug eine eigene, fest einprogrammierte Karte der
 * Planetenpositionen:
 *
 *     const deptPosMap = { product: {xPct:0.50,yPct:0.18}, ... }
 *     // "Department Planet positions matching exact UniverseView topology"
 *
 * Der Kommentar stimmte, als er geschrieben wurde. Dann rechnete
 * buildOrganicUniverseLayout die Positionen aus - und der Zugriff lief ohnehin
 * ueber deptPosMap[dept.id], wobei dept.id eine UUID ist und niemals
 * "product". Jede Abteilung fiel in die Ersatzformel, das Netz haing neben den
 * Planeten in der Luft. Eine Kopie faellt nicht auf, wenn sie falsch wird.
 *
 * Jetzt liest sie dieselbe Messung, die das Feld selbst veroeffentlicht.
 * Steht dort nichts - andere Ansicht, Handy-Raster, noch nicht gerendert -,
 * wird nichts gezeichnet.
 */

interface Thread {
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    controlX: number;
    controlY: number;
    color: string;
}

interface Pulse {
    thread: number;
    progress: number;
    speed: number;
}

interface Spore {
    angle: number;
    radius: number;
    speed: number;
    size: number;
    phase: number;
    anchorX: number;
    anchorY: number;
    color: string;
}

const MOUSE_REACH = 260;
const MOUSE_PULL = 38;

function hexToRgb(hex: string): [number, number, number] {
    const clean = hex.replace('#', '');
    const full = clean.length === 3
        ? clean.split('').map((c) => c + c).join('')
        : clean.padEnd(6, '0').slice(0, 6);
    return [
        parseInt(full.slice(0, 2), 16),
        parseInt(full.slice(2, 4), 16),
        parseInt(full.slice(4, 6), 16),
    ];
}

export const MyceliumOverlay: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pageVisible = usePageVisibility();
    const anchors = useUniverseFieldStore((state) => state.anchors);
    const rect = useUniverseFieldStore((state) => state.rect);
    const mouseRef = useRef({ x: -9999, y: -9999, active: false });

    useEffect(() => {
        const move = (event: MouseEvent) => {
            mouseRef.current = { x: event.clientX, y: event.clientY, active: true };
        };
        const leave = () => { mouseRef.current.active = false; };
        window.addEventListener('mousemove', move, { passive: true });
        window.addEventListener('mouseleave', leave);
        return () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseleave', leave);
        };
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !pageVisible) return;

        const points = anchorsToViewport(anchors, rect);
        if (points.length === 0 || !rect) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

        // Der Kern sitzt in der Mitte des gemessenen Feldes, nicht in der Mitte
        // des Bildschirms: die Widget-Spalten links und rechts gehoeren nicht
        // zum Feld, und ein Kern in der Fenstermitte saesse daneben.
        const core = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
        };

        const threads: Thread[] = points.map((point, index) => {
            const midX = (core.x + point.x) / 2 + Math.sin(index * 1.7) * 42;
            const midY = (core.y + point.y) / 2 + Math.cos(index * 1.7) * 42;
            return {
                fromX: core.x,
                fromY: core.y,
                toX: point.x,
                toY: point.y,
                controlX: midX,
                controlY: midY,
                color: point.color,
            };
        });

        const pulses: Pulse[] = threads.flatMap((_, index) => [
            { thread: index, progress: (index * 0.37) % 1, speed: 0.0022 },
            { thread: index, progress: (index * 0.37 + 0.5) % 1, speed: 0.0018 },
        ]);

        // 10 Sporen je Bereich statt 120 im Feld - und auf Kreisbahnen statt
        // mit freier Geschwindigkeit. Die alte Fassung liess sie driften und
        // zog sie mit einer Federkraft zurueck; das sah gleich aus, kostete
        // aber jede Bildfolge zwei Multiplikationen mehr pro Teilchen und
        // konnte bei langer Laufzeit ausbrechen.
        const spores: Spore[] = points.flatMap((point) =>
            Array.from({ length: 10 }, (_, i) => ({
                angle: (i / 10) * Math.PI * 2,
                radius: 74 + (i % 4) * 13,
                speed: 0.00042 + (i % 3) * 0.00016,
                size: 0.9 + (i % 3) * 0.5,
                phase: i * 0.9,
                anchorX: point.x,
                anchorY: point.y,
                color: point.color,
            })),
        );

        // Steuerpunkte nach der Maus-Anziehung, paarweise x/y je Faden. Ein
        // typisiertes Feld statt Eigenschaften am Objekt: es wird jede
        // Bildfolge beschrieben, und ein Float64Array bleibt dabei in einer
        // festen Form.
        const liveControl = new Float64Array(threads.length * 2);
        threads.forEach((thread, index) => {
            liveControl[index * 2] = thread.controlX;
            liveControl[index * 2 + 1] = thread.controlY;
        });

        let frame = 0;
        let running = true;
        let width = window.innerWidth;
        let height = window.innerHeight;

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();
        window.addEventListener('resize', resize);

        const bezier = (t: number, p0: number, p1: number, p2: number) => {
            const inv = 1 - t;
            return inv * inv * p0 + 2 * inv * t * p1 + t * t * p2;
        };

        const draw = (time: number) => {
            if (!running) return;
            ctx.clearRect(0, 0, width, height);

            // Additives Zeichnen statt shadowBlur je Element. shadowBlur ist
            // eine der teuersten Operationen im 2D-Kontext und lief vorher
            // ueber 120 Sporen, 8 Pulse und bis zu 50 Mauspartikel - pro Bild.
            ctx.globalCompositeOperation = 'lighter';

            const mouse = mouseRef.current;
            // Ein gemeinsamer Atem, derselbe Rhythmus wie im CSS des Feldes.
            const breath = 0.5 + Math.sin(time / 3400) * 0.5;

            threads.forEach((thread, index) => {
                let cx = thread.controlX;
                let cy = thread.controlY;

                if (mouse.active) {
                    const dx = mouse.x - cx;
                    const dy = mouse.y - cy;
                    const distance = Math.hypot(dx, dy);
                    if (distance < MOUSE_REACH && distance > 0.5) {
                        const pull = (1 - distance / MOUSE_REACH) * MOUSE_PULL;
                        cx += (dx / distance) * pull;
                        cy += (dy / distance) * pull;
                    }
                }

                const [r, g, b] = hexToRgb(thread.color);
                const gradient = ctx.createLinearGradient(thread.fromX, thread.fromY, thread.toX, thread.toY);
                gradient.addColorStop(0, `rgba(${r},${g},${b},0.02)`);
                gradient.addColorStop(1, `rgba(${r},${g},${b},${(0.14 + breath * 0.1).toFixed(3)})`);

                ctx.beginPath();
                ctx.moveTo(thread.fromX, thread.fromY);
                ctx.quadraticCurveTo(cx, cy, thread.toX, thread.toY);
                ctx.strokeStyle = gradient;
                ctx.lineWidth = 1.1;
                ctx.stroke();

                // Der von der Maus gebogene Steuerpunkt, damit die Pulse
                // derselben Kurve folgen wie der gezeichnete Faden. Ohne das
                // liefen sie neben ihrem eigenen Faden her, sobald der Zeiger
                // in der Naehe war.
                liveControl[index * 2] = cx;
                liveControl[index * 2 + 1] = cy;
            });

            if (!reducedMotion) {
                pulses.forEach((pulse) => {
                    pulse.progress += pulse.speed;
                    if (pulse.progress > 1) pulse.progress = 0;

                    const thread = threads[pulse.thread];
                    const cx = liveControl[pulse.thread * 2];
                    const cy = liveControl[pulse.thread * 2 + 1];
                    const px = bezier(pulse.progress, thread.fromX, cx, thread.toX);
                    const py = bezier(pulse.progress, thread.fromY, cy, thread.toY);
                    const [r, g, b] = hexToRgb(thread.color);
                    // Am Anfang und Ende der Bahn ausblenden, damit der Punkt
                    // nicht aus dem Kern springt und im Planeten verschwindet.
                    const fade = Math.sin(pulse.progress * Math.PI);

                    const halo = ctx.createRadialGradient(px, py, 0, px, py, 9);
                    halo.addColorStop(0, `rgba(${r},${g},${b},${(0.5 * fade).toFixed(3)})`);
                    halo.addColorStop(1, `rgba(${r},${g},${b},0)`);
                    ctx.fillStyle = halo;
                    ctx.beginPath();
                    ctx.arc(px, py, 9, 0, Math.PI * 2);
                    ctx.fill();
                });
            }

            spores.forEach((spore) => {
                if (!reducedMotion) spore.angle += spore.speed;
                const x = spore.anchorX + Math.cos(spore.angle) * spore.radius;
                const y = spore.anchorY + Math.sin(spore.angle) * spore.radius * 0.72;
                const alpha = 0.16 + Math.sin(time / 1800 + spore.phase) * 0.12;
                const [r, g, b] = hexToRgb(spore.color);
                ctx.fillStyle = `rgba(${r},${g},${b},${Math.max(0.04, alpha).toFixed(3)})`;
                ctx.beginPath();
                ctx.arc(x, y, spore.size, 0, Math.PI * 2);
                ctx.fill();
            });

            ctx.globalCompositeOperation = 'source-over';
            frame = requestAnimationFrame(draw);
        };

        frame = requestAnimationFrame(draw);

        return () => {
            running = false;
            if (frame) cancelAnimationFrame(frame);
            window.removeEventListener('resize', resize);
        };
    }, [anchors, pageVisible, rect]);

    // Kein gemessenes Feld, keine Zeichnung. Vorher hing das an einer
    // Abfrage auf viewLevel/coreMode - die musste jedes Mal nachgezogen
    // werden, wenn eine Ansicht dazukam.
    if (anchors.length === 0 || !rect) return null;

    return (
        <div className="pointer-events-none fixed inset-0 z-[6]">
            <canvas ref={canvasRef} className="h-full w-full" style={{ mixBlendMode: 'screen' }} />
        </div>
    );
};
