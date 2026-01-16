/** @type {import('next').NextConfig} */
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
  async rewrites() {
    return [
      {
        // Frontend calls /api/core/v1/... which should go to backend /v1/...
        // DO NOT add extra /v1/ - frontend already includes it!
        source: '/api/core/:path*',
        destination: 'http://localhost:8083/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
