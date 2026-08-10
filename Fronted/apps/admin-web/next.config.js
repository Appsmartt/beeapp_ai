/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@beeapp/design-system', '@beeapp/shared-types'],
};

module.exports = nextConfig;
