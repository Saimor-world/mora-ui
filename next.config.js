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

const nextConfig = {
  reactStrictMode: false,
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
    return [
      {
        // Frontend calls /api/core/v1/...
        // Use absolute core URL only when explicitly configured.
        source: '/api/core/:path*',
        destination: `${coreRewriteTarget}/:path*`,
      },
    ];
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
        ],
      },
    ];
  },
};

module.exports = nextConfig;
