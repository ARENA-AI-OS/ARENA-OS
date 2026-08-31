/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Pre-existing codebase uses `any` extensively in adapters/gateways.
    // Lint separately; don't block builds.
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  serverExternalPackages: ["@stellar/stellar-sdk", "@stellar/stellar-base"],
};

export default nextConfig;
