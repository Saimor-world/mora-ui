import { enabledFeatureFlags, isLocalPreview, isOsPrototypeEnabled } from '@/lib/os-prototype/flags';
import { proposeActions } from '@/features/mora/data/proposals';

describe('OS prototype flags', () => {
  it('is off unless explicitly enabled at build time', () => {
    expect(isOsPrototypeEnabled({})).toBe(false);
    expect(isOsPrototypeEnabled({ NEXT_PUBLIC_OS_PROTOTYPE: '1' })).toBe(true);
  });
  it('local preview only on localhost and only with NEXT_PUBLIC_OS_PREVIEW=local', () => {
    expect(isLocalPreview('localhost', {})).toBe(false);
    expect(isLocalPreview('hq.saimor.world', { NEXT_PUBLIC_OS_PREVIEW: 'local' })).toBe(false);
    expect(isLocalPreview('localhost', { NEXT_PUBLIC_OS_PREVIEW: 'local' })).toBe(true);
    expect(isLocalPreview('127.0.0.1', { NEXT_PUBLIC_OS_PREVIEW: 'local' })).toBe(true);
  });
  it('parses feature flags', () => {
    expect([...enabledFeatureFlags({ NEXT_PUBLIC_OS_FLAGS: 'a, b,,' })]).toEqual(['a', 'b']);
  });
});

describe('MÔRA proposals', () => {
  it('proposes reversible navigation with an explanation', () => {
    const p = proposeActions('Wie sieht mein Cashflow aus?', 'today');
    const nav = p.find((x) => x.target === 'finance');
    expect(nav).toMatchObject({ kind: 'navigate', reversible: true });
    expect(nav!.explanation).toMatch(/nichts wird verändert/);
  });
  it('never proposes the surface the user is already on', () => {
    expect(proposeActions('finance', 'finance').some((x) => x.target === 'finance')).toBe(false);
  });
  it('marks actions with external effect as non-reversible (confirmation required)', () => {
    const p = proposeActions('Sende die Antwort an den Kunden', 'post');
    expect(p.find((x) => x.kind === 'prepare')).toMatchObject({ reversible: false });
  });
  it('offers legacy apps only on explicit open intent', () => {
    expect(proposeActions('öffne scanner', 'today').some((x) => x.kind === 'open-legacy' && x.target === 'scanner')).toBe(true);
    expect(proposeActions('scanner', 'today').some((x) => x.kind === 'open-legacy')).toBe(false);
  });
});
