/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      buffer: require.resolve('buffer/'),
    };
    return config;
  },
  images: {
    domains: ['cache.tonapi.io', 'ton.org'],
  },
};

module.exports = nextConfig;
