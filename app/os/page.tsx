'use client';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { OsShell } from '@/components/os-shell/OsShell';
import { isLocalPreview, isOsPrototypeEnabled } from '@/lib/os-prototype/flags';

/**
 * /os — SAIMÔR OS recovery prototype (v1).
 * Off unless built with NEXT_PUBLIC_OS_PROTOTYPE=1 (or NEXT_PUBLIC_OS_PREVIEW=local
 * for localhost-only preview). The legacy shell at "/" is untouched.
 */
export default function OsPrototypePage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!isOsPrototypeEnabled()) {
    return (
      <main style={{ padding: 48, fontFamily: 'system-ui', opacity: 0.7 }}>
        <p>Der OS-Prototyp ist in diesem Build nicht aktiviert.</p>
        <p><Link href="/">Zur Oberfläche</Link></p>
      </main>
    );
  }
  if (!mounted) return null;
  return <OsShell preview={isLocalPreview()} />;
}
