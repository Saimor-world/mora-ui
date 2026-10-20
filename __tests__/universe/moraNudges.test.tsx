import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MoraNudges } from '@/components/universe/MoraNudges';
import { resetAllStores } from '../test-utils';

jest.mock('@/lib/universe/moraPresence', () => ({
  flyMora: jest.fn(),
  getMoraPresence: () => ({ state: 'calm', place: 'dock', target: null }),
}));

const soon = new Date(Date.now() + 8 * 60000).toISOString();
const old = new Date(Date.now() - 18 * 3600000).toISOString();

describe('MÔRA chips', () => {
  beforeEach(() => {
    resetAllStores();
  });

  it('opens one chip and keeps the rest as a quiet counter', () => {
    render(
      <MoraNudges
        mail={[{ id: 'm1', subject: 'Anfrage: Produktdemo', from: 'a', date: old }]}
        calendar={[{ id: 'c1', title: 'Standup', date: soon }]}
        incidents={[]}
        dueToday={[{ id: 't1', title: 'API-Integration fertigstellen' }]}
      />,
    );
    const region = screen.getByTestId('uv2-mora-nudges');
    expect(region.querySelectorAll('[data-nudge-open]')).toHaveLength(1);
    expect(screen.getByTestId('uv2-mora-nudge-more')).toHaveTextContent('2 weitere');
    fireEvent.click(screen.getByTestId('uv2-mora-nudge-more'));
    expect(region.querySelectorAll('[data-nudge-open]')).toHaveLength(1);
  });
});
