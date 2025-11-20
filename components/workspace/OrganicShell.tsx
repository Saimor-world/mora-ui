'use client';

import { Suspense, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import OrganicField from '@/components/canvas/OrganicField';
import { OrganicSidebar } from '@/components/organic/OrganicSidebar';
import DiagnosticsPanel from '@/components/diagnostics/DiagnosticsPanel';
import ToastViewport from '@/components/ui/ToastViewport';
import { AppProvider } from '@/lib/contexts';
import { QueryProvider } from '@/lib/queryClient';
import { ThoughtBubbleProvider } from '@/lib/contexts/ThoughtBubbleContext';
import { useSessionStore } from '@/store/session';
import usePrefersReducedMotion from '@/lib/hooks/usePrefersReducedMotion';

interface OrganicShellProps {
  spaceId?: string;
}

/**
 * OrganicShell - NEW Layout Architecture
 *
 * Antigravity x Môra Fusion:
 * ┌─────────────────────────────────────┐
 * │ Sidebar │ OrganicField (full)       │
 * │ (20px)  │ - OrganicBackground       │
 * │         │ - MoraOrb (center)        │
 * │         │ - DataClusters            │
 * │         │ - ConnectorNodes          │
 * │         │ - Intelligence Panel      │
 * │         ├───────────────────────────│
 * │         │ OrganicInput (bottom)     │
 * └─────────────────────────────────────┘
 */
export default function OrganicShell({ spaceId }: OrganicShellProps) {
  const pathname = usePathname();
  const prefersReducedMotion = usePrefersReducedMotion();
  const setLastVisitedRoute = useSessionStore((state) => state.setLastVisitedRoute);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const timer = window.setTimeout(() => setVisible(true), prefersReducedMotion ? 50 : 120);
    return () => window.clearTimeout(timer);
  }, [pathname, prefersReducedMotion]);

  useEffect(() => {
    setLastVisitedRoute(pathname);
  }, [pathname, setLastVisitedRoute]);

  return (
    <QueryProvider>
      <Suspense fallback={<div className="h-screen flex items-center justify-center text-sm text-muted-foreground bg-mora-forest">Môra erwacht...</div>}>
        <AppProvider initialMode="field" spaceId={spaceId}>
          <ThoughtBubbleProvider>
            <div
              className={`h-screen flex overflow-hidden transition-all bg-mora-forest ${
                prefersReducedMotion ? 'duration-150' : 'duration-500'
              } ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            >
              {/* Sidebar - 20px */}
              <OrganicSidebar spaceId={spaceId} />

              {/* Main Field */}
              <div className="flex-1 relative">
                <OrganicField spaceId={spaceId} />
              </div>

              {/* Diagnostics Panel (DEV only) */}
              <DiagnosticsPanel />

              {/* Toast Notifications */}
              <ToastViewport />
            </div>
          </ThoughtBubbleProvider>
        </AppProvider>
      </Suspense>
    </QueryProvider>
  );
}
