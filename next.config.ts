import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['172.20.10.3', '172.20.10.4'],
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core"],
  turbopack: {
    // disable turbopack bundling for these modules
    resolveAlias: {
      "playwright-core": "playwright-core",
      "@sparticuz/chromium": "@sparticuz/chromium",
    },
  },
};

export default nextConfig;
