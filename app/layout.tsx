"use client";

import { useEffect, useState } from "react";
import "./globals.css";
import "./mora-stone.css";
import "./saimor-next.css";
import "./universe-v2.css";
import "./live-polish.css";
import { isUniverseV2Enabled } from "@/lib/universe/morgen";
import { UV2_FONTS_HREF } from "@/lib/universe/tokens";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import './os-brightness.css';
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
  // Independent document-style lab, unlike the full-screen OS canvas.
  const isCommerceLab = pathname === "/xrpl-commerce-lab";
  // Auth / entry routes don't need the floating pane stack — keep first paint thin.
  const isAuthEntryRoute =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/entry" ||
    pathname === "/reset-password" ||
    pathname.startsWith("/begleiter") ||
    pathname.startsWith("/join") ||
    pathname.startsWith("/oauth");

  // Fix hydration mismatch from browser extensions
  useEffect(() => {
    const body = document.body;
    if (body?.classList?.contains("antigravity-scroll-lock")) {
      body.classList.remove("antigravity-scroll-lock");
    }
  }, []);

  // Saimôr Universe v2: Designsprache nur hinter dem Flag (html[data-uv2=on]).
  useEffect(() => {
    if (!isUniverseV2Enabled()) return;
    document.documentElement.dataset.uv2 = "on";
    if (!document.getElementById("uv2-fonts")) {
      const l = document.createElement("link");
      l.id = "uv2-fonts"; l.rel = "stylesheet"; l.href = UV2_FONTS_HREF;
      document.head.appendChild(l);
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
    <html lang="en" data-route-scrollable={isCommerceLab ? "commerce-lab" : undefined} suppressHydrationWarning>
      <head>
        <title>SAIMÔR OS</title>
        <meta name="description" content="SAIMÔR OS — Intelligentes Wissenssystem" />
      </head>
      <body className={`font-sans antialiased ${isCommerceLab ? "commerce-lab-scroll" : "overflow-hidden"}`} suppressHydrationWarning>
        <QueryProvider>
          <ErrorBoundary>
            <MoraSessionProvider>
              <StandardModeHandler />
              {children}
              {mounted && !isTunnelDev && !isAuthEntryRoute && !isCommerceLab && (
                <>
                  <PaneManager />
                  <Toaster position="top-right" />
                </>
              )}
              {mounted && !isTunnelDev && (isAuthEntryRoute || isCommerceLab) && (
                <Toaster position="top-right" />
              )}
            </MoraSessionProvider>
          </ErrorBoundary>
        </QueryProvider>
      </body>
    </html>
  );
}
