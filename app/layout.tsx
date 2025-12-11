"use client";

import { useEffect, useState } from "react";
import "./globals.css";
import FolderRoom from "@/components/folder/FolderRoom";
import DocumentViewer from "@/components/document/DocumentViewer";
import { useMoraStore } from "@/lib/store/moraState";
import { setFocus, updateOrbFromSystemState } from "@/lib/mora/awarenessController";
import { MoraIntelligenceBar } from "@/components/mora/MoraIntelligenceBar";
import { SynthesisPanel } from "@/components/intelligence/SynthesisPanel";
import { Toaster } from "sonner";
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const activeSpaceId = useMoraStore((state) => state.activeSpaceId);
  const activeFolderId = useMoraStore((state) => state.activeFolderId);
  const coreError = useMoraStore((state) => state.coreError);
  const [showIntel, setShowIntel] = useState(false);
  const [mounted, setMounted] = useState(false);

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
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-[#030806]" suppressHydrationWarning style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", backgroundColor: '#030806' }}>
        <ErrorBoundary>
          {children}
          {mounted && (
            <>
              <FolderRoom />
              <DocumentViewer />
              <MoraIntelligenceBar onOpenIntelligence={() => setShowIntel(!showIntel)} isOpen={showIntel} />
              {showIntel && <SynthesisPanel visible onClose={() => setShowIntel(false)} />}
              <Toaster position="top-right" />
            </>
          )}
        </ErrorBoundary>
      </body>
    </html>
  );
}
