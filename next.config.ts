import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
        pathname: '/**',
      },
    ],
  },
  // 允许上传较大的图片文件（微信截图）
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // sharp 原生模块在 Vercel Serverless 中需要外部化
  serverExternalPackages: ['sharp'],
  // 显式指定 Turbopack 工作区根目录，避免多 lockfile 时误判到 /
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
