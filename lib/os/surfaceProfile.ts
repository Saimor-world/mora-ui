export type SurfaceProfileId = 'standard' | 'public_demo' | 'local_truth';

export interface SurfaceProfileSnapshot {
    id: SurfaceProfileId;
    isPublicDemoSurface: boolean;
    isLocalTruthSurface: boolean;
    workspaceTabLabel: string;
    fallbackCompanyName: string;
    roleBadgeLabel: string;
    companySwitcherEnabled: boolean;
}

export const DEFAULT_SURFACE_PROFILE: SurfaceProfileSnapshot = {
    id: 'standard',
    isPublicDemoSurface: false,
    isLocalTruthSurface: false,
    workspaceTabLabel: 'Organisation',
    fallbackCompanyName: 'Organisation',
    roleBadgeLabel: 'Arbeitsmodus',
    companySwitcherEnabled: true,
};

const PUBLIC_DEMO_PROFILE: SurfaceProfileSnapshot = {
    id: 'public_demo',
    isPublicDemoSurface: true,
    isLocalTruthSurface: false,
    workspaceTabLabel: 'Demo',
    fallbackCompanyName: 'Simple Coffee Group',
    roleBadgeLabel: 'Demo',
    companySwitcherEnabled: false,
};

const LOCAL_TRUTH_PROFILE: SurfaceProfileSnapshot = {
    id: 'local_truth',
    isPublicDemoSurface: false,
    isLocalTruthSurface: true,
    workspaceTabLabel: 'Instanz',
    fallbackCompanyName: 'Interne Instanz',
    roleBadgeLabel: 'Intern',
    companySwitcherEnabled: true,
};

export const resolveSurfaceProfile = (hostname?: string | null): SurfaceProfileSnapshot => {
    const normalized = (hostname || '').trim().toLowerCase();

    if (normalized === 'hq.saimor.world' || normalized.startsWith('hq.saimor.world:')) {
        return PUBLIC_DEMO_PROFILE;
    }

    if (
        normalized === 'localhost' ||
        normalized === '127.0.0.1' ||
        normalized === '::1' ||
        normalized.startsWith('localhost:') ||
        normalized.startsWith('127.0.0.1:') ||
        normalized.startsWith('[::1]:')
    ) {
        return LOCAL_TRUTH_PROFILE;
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

    if (profile.isLocalTruthSurface) {
        return 'Interne Instanz';
    }

    if (companyCount <= 0) return 'Keine Organisation';
    return companyCount === 1 ? '1 Organisation' : `${companyCount} Organisationen`;
};
