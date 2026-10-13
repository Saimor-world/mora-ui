import type { Metadata, Viewport } from 'next';
import './begleiter.css';

export const metadata: Metadata = {
  title: 'Saimôr Begleiter',
  manifest: '/begleiter.webmanifest',
  appleWebApp: { capable: true, title: 'Begleiter', statusBarStyle: 'black-translucent' },
  icons: { apple: '/begleiter-icon.svg' },
};

export const viewport: Viewport = { themeColor: '#050706', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function BegleiterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
