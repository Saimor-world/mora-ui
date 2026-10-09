import { parseThoughtTime, DEMO_THOUGHTS } from '@/features/mora/ui/AgentFeed';
import { connectedSources } from '@/lib/os-prototype/useSources';
import { readLocalOrg, saveLocalOrg, isOnboardingDone, finishOnboarding, requestOnboarding } from '@/lib/os-prototype/onboarding';

describe('V1.6 helpers', () => {
  it('tolerates the CORE "+00:00Z" timestamp', () => {
    expect(parseThoughtTime('2026-10-07T16:00:00.000+00:00Z')?.toISOString()).toBe('2026-10-07T16:00:00.000Z');
    expect(parseThoughtTime('nope')).toBeNull();
    expect(parseThoughtTime(undefined)).toBeNull();
  });
  it('demo thoughts exist and never claim to be sent', () => {
    expect(DEMO_THOUGHTS.length).toBeGreaterThan(2);
    expect(DEMO_THOUGHTS.some((t) => /gesendet|überwiesen/i.test(t.thought || ''))).toBe(false);
  });
  it('only status "connected" counts as a connected source', () => {
    expect(connectedSources([
      { id: 'a', label: 'A', group: 'mail', status: 'available', detail: '' },
      { id: 'b', label: 'B', group: 'cloud', status: 'setup_required', detail: '' },
      { id: 'c', label: 'C', group: 'calendar', status: 'connected', detail: '' },
    ]).map((s) => s.id)).toEqual(['c']);
    expect(connectedSources(undefined)).toEqual([]);
  });
  it('stores company/departments locally, trimmed and bounded', () => {
    saveLocalOrg({ company: '  Muster GmbH ', departments: [' Vertrieb ', '', ...Array.from({ length: 20 }, (_, i) => `D${i}`)] });
    const org = readLocalOrg();
    expect(org.company).toBe('Muster GmbH');
    expect(org.departments[0]).toBe('Vertrieb');
    expect(org.departments.length).toBeLessThanOrEqual(12);
  });
  it('onboarding done/restart uses the legacy first-run keys', () => {
    window.localStorage.clear();
    expect(isOnboardingDone()).toBe(false);
    finishOnboarding();
    expect(isOnboardingDone()).toBe(true);
    expect(window.localStorage.getItem('saimor_product_tour_dismissed')).toBe('1');
    const spy = jest.fn();
    window.addEventListener('saimor:product-tour-restart', spy);
    requestOnboarding();
    expect(spy).toHaveBeenCalled();
    expect(isOnboardingDone()).toBe(false);
  });
});
