'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useSessionStore } from '@/lib/store/sessionStore';

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

/**
 * Fail-closed cache boundary: when a signed-in principal leaves (logout, user switch,
 * explicit session reset), every cached read belongs to the old session. Cancel what is
 * in flight and drop the whole cache, so nothing from person A can render for person B.
 * The first sign-in (anonymous → user) keeps the cache: nothing personal is in it yet.
 */
export function installSessionCacheReset(client: QueryClient): () => void {
  return useSessionStore.subscribe((state, previous) => {
    if (state.sessionGeneration === previous.sessionGeneration) return;
    if (!previous.user) return;
    void client.cancelQueries();
    client.clear();
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient(); // SSR: fresh each time
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient(); // browser: singleton
    installSessionCacheReset(browserQueryClient);
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
