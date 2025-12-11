import React from 'react';
import { motion } from 'framer-motion';

interface PulseRingProps {
    pulse: 'low' | 'medium' | 'high';
}

export const PulseRing: React.FC<PulseRingProps> = ({ pulse }) => {
    // Pulse configurations
    const config = {
        low: { scale: [1, 1.05, 1], opacity: [0.1, 0.2, 0.1], duration: 4 },
        medium: { scale: [1, 1.15, 1], opacity: [0.2, 0.4, 0.2], duration: 2.5 },
        high: { scale: [1, 1.25, 1], opacity: [0.3, 0.6, 0.3], duration: 1.5 }
    };

    const activeConfig = config[pulse] || config.low;

    return (
        <div className="absolute pointer-events-none" style={{
            bottom: '48px',
            right: '48px',
            transform: 'translate(50%, 50%)' // Center on Orb check logic? 
            // The orb is fixed bottom: 48px, right: 48px. 
            // So centering a larger ring needs offset logic or just positioning it exactly there.
            // Since it's fixed position, we'll mimic the orb position.
            // Wait, Orb is fixed in CSS. Playfield is absolute in Shell. 
            // If Playfield is container, we can use fixed position for this ring too.
        }}>
            {/* We use a fixed container at the bottom right */}
            <motion.div
                className="rounded-full border border-cyan-500/30"
                style={{
                    position: 'fixed',
                    bottom: '48px',
                    right: '48px',
                    width: '160px', // Slightly larger than typical Orb (130-140)
                    height: '160px',
                    transform: 'translate(50%, 50%)' // Wait, simple bottom/right aligns edges. 
                    // Orb centers itself via translate(-50%, -50%)?
                    // Let's check CompanyCoreView orb code...
                    // Orb: bottom-[48px] right-[48px], no translate? 
                    // Ah, inside the div wrapper it might be.
                    // To be safe, let's use a large radial gradient that is forgiving of exact enter.
                }}
                animate={{
                    scale: activeConfig.scale,
                    opacity: activeConfig.opacity,
                    // Center the transformation? 
                    // If we use 'fixed' and exact pixels, we need to ensure alignment.
                    // Alignment strategy: Use `transform: translate(50%, 50%)`? No, bottom/right usually origin is bottom-right corner of component?
                    x: '50%', // Move center to the point (48,48) from edge?
                    y: '50%'
                    // Actually, easiest is to just center it relative to the 48px point.
                }}
                // But wait, Framer Motion animate overrides style transform?
                // Better:
                initial={{ x: '50%', y: '50%' }} // Initial translate to center of itself relative to bottom-right point?
                // Let's assume the orb is roughly centered at `bottom: 48 + size/2`, `right: 48 + size/2`?
                // Let's inspect CompanyCoreView orb wrapper:
                // <div className="fixed bottom-[48px] right-[48px] ..."> 
                //    <MoraOrb ... />
                // <div>
                // And MoraOrb usually translates itself -50% -50%? 
                // Let's just make a "Global Ambience" ring that is visibly distinct.
                transition={{
                    duration: activeConfig.duration,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />

            {/* Simpler Approach: Ring is purely decorative and atmospheric */}
            <motion.div
                className="fixed bottom-[20px] right-[20px] pointer-events-none rounded-full blur-3xl"
                style={{
                    width: '200px',
                    height: '200px',
                    background: pulse === 'high' ? 'rgba(6,182,212,0.15)' : 'rgba(6,182,212,0.05)'
                }}
                animate={{
                    scale: activeConfig.scale,
                    opacity: activeConfig.opacity
                }}
                transition={{
                    duration: activeConfig.duration,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />
        </div>
    );
};
