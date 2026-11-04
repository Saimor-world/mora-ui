import React from 'react';
import { act, render, screen } from '@testing-library/react';
import type { ContinuityRequest } from '@/components/home/ContinuityPanel';

const coreRequest = jest.fn();
const panel = jest.fn();
jest.mock('@/lib/api/http', () => ({
  coreRequest: (...args: unknown[]) => coreRequest(...args),
  CoreError: class extends Error { status?: number; },
}));
jest.mock('@/lib/universe/morgen', () => ({ isUniverseV2Enabled: () => false }));
jest.mock('@/components/home/ContinuityPanel', () => ({
  ContinuityPanel: (props: { request: ContinuityRequest }) => {
    panel(props);
    return <div data-testid="personal-continuity">Personal calendar fixture</div>;
  },
}));

import { CalendarContinuity } from '@/components/home/CalendarContinuity';
import { useDemoStore } from '@/lib/demo/demoStore';
import { useSessionStore } from '@/lib/store/sessionStore';

beforeEach(() => {
  jest.clearAllMocks();
  coreRequest.mockReset().mockResolvedValue([]);
  useDemoStore.getState().setDemoCompany(null);
  useSessionStore.setState({ user: { id: 'presenter-test', tenant_id: 'tenant-test' } as never });
});
afterEach(() => useDemoStore.getState().setDemoCompany(null));

it('does not mount personal calendar threads when entering in demo scope', () => {
  useDemoStore.getState().setDemoCompany('demo-morgenrot');
  const { container } = render(<CalendarContinuity />);
  expect(container).toBeEmptyDOMElement();
  expect(panel).not.toHaveBeenCalled();
  expect(coreRequest).not.toHaveBeenCalled();
});

it('preserves the live read path outside demo scope', async () => {
  render(<CalendarContinuity />);
  const request = panel.mock.calls[0][0].request as ContinuityRequest;
  await expect(request('list')).resolves.toEqual([]);
  expect(coreRequest).toHaveBeenCalledWith('/v3/continuity/threads', expect.objectContaining({ method: 'GET' }));
});

it('unmounts previous content and refuses stale read, scan and approve callbacks', async () => {
  render(<CalendarContinuity />);
  const request = panel.mock.calls[0][0].request as ContinuityRequest;
  expect(screen.getByTestId('personal-continuity')).toBeInTheDocument();
  act(() => useDemoStore.getState().setDemoCompany('demo-morgenrot'));
  expect(screen.queryByTestId('personal-continuity')).not.toBeInTheDocument();
  await expect(request('list')).rejects.toThrow('in der Demo');
  await expect(request('scan')).rejects.toThrow('in der Demo');
  await expect(request('approve', { id: 'thread-test', proposal_hash: 'test-hash' })).rejects.toThrow('in der Demo');
  expect(coreRequest).not.toHaveBeenCalled();
});

it('blocks the next scan step if demo begins during an existing calendar sync', async () => {
  let finishSync!: (value: unknown) => void;
  coreRequest.mockImplementationOnce(() => new Promise(resolve => { finishSync = resolve; }));
  render(<CalendarContinuity />);
  const request = panel.mock.calls[0][0].request as ContinuityRequest;
  const scan = request('scan');
  expect(coreRequest).toHaveBeenCalledTimes(1);
  act(() => useDemoStore.getState().setDemoCompany('demo-morgenrot'));
  finishSync([]);
  await expect(scan).rejects.toThrow('in der Demo');
  expect(coreRequest).toHaveBeenCalledTimes(1);
  expect(coreRequest.mock.calls[0][0]).toContain('/v1/calendar/fabric/sync');
});
