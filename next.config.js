/** @type {import('next').NextConfig} */
const coreApiUrl = process.env.NEXT_PUBLIC_CORE_API_URL;
const shouldRewriteCore = typeof coreApiUrl === 'string' && /^https?:\/\//.test(coreApiUrl);
const coreRewriteTarget = shouldRewriteCore ? coreApiUrl.replace(/\/$/, '') : null;

const nextConfig = {
  reactStrictMode: true,
  // GUARDRAIL: Only port 3000 for development. No other ports allowed.
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
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
