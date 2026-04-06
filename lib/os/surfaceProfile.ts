export type SurfaceProfileId = 'standard' | 'public_demo';

export interface SurfaceProfileSnapshot {
    id: SurfaceProfileId;
    isPublicDemoSurface: boolean;
    workspaceTabLabel: string;
    fallbackCompanyName: string;
    roleBadgeLabel: string;
    companySwitcherEnabled: boolean;
}

export const DEFAULT_SURFACE_PROFILE: SurfaceProfileSnapshot = {
    id: 'standard',
    isPublicDemoSurface: false,
    workspaceTabLabel: 'Organisation',
    fallbackCompanyName: 'Organisation',
    roleBadgeLabel: 'Arbeitsmodus',
    companySwitcherEnabled: true,
};

const PUBLIC_DEMO_PROFILE: SurfaceProfileSnapshot = {
    id: 'public_demo',
    isPublicDemoSurface: true,
    workspaceTabLabel: 'Demo',
    fallbackCompanyName: 'Simple Coffee Group',
    roleBadgeLabel: 'Demo',
    companySwitcherEnabled: false,
};

export const resolveSurfaceProfile = (hostname?: string | null): SurfaceProfileSnapshot => {
    const normalized = (hostname || '').trim().toLowerCase();

    if (normalized === 'hq.saimor.world' || normalized.startsWith('hq.saimor.world:')) {
        return PUBLIC_DEMO_PROFILE;
    }

    return DEFAULT_SURFACE_PROFILE;
};

export const formatCompanyContextLabel = (
    profile: SurfaceProfileSnapshot,
    companyCount: number
) => {
    if (profile.isPublicDemoSurface) {
        return 'Beispielsystem';
    }

    if (companyCount <= 0) return 'Keine Organisation';
    return companyCount === 1 ? '1 Organisation' : `${companyCount} Organisationen`;
};
