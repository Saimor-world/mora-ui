/** Plattformgerechte Tastenkürzel-Beschriftung: ⌘K auf Apple-Geräten, Strg+K auf Windows/Linux. */
export function isApplePlatform(nav?: { platform?: string; userAgent?: string; userAgentData?: { platform?: string } }): boolean {
  const n = nav ?? (typeof navigator !== 'undefined' ? (navigator as any) : undefined);
  if (!n) return true; // SSR: neutral bleiben, Client korrigiert nach dem Mount
  const p = String(n.userAgentData?.platform || n.platform || n.userAgent || '');
  return /mac|iphone|ipad|ipod/i.test(p);
}

export function shortcutLabel(key: string, nav?: Parameters<typeof isApplePlatform>[0]): string {
  return isApplePlatform(nav) ? `⌘${key.toUpperCase()}` : `Ctrl+${key.toUpperCase()}`;
}
