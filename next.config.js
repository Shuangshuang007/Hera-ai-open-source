/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [];
  },
  webpack: (config) => {
    return config;
  }
}

module.exports = nextConfig 