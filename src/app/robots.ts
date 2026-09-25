import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/api/og/"],
        disallow: [
          "/dashboard",
          "/editor",
          "/settings",
          "/onboarding",
          "/api/",
        ],
      },
    ],
    sitemap: "https://www.agenticapp.cv/sitemap.xml",
  };
}
