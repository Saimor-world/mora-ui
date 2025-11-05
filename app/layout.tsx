import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Môra UI - Dual Mode Vision",
  description: "Folder Mode ↔ Field Mode for Môra Core",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
