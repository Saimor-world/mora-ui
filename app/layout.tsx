"use client";

import { useEffect, useState } from "react";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { useMoraStore } from "@/lib/store/moraState";
import { setFocus, updateOrbFromSystemState } from "@/lib/mora/awarenessController";
import { PaneManager } from "@/components/mora/PaneManager";
import { Toaster } from "sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import { usePathname } from "next/navigation";
import { MoraSessionProvider } from "@/components/providers/MoraSessionProvider";
import { StandardModeHandler } from "@/components/ui/StandardModeHandler";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mora-mono",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const activeSpaceId = useMoraStore((state) => state.activeSpaceId);
  const activeFolderId = useMoraStore((state) => state.activeFolderId);
  const coreError = useMoraStore((state) => state.coreError);
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

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>SAIMOR | Mora OS</title>
        <meta name="description" content="Intelligent System" />
      </head>
      <body className={`${inter.className} ${jetbrainsMono.variable} antialiased bg-[#030806] overflow-hidden`} suppressHydrationWarning>
        <ErrorBoundary>
          <MoraSessionProvider>
            <StandardModeHandler />
            {children}
            {mounted && (
              <>
                <PaneManager />
                <Toaster position="top-right" />
              </>
            )}
          </MoraSessionProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
