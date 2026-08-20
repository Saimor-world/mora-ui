import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTasks } from '@/lib/queries/useTasks';
import { queryKeys } from '@/lib/queries/queryKeys';
import { coreGet } from '@/lib/api/http';

jest.mock('@/lib/api/http', () => ({
  coreGet: jest.fn().mockResolvedValue([{ id: 'task-1', title: 'Liefern', status: 'backlog' }]),
  normalizeList: (value: unknown) => Array.isArray(value) ? value : [],
}));

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useTasks company scope', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses the company in request and cache identity', async () => {
    const { result } = renderHook(() => useTasks('company-alpha'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(coreGet).toHaveBeenCalledWith('/v3/tasks?company_id=company-alpha', { isOptional: true });
    expect(queryKeys.tasks('company-alpha')).not.toEqual(queryKeys.tasks('company-beta'));
  });

  it('does not load tasks without an active company', () => {
    const { result } = renderHook(() => useTasks(null), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(coreGet).not.toHaveBeenCalled();
  });
});