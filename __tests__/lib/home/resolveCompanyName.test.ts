import { resolveCompanyName } from '@/lib/home/resolveCompanyName';

const view = (name: string) => ({ company: { id: 'c1', name, is_visitor: false } });

it('uses the view company name when present', () => {
    expect(resolveCompanyName(view('Müller GmbH'), { companyName: 'OLD' })).toBe('Müller GmbH');
});

it('falls back to websiteEntryContext only when view has no name', () => {
    expect(resolveCompanyName(undefined, { companyName: 'Visitor Co' })).toBe('Visitor Co');
    expect(resolveCompanyName(view(''), { companyName: 'Visitor Co' })).toBe('Visitor Co');
});

it('returns empty string when nothing is known — never a hardcoded fallback', () => {
    expect(resolveCompanyName(undefined, null)).toBe('');
    expect(resolveCompanyName(view(''), { companyName: '' })).toBe('');
});
