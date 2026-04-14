'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

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

export function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient(); // SSR: fresh each time
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient(); // browser: singleton
  }
  return browserQueryClient;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // NOTE: getQueryClient() used here — NOT makeQueryClient() — to share the singleton.
  // The orb bridge (QueryCache event listener) is wired in Task 12 when orbStore exists.
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
