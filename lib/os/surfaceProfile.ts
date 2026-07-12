export type SurfaceProfileId = 'standard' | 'public_demo' | 'local_truth' | 'hq';

export interface SurfaceProfileSnapshot {
    id: SurfaceProfileId;
    isPublicDemoSurface: boolean;
    isLocalTruthSurface: boolean;
    isHqSurface: boolean;
    workspaceTabLabel: string;
    fallbackCompanyName: string;
    roleBadgeLabel: string;
    companySwitcherEnabled: boolean;
}

// ─── Profiles ─────────────────────────────────────────────────────────────────

/**
 * Standard: any deployment that isn't local, hq, or demo.
 */
export const DEFAULT_SURFACE_PROFILE: SurfaceProfileSnapshot = {
    id: 'standard',
    isPublicDemoSurface: false,
    isLocalTruthSurface: false,
    isHqSurface: false,
    workspaceTabLabel: 'Organisation',
    fallbackCompanyName: '',
    roleBadgeLabel: 'Arbeitsmodus',
    companySwitcherEnabled: true,
};

/**
 * Public demo: used on show.saimor.world or similar demo-only hostnames.
 * Shows fake / example data, demo badges, limited controls.
 */
const PUBLIC_DEMO_PROFILE: SurfaceProfileSnapshot = {
    id: 'public_demo',
    isPublicDemoSurface: true,
    isLocalTruthSurface: false,
    isHqSurface: false,
    workspaceTabLabel: 'Demo',
    fallbackCompanyName: '',
    roleBadgeLabel: 'Demo',
    companySwitcherEnabled: false,
};

/**
 * Local truth: localhost development.
 * Full access, Ollama AI, real local DB.
 */
const LOCAL_TRUTH_PROFILE: SurfaceProfileSnapshot = {
    id: 'local_truth',
    isPublicDemoSurface: false,
    isLocalTruthSurface: true,
    isHqSurface: false,
    workspaceTabLabel: 'Instanz',
    fallbackCompanyName: '',
    roleBadgeLabel: 'Intern',
    companySwitcherEnabled: true,
};

/**
 * HQ: hq.saimor.world — real single-company production deployment.
 * Guided /entry surface, Gemini AI, real data, no demo labels.
 * Owners can switch explicitly between real work and a tenant-local guided demo.
 */
const HQ_PROFILE: SurfaceProfileSnapshot = {
    id: 'hq',
    isPublicDemoSurface: false,
    isLocalTruthSurface: false,
    isHqSurface: true,
    workspaceTabLabel: 'HQ',
    fallbackCompanyName: '',
    roleBadgeLabel: 'HQ-Modus',
    companySwitcherEnabled: true,
};

// ─── Resolver ─────────────────────────────────────────────────────────────────

export const resolveSurfaceProfile = (hostname?: string | null): SurfaceProfileSnapshot => {
    const normalized = (hostname || '').trim().toLowerCase();

    if (normalized === 'hq.saimor.world' || normalized.startsWith('hq.saimor.world:')) {
        return HQ_PROFILE;
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

    // Explicit demo hostnames only — never default to demo
    if (
        normalized === 'show.saimor.world' ||
        normalized.startsWith('show.saimor.world:') ||
        normalized === 'demo.saimor.world' ||
        normalized.startsWith('demo.saimor.world:')
    ) {
        return PUBLIC_DEMO_PROFILE;
    }

    return DEFAULT_SURFACE_PROFILE;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const formatCompanyContextLabel = (
    profile: SurfaceProfileSnapshot,
    companyCount: number
) => {
    if (profile.isPublicDemoSurface) return 'Beispielsystem';
    if (profile.isHqSurface || profile.isLocalTruthSurface) {
        if (companyCount <= 0) return '';
        return companyCount === 1 ? '1 Organisation' : `${companyCount} Organisationen`;
    }
    if (companyCount <= 0) return 'Keine Organisation';
    return companyCount === 1 ? '1 Organisation' : `${companyCount} Organisationen`;
};
