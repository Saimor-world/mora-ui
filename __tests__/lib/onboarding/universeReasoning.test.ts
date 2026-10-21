import { universeReasoningLines } from '@/lib/onboarding/universeReasoning';
import { usesInternalVocabulary, businessTerm, firstNameOf } from '@/lib/os/businessLanguage';

describe('universeReasoningLines', () => {
  it('explains each proposed planet without a template', () => {
    const lines = universeReasoningLines([
      { name: 'Kasse & Umsatz', category: 'finance', reasoning: { source: 'mora', reason: 'Kategorie aus dem Gespräch' }, evidence: ['SumUp-Mails'] },
      { name: 'Instagram', category: 'marketing', reasoning: { source: 'rule', reason: "Name enthält 'instagram'" } },
    ]);
    expect(lines[0]).toBe('Kasse & Umsatz → finance (aus dem Gespräch) – Kategorie aus dem Gespräch · Belege: SumUp-Mails');
    expect(lines[1]).toContain('(aus dem Namen)');
  });
});

describe('businessLanguage', () => {
  afterEach(() => window.localStorage.removeItem('saimor-vocab'));
  it('uses plain words for customer companies', () => {
    expect(usesInternalVocabulary({ tenant_id: 'tenant-abc', role: 'owner' } as never)).toBe(false);
    expect(businessTerm('Wache', false)).toBe('Hinweise');
    expect(businessTerm('Wache', true)).toBe('Wache');
  });
  it('keeps internal words for the HQ', () => {
    expect(usesInternalVocabulary({ tenant_id: 'tenant-saimor-hq', role: 'owner' } as never)).toBe(true);
  });
  it('never greets with an email', () => {
    expect(firstNameOf({ name: 'aylin@nails.de', email: 'aylin@nails.de' } as never)).toBe('');
    expect(firstNameOf({ name: 'Aylin Kaya', email: 'a@b.de' } as never)).toBe('Aylin');
  });
});
