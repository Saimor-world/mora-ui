"use client";

import { useEffect, useRef, useState } from 'react';
import { useMotionValue, useSpring, useTransform } from 'framer-motion';

/**
 * SEMANTIC GRAVITY HOOK
 * 
 * apply physics-based attraction to UI elements based on their "semantic mass" (relevance).
 * The user's cursor acts as a gravity well.
 * 
 * @param relevance 0.0 to 1.0 (1.0 = heavy/highly relevant)
 * @param radius interaction radius in pixels
 */
export function useSemanticGravity(relevance: number = 0, radius: number = 300) {
    const ref = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    // Physics values
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // Spring configuration - heavier items move slower but more deliberately
    const springConfig = {
        damping: 15 + (relevance * 10), // More damping for heavy items
        stiffness: 150 + (relevance * 100), // Stiffer pull for relevant items
        mass: 0.5 + (relevance * 1.5) // Heavier
    };

    const springX = useSpring(x, springConfig);
    const springY = useSpring(y, springConfig);

    useEffect(() => {
        if (!ref.current || relevance <= 0.1) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!ref.current) return;

            const rect = ref.current.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const dx = e.clientX - centerX;
            const dy = e.clientY - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < radius) {
                // Gravity Formula: Pull = (Mass / Distance)
                // We invert it so closer = stronger pull
                const pullStrength = (1 - dist / radius) * (relevance * 40); // Max 40px shift

                x.set(dx * (pullStrength / dist));
                y.set(dy * (pullStrength / dist));
            } else {
                x.set(0);
                y.set(0);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [relevance, radius]);

    return {
        ref,
        style: {
            x: springX,
            y: springY,
            scale: useTransform(springX, (val) => 1 + (Math.abs(val) / 500)) // Slight swelling when pulled
        }
    };
}
