/**
 * @jest-environment node
 */
// Caching-Regeln aus next.config.js (Aufräumen 11/2026):
// Seiten, API und alles Sitzungsnahe bleiben no-store; gehashte Build-Dateien sind immutable;
// Bilder/Audio/Schriften aus public/ werden einen Tag gecacht.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextConfig = require('../../next.config.js');

type HeaderRule = { source: string; headers: { key: string; value: string }[] };

/** Nachbau der Next-Regel: alle passenden Einträge der Reihe nach, der letzte gleiche Schlüssel gewinnt. */
function toRegExp(source: string): RegExp {
  if (source === '/:path*') return /^\/.*$/;
  if (source === '/_next/static/:path*') return /^\/_next\/static\/.*$/;
  const m = source.match(/^\/:asset\((.*)\)$/);
  if (!m) throw new Error(`Unbekannte Regel im Test nicht nachgebaut: ${source}`);
  return new RegExp(`^/${m[1]}$`);
}

async function cacheControlFor(pathname: string, env: string): Promise<string | undefined> {
  const prev = process.env.NODE_ENV;
  (process.env as Record<string, string>).NODE_ENV = env;
  try {
    const rules: HeaderRule[] = await nextConfig.headers();
    let value: string | undefined;
    for (const rule of rules) {
      if (!toRegExp(rule.source).test(pathname)) continue;
      const h = rule.headers.find((x) => x.key.toLowerCase() === 'cache-control');
      if (h) value = h.value;
    }
    return value;
  } finally {
    (process.env as Record<string, string>).NODE_ENV = prev as string;
  }
}

const NO_STORE = 'no-cache, no-store, must-revalidate, max-age=0';

describe('next.config.js Cache-Control (Produktion)', () => {
  it('gehashte /_next/static-Dateien sind ein Jahr immutable', async () => {
    expect(await cacheControlFor('/_next/static/chunks/app/os/page-abc123.js', 'production')).toBe('public, max-age=31536000, immutable');
    expect(await cacheControlFor('/_next/static/css/1c0c199f3d9df3de.css', 'production')).toBe('public, max-age=31536000, immutable');
  });

  it('Bilder, Audio und Schriften aus public/ haben einen Tag Cache mit stale-while-revalidate', async () => {
    for (const p of ['/universe/glass/champagne.png', '/nightwatch/eule.png', '/universe/universe-lake.jpg', '/werkstatt/room-pult.webp', '/ambient/night.mp3', '/fonts/x.woff2']) {
      expect(await cacheControlFor(p, 'production')).toBe('public, max-age=86400, stale-while-revalidate=604800');
    }
  });

  it('Seiten, API, Auth und Service Worker bleiben no-store', async () => {
    for (const p of ['/', '/os', '/login', '/home', '/entry', '/api/core/v3/tree', '/api/auth/session', '/api/core/avatar.png', '/begleiter-sw.js', '/begleiter.webmanifest', '/universe/planet-surface-worker.js', '/oauth/google/callback']) {
      expect(await cacheControlFor(p, 'production')).toBe(NO_STORE);
    }
  });

  it('Sicherheits-Header gelten weiter für alle Pfade', async () => {
    const rules: HeaderRule[] = await nextConfig.headers();
    const all = rules.find((r) => r.source === '/:path*');
    const keys = (all?.headers ?? []).map((h) => h.key);
    expect(keys).toEqual(expect.arrayContaining(['Strict-Transport-Security', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy']));
  });

  it('im Dev-Server bleibt alles no-store (keine Caching-Überraschungen beim Entwickeln)', async () => {
    expect(await cacheControlFor('/_next/static/chunks/main.js', 'development')).toBe(NO_STORE);
    expect(await cacheControlFor('/universe/glass/champagne.png', 'development')).toBe(NO_STORE);
  });
});
