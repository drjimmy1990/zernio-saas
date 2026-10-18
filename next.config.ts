import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  typescript: {
    // Type checking is verified via `npx tsc --noEmit` in CI/pre-push;
    // skipping the duplicate check inside Docker build avoids VPS RAM spikes & hangs.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
