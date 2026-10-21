import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async redirects() {
    return [{
      source: '/:path*',
      has: [{ type: 'host', value: 'www.asra3.com' }],
      destination: 'https://asra3.com/:path*',
      permanent: true,
    }];
  },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ] }, ...['/api/:path*', '/dashboard/:path*', '/admin/:path*', '/login', '/signup', '/recovery'].map((source) => ({
      source, headers: [
        { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
      ],
    }))];
  },
};

export default nextConfig;
