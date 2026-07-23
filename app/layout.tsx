"use client";

import { useEffect, useState } from "react";
import "./globals.css";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { useNavStore } from "@/lib/store/navStore";
import { useSessionStore } from "@/lib/store/sessionStore";
import { setFocus, updateOrbFromSystemState } from "@/lib/mora/awarenessController";
import { PaneManager } from "@/components/mora/PaneManager";
import { Toaster } from "sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import { usePathname } from "next/navigation";
import { MoraSessionProvider } from "@/components/providers/MoraSessionProvider";
import { StandardModeHandler } from "@/components/ui/StandardModeHandler";
import { QueryProvider } from "@/lib/queryClient";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const activeSpaceId = useNavStore((state) => state.activeSpaceId);
  const activeFolderId = useNavStore((state) => state.activeFolderId);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  const isTunnelDev = pathname === "/tunnel";
  // Auth / entry routes don't need the floating pane stack — keep first paint thin.
  const isAuthEntryRoute =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/entry" ||
    pathname === "/reset-password" ||
    pathname.startsWith("/join") ||
    pathname.startsWith("/oauth");

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

  // Update orb when layout mounts
  useEffect(() => {
    updateOrbFromSystemState();
  }, []);

  // Interface Scaling Logic
  const user = useSessionStore((state) => state.user);
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
    const activeScale = typeof userScale === 'number'
      ? userScale
      : parseFloat(localStorage.getItem('saimor_scale') || '1');
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

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>SAIMÔR OS</title>
        <meta name="description" content="SAIMÔR OS — Intelligentes Wissenssystem" />
      </head>
      <body className="font-sans antialiased overflow-hidden" suppressHydrationWarning>
        <QueryProvider>
          <ErrorBoundary>
            <MoraSessionProvider>
              <StandardModeHandler />
              {children}
              {mounted && !isTunnelDev && !isAuthEntryRoute && (
                <>
                  <PaneManager />
                  <Toaster position="top-right" />
                </>
              )}
              {mounted && !isTunnelDev && isAuthEntryRoute && (
                <Toaster position="top-right" />
              )}
            </MoraSessionProvider>
          </ErrorBoundary>
        </QueryProvider>
      </body>
    </html>
  );
}
