"use client";

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { UniverseLens } from './OrganizationField';

interface Props {
    lens: UniverseLens;
    selected: boolean;
}

/**
 * Nur noch die Stimmung ueber dem geteilten Hintergrund, nicht mehr der
 * Hintergrund selbst.
 *
 * Vorher trug diese Datei einen eigenen, fast blickdichten Verlauf
 * (linear-gradient mit festen Hex-Endpunkten wie #082034) plus 82 eigene
 * Sterne und drei Monde - ein zweites, kleineres Universum, das ueber dem
 * geteilten Hintergrundsystem der Shell (MoraLivingBackground: 500 Sterne,
 * Aurora, szenenreaktiver Nebel) lag und es komplett verdeckte, weil
 * UniverseView selbst zusaetzlich noch eine blickdichte bg-Farbe hatte.
 *
 * Jetzt: additive Farbtoene im Stil von TemporalAtmosphere (niedrige
 * Deckkraft, kein fester Endpunkt), die sich nach der Linse richten -
 * "Organisation" kuehler/cyan, "Zusammenhaenge" waermer/violett. Sterne,
 * Aurora und Nebel liefert die Shell; hier kommt nur noch dazu, was wirklich
 * Zustand ausdrueckt: die Linse und die Auswahl.
 */
export function UniverseAmbientField({ lens, selected }: Props) {
    const reducedMotion = useReducedMotion();

    return (
        <div className="pointer-events-none absolute inset-0 z-[4] overflow-hidden" aria-hidden="true">
            <motion.div
                className="absolute inset-0"
                animate={{
                    background: lens === 'relations'
                        ? 'radial-gradient(ellipse at 58% 42%, rgba(139,92,246,0.16), transparent 46%), radial-gradient(ellipse at 18% 78%, rgba(6,182,212,0.12), transparent 50%)'
                        : 'radial-gradient(ellipse at 48% 38%, rgba(56,189,248,0.15), transparent 50%), radial-gradient(ellipse at 18% 82%, rgba(251,191,36,0.10), transparent 48%)',
                }}
                transition={{ duration: 1.4, ease: 'easeInOut' }}
            />

            <motion.div
                className="absolute left-[12%] top-[14%] h-[54vw] max-h-[720px] w-[54vw] max-w-[900px] rounded-full blur-[100px]"
                style={{ background: 'radial-gradient(circle,rgba(56,189,248,0.1),rgba(45,60,125,0.04) 44%,transparent 72%)' }}
                animate={reducedMotion ? undefined : { x: [0, 34, -12, 0], y: [0, -24, 18, 0], scale: [1, 1.06, 0.98, 1] }}
                transition={{ duration: 32, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                className="absolute -bottom-[20%] -left-[8%] h-[58%] w-[64%] rounded-full blur-[110px]"
                style={{ background: 'radial-gradient(circle,rgba(212,167,61,0.12),rgba(115,83,35,0.04) 46%,transparent 72%)' }}
                animate={reducedMotion ? undefined : { x: [0, 42, 0], opacity: [0.5, 0.72, 0.5] }}
                transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
            />

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
                animate={{ opacity: selected ? 0.4 : 0 }}
                transition={{ duration: 0.6 }}
                style={{ background: 'radial-gradient(circle at center,transparent 18%,rgba(2,8,18,0.48) 100%)' }}
            />
            <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.3) 1px,transparent 1px)', backgroundSize: '80px 80px' }} />
        </div>
    );
}
