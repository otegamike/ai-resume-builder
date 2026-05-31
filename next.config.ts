import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['172.20.10.3', '172.20.10.4' ],
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core"],
  experimental: {
    outputFileTracingIncludes: {
      '/api/**/*': ['./node_modules/playwright-core/browsers.json'],
    },
  },
};

export default nextConfig;
