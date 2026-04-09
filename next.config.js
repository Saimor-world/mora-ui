/** @type {import('next').NextConfig} */
const path = require('path');

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
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { dev }) => {
    // Ensure TS path alias "@/*" works reliably in production builds (Linux case-sensitivity).
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(__dirname),
    };
    if (dev) {
      // Avoid eval-based devtool output that can trigger parse issues in the browser.
      config.devtool = 'source-map';
    }
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
};

module.exports = nextConfig;
