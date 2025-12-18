import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Force Webpack to ignore server-side modules on the client
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        module: false,
        path: false,
        os: false,
        perf_hooks: false,
      };
    }
    return config;
  },
  // 2. Allow images from Unsplash
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;