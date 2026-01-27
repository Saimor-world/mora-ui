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
        // Frontend calls /api/core/v1/...
        // Hetzner Gateway handles /v1/... endpoints
        source: '/api/core/:path*',
        destination: 'https://api.saimor.world/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
