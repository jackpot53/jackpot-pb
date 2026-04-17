import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'd3-scale',
      'd3-shape',
      'd3-array',
      'd3-selection',
      'd3-axis',
      'd3-time-format',
    ],
  },
  compiler: {
    removeConsole: { exclude: ['error', 'warn'] },
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'img.logo.dev' },
    ],
  },
};

export default nextConfig;
