"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Star } from '@/components/mora/Star';

interface MoonLayerProps {
    moons: Array<{
        space: any;
        x: number;
        y: number;
        delay: number;
        parentPlanet?: { planet: { name: string; color: string }, x: number, y: number };
        orbitRadiusX: number;
        orbitRadiusY: number;
    }>;
    activeSpaceId: string | null;
    promotedMoonIds: Set<string>;
    hoveredPlanet: string | null;
    heldPlanetId: string | null;
    orbitActive: boolean;
    orbitShiftActive: boolean;
    moonOrbitOffsetMap: Map<string, Array<{ x: number; y: number }>>;
    getOrbitOffsets: (originX: number, originY: number, x: number, y: number) => Array<{ x: number; y: number }>;
    onHover: (hovered: boolean, deptId: string) => void;
    onClick: (spaceId: string) => void;
    foldersBySpace: Record<string, any[]>;
}

export const MoonLayer: React.FC<MoonLayerProps> = ({
    moons,
    activeSpaceId,
    promotedMoonIds,
    hoveredPlanet,
    heldPlanetId,
    orbitActive,
    orbitShiftActive,
    moonOrbitOffsetMap,
    getOrbitOffsets,
    onHover,
    onClick,
    foldersBySpace
}) => {
    return (
        <div className="absolute inset-0 w-full h-full pointer-events-none z-20">
            {moons.map(({ space, x, y, delay, parentPlanet }) => {
                const originX = parentPlanet?.x ?? x;
                const originY = parentPlanet?.y ?? y;
                const moonOrbitOffsets = parentPlanet
                    ? (moonOrbitOffsetMap.get(space.id) || getOrbitOffsets(originX, originY, x, y))
                    : null;

                // Sub-item naming logic: If space name matches planet (Department), rename to 'General' to avoid redundancy
                const normalize = (s: string) => s?.toLowerCase().trim();
                const subTitle = normalize(space.name) === normalize(parentPlanet?.planet?.name || '')
                    ? "General"
                    : space.name;

                return (
                    <div
                        key={space.id}
                        className="absolute"
                        style={{
                            left: `${x}vw`,
                            top: `${y}vh`,
                            transform: 'translate(-50%, -50%)',
                            pointerEvents: 'auto',
                            zIndex: 60
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{
                                scale: 1,
                                opacity: 1,
                                x: (orbitActive && moonOrbitOffsets) ? moonOrbitOffsets.map(o => o.x) : 0,
                                y: (orbitActive && moonOrbitOffsets) ? moonOrbitOffsets.map(o => o.y) : 0
                            }}
                            transition={{
                                delay,
                                duration: orbitActive ? 60 : (orbitShiftActive ? 1.5 : 0.8),
                                repeat: orbitActive ? Infinity : 0,
                                ease: orbitActive ? "linear" : "easeInOut"
                            }}
                        >
                            <Star
                                space={{
                                    id: space.id,
                                    name: subTitle,
                                    department_id: space.departmentId,
                                    color: parentPlanet?.planet?.color || '#60A5FA',
                                    description: space.description || undefined,
                                    folder_count: (foldersBySpace[space.id] || []).length
                                }}
                                position={{ x: '50%', y: '50%' }}
                                delay={delay}
                                isActive={activeSpaceId === space.id}
                                size={(activeSpaceId === space.id || promotedMoonIds.has(space.id)) ? 'lg' : 'md'}
                                orbitActive={orbitActive}
                                isPromoted={promotedMoonIds.has(space.id)}
                                isHoveredByPlanet={hoveredPlanet === space.departmentId || heldPlanetId === space.departmentId}
                                onHover={(hovered) => onHover(hovered, space.departmentId)}
                                onClick={() => onClick(space.id)}
                            />
                        </motion.div>
                    </div>
                );
            })}
        </div>
    );
};
