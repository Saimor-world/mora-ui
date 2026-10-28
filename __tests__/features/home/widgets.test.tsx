import React from 'react';
import { render, screen } from '@testing-library/react';
import { WidgetBoard } from '@/features/home/widgets/WidgetBoard';
import { widgetsFromDemo, widgetsFromToday } from '@/features/home/widgets/adapters';
import { buildHomeModel } from '@/features/home/data/homeModel';
import { MORGENROT_SEED } from '@/lib/demo/morgenrot/seed';
import { MORGENROT_EVENTS } from '@/lib/demo/morgenrot/structure';
import type { TodaySnapshot } from '@/lib/api/todayClient';

const model = (id: string) => buildHomeModel(MORGENROT_SEED, MORGENROT_EVENTS, '2026-10-28', id);
it('renders the same board with fictional café data and scoped CORE data', () => {
  const { rerender } = render(<WidgetBoard widgets={widgetsFromDemo(model('marius'))} />);
  expect(screen.getByTestId('widget-revenue')).toHaveTextContent('1.842 €');
  expect(screen.getAllByText(/Fiktive Demo/).length).toBeGreaterThan(0);
  const meta = { status: 'ok', source: 'CORE', as_of: '10:00' };
  const snapshot = { mail: { ...meta, unread_count: 4 }, calendar: { ...meta, status: 'disconnected', events: [] }, tasks: { ...meta, status: 'unavailable', due_today: [] } } as unknown as TodaySnapshot;
  rerender(<WidgetBoard widgets={widgetsFromToday(snapshot)} />);
  expect(screen.getByTestId('widget-mail')).toHaveTextContent('4 ungelesen');
  expect(screen.queryByTestId('widget-revenue')).not.toBeInTheDocument();
  expect(screen.queryByTestId('widget-calendar')).not.toBeInTheDocument();
  expect(screen.queryByTestId('widget-tasks')).not.toBeInTheDocument();
});
it('does not expose café revenue or other employees to staff', () => {
  const widgets = widgetsFromDemo(model('tarek'));
  render(<WidgetBoard widgets={widgets} />);
  expect(screen.queryByTestId('widget-revenue')).not.toBeInTheDocument();
  expect(screen.queryByTestId('widget-team')).not.toBeInTheDocument();
  expect(screen.getByTestId('widget-shift')).toHaveTextContent('06:30–14:30');
});
it('does not invent a total from a mail sample', () => {
  const snapshot = { mail: { status: 'ok', source: 'CORE', unread_count: null, inbox_loaded: 3 }, calendar: { status: 'disconnected' }, tasks: { status: 'unavailable' } } as unknown as TodaySnapshot;
  expect(widgetsFromToday(snapshot)).toEqual([]);
});
