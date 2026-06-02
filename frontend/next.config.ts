import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'wallpapers.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org', // Cho logo các đội bóng
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com', // Cho ảnh avatar người dùng nếu dùng Google Login
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
