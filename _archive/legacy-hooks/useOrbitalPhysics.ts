import { useState, useEffect, useLayoutEffect } from 'react';

// Use layoutEffect on client, effect on server
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function useOrbitalPhysics() {
    // PERCENTAGE-BASED CENTER: Always 50% of container
    // This is container-independent and always works
    const [center, setCenter] = useState({ x: 50, y: 50 }); // PERCENT, not pixels!
    const [isReady, setIsReady] = useState(true); // Always ready with percentage

    // No need for window measurements with percentage-based positioning
    return { center, isReady };
}
