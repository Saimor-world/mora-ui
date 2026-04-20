import { useEffect, useState } from 'react';
import {
    DEFAULT_SURFACE_PROFILE,
    resolveSurfaceProfile,
    type SurfaceProfileSnapshot,
} from '@/lib/os/surfaceProfile';

export const useSurfaceProfile = (): SurfaceProfileSnapshot => {
    // Always start with the default profile so server and client render identically.
    // The real hostname-based profile is applied after mount in useEffect to avoid
    // SSR/client hydration mismatches (typeof window differs between environments).
    const [profile, setProfile] = useState<SurfaceProfileSnapshot>(DEFAULT_SURFACE_PROFILE);

    useEffect(() => {
        setProfile(resolveSurfaceProfile(window.location.hostname));
    }, []);

    return profile;
};
