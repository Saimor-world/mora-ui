import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { Calendar, Home, Library, Orbit, Wallet } from 'lucide-react';
import { OsDock, PHONE_DOCK_IDS, phoneSlotFor } from '@/components/os-shell/OsDock';
import type { FeatureManifest } from '@/features/types';

const item = (id: string, title: string, icon: FeatureManifest['icon']) => ({ id, title, icon } as FeatureManifest);
const ITEMS = [
  item('today', 'Heute', Home),
  item('post', 'Post', Calendar),
  item('finance', 'Finance', Wallet),
  item('knowledge', 'Wissen', Library),
  item('universe', 'Universe', Orbit),
];

function renderDock(over: Partial<React.ComponentProps<typeof OsDock>> = {}) {
  const props = {
    items: ITEMS, activeId: 'today', moraOpen: false,
    onNavigate: jest.fn(), onSearch: jest.fn(), onNotifications: jest.fn(), onMora: jest.fn(),
    ...over,
  };
  render(<OsDock {...props} />);
  return props;
}

describe('phone dock slots', () => {
  const all = ITEMS.map((m) => m.id);

  it('puts Heute, two places and Universe around MÔRA in the middle (slot 3)', () => {
    expect(PHONE_DOCK_IDS.map((id) => phoneSlotFor(id, all))).toEqual([1, 2, 4, 5]);
  });

  it('sends everything else to "Mehr"', () => {
    expect(phoneSlotFor('finance', all)).toBeNull();
    expect(phoneSlotFor('settings', all)).toBeNull();
  });

  it('closes the gap when a place is not available', () => {
    const withoutPost = all.filter((id) => id !== 'post');
    expect(phoneSlotFor('knowledge', withoutPost)).toBe(2);
    expect(phoneSlotFor('universe', withoutPost)).toBe(4);
  });
});

describe('OsDock', () => {
  it('is one main navigation with the active place marked', () => {
    renderDock({ activeId: 'post' });
    const nav = screen.getByRole('navigation', { name: 'Hauptnavigation' });
    const post = within(nav).getByRole('button', { name: 'Post' });
    expect(post).toHaveAttribute('aria-current', 'page');
    expect(post.closest('[data-feature]')).toHaveAttribute('data-active', 'true');
    expect(within(nav).getByRole('button', { name: 'Heute' })).not.toHaveAttribute('aria-current');
  });

  it('marks the phone slots and leaves the rest for "Mehr"', () => {
    renderDock();
    const slotOf = (name: string) => screen.getByRole('button', { name }).closest('[data-feature]')!.getAttribute('data-phone-slot');
    expect(['Heute', 'Post', 'Wissen', 'Universe'].map(slotOf)).toEqual(['1', '2', '4', '5']);
    expect(slotOf('Finance')).toBeNull();
  });

  it('shows MÔRA as the stone, not as an image', () => {
    const props = renderDock();
    const mora = screen.getByTestId('dock-mora');
    expect(within(mora).getByTestId('mora-stone')).toBeInTheDocument();
    expect(mora.querySelector('img')).toBeNull();
    fireEvent.click(mora);
    expect(props.onMora).toHaveBeenCalled();
  });

  it('navigates and keeps the tools (search, notifications, classic view)', () => {
    const props = renderDock();
    fireEvent.click(screen.getByRole('button', { name: 'Universe' }));
    expect(props.onNavigate).toHaveBeenCalledWith('universe');
    fireEvent.click(screen.getByRole('button', { name: 'Suche' }));
    expect(props.onSearch).toHaveBeenCalled();
    expect(screen.getByTestId('legacy-shell-link')).toHaveAttribute('href', '/');
  });
});
