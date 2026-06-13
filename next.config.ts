import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@napi-rs/canvas", "pdfjs-dist"],
  allowedDevOrigins: ['172.20.10.3', '172.20.10.4', '192.168.0.159' ],
};

export default nextConfig;
