"use client";

import { useEffect, useState } from "react";
import "./globals.css";
import { useMoraStore } from "@/lib/store/moraState";
import { setFocus, updateOrbFromSystemState } from "@/lib/mora/awarenessController";
import { usePaneStore } from "@/lib/store/paneStore";
import { PaneManager } from "@/components/mora/PaneManager";
import { UserAvatar } from "@/components/user/UserAvatar";
import { Toaster } from "sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import { usePathname } from "next/navigation";
import { MoraSessionProvider } from "@/components/providers/MoraSessionProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const activeSpaceId = useMoraStore((state) => state.activeSpaceId);
  const activeFolderId = useMoraStore((state) => state.activeFolderId);
  const coreError = useMoraStore((state) => state.coreError);
  const openPane = usePaneStore((state) => state.openPane);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // Show bar (OS Dock/UI) only if NOT on login page
  const showBar = pathname !== "/" && pathname !== "/login";

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
          <MoraSessionProvider>
            {children}
            {mounted && (
              <>
                <PaneManager />
                {showBar && (
                  <div className="transition-opacity duration-500 opacity-100 pointer-events-auto">
                    <UserAvatar
                      onClick={() => openPane({
                        id: 'settings-main',
                        type: 'settings',
                        title: 'Settings',
                        size: { width: 700, height: 500 }
                      })}
                      showLabel={true}
                    />
                  </div>
                )}
                <Toaster position="top-right" />
              </>
            )}
          </MoraSessionProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
