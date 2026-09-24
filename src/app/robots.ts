import { MetadataRoute } from "next";
import { siteConfig } from "@/lib/siteConfig";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/about",
          "/contact",
          "/terms",
          "/privacy",
          "/dmca",
          "/cookie-policy",
          "/login",
          "/register",
          "/onboard",
        ],
        disallow: [
          "/api/",
          "/dashboard",
          "/match",
          "/resume-builder",
          "/resume-maker",
          "/applications",
          "/outreach",
          "/settings",
        ],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
