import path from "path";

/**
 * Canonical Master Resume Resolver
 * Static pre-baked variants have been retired in favor of AstreWork's live /resume-maker
 * and the single canonical Master Resume PDF for each founder.
 */

export interface RecommendedResumeVariant {
  variantName: string;
  fileName: string;
  pdfPath: string;
  reasoning: string;
  keyStrengths: string[];
}

export interface OfficialResumeVariant {
  variantName: string;
  fileName: string;
  category: string;
  description: string;
  keyStrengths: string[];
}

function resolveMasterResumePdf(candidateFolder: "2_Ayushi_Raj" | "3_Roushan_Kumar"): string {
  const defaultFileName =
    candidateFolder === "2_Ayushi_Raj" ? "Ayushi_Raj_Resume.pdf" : "Roushan_Kumar_Resume.pdf";
  const defaultPath = path.join(process.cwd(), "public", "candidates", candidateFolder, defaultFileName);
  return defaultPath.replace(/\\/g, "/");
}

export function selectRecommendedResumeVariant(
  profileSlug: string,
  _jobTitle: string = "",
  _jobDescription: string = "",
  _company: string = "",
  _platform: string = ""
): RecommendedResumeVariant {
  const normalizedSlug = (profileSlug || "roushan").toLowerCase();

  if (normalizedSlug === "ayushi") {
    return {
      variantName: "Master Resume (Canonical)",
      fileName: "Ayushi_Raj_Resume.pdf",
      pdfPath: resolveMasterResumePdf("2_Ayushi_Raj"),
      reasoning:
        "Canonical single-page A4 Master Resume covering AstreWork (Next.js 16 & Gemini scoring studio), AstrePilot Chrome Extension (MV3), Alyra Lock zero-knowledge cryptography, and Astra Vision AST sandbox. Use /resume-maker for role-specific tailoring.",
      keyStrengths: [
        "AstreWork & AstrePilot (Chrome MV3)",
        "React 19 & Next.js 16",
        "Alyra Lock (AES-GCM/PBKDF2)",
        "Astra Vision AST Sandbox",
      ],
    };
  }

  return {
    variantName: "Master Resume (Canonical)",
    fileName: "Roushan_Kumar_Resume.pdf",
    pdfPath: resolveMasterResumePdf("3_Roushan_Kumar"),
    reasoning:
      "Canonical single-page A4 Master Resume covering AstreWork distributed scrapers on Oracle Cloud (OCI ARM64), Turso LibSQL WAL, Redis 7 caching, Astra Vision AST parser, and Alyra Lock zero-knowledge vault. Use /resume-maker for role-specific tailoring.",
    keyStrengths: [
      "AstreWork (OCI ARM64 & Distributed Scrapers)",
      "Turso LibSQL & Redis 7",
      "Astra Vision (FastAPI & Tree-Sitter)",
      "Alyra Lock (Web Crypto AES-GCM)",
    ],
  };
}

export function getAllResumeVariants(profileSlug: string): OfficialResumeVariant[] {
  const normalized = (profileSlug || "roushan").toLowerCase();

  if (normalized === "ayushi") {
    return [
      {
        variantName: "Master Resume (Canonical)",
        fileName: "Ayushi_Raj_Resume.pdf",
        category: "Master",
        description:
          "Canonical single-page A4 Master Resume covering AstreWork, AstrePilot Chrome Extension, Alyra Lock, and Astra Vision.",
        keyStrengths: [
          "AstreWork & AstrePilot (Chrome MV3)",
          "React 19 & Next.js 16",
          "Alyra Lock (AES-GCM/PBKDF2)",
          "Astra Vision AST Sandbox",
        ],
      },
    ];
  }

  return [
    {
      variantName: "Master Resume (Canonical)",
      fileName: "Roushan_Kumar_Resume.pdf",
      category: "Master",
      description:
        "Canonical single-page A4 Master Resume covering AstreWork OCI distributed platform, Astra Vision AST sandbox, Alyra Lock, and virtual simulations.",
      keyStrengths: [
        "AstreWork OCI Harvester",
        "Turso LibSQL & Redis 7",
        "Astra Vision AST Sandbox",
        "Alyra Lock Zero-Knowledge",
      ],
    },
  ];
}
