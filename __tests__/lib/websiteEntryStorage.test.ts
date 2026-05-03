import { buildWebsiteEntryContext } from '@/lib/websiteEntryContext';
import {
    clearWebsiteEntryContext,
    loadWebsiteEntryContext,
    saveWebsiteEntryContext,
    WEBSITE_ENTRY_CONTEXT_STORAGE_KEY,
} from '@/lib/websiteEntryStorage';

describe('website entry storage', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('persists and reloads the latest website entry context', () => {
        const context = buildWebsiteEntryContext({
            surface: 'website',
            entity: 'security-audit',
            id: 'audit-123',
            company: 'Acme GmbH',
            domain: 'acme.de',
            score: '64',
        });

        expect(context).not.toBeNull();
        saveWebsiteEntryContext(context!);

        const loaded = loadWebsiteEntryContext();
        expect(loaded).toMatchObject({
            id: 'audit-123',
            companyName: 'Acme GmbH',
            domain: 'acme.de',
            score: 64,
        });
        expect(loaded?.storedAt).toEqual(expect.any(String));
    });

    it('ignores malformed storage payloads', () => {
        localStorage.setItem(WEBSITE_ENTRY_CONTEXT_STORAGE_KEY, '{"companyName":42}');
        expect(loadWebsiteEntryContext()).toBeNull();
    });

    it('clears the stored context', () => {
        localStorage.setItem(WEBSITE_ENTRY_CONTEXT_STORAGE_KEY, '{}');
        clearWebsiteEntryContext();
        expect(localStorage.getItem(WEBSITE_ENTRY_CONTEXT_STORAGE_KEY)).toBeNull();
    });
});
