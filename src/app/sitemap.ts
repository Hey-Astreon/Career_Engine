import { MetadataRoute } from "next";
import { siteConfig } from "@/lib/siteConfig";

export default function sitemap(): MetadataRoute.Sitemap {
  const currentDate = new Date();

  const routes = [
    { path: "", priority: 1.0, changeFrequency: "daily" as const },
    { path: "/about", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/contact", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/onboard", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/login", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/register", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/terms", priority: 0.5, changeFrequency: "yearly" as const },
    { path: "/privacy", priority: 0.5, changeFrequency: "yearly" as const },
    { path: "/dmca", priority: 0.5, changeFrequency: "yearly" as const },
    { path: "/cookie-policy", priority: 0.5, changeFrequency: "yearly" as const },
  ];

  return routes.map((route) => ({
    url: `${siteConfig.url}${route.path}`,
    lastModified: currentDate,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
