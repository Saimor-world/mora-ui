/**
 * Multi-Organization Configuration
 * Switch between organizations without code changes
 */

export interface OrgConfig {
  id: string;
  name: string;
  displayName: string;
  tenantId: string;
  theme?: {
    primary?: string;    // Default: #10b981 (emerald)
    accent?: string;     // Default: #CEB676 (mora-gold)
    background?: string; // Default: mora-forest
  };
  branding?: {
    logo?: string;
    favicon?: string;
  };
}

export const ORGS: Record<string, OrgConfig> = {
  'alpha-centauri': {
    id: 'alpha-centauri',
    name: 'Alpha Centauri',
    displayName: 'Alpha Centauri Demo',
    tenantId: 'saimor',
    theme: {
      primary: '#10b981', // emerald
      accent: '#CEB676',  // mora-gold
    },
  },
  'olfas-tobi': {
    id: 'olfas-tobi',
    name: 'Olfas & Tobi',
    displayName: 'Olfas & Tobi Organization',
    tenantId: 'olfas_tobi',
    // Can override theme colors here if needed
  },
  // Easy to add more organizations
};

/**
 * Get the active organization based on environment variable
 * Set NEXT_PUBLIC_ORG_ID in .env.local to switch organizations
 */
export const getActiveOrg = (): OrgConfig => {
  const orgId = process.env.NEXT_PUBLIC_ORG_ID || 'alpha-centauri';
  return ORGS[orgId] || ORGS['alpha-centauri'];
};

/**
 * Get JWT for the active organization
 * Supports organization-specific JWTs
 */
export const getActiveOrgJWT = (): string => {
  const org = getActiveOrg();
  
  // Try organization-specific JWT first
  const orgSpecificKey = `NEXT_PUBLIC_SAIMOR_CORE_JWT_${org.id.toUpperCase().replace(/-/g, '_')}`;
  const orgJWT = process.env[orgSpecificKey as keyof typeof process.env];
  
  if (orgJWT) {
    return orgJWT;
  }
  
  // Fall back to default JWT
  return process.env.NEXT_PUBLIC_SAIMOR_CORE_JWT || '';
};
