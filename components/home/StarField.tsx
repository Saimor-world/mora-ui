import React, { useMemo } from 'react';

interface StarFieldProps {
    seed: string;
}

// Helper for deterministic random numbers
function seededRandom(seed: number) {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

export const StarField: React.FC<StarFieldProps> = ({ seed: universeSeed }) => {
    // Generate stable stars (Background) - INCREASED DENSITY
    // Moved from UniverseView.tsx to decouple "decoration" from "logic"
    const stableStars = useMemo(() => {
        // Use company-specific seed for deterministic but unique starfields
        const seedStr = universeSeed;
        let hash = 0;
        for (let i = 0; i < seedStr.length; i++) {
            hash = ((hash << 5) - hash) + seedStr.charCodeAt(i);
            hash = hash & hash; // Convert to 32-bit integer
        }

        return Array.from({ length: 600 }, (_, i) => { // 600 Stars for "Stars Everywhere"
            // Deterministic pseudo-random based on seed + index
            const getSeededRandom = (offset: number) => {
                const x = Math.sin(hash + i + offset * 7.3) * 10000;
                return x - Math.floor(x);
            };

            const cx = getSeededRandom(0) * 100;
            const cy = getSeededRandom(100) * 100;

            // Bigger Stars for Visibility
            const size = getSeededRandom(200) < 0.15 ? 3.5 :
                getSeededRandom(300) < 0.4 ? 2.0 : 1.2;

            // BRIGHTNESS BOOST: High visibility floor
            const brightness = getSeededRandom(400) < 0.2 ? 1.0 :
                getSeededRandom(500) < 0.5 ? 0.8 : 0.6; // Min 0.6

            const colorIndex = Math.floor(getSeededRandom(600) * 5);
            const color = colorIndex === 0 ? '#D4AF37' : // Gold
                colorIndex === 1 ? '#10B981' : // Emerald
                    colorIndex === 2 ? '#3B82F6' : // Blue
                        colorIndex === 3 ? '#F472B6' : // Pink
                            '#FFFFFF'; // White

            const hasGlow = getSeededRandom(700) < 0.3;

            return { id: i, cx, cy, size, brightness, color, hasGlow };
        });
    }, [universeSeed]);

    return (
        <>
            {/* UPGRADE: Deep Space Gradient */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-900/60 via-[#05100a] to-black z-[-1] pointer-events-none" />

            {/* BACKGROUND STARS */}
            {stableStars.map((star) => (
                <div
                    key={star.id}
                    className="absolute rounded-full pointer-events-none z-0"
                    style={{
                        left: `${star.cx}%`,
                        top: `${star.cy}%`,
                        width: star.size,
                        height: star.size,
                        backgroundColor: star.color,
                        opacity: star.brightness,
                        boxShadow: star.hasGlow ? `0 0 ${star.size * 4}px ${star.color}` : 'none',
                    }}
                />
            ))}
        </>
    );
};
