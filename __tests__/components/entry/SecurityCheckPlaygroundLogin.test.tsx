import { render, waitFor } from '@testing-library/react';
import { SecurityCheckPlaygroundLogin } from '@/components/entry/SecurityCheckPlaygroundLogin';
import { corePost } from '@/lib/api/coreClient';
import { getDossierNodeId } from '@/lib/dossier/dossierNodeStorage';
import { useNavStore } from '@/lib/store/navStore';
import type { WebsiteEntryContext } from '@/lib/websiteEntryContext';

jest.mock('@/lib/api/coreClient', () => ({
    corePost: jest.fn(),
}));

jest.mock('@/lib/store/navStore', () => ({
    useNavStore: {
        getState: jest.fn(),
    },
}));

const context: WebsiteEntryContext = {
    surface: 'website',
    entity: 'security-audit',
    id: 'audit-123',
    companyName: 'Acme GmbH',
    email: 'lead@acme.de',
    domain: 'acme.de',
    score: 64,
    grade: 'B',
    level: 'mittel',
    summary: 'CSP fehlt.',
    title: 'Nightwatch',
    rooms: [],
    documents: [],
    tasks: [
        { title: 'CSP setzen', priority: 'hoch' },
        { title: 'DNS prüfen', priority: 'mittel' },
    ],
};

beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    localStorage.setItem('saimor_visitor_id', 'visitor_test');
    (corePost as jest.Mock).mockResolvedValue({
        active_company_id: 'company-public',
        node_id: 'node-audit-1',
    });
    (useNavStore.getState as jest.Mock).mockReturnValue({
        setActiveCompany: jest.fn(),
        setActiveMode: jest.fn(),
    });
});

it('ingests the audit into CORE and stores the returned dossier node id', async () => {
    const onReady = jest.fn();

    render(<SecurityCheckPlaygroundLogin context={context} onReady={onReady} onError={jest.fn()} />);

    await waitFor(() => expect(onReady).toHaveBeenCalled());
    expect(corePost).toHaveBeenCalledWith('/v3/playground/ingest-audit', expect.objectContaining({
        audit_id: 'audit-123',
        domain: 'acme.de',
        email: 'lead@acme.de',
        score: 64,
        visitor_id: 'visitor_test',
    }));
    expect(getDossierNodeId('audit-123')).toBe('node-audit-1');
});
