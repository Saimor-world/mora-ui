import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WebsiteLeadLedger } from '@/components/admin/WebsiteLeadLedger';

jest.mock('@/lib/websiteEntryStorage', () => ({
    loadWebsiteEntryLeads: jest.fn(() => []),
}));

describe('WebsiteLeadLedger', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
        global.fetch = originalFetch;
        jest.clearAllMocks();
    });

    it('renders CORE preview tenants ahead of local fallback data', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                previews: [
                    {
                        id: 'co-1',
                        tenant_id: 'tenant-preview-abc',
                        company_name: 'Acme GmbH',
                        preview_email: 'entry-abc@preview.saimor.local',
                        owner_email: 'entry-abc@preview.saimor.local',
                        contact_email: 'lead@acme.de',
                        domain: 'acme.de',
                        score: 64,
                        dossier_title: 'Acme GmbH Security Dossier',
                        is_demo: false,
                        status: 'preview',
                        claimed: false,
                    },
                ],
            }),
        } as any);

        render(<WebsiteLeadLedger />);

        await waitFor(() => {
            expect(screen.getByText('CORE Tenant Ledger')).toBeInTheDocument();
            expect(screen.getByText('Acme GmbH')).toBeInTheDocument();
            expect(screen.getByText('tenant-preview-abc')).toBeInTheDocument();
            expect(screen.getByText('lead@acme.de')).toBeInTheDocument();
            expect(screen.getByText(/64\s*Preview/)).toBeInTheDocument();
            expect(screen.getByText('Preview-Zugang')).toBeInTheDocument();
        });
    });

    it('shows claimed website tenants as customer-bound accounts', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                previews: [
                    {
                        id: 'co-2',
                        tenant_id: 'tenant-preview-claimed',
                        company_name: 'Kunde AG',
                        owner_email: 'owner@kunde.de',
                        claim_email: 'owner@kunde.de',
                        contact_email: 'owner@kunde.de',
                        domain: 'kunde.de',
                        score: 82,
                        dossier_title: 'Kunde AG Security Dossier',
                        is_demo: false,
                        status: 'claimed',
                        claimed: true,
                    },
                ],
            }),
        } as any);

        render(<WebsiteLeadLedger />);

        await waitFor(() => {
            expect(screen.getByText('Kunde AG')).toBeInTheDocument();
            expect(screen.getByText(/82\s*Kundenaccount/)).toBeInTheDocument();
            expect(screen.getAllByText('owner@kunde.de').length).toBeGreaterThan(0);
            expect(screen.getByText('Verbundenes Konto')).toBeInTheDocument();
        });
    });

    it('falls back gracefully when CORE cannot expose the ledger', async () => {
        global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 403 } as any);

        render(<WebsiteLeadLedger />);

        await waitFor(() => {
            expect(screen.getByText('Noch leer')).toBeInTheDocument();
            expect(screen.getByText('Noch kein Website-Dossier im OS angenommen.')).toBeInTheDocument();
        });
    });
});
