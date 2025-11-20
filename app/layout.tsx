"use client";

import { useEffect } from "react";
import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fix hydration mismatch from browser extensions
  useEffect(() => {
    const body = document.body;
    if (body?.classList?.contains("antigravity-scroll-lock")) {
      body.classList.remove("antigravity-scroll-lock");
    }
  }, []);

  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
