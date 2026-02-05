"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Planet } from '@/components/mora/Planet';

interface PlanetLayerProps {
    planets: Array<{
        planet: any;
        x: number;
        y: number;
        delay: number;
        angle: number;
        radius: number;
    }>;
    activeDepartmentId: string | null;
    heldPlanetId: string | null;
    hoveredPlanet: string | null;
    onPlanetHover: (id: string, hovered: boolean) => void;
    onPlanetClick: (id: string) => void;
    departmentIconMap: Map<string, any>;
    orbitActive: boolean;
}

export const PlanetLayer: React.FC<PlanetLayerProps> = ({
    planets,
    activeDepartmentId,
    heldPlanetId,
    hoveredPlanet,
    onPlanetHover,
    onPlanetClick,
    departmentIconMap,
    orbitActive
}) => {
    return (
        <div className="absolute inset-0 w-full h-full pointer-events-none z-10">
            {planets.map(({ planet, x, y, delay }) => (
                <div
                    key={planet.id}
                    className="absolute"
                    style={{
                        left: `${x}vw`,
                        top: `${y}vh`,
                        transform: 'translate(-50%, -50%)',
                        pointerEvents: 'auto',
                        zIndex: 50
                    }}
                >
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                            delay,
                            type: "spring",
                            stiffness: 100,
                            damping: 20
                        }}
                    >
                        <Planet
                            department={planet}
                            iconOverride={departmentIconMap.get(planet.id)}
                            position={{ x: 0, y: 0 }}
                            isActive={activeDepartmentId === planet.id}
                            onClick={() => onPlanetClick(planet.id)}
                            onHover={(hovered) => onPlanetHover(planet.id, hovered)}
                        />
                    </motion.div>
                </div>
            ))}

            {/* Orbit Lines for Visual Reference - Disabled as per user feedback */}
            {/* 
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-10">
                <circle cx="50%" cy="50%" r="34%" fill="none" stroke="white" strokeWidth="1" strokeDasharray="4 4" />
            </svg>
            */}
        </div>
    );
};
