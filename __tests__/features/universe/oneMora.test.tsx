import React from 'react';
import { render, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OsDock } from '@/components/os-shell/OsDock';
import { UnifiedUniverse } from '@/features/universe/ui/UnifiedUniverse';
import { useMoraPresence, flightOffset } from '@/lib/mora/moraPresence';
import { Home, Orbit } from 'lucide-react';
import type { FeatureManifest } from '@/features/types';

const items = [{ id: 'home', title: 'Home', icon: Home }, { id: 'universe', title: 'Universe', icon: Orbit }] as unknown as FeatureManifest[];
const MORA = '.px-mora'; // jede MÔRA-Figur (Dock, Szene, Marke) trägt diese Klasse

function Shell({ children }: { children?: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}<OsDock items={items} mobileItems={[]} activeId="home" moraOpen={false} moreActive={false} onNavigate={jest.fn()} onSearch={jest.fn()} onMora={jest.fn()} onMore={jest.fn()} onNotifications={jest.fn()} /></QueryClientProvider>;
}

describe('Genau eine MÔRA im OS', () => {
  beforeEach(() => { localStorage.clear(); useMoraPresence.getState().goHome(); window.matchMedia = jest.fn().mockImplementation((q: string) => ({ matches: false, media: q, addEventListener: jest.fn(), removeEventListener: jest.fn() })); });

  it('Home: nur die Dock-MÔRA', () => {
    const { container } = render(<Shell />);
    expect(container.querySelectorAll(MORA)).toHaveLength(1);
  });

  it.each(['glas', 'pixel'] as const)('Universe (%s): keine zweite MÔRA in der Szene', (style) => {
    const { container } = render(<Shell><UnifiedUniverse navigate={jest.fn()} initialStyle={style} /></Shell>);
    expect(container.querySelectorAll(MORA)).toHaveLength(1);
    expect(container.querySelector('[data-testid="world-mora"]')).toBeNull();
  });

  it('offener Planet: dieselbe Instanz fliegt hin und kommt zurück', () => {
    const { container, unmount } = render(<Shell><UnifiedUniverse navigate={jest.fn()} initialStyle="glas" initialPlanetId="dept-kueche" /></Shell>);
    expect(useMoraPresence.getState().target).toEqual({ kind: 'anchor', selector: '[data-mora-anchor="planet"]', reason: 'planet' });
    expect(container.querySelectorAll(MORA)).toHaveLength(1);
    act(() => unmount());
    expect(useMoraPresence.getState().target).toEqual({ kind: 'dock' });
  });

  it('flightOffset rechnet Mitte zu Mitte', () => {
    const r = (l: number, t: number, w: number, h: number) => ({ left: l, top: t, width: w, height: h } as DOMRect);
    expect(flightOffset(r(0, 0, 100, 100), r(300, -200, 100, 100))).toEqual({ x: 300, y: -200 });
    expect(flightOffset(r(0, 0, 10, 10), null)).toBeNull();
  });
});
