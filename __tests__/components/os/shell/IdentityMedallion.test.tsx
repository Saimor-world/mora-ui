import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { IdentityMedallion } from '@/components/os/shell/IdentityMedallion';
import { UserAvatar } from '@/components/mora/UserAvatar';
import { getUserColor } from '@/lib/utils/userColors';

// IdentityMedallion uses jsx styled-jsx — mock it
jest.mock('styled-jsx/style', () => () => null);

describe('IdentityMedallion — auraColor prop', () => {
  it('applies auraColor ring/glow to outer ring div for non-owner role', () => {
    const { container } = render(
      <IdentityMedallion name="Alice" role="member" auraColor="#34d399" size={48} />
    );
    const ringDiv = container.querySelector('[style*="border"]');
    expect(ringDiv).toBeTruthy();
    const style = (ringDiv as HTMLElement).getAttribute('style') || '';
    expect(style).toContain('#34d399');
  });

  it('ignores auraColor for owner role — stays gold', () => {
    const { container } = render(
      <IdentityMedallion name="Owner" role="owner" auraColor="#34d399" size={48} />
    );
    const ringDiv = container.querySelector('[style*="border"]');
    const style = (ringDiv as HTMLElement)?.getAttribute('style') || '';
    expect(style).toContain('212,175,55');
    expect(style).not.toContain('#34d399');
  });

  it('ignores auraColor for system_owner role — stays gold', () => {
    const { container } = render(
      <IdentityMedallion name="Root" role="system_owner" auraColor="#a78bfa" size={48} />
    );
    const ringDiv = container.querySelector('[style*="border"]');
    const style = (ringDiv as HTMLElement)?.getAttribute('style') || '';
    expect(style).toContain('212,175,55');
    expect(style).not.toContain('#a78bfa');
  });

  it('renders with default role colors when auraColor is undefined', () => {
    const { container } = render(
      <IdentityMedallion name="Bob" role="member" size={48} />
    );
    const ringDiv = container.querySelector('[style*="border"]');
    const style = (ringDiv as HTMLElement)?.getAttribute('style') || '';
    expect(style).toContain('56,189,248');
  });
});

describe('UserAvatar — auraColor forwarded to IdentityMedallion', () => {
  it('computes personal auraColor from name and forwards it for non-owner', () => {
    const email = 'alice@example.com';
    const expectedHex = getUserColor(email).hex;
    const { container } = render(
      <UserAvatar role="member" name={email} showAura />
    );
    const ringDiv = container.querySelector('[style*="border"]');
    const style = (ringDiv as HTMLElement)?.getAttribute('style') || '';
    expect(style).toContain(expectedHex.replace('#', ''));
  });

  it('does not forward auraColor for owner — stays gold', () => {
    const { container } = render(
      <UserAvatar role="owner" name="owner@example.com" showAura />
    );
    const ringDiv = container.querySelector('[style*="border"]');
    const style = (ringDiv as HTMLElement)?.getAttribute('style') || '';
    expect(style).toContain('212,175,55'); // gold
  });
});
