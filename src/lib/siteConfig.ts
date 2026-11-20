/**
 * Centralized Site Configuration & SEO Metadata for Stride
 * Guarantees correct domain resolution across production, staging, and local environments.
 */

function resolveBaseUrl(): string {
  // 1. Explicit public app URL if defined
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  // 2. NextAuth URL if valid and NOT legacy or localhost
  if (
    process.env.NEXTAUTH_URL &&
    !process.env.NEXTAUTH_URL.includes("career-engine") &&
    !process.env.NEXTAUTH_URL.includes("localhost")
  ) {
    return process.env.NEXTAUTH_URL.replace(/\/$/, "");
  }

  // 3. Default authoritative production domain
  return "https://stride.app";
}

export const SITE_URL = resolveBaseUrl();

export const siteConfig = {
  name: "Stride",
  shortName: "Stride",
  title: "Stride | Autonomous Remote Career Intelligence & ATS Resume Engine",
  description:
    "Stride is the premier autonomous remote career intelligence platform. Featuring 21-provider automated job scraping, deep ATS resume scoring, 1-click tailored application kits, and background job synchronization.",
  url: SITE_URL,
  ogImage: `${SITE_URL}/landing-dashboard.png`,
  author: "Ayushi Raj & Roushan Kumar",
  creator: "Ayushi Raj & Roushan Kumar",
  links: {
    github: "https://github.com/Hey-Astreon/Career_Engine",
    portfolioRoushan: "https://astreon.me",
    portfolioAyushi: "https://ayushiraj.me",
    twitter: "https://x.com/Hey_Astreon",
  },
  keywords: [
    "Stride",
    "Stride remote jobs",
    "Stride career engine",
    "autonomous remote job discovery",
    "remote software developer jobs",
    "ATS resume maker",
    "tailored resume generator",
    "AI career engine",
    "21-provider job aggregator",
    "automated job application pipeline",
    "remote tech careers",
    "StridePilot",
    "StrideShield",
    "Roushan Kumar Stride",
    "Ayushi Raj Stride",
  ],
};
