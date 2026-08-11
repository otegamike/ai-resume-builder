import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/editor",
          "/settings",
          "/onboarding",
          "/api/",
        ],
      },
    ],
    sitemap: "https://agenticapp.cv/sitemap.xml",
  };
}
