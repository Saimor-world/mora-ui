'use client';

import { Suspense, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Lens from '@/components/lens/Lens';
import Canvas from '@/components/canvas/Canvas';
import Insights from '@/components/insights/Insights';
import MoraChat from '@/components/chat/MoraChat';
import DiagnosticsPanel from '@/components/diagnostics/DiagnosticsPanel';
import ToastViewport from '@/components/ui/ToastViewport';
import ThoughtBubble from '@/components/hints/ThoughtBubble';
import { AppProvider } from '@/lib/contexts';
import { QueryProvider } from '@/lib/queryClient';
import { ThoughtBubbleProvider } from '@/lib/contexts/ThoughtBubbleContext';
import { useSessionStore } from '@/store/session';
import usePrefersReducedMotion from '@/lib/hooks/usePrefersReducedMotion';

interface WorkspaceShellProps {
  initialMode?: 'folder' | 'field';
  standaloneInsights?: boolean;
}

export default function WorkspaceShell({
  initialMode = 'field',
  standaloneInsights = false,
}: WorkspaceShellProps) {
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
      <Suspense fallback={<div className="h-screen flex items-center justify-center text-sm text-muted-foreground">Lade Môra...</div>}>
        <AppProvider initialMode={initialMode}>
          <ThoughtBubbleProvider>
            <div
              className={`h-screen flex overflow-hidden transition-all ${
                prefersReducedMotion ? 'duration-150' : 'duration-500'
              } ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            >
              {standaloneInsights ? (
                <div className="flex flex-1">
                  <Insights />
                </div>
              ) : (
                <>
                  <Lens />
                  <Canvas />
                  <Insights />
                  <MoraChat />
                </>
              )}
              <DiagnosticsPanel />
              <ToastViewport />
              <ThoughtBubble />
            </div>
          </ThoughtBubbleProvider>
        </AppProvider>
      </Suspense>
    </QueryProvider>
  );
}
