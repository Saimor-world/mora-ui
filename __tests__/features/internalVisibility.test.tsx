import React from 'react';
import { render, screen } from '@testing-library/react';
import { FEATURE_MANIFESTS, navigationModel, resolveFeatureId } from '@/features/registry';


const customer = { role: 'owner' as const, flags: new Set<string>(), internal: false };
const saimor = { role: 'owner' as const, flags: new Set<string>(), internal: true };

describe('SAIMÔR-internal things stay hidden from customer companies', () => {
  it('hides Labs from the navigation and from direct links for customers', () => {
    const labs = FEATURE_MANIFESTS.find((m) => m.id === 'labs')!;
    expect(labs.internalOnly).toBe(true);
    const ids = (ctx: typeof customer) => Object.values(navigationModel(ctx)).flat().map((m) => m.id);
    expect(ids(customer)).not.toContain('labs');
    expect(ids(saimor)).toContain('labs');
    expect(resolveFeatureId('labs', customer)).toBe('today');
    expect(resolveFeatureId('labs', saimor)).toBe('labs');
  });

  it('hides Finance and the classic surface from customers', () => {
    const ids = (ctx: typeof customer) => Object.values(navigationModel(ctx)).flat().map((m) => m.id);
    expect(ids(customer)).not.toContain('finance');
    expect(ids(saimor)).toContain('finance');
    expect(resolveFeatureId('finance', customer)).toBe('today');
    const { OsDock } = require('@/components/os-shell/OsDock');
    const noop = () => undefined;
    const p = { items: [], mobileItems: [], moreActive: false, onMore: noop, activeId: 'today', moraOpen: false, unread: 0, onNavigate: noop, onSearch: noop, onControl: noop, controlOpen: false, onNotifications: noop, onMora: noop };
    const { unmount } = render(<OsDock {...p} />);
    expect(screen.queryByTestId('legacy-shell-link')).not.toBeInTheDocument();
    unmount();
    render(<OsDock {...p} showLegacy />);
    expect(screen.getByTestId('legacy-shell-link')).toBeInTheDocument();
  });

});
