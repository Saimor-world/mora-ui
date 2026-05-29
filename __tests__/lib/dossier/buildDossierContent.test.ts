import { buildDossierContent } from '@/lib/dossier/buildDossierContent';
import type { WebsiteEntryContext } from '@/lib/websiteEntryContext';

const ctx: WebsiteEntryContext = {
    companyName: 'Acme GmbH',
    domain: 'acme.de',
    score: 62,
    level: 'mittel',
    summary: 'Mittleres Risiko.',
    title: 'Nightwatch Security Signal aus WORLD',
    rooms: [],
    documents: [],
    tasks: [
        { title: 'SSL erneuern', priority: 'hoch' },
        { title: 'CSP einrichten', priority: 'mittel' },
    ],
};

it('includes company name and domain', () => {
    const md = buildDossierContent(ctx);
    expect(md).toContain('Acme GmbH');
    expect(md).toContain('acme.de');
});

it('includes score as number', () => {
    const md = buildDossierContent(ctx);
    expect(md).toContain('62');
});

it('includes all task titles', () => {
    const md = buildDossierContent(ctx);
    expect(md).toContain('SSL erneuern');
    expect(md).toContain('CSP einrichten');
});

it('works when score is undefined', () => {
    const { score, ...noScore } = ctx;
    expect(() => buildDossierContent(noScore as WebsiteEntryContext)).not.toThrow();
});
