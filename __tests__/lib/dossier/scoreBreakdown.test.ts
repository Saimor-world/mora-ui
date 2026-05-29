import { scoreBreakdown, buildScoreNarrative } from '@/lib/dossier/scoreBreakdown';
import type { WebsiteEntryContext } from '@/lib/websiteEntryContext';

const base: WebsiteEntryContext = {
    companyName: 'Acme GmbH',
    domain: 'acme.de',
    score: 62,
    title: 'Test',
    rooms: [],
    documents: [],
    tasks: [],
};

it('returns 4 dimensions always', () => {
    const dims = scoreBreakdown(base);
    expect(dims).toHaveLength(4);
    expect(dims.map(d => d.id)).toEqual(['ssl', 'headers', 'performance', 'availability']);
});

it('maps SSL task to critical ssl dimension', () => {
    const ctx = { ...base, tasks: [{ title: 'SSL-Zertifikat erneuern', priority: 'hoch' as const }] };
    const dims = scoreBreakdown(ctx);
    const ssl = dims.find(d => d.id === 'ssl')!;
    expect(ssl.status).toBe('critical');
    expect(ssl.barPercent).toBeLessThanOrEqual(25);
});

it('maps CSP/HSTS tasks to headers dimension as warn', () => {
    const ctx = { ...base, tasks: [{ title: 'CSP-Header einrichten', priority: 'mittel' as const }] };
    const dims = scoreBreakdown(ctx);
    const headers = dims.find(d => d.id === 'headers')!;
    expect(headers.status).toBe('warn');
});

it('maps performance task to warn performance dimension', () => {
    const ctx = { ...base, tasks: [{ title: 'Ladezeit verbessern', priority: 'mittel' as const }] };
    const dims = scoreBreakdown(ctx);
    const perf = dims.find(d => d.id === 'performance')!;
    expect(perf.status).toBe('warn');
});

it('sets availability ok when no matching tasks', () => {
    const dims = scoreBreakdown(base);
    const avail = dims.find(d => d.id === 'availability')!;
    expect(avail.status).toBe('ok');
    expect(avail.barPercent).toBe(100);
});

it('buildScoreNarrative counts hoch tasks', () => {
    const ctx = { ...base, tasks: [
        { title: 'SSL erneuern', priority: 'hoch' as const },
        { title: 'CSP einrichten', priority: 'mittel' as const },
    ]};
    const narrative = buildScoreNarrative(ctx);
    expect(narrative).toContain('acme.de');
    expect(narrative).toContain('1');
});

it('buildScoreNarrative uses positive framing for score >= 80', () => {
    const ctx = { ...base, score: 85, tasks: [] };
    const narrative = buildScoreNarrative(ctx);
    expect(narrative).toContain('acme.de');
    expect(narrative).toMatch(/solide|gut/i);
});
