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
}

module.exports = nextConfig

