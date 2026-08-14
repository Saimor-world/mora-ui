import { filterCompaniesForSurface } from '@/lib/os/companySurfaceFilter';
import { DEFAULT_SURFACE_PROFILE, resolveSurfaceProfile } from '@/lib/os/surfaceProfile';
import { TENANT_HQ } from '@/lib/constants/tenants';
import type { CoreCompany } from '@/lib/types/core';

const company = (id: string, name: string, tenantId: string, isDemo = false): CoreCompany => ({
    id,
    name,
    tenant_id: tenantId,
    owner_id: `owner-${id}`,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    is_demo: isDemo,
});

describe('filterCompaniesForSurface', () => {
    const companies = [
        company('preview-1', 'Live Claim mok8dpfl GmbH', 'tenant-preview-dfe6560ee3a9'),
        company('preview-2', 'Codex Audit GmbH', 'tenant-preview-e830c6f28bde'),
        company('hq', 'Saimôr HQ', TENANT_HQ),
    ];

    it('keeps the company switcher enabled on HQ', () => {
        expect(resolveSurfaceProfile('hq.saimor.world').companySwitcherEnabled).toBe(true);
    });

    it('shows only the HQ company on localhost/local-truth surfaces', () => {
        const result = filterCompaniesForSurface(companies, {
            surfaceProfile: resolveSurfaceProfile('127.0.0.1'),
            role: 'system_owner',
            tenantId: TENANT_HQ,
            viewMode: 'workspace',
        });

        expect(result.map((item) => item.name)).toEqual(['Saimôr HQ']);
    });

    it('shows only the HQ company on HQ surfaces', () => {
        const result = filterCompaniesForSurface(companies, {
            surfaceProfile: resolveSurfaceProfile('hq.saimor.world'),
            role: 'system_owner',
            tenantId: TENANT_HQ,
            viewMode: 'workspace',
        });

        expect(result.map((item) => item.name)).toEqual(['Saimôr HQ']);
    });

    // Frueher zeigte HQ dem Eigentuemer sein eigenes gefuehrtes Demo neben der
    // echten Firma. Seit 75d16e3 ("eliminate hardcoded demo company injection
    // on real HQ surface") nicht mehr - und das ist richtig so: hq.saimor.world
    // ist laut surfaceProfile.ts "real single-company production deployment",
    // also genau eine Firma. Demos leben auf der oeffentlichen Demo-Oberflaeche
    // (show.saimor.world), nicht in der Produktivumgebung eines Kunden.
    //
    // Der Test prueft weiterhin dieselbe Sorge wie vorher - dass ein Demo den
    // echten Arbeitsbereich nicht verunreinigt - nur jetzt in die Richtung, die
    // die Architektur vorgibt.
    it('shows an HQ owner only the real company, never their guided demo', () => {
        const ownerTenant = 'tenant-nextchapter';
        const ownerCompanies = [
            company('nextchapter', 'Next Chapter Germany', ownerTenant),
            company('guided-demo', 'Brandt & Söhne Gebäudetechnik', ownerTenant, true),
        ];
        const result = filterCompaniesForSurface(ownerCompanies, {
            surfaceProfile: resolveSurfaceProfile('hq.saimor.world'),
            role: 'owner',
            tenantId: ownerTenant,
            viewMode: 'workspace',
        });

        expect(result.map((item) => item.id)).toEqual(['nextchapter']);
    });

    it('does not expose the guided demo to a regular member', () => {
        const ownerTenant = 'tenant-nextchapter';
        const ownerCompanies = [
            company('nextchapter', 'Next Chapter Germany', ownerTenant),
            company('guided-demo', 'Brandt & Söhne Gebäudetechnik', ownerTenant, true),
        ];
        const result = filterCompaniesForSurface(ownerCompanies, {
            surfaceProfile: resolveSurfaceProfile('hq.saimor.world'),
            role: 'team_member',
            tenantId: ownerTenant,
            viewMode: 'workspace',
        });

        expect(result.map((item) => item.id)).toEqual(['nextchapter']);
    });

    it('keeps system-owner portfolio behavior on standard surfaces', () => {
        const result = filterCompaniesForSurface(companies, {
            surfaceProfile: DEFAULT_SURFACE_PROFILE,
            role: 'system_owner',
            tenantId: TENANT_HQ,
            viewMode: 'workspace',
        });

        expect(result.map((item) => item.name)).toEqual([
            'Live Claim mok8dpfl GmbH',
            'Codex Audit GmbH',
            'Saimôr HQ',
        ]);
    });
});
