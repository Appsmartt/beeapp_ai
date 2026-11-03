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
  ]
};

module.exports = nextConfig;