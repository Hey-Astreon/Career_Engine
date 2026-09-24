/**
 * Centralized Site Configuration & SEO Metadata for AstreWork
 * Guarantees correct domain resolution across Vercel production, preview, and local environments.
 */

function resolveBaseUrl(): string {
  // 1. Explicit public app URL if defined
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  // 2. Vercel production URL automatically exposed by Vercel
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/$/, "")}`;
  }

  // 3. NextAuth URL if valid and NOT legacy or localhost
  if (
    process.env.NEXTAUTH_URL &&
    !process.env.NEXTAUTH_URL.includes("career-engine") &&
    !process.env.NEXTAUTH_URL.includes("localhost")
  ) {
    return process.env.NEXTAUTH_URL.replace(/\/$/, "");
  }

  // 4. Default authoritative production domain
  return "https://astrework.vercel.app";
}

export const SITE_URL = resolveBaseUrl();

export const siteConfig = {
  name: "AstreWork",
  shortName: "AstreWork",
  title: "AstreWork | Autonomous Remote Career Intelligence & ATS Resume Engine",
  description:
    "AstreWork is the premier autonomous remote career intelligence platform. Featuring 19-provider automated job scraping, deep ATS resume scoring, 1-click tailored application kits, and background job synchronization.",
  url: SITE_URL,
  ogImage: `${SITE_URL}/landing-dashboard.png`,
  author: "Roushan Kumar (Astreon)",
  creator: "Roushan Kumar & Ayushi Raj",
  links: {
    github: "https://github.com/Hey-Astreon/Career_Engine",
    portfolioRoushan: "https://astreon.me",
    portfolioAyushi: "https://ayushiraj.me",
    twitter: "https://x.com/Hey_Astreon",
  },
  keywords: [
    "AstreWork",
    "AstreWork remote jobs",
    "AstreWork career engine",
    "autonomous remote job discovery",
    "remote software engineer jobs",
    "ATS resume maker",
    "tailored resume generator",
    "AI career engine",
    "19-provider job aggregator",
    "automated job application pipeline",
    "remote tech careers",
    "Astreon AstreWork",
    "Roushan Kumar AstreWork",
    "Ayushi Raj AstreWork",
  ],
};
