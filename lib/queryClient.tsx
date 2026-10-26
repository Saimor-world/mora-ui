'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { getDataScopeKey, useDataScopeKey } from '@/lib/store/dataScope';

function makeQueryClient() {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });

  // QueryCache → orb bridge: reflects query activity in the orb state.
  // Dynamic import avoids circular dependency (orbStore → awarenessClient → queryClient).
  client.getQueryCache().subscribe(async (event) => {
    const { useOrbStore } = await import('@/lib/store/orbStore');
    if (event.type === 'updated' && event.action.type === 'fetch') {
      useOrbStore.getState().setOrbState('thinking');
    }
    if (event.type === 'updated' && event.action.type === 'success') {
      useOrbStore.getState().setOrbState('idle');
    }
  });

  return client;
}

let browserQueryClient: QueryClient | undefined;
let browserScope: string | undefined;

export function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient(); // SSR: fresh each time
  }
  const scope = getDataScopeKey();
  if (!browserQueryClient || browserScope !== scope) {
    const previous = browserQueryClient;
    browserScope = scope;
    browserQueryClient = makeQueryClient();
    if (previous) { void previous.cancelQueries(); previous.clear(); }
  }
  return browserQueryClient;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const scope = useDataScopeKey();
  // NOTE: getQueryClient() used here — NOT makeQueryClient() — to share the singleton.
  // The orb bridge (QueryCache event listener) is wired in Task 12 when orbStore exists.
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider key={scope} client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
