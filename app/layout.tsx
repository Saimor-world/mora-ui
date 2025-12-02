"use client";

import { useEffect, useState } from "react";
import "./globals.css";
import FolderRoom from "@/components/folder/FolderRoom";
import DocumentViewer from "@/components/document/DocumentViewer";
import { useMoraStore } from "@/lib/store/moraState";
import { setActive, updateOrbFromSystemState } from "@/lib/mora/awarenessController";
import { MoraIntelligenceBar } from "@/components/mora/MoraIntelligenceBar";
import { SynthesisPanel } from "@/components/intelligence/SynthesisPanel";
import { Toaster } from "sonner";

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

  // Môra Awareness: Pulse when space/folder changes
  useEffect(() => {
    if (activeSpaceId || activeFolderId) {
      setActive();
    }
  }, [activeSpaceId, activeFolderId]);

  // Update orb when error state changes
  useEffect(() => {
    updateOrbFromSystemState();
  }, [coreError]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <html lang="en" suppressHydrationWarning>
        <body className="antialiased" suppressHydrationWarning />
      </html>
    );
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        {children}
        <FolderRoom />
        <DocumentViewer />
        <MoraIntelligenceBar onOpenIntelligence={() => setShowIntel(!showIntel)} isOpen={showIntel} />
        {showIntel && <SynthesisPanel visible onClose={() => setShowIntel(false)} />}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
