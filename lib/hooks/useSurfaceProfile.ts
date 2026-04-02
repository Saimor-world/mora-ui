import { useEffect, useState } from 'react';
import {
    DEFAULT_SURFACE_PROFILE,
    resolveSurfaceProfile,
    type SurfaceProfileSnapshot,
} from '@/lib/os/surfaceProfile';

export const useSurfaceProfile = (): SurfaceProfileSnapshot => {
    const [profile, setProfile] = useState<SurfaceProfileSnapshot>(DEFAULT_SURFACE_PROFILE);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        setProfile(resolveSurfaceProfile(window.location.hostname));
    }, []);

    return profile;
};
