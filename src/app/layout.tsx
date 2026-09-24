import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"] });

const baseUrl = process.env.NEXTAUTH_URL || "https://astrework.com";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "AstreWork | Autonomous Remote Career Intelligence & Application Engine",
    template: "%s | AstreWork",
  },
  description:
    "AstreWork is the premier autonomous remote career intelligence platform. Featuring multi-provider job scraping, deep ATS resume scoring, one-click application dispatching, and automated recruiter outreach.",
  keywords: [
    "AstreWork",
    "remote jobs",
    "autonomous job application",
    "ATS resume maker",
    "career engine",
    "remote career management",
    "job scraper",
    "direct recruiter outreach",
    "AI job application",
    "deep link ATS",
  ],
  authors: [{ name: "Astreon", url: "https://github.com/Hey-Astreon" }],
  creator: "Astreon",
  publisher: "AstreWork",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "AstreWork | Autonomous Remote Career Intelligence & Application Engine",
    description:
      "Autonomous remote job discovery, deep ATS resume scoring, 1-click application dispatching, and direct recruiter outreach.",
    url: baseUrl,
    siteName: "AstreWork",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/landing-dashboard.png",
        width: 1200,
        height: 630,
        alt: "AstreWork Autonomous Career Engine Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AstreWork | Autonomous Remote Career Intelligence",
    description:
      "Autonomous remote job discovery, deep ATS resume scoring, 1-click dispatching, and outreach.",
    creator: "@Hey_Astreon",
    images: ["/landing-dashboard.png"],
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
  icons: {
    icon: [
      { url: "/astrework-favicon.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [{ url: "/astrework-favicon.png" }],
    shortcut: "/astrework-favicon.png",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "name": "AstreWork",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web Browser",
      "url": "https://astrework.com",
      "description":
        "Autonomous remote career intelligence and application engine featuring multi-provider job scraping, deep ATS scoring, and auto-dispatching.",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
      },
      "creator": {
        "@type": "Person",
        "name": "Astreon",
        "url": "https://github.com/Hey-Astreon",
      },
    },
    {
      "@type": "Organization",
      "name": "AstreWork",
      "url": "https://astrework.com",
      "logo": "https://astrework.com/astrework-favicon.png",
      "sameAs": ["https://github.com/Hey-Astreon/Career_Engine"],
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
