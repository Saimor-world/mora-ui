import { useEffect, useState } from 'react';
import {
    DEFAULT_SURFACE_PROFILE,
    resolveSurfaceProfile,
    type SurfaceProfileSnapshot,
} from '@/lib/os/surfaceProfile';

export const useSurfaceProfile = (): SurfaceProfileSnapshot => {
    const [profile, setProfile] = useState<SurfaceProfileSnapshot>(() => {
        if (typeof window === 'undefined') return DEFAULT_SURFACE_PROFILE;
        return resolveSurfaceProfile(window.location.hostname);
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;
        setProfile(resolveSurfaceProfile(window.location.hostname));
    }, []);

    return profile;
};
