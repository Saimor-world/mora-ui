"use client";

import React, { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { UniverseLens } from './OrganizationField';

interface Props {
    lens: UniverseLens;
    selected: boolean;
}

interface Star {
    id: number;
    x: number;
    y: number;
    size: number;
    opacity: number;
    duration: number;
    delay: number;
    tint: string;
}

function seeded(index: number, salt: number) {
    const value = Math.sin(index * 917.31 + salt * 131.7) * 43758.5453;
    return value - Math.floor(value);
}

export function UniverseAmbientField({ lens, selected }: Props) {
    const reducedMotion = useReducedMotion();
    const stars = useMemo<Star[]>(() => Array.from({ length: 82 }, (_, index) => ({
        id: index,
        x: seeded(index, 1) * 100,
        y: seeded(index, 2) * 100,
        size: 0.7 + seeded(index, 3) * 2.1,
        opacity: 0.16 + seeded(index, 4) * 0.62,
        duration: 4.5 + seeded(index, 5) * 7,
        delay: seeded(index, 6) * 8,
        tint: index % 11 === 0 ? '#fde68a' : index % 7 === 0 ? '#c4b5fd' : '#dbeafe',
    })), []);

    return (
        <div className="pointer-events-none absolute inset-0 z-[4] overflow-hidden" aria-hidden="true">
            <motion.div
                className="absolute inset-0"
                animate={{
                    background: lens === 'relations'
                        ? 'radial-gradient(ellipse at 58% 42%, rgba(69,55,130,0.24), transparent 45%), radial-gradient(ellipse at 18% 78%, rgba(18,95,110,0.22), transparent 48%), linear-gradient(145deg,#071526 0%,#07111f 48%,#0a1022 100%)'
                        : 'radial-gradient(ellipse at 48% 38%, rgba(31,120,154,0.26), transparent 48%), radial-gradient(ellipse at 18% 82%, rgba(154,115,28,0.18), transparent 46%), linear-gradient(145deg,#082034 0%,#071629 54%,#07111d 100%)',
                }}
                transition={{ duration: 1.4, ease: 'easeInOut' }}
            />

            <motion.div
                className="absolute left-[12%] top-[14%] h-[54vw] max-h-[720px] w-[54vw] max-w-[900px] rounded-full blur-[100px]"
                style={{ background: 'radial-gradient(circle,rgba(56,189,248,0.13),rgba(45,60,125,0.05) 44%,transparent 72%)' }}
                animate={reducedMotion ? undefined : { x: [0, 34, -12, 0], y: [0, -24, 18, 0], scale: [1, 1.06, 0.98, 1] }}
                transition={{ duration: 32, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                className="absolute -bottom-[20%] -left-[8%] h-[58%] w-[64%] rounded-full blur-[110px]"
                style={{ background: 'radial-gradient(circle,rgba(212,167,61,0.16),rgba(115,83,35,0.05) 46%,transparent 72%)' }}
                animate={reducedMotion ? undefined : { x: [0, 42, 0], opacity: [0.62, 0.88, 0.62] }}
                transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
            />

            {stars.map((star) => (
                <motion.span
                    key={star.id}
                    className="absolute rounded-full"
                    style={{
                        left: String(star.x) + '%',
                        top: String(star.y) + '%',
                        width: star.size,
                        height: star.size,
                        background: star.tint,
                        boxShadow: '0 0 ' + String(star.size * 5) + 'px ' + star.tint,
                    }}
                    initial={{ opacity: star.opacity }}
                    animate={reducedMotion ? undefined : { opacity: [star.opacity * 0.45, star.opacity, star.opacity * 0.55] }}
                    transition={{ duration: star.duration, delay: star.delay, repeat: Infinity, ease: 'easeInOut' }}
                />
            ))}

            <Moon left="16%" top="24%" size={64} tint="#b9d9e8" duration={38} reducedMotion={Boolean(reducedMotion)} />
            <Moon left="82%" top="66%" size={42} tint="#c9b7e9" duration={46} reducedMotion={Boolean(reducedMotion)} />
            <Moon left="69%" top="18%" size={24} tint="#e8d8ad" duration={29} reducedMotion={Boolean(reducedMotion)} />

            {!reducedMotion && [0, 1, 2].map((index) => (
                <motion.span
                    key={'meteor-' + String(index)}
                    className="absolute h-px w-28 origin-left rotate-[-24deg] rounded-full bg-gradient-to-r from-transparent via-sky-100/70 to-white shadow-[0_0_12px_rgba(186,230,253,0.42)]"
                    style={{ left: String(18 + index * 27) + '%', top: String(11 + index * 19) + '%' }}
                    initial={{ x: -160, y: -70, opacity: 0 }}
                    animate={{ x: [-160, 420], y: [-70, 165], opacity: [0, 0.8, 0] }}
                    transition={{ duration: 1.8 + index * 0.22, delay: 4 + index * 8, repeat: Infinity, repeatDelay: 15 + index * 7, ease: 'easeOut' }}
                />
            ))}

            <motion.div
                className="absolute inset-0"
                animate={{ opacity: selected ? 0.48 : 0 }}
                transition={{ duration: 0.6 }}
                style={{ background: 'radial-gradient(circle at center,transparent 18%,rgba(2,8,18,0.52) 100%)' }}
            />
            <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.3) 1px,transparent 1px)', backgroundSize: '80px 80px' }} />
        </div>
    );
}

function Moon({ left, top, size, tint, duration, reducedMotion }: { left: string; top: string; size: number; tint: string; duration: number; reducedMotion: boolean }) {
    return (
        <motion.div
            className="absolute rounded-full border border-white/[0.08]"
            style={{
                left,
                top,
                width: size,
                height: size,
                background: 'radial-gradient(circle at 32% 28%,' + tint + 'aa,' + tint + '28 44%,rgba(4,12,24,0.9) 76%)',
                boxShadow: 'inset -10px -8px 22px rgba(0,0,0,0.55),0 0 34px ' + tint + '22',
            }}
            animate={reducedMotion ? undefined : { y: [0, -12, 0], x: [0, 7, 0], rotate: [0, 5, 0] }}
            transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}
        >
            <span className="absolute left-[22%] top-[18%] h-[18%] w-[26%] rounded-full bg-black/10 blur-[1px]" />
            <span className="absolute bottom-[22%] right-[18%] h-[12%] w-[16%] rounded-full bg-black/15 blur-[1px]" />
        </motion.div>
    );
}

/*
 * SignalArrival ist hier entfernt.
 *
 * Die Komponente liess eine Haarlinie von rechts hereinfliegen und irgendwo in
 * der Luft stehen bleiben - auf einer festen Hoehe (26% + index * 14%), die mit
 * der Position des gemeinten Bereichs nichts zu tun hatte. Sie versprach eine
 * Verbindung und zeigte dann auf nichts.
 *
 * Die echten Verbindungen zeichnet jetzt RelationLayer in OrganizationField:
 * von der Kante, an der die Quelle wirklich steht, bis zu dem Bereich, den das
 * Signal wirklich betrifft.
 */