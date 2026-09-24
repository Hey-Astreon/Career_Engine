import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import { siteConfig } from "@/lib/siteConfig";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "AstreWork | Autonomous Remote Career Intelligence & ATS Resume Engine",
    template: "%s | AstreWork",
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: [
    { name: "Roushan Kumar (Astreon)", url: "https://github.com/Hey-Astreon" },
    { name: "Ayushi Raj", url: "https://github.com/Silenttears-cloud" },
  ],
  creator: "Roushan Kumar",
  publisher: "AstreWork",
  category: "technology",
  alternates: {
    canonical: siteConfig.url,
  },
  openGraph: {
    title: "AstreWork | Autonomous Remote Career Intelligence & ATS Resume Engine",
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: "AstreWork",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: "AstreWork Autonomous Remote Career Engine Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AstreWork | Autonomous Remote Career Intelligence",
    description:
      "Autonomous 19-provider remote job discovery, deep ATS resume scoring, 1-click tailored application kits, and background job synchronization.",
    creator: "@Hey_Astreon",
    images: [siteConfig.ogImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  },
  icons: {
    icon: [
      { url: "/favicon.ico?v=2", sizes: "any" },
      { url: "/icon.png?v=2", type: "image/png", sizes: "32x32" },
      { url: "/icon-192.png?v=2", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png?v=2", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png?v=2", sizes: "180x180" }],
    shortcut: "/favicon.ico?v=2",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteConfig.url}/#website`,
      "url": siteConfig.url,
      "name": "AstreWork",
      "description": siteConfig.description,
      "publisher": {
        "@id": `${siteConfig.url}/#organization`,
      },
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": `${siteConfig.url}/dashboard?search={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${siteConfig.url}/#software`,
      "name": "AstreWork",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "All Modern Web Browsers",
      "url": siteConfig.url,
      "description": siteConfig.description,
      "featureList": [
        "19-Provider Autonomous Remote Job Scraping Engine",
        "Deterministic Stage-1 & AI Stage-2 Fit Scoring",
        "Enterprise ATS-Compliant Resume Maker with 5 Presets",
        "One-Click Tailored Application Kit Generation",
        "Automated 3-Hour Background Discovery Scheduler",
      ],
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
      },
      "creator": {
        "@type": "Person",
        "name": "Roushan Kumar",
        "url": "https://github.com/Hey-Astreon",
      },
    },
    {
      "@type": "Organization",
      "@id": `${siteConfig.url}/#organization`,
      "name": "AstreWork",
      "url": siteConfig.url,
      "logo": `${siteConfig.url}/icon.png`,
      "sameAs": [
        "https://github.com/Hey-Astreon/Career_Engine",
        "https://astreon.me",
        "https://ayushiraj.me",
      ],
      "founders": [
        {
          "@type": "Person",
          "name": "Roushan Kumar",
          "url": "https://github.com/Hey-Astreon",
        },
        {
          "@type": "Person",
          "name": "Ayushi Raj",
          "url": "https://github.com/Silenttears-cloud",
        },
      ],
    },
    {
      "@type": "FAQPage",
      "@id": `${siteConfig.url}/#faq`,
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Is my resume data private?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. Your resume data is strictly isolated to your workspace for job matching, tailoring, and ATS formatting. We never sell your data or use it to train public models.",
          },
        },
        {
          "@type": "Question",
          "name": "How is AstreWork different from LinkedIn or Indeed?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "AstreWork continuously scans 19+ verified remote developer boards every 3 hours, eliminates expired and ghost listings, scores your profile against job descriptions, and generates tailored ATS-proof resumes and outreach kits automatically.",
          },
        },
        {
          "@type": "Question",
          "name": "Does the ATS Resume Maker actually work?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. Our ATS Resume Maker scores your resume against real enterprise parsers, validates typography, margins, and keyword density, and outputs certified A4 PDF variants tested for maximum extractability.",
          },
        },
        {
          "@type": "Question",
          "name": "Is AstreWork free?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. AstreWork is free to use for individual job seekers, built by engineers to eliminate the frustration of sending applications into the void.",
          },
        },
      ],
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
