import {
    getDossierNodeId,
    setDossierNodeId,
    clearDossierNodeId,
    DOSSIER_NODE_KEY_PREFIX,
} from '@/lib/dossier/dossierNodeStorage';

beforeEach(() => localStorage.clear());

it('returns null when nothing is stored', () => {
    expect(getDossierNodeId('ctx-abc')).toBeNull();
});

it('stores and retrieves a node id', () => {
    setDossierNodeId('ctx-abc', 'node-xyz');
    expect(getDossierNodeId('ctx-abc')).toBe('node-xyz');
});

it('uses a key prefixed with the constant', () => {
    setDossierNodeId('ctx-abc', 'node-xyz');
    const raw = localStorage.getItem(`${DOSSIER_NODE_KEY_PREFIX}ctx-abc`);
    expect(raw).toBe('node-xyz');
});

it('clears the stored id', () => {
    setDossierNodeId('ctx-abc', 'node-xyz');
    clearDossierNodeId('ctx-abc');
    expect(getDossierNodeId('ctx-abc')).toBeNull();
});

it('returns null gracefully when key is empty', () => {
    expect(() => getDossierNodeId('')).not.toThrow();
    expect(getDossierNodeId('')).toBeNull();
});
