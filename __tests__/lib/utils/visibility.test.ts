import {
    getCoreFileVisibilityLabel,
    isSharedVisibilityScope,
    isWorkspaceVisibilityScope,
    normalizeVisibilityScope,
    visibilityFromScope,
} from '@/lib/utils/visibility';

describe('visibility utilities', () => {
    it('normalizes file scopes into OS visibility values', () => {
        expect(visibilityFromScope('personal')).toBe('private');
        expect(visibilityFromScope('company')).toBe('company');
        expect(visibilityFromScope('department')).toBe('department');
        expect(visibilityFromScope('public_link')).toBe('public');
    });

    it('keeps legacy visibility fallbacks readable', () => {
        expect(visibilityFromScope(null, 'private')).toBe('private');
        expect(visibilityFromScope(null, 'visible')).toBe('company');
        expect(visibilityFromScope('workspace')).toBe('company');
    });

    it('labels the same scopes across Meine Dateien and Finder', () => {
        expect(getCoreFileVisibilityLabel('personal')).toBe('Privat');
        expect(getCoreFileVisibilityLabel('personal', 'node-1')).toBe('Privat + OS-Dokument');
        expect(getCoreFileVisibilityLabel('company')).toBe('Workspace sichtbar');
        expect(getCoreFileVisibilityLabel('department')).toBe('Bereich sichtbar');
        expect(getCoreFileVisibilityLabel('public_link')).toBe('Freigabelink');
    });

    it('detects workspace scope without treating public links as workspace', () => {
        expect(normalizeVisibilityScope('team')).toBe('company');
        expect(isWorkspaceVisibilityScope('company')).toBe(true);
        expect(isWorkspaceVisibilityScope('public_link')).toBe(false);
    });

    it('separates private server files from shared workspace files', () => {
        expect(isSharedVisibilityScope('personal')).toBe(false);
        expect(isSharedVisibilityScope('company')).toBe(true);
        expect(isSharedVisibilityScope('department')).toBe(true);
        expect(isSharedVisibilityScope('public_link')).toBe(true);
    });
});
