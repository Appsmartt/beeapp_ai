const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
  path: path.resolve(__dirname, "../../.env")
});

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@beeapp/api-client",
    "@beeapp/design-system",
    "@beeapp/shared-types"
  ],
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.BEEAPP_API_BASE_URL
  }
};

module.exports = nextConfig;