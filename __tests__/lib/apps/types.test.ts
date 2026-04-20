import type { AppProps, AppManifest, AppCategory, AppColor, NavigationTarget } from '@/lib/apps/types';

describe('lib/apps/types', () => {
  it('AppProps requires paneId', () => {
    // TypeScript compile test — if this file compiles, types are correct.
    const props: AppProps = {
      paneId: 'pane-1',
    };
    expect(props.paneId).toBe('pane-1');
  });

  it('AppProps optional fields are optional', () => {
    const minimal: AppProps = { paneId: 'x' };
    expect(minimal.initialData).toBeUndefined();
    expect(minimal.onClose).toBeUndefined();
    expect(minimal.onNavigate).toBeUndefined();
  });

  it('NavigationTarget has correct shape', () => {
    const nav: NavigationTarget = { type: 'pane', id: 'finder-1' };
    expect(nav.type).toBe('pane');
  });
});
