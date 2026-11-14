/** @type {import('next').NextConfig} */
const path = require('path');
const fs = require('fs');

// Keep Next on one physical path. This workspace can be reached via C:\ and
// E:\; mixing those paths breaks Next Dev manifests and Webpack chunks.
const startedRoot = path.resolve(process.cwd());
const realStartedRoot = fs.realpathSync(startedRoot);
if (startedRoot.toLowerCase() !== realStartedRoot.toLowerCase()) {
  process.chdir(realStartedRoot);
}
const projectRoot = path.resolve(process.cwd());

const coreApiUrl = process.env.NEXT_PUBLIC_CORE_API_URL;
const shouldRewriteCore = typeof coreApiUrl === 'string' && /^https?:\/\//.test(coreApiUrl);
const coreRewriteTarget = shouldRewriteCore ? coreApiUrl.replace(/\/$/, '') : null;

// Caching (Aufräumen 11/2026): vorher galt no-store für ALLES, auch für gehashte Chunks und Bilder.
const NO_STORE = 'no-cache, no-store, must-revalidate, max-age=0';
const IMMUTABLE = 'public, max-age=31536000, immutable';
const STATIC_ASSET_CACHE = 'public, max-age=86400, stale-while-revalidate=604800';
// Dateien aus public/ mit Bild-, Audio- oder Schrift-Endung, nie unter /api oder /_next.
const STATIC_ASSET_SOURCE = '/:asset((?!api/|_next/).+\\.(?:png|jpe?g|webp|avif|gif|svg|ico|mp3|woff2?))';

const nextConfig = {
  reactStrictMode: false,
  // Kein Next-Dev-Abzeichen: es lag als „N“ unten links über der Dock-Uhr und verfälschte jede Bildprüfung.
  devIndicators: false,
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3003",
    "http://127.0.0.1:3003",
    "http://172.20.10.*",
    "https://*.trycloudflare.com",
  ],
  webpack: (config) => {
    // Ensure TS path alias "@/*" works reliably in production builds (Linux case-sensitivity).
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': projectRoot,
    };
    return config;
  },
  async rewrites() {
    if (!coreRewriteTarget) return [];
    // fallback (nicht afterFiles): Die Proxy-Route app/api/core/[...slug] hat Vorrang.
    // Sonst ginge jeder Aufruf am Proxy vorbei, das httpOnly-Cookie würde nie zum
    // Bearer-Header, und CORE-Endpunkte mit optionaler Auth (z. B. /v3/chat) sähen
    // die Sitzung nicht („Bitte melde dich an“).
    return { fallback: [
      {
        // Frontend calls /api/core/v1/...
        // Use absolute core URL only when explicitly configured.
        source: '/api/core/:path*',
        destination: `${coreRewriteTarget}/:path*`,
      },
    ] };
  },
  // Baseline security headers applied to every response.
  // Deliberately conservative: no Content-Security-Policy and no Permissions-Policy
  // here, because a strict CSP/mic policy can break styles and the Môra voice
  // field — those need their own tested rollout. These four are safe and break nothing.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Cache-Control', value: NO_STORE },
        ],
      },
      // Nur im Produktions-Build: Ausnahmen vom no-store. Bei mehreren Treffern gewinnt der letzte Eintrag.
      // HTML-Seiten, /api, Service Worker und alles andere bleiben no-store (Sitzung, Auth, frische Daten).
      ...(process.env.NODE_ENV === 'production'
        ? [
            // Gehashte Build-Dateien ändern nie ihren Inhalt.
            { source: '/_next/static/:path*', headers: [{ key: 'Cache-Control', value: IMMUTABLE }] },
            // Bilder, Audio und Schriften aus public/: einen Tag frisch, danach im Hintergrund neu prüfen.
            { source: STATIC_ASSET_SOURCE, headers: [{ key: 'Cache-Control', value: STATIC_ASSET_CACHE }] },
          ]
        : []),
    ];
  },
};

module.exports = nextConfig;
