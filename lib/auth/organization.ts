import { TENANT_HQ, isSystemOwner } from '@/lib/constants/tenants';

/**
 * Is this session part of the SAIMÔR organization itself?
 *
 * Internal things (Paddle and revenue, Nightwatch/Wache, XRPL, Treasury, Labs) are
 * for SAIMÔR only, never for a customer company. The decision uses the role and the
 * tenant from the session, never a display name. A customer's owner is not internal,
 * the demo tenant is not internal, and a missing session is not internal (fail closed).
 */
export function isSaimorInternal(
    user: { role?: string | null; tenant_id?: string | null } | null | undefined,
    opts: { activeCompanyIsDemo?: boolean } = {},
): boolean {
    if (!user) return false;
    // Demo-Arbeitsbereich (is_demo-Firma, auch im HQ-Tenant): Kundenregeln, nie Finance/Labs/Wache.
    if (opts.activeCompanyIsDemo) return false;
    if (isSystemOwner(user.role)) return true;
    return user.tenant_id === TENANT_HQ;
}
