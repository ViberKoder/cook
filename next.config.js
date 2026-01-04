/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['example.com'],
    unoptimized: true,
  },
  env: {
    TON_CONNECT_MANIFEST_URL: 'https://www.cook.tg/tonconnect-manifest.json',
  },
  // Exclude contracts and other non-frontend directories from build
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
    }
    return config
  },
  // Exclude certain paths from TypeScript compilation
  typescript: {
    ignoreBuildErrors: false,
  },
}

module.exports = nextConfig

