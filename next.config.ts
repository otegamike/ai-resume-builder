import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  allowedDevOrigins: ['172.20.10.3', '172.20.10.4', '192.168.0.159' ],
  async redirects() {
    return [
      { source: "/employer", destination: "/dashboard/jobs", permanent: true },
      { source: "/employer/:path*", destination: "/dashboard/jobs", permanent: true },
      { source: "/dashboard/employer", destination: "/dashboard/employers", permanent: true },
      { source: "/dashboard/employer/:path*", destination: "/dashboard/employers", permanent: true },
    ];
  },
};

export default nextConfig;
