import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { HeadSheet } from '@/features/home/departments/HeadSheet';
import { Cockpit } from '@/features/home/cockpit/Cockpit';
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
  expect(act(initialDay(), { type: 'head', record: { departmentId: 'service', itemId: 'code-example', actorId: 'lena', choice: 'code-draft', at: '2026-10-28T06:00:00Z' } }).headRecords).toEqual([]);
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

it('shows explicitly fictional research examples without implying real research', () => {
  render(<HeadSheet planet={service} viewer="tarek" day={initialDay()} dispatch={jest.fn()} onClose={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Demo-Ergebnisse anzeigen' }));
  expect(screen.getByTestId('head-demo-research').children).toHaveLength(3);
  expect(screen.getByText(/keine echte Recherche statt/)).toBeInTheDocument();
  expect(screen.getByLabelText('Fiktive Vorher-nachher-Vorschau')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Demo-Auftrag'), { target: { value: 'Andere Aufgabe' } });
  fireEvent.click(screen.getByRole('button', { name: 'Demo-Ergebnisse anzeigen' }));
  expect(screen.queryByTestId('head-demo-research')).not.toBeInTheDocument();
  expect(screen.getByText(/kein Demo-Beispiel vorbereitet/)).toBeInTheDocument();
});

it('closes the department sheet when opening a folder', () => {
  localStorage.clear();
  window.history.replaceState(null, '', '/os?firma=morgenrot&als=marius');
  window.matchMedia = jest.fn().mockImplementation(query => ({ matches: false, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
  render(<Cockpit initialViewer="marius" />);
  fireEvent.click(screen.getByTestId('open-firma'));
  fireEvent.click(screen.getByTestId('open-kueche'));
  fireEvent.click(screen.getByTestId('open-head'));
  expect(screen.getByTestId('head-sheet')).toBeInTheDocument();
  fireEvent.click(screen.getByTestId('moon-k-rez'));
  expect(screen.queryByTestId('head-sheet')).not.toBeInTheDocument();
  expect(screen.getByTestId('ck-sheet')).toBeInTheDocument();
});
