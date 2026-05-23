'use client';

import { useEffect } from 'react';

/**
 * Tunnel is a scrollable dev page — root layout uses overflow-hidden for the OS shell.
 */
export default function TunnelLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyHeight: body.style.height,
      hadHidden: body.classList.contains('overflow-hidden'),
    };

    html.style.overflow = 'auto';
    body.style.overflow = 'auto';
    body.style.height = 'auto';
    body.classList.remove('overflow-hidden');

    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      body.style.height = prev.bodyHeight;
      if (prev.hadHidden) {
        body.classList.add('overflow-hidden');
      }
    };
  }, []);

  return (
    <div className="tunnel-root fixed inset-0 z-[200] overflow-y-auto overflow-x-hidden bg-[#030806]">
      {children}
    </div>
  );
}
