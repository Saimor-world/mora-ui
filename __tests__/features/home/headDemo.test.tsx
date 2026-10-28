import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { HeadSheet } from '@/features/home/departments/HeadSheet';
import { act, initialDay } from '@/features/home/data/demoDay';
import { canDecideHead } from '@/features/home/departments/demoHead';
import { MORGENROT_STRUCTURE } from '@/lib/demo/morgenrot/structure';

const service = MORGENROT_STRUCTURE.find(p => p.id === 'service')!;
it('lets the responsible manager decide, but blocks members and other departments in the reducer', () => {
  expect(canDecideHead('lena', 'service', 'accepted')).toBe(true);
  expect(canDecideHead('lena', 'kueche', 'accepted')).toBe(false);
  expect(canDecideHead('tarek', 'kueche', 'accepted')).toBe(false);
  const record = { departmentId: 'service', itemId: 'service-response', actorId: 'tarek', choice: 'accepted' as const, at: '2026-10-28T06:00:00Z' };
  expect(act(initialDay(), { type: 'head', record }).headRecords).toEqual([]);
});
it('only permits the admin hierarchy to mark the simulated code proposal', () => {
  expect(canDecideHead('marius', 'service', 'code-draft')).toBe(true);
  expect(canDecideHead('lena', 'service', 'code-draft')).toBe(false);
  render(<HeadSheet planet={service} viewer="lena" day={initialDay()} dispatch={jest.fn()} onClose={jest.fn()} />);
  expect(screen.queryByRole('button', { name: 'Demo-Freigabe vormerken' })).not.toBeInTheDocument();
  expect(screen.getByText('Administrator fragen')).toBeInTheDocument();
  expect(screen.getByText(/kein Branch und kein Pull Request/)).toBeInTheDocument();
});
it('records a demo rejection and removes the suggestion', () => {
  let day = initialDay();
  const dispatch = jest.fn(action => { day = act(day, action); });
  const view = render(<HeadSheet planet={service} viewer="lena" day={day} dispatch={dispatch} onClose={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Ablehnen' }));
  view.rerender(<HeadSheet planet={service} viewer="lena" day={day} dispatch={dispatch} onClose={jest.fn()} />);
  expect(screen.queryByTestId('head-suggestion')).not.toBeInTheDocument();
  expect(screen.getByText(/abgelehnt · Demo/)).toBeInTheDocument();
  expect(day.headRecords?.[0].actorId).toBe('lena');
});
