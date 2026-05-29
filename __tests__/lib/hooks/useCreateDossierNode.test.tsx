import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { useCreateDossierNode } from '@/lib/hooks/useCreateDossierNode';
import { createNode } from '@/lib/api/orgClient';
import { getDossierNodeId, setDossierNodeId } from '@/lib/dossier/dossierNodeStorage';
import { useNavStore } from '@/lib/store/navStore';

jest.mock('@/lib/api/orgClient', () => ({
    createNode: jest.fn(),
}));

jest.mock('@/lib/store/navStore', () => ({
    useNavStore: jest.fn(),
}));

const mockContext = {
    id: 'ctx-001',
    companyName: 'Acme GmbH',
    domain: 'acme.de',
    score: 72,
    title: 'Test',
    rooms: [],
    documents: [],
    tasks: [{ title: 'Fix SSL', priority: 'hoch' as const }],
    storedAt: new Date().toISOString(),
};

beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    (useNavStore as unknown as jest.Mock).mockReturnValue({ activeCompanyId: 'company-1' });
    (createNode as jest.Mock).mockResolvedValue({ id: 'node-created-123' });
});

it('creates a node when context has an id and company is available', async () => {
    const { result } = renderHook(() => useCreateDossierNode(mockContext));
    await waitFor(() => expect(result.current.nodeId).toBe('node-created-123'));
    expect(createNode).toHaveBeenCalledTimes(1);
    expect(createNode).toHaveBeenCalledWith(
        expect.objectContaining({
            company_id: 'company-1',
            type: 'document',
            title: expect.stringContaining('Acme GmbH'),
        })
    );
});

it('stores the nodeId in localStorage after creation', async () => {
    renderHook(() => useCreateDossierNode(mockContext));
    await waitFor(() => expect(getDossierNodeId('ctx-001')).toBe('node-created-123'));
});

it('does not call createNode again if nodeId already in localStorage', async () => {
    setDossierNodeId('ctx-001', 'existing-node-456');
    const { result } = renderHook(() => useCreateDossierNode(mockContext));
    await waitFor(() => expect(result.current.nodeId).toBe('existing-node-456'));
    expect(createNode).not.toHaveBeenCalled();
});

it('returns null nodeId when context is null', () => {
    const { result } = renderHook(() => useCreateDossierNode(null));
    expect(result.current.nodeId).toBeNull();
    expect(createNode).not.toHaveBeenCalled();
});

it('sets metadata.expires_at to 20 days from now', async () => {
    renderHook(() => useCreateDossierNode(mockContext));
    await waitFor(() => expect(createNode).toHaveBeenCalled());
    const payload = (createNode as jest.Mock).mock.calls[0][0];
    const expiresAt = new Date(payload.metadata.expires_at);
    const diffDays = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(19);
    expect(diffDays).toBeLessThan(21);
});
