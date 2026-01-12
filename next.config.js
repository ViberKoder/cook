/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'em-content.zobj.net',
      'gdykpsdfxlyhvmx.public.blob.vercel-storage.com',
      'cache.tonapi.io',
      'lime-gigantic-quelea-995.mypinata.cloud',
      'ston.fi',
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },
  env: {
    TON_CONNECT_MANIFEST_URL: 'https://www.cook.tg/tonconnect-manifest.json',
  },
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  // Exclude contracts and other non-frontend directories from build
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
    }
    // Optimize bundle size
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        usedExports: true,
      }
    }
    return config
  },
  // Exclude certain paths from TypeScript compilation
  typescript: {
    ignoreBuildErrors: false,
  },
}

module.exports = nextConfig

