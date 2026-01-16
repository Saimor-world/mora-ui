"use client";

import { useEffect, useState } from "react";
import "./globals.css";
import FolderRoom from "@/components/folder/FolderRoom";
import DocumentViewer from "@/components/document/DocumentViewer";
import { useMoraStore } from "@/lib/store/moraState";
import { setFocus, updateOrbFromSystemState } from "@/lib/mora/awarenessController";
import { usePaneStore } from "@/lib/store/paneStore";
import { PaneManager } from "@/components/mora/PaneManager";
import { MoraIntelligenceBar } from "@/components/mora/MoraIntelligenceBar";
import { SynthesisPanel } from "@/components/intelligence/SynthesisPanel";
import { Toaster } from "sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OperatorStatusPane } from "@/components/operator/OperatorStatusPane";
import { AgencyCursor } from "@/components/agency/AgencyCursor";  // Guided Agency
import { MoraThoughtStream } from "@/components/mora/MoraThoughtStream";
import { MoraLivingBackground } from "@/components/mora/MoraLivingBackground";
import { CognitionBadge } from "@/components/mora/CognitionBadge";
import { EventsViewer } from "@/components/debug/EventsViewer";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const activeSpaceId = useMoraStore((state) => state.activeSpaceId);
  const activeFolderId = useMoraStore((state) => state.activeFolderId);
  const coreError = useMoraStore((state) => state.coreError);
  const panes = usePaneStore((state) => state.panes);
  const [showIntel, setShowIntel] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Show bar ALWAYS (OS Dock behavior)
  const showBar = true;

  // Fix hydration mismatch from browser extensions
  useEffect(() => {
    const body = document.body;
    if (body?.classList?.contains("antigravity-scroll-lock")) {
      body.classList.remove("antigravity-scroll-lock");
    }
  }, []);

  // Mora Awareness: Pulse when space/folder changes
  useEffect(() => {
    if (activeSpaceId || activeFolderId) {
      setFocus();
    }
  }, [activeSpaceId, activeFolderId]);

  // Update orb when error state changes
  useEffect(() => {
    updateOrbFromSystemState();
  }, [coreError]);

  // Interface Scaling Logic
  const user = useMoraStore((state) => state.user);
  const userScale = user?.settings?.scale;

  useEffect(() => {
    // Only apply scaling after component is mounted to avoid hydration mismatch
    if (!mounted || typeof window === 'undefined') return;

    const applyScale = (scale: number) => {
      // Clamp scale between 0.8 and 1.2 for safety
      const clampedScale = Math.max(0.8, Math.min(1.2, scale));

      // Apply via zoom (standard on Chromium)
      const body = document.body;
      if (body) {
        (body.style as any).zoom = clampedScale.toString();
      }

      // Set as CSS variable for components that need manual calculation
      document.documentElement.style.setProperty('--mora-interface-scale', clampedScale.toString());
    };

    // Fallback order: API Setting > LocalStorage > Default (1)
    const activeScale = userScale ?? parseFloat(localStorage.getItem('saimor_scale') || '1');
    applyScale(activeScale);

    // Listen for storage changes (cross-tab sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'saimor_scale' && e.newValue) {
        applyScale(parseFloat(e.newValue));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [userScale, mounted]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // REMOVED BLANK SCREEN BLOCKER - render immediately
  // if (!mounted) {
  //   return blank body...
  // }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>SAIMÔR | Môra OS</title>
        <meta name="description" content="Intelligentes Wissenssystem" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-[#030806] overflow-hidden" suppressHydrationWarning>
        <ErrorBoundary>
          {/* BACKGROUND REMOVED - MoraShell provides NeuralGrid + MyceliumOverlay */}
          {/* <MoraLivingBackground /> */}
          {children}
          {mounted && (

            <>
              <PaneManager />
              <FolderRoom />
              <DocumentViewer />
              <div className={`transition-opacity duration-500 ${showBar ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <MoraIntelligenceBar onOpenIntelligence={() => setShowIntel(!showIntel)} isOpen={showIntel} />
              </div>

              {showIntel && <SynthesisPanel visible onClose={() => setShowIntel(false)} />}
              <Toaster position="top-right" />
              {/* DISABLED: Felt like mock/simulation */}
              {/* <OperatorStatusPane /> */}
              <AgencyCursor />  {/* Guided Agency: MÔRA Cursor */}
              {/* <MoraThoughtStream /> - DISABLED: Felt like mock */}

              {/* <EventsViewer /> - DISABLED: Dev only */}
            </>
          )}
        </ErrorBoundary>
      </body>
    </html>
  );
}
