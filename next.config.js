/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [
    "http://localhost:3002",
    "http://127.0.0.1:3002",
    "http://172.20.10.*",
    "https://*.trycloudflare.com",
  ],
  async rewrites() {
    return [
      {
        source: '/api/core/:path*',
        destination: 'http://localhost:8081/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
