import { buildWebsiteEntryContext, firstQueryValue } from '@/lib/websiteEntryContext';

describe('website entry context', () => {
    it('returns null for non-website entries', () => {
        expect(buildWebsiteEntryContext({ surface: 'os', entity: 'security-audit', id: 'audit-1' })).toBeNull();
        expect(buildWebsiteEntryContext({ surface: 'website', entity: 'security-audit' })).toBeNull();
    });

    it('builds a security audit HQ preview from query params', () => {
        const context = buildWebsiteEntryContext({
            surface: 'website',
            entity: 'security-audit',
            id: 'audit-123',
            company: 'Acme GmbH',
            domain: 'acme.de',
            score: '42.4',
            level: 'kritisch',
        });

        expect(context).toMatchObject({
            surface: 'website',
            entity: 'security-audit',
            id: 'audit-123',
            companyName: 'Acme GmbH',
            domain: 'acme.de',
            score: 42,
            level: 'kritisch',
            title: 'Digital Risk Check aus der Website',
        });
        expect(context?.rooms[0]).toMatchObject({
            name: 'Security',
            tone: 'risk',
        });
        expect(context?.tasks[0]).toMatchObject({
            title: 'Kritische Befunde zuerst klaeren',
            priority: 'hoch',
        });
    });

    it('derives a readable company name from the domain when no company is present', () => {
        const context = buildWebsiteEntryContext({
            surface: 'website',
            entity: 'digital-blueprint',
            id: 'blueprint-1',
            domain: 'www.green-tools.example',
            score: '120',
        });

        expect(context?.companyName).toBe('Green Tools');
        expect(context?.score).toBe(100);
        expect(context?.title).toBe('Digital AI Self Blueprint aus der Website');
        expect(context?.rooms[0]).toMatchObject({
            name: 'Security',
            tone: 'setup',
        });
    });

    it('reads the first value from array query params', () => {
        expect(firstQueryValue(['one', 'two'])).toBe('one');
        expect(firstQueryValue('single')).toBe('single');
    });
});
