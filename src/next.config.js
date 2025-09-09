/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { appDir: true },
  transpilePackages: ['@polymarket/clob-client'],
};

module.exports = nextConfig;
