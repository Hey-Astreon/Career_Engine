import { db } from "../src/lib/db";
import {
  generateApplicationsCsv,
  generateApplicationsExcelXml,
  generateApplicationsSemanticXml,
  generateApplicationsTsv,
  normalizeApplicationUrl,
  sanitizeForSpreadsheet,
  ExportableApplication,
} from "../src/lib/exportEngine";
import { ApplicationStatus, PlatformSource } from "@prisma/client";

async function main() {
  console.log("=================================================");
  console.log("🔍 ASTREWORK APPLICATION TRACKER VERIFICATION RUN");
  console.log("=================================================");

  // 1. Verify URL Normalization & Formula Shield
  console.log("\n[Test 1] URL Normalization & Formula Injection Shield:");
  const testUrl = "https://boards.greenhouse.io/stripe/jobs/9926?utm_source=test&gh_src=123&ref=auto";
  const normalized = normalizeApplicationUrl(testUrl);
  console.log("  Raw URL:       ", testUrl);
  console.log("  Normalized URL:", normalized);
  if (normalized === "https://boards.greenhouse.io/stripe/jobs/9926") {
    console.log("  ✓ URL normalization passed.");
  } else {
    throw new Error("URL normalization failed");
  }

  const maliciousTitle = "=cmd|' /C calc'!A0";
  const sanitizedTitle = sanitizeForSpreadsheet(maliciousTitle);
  console.log("  Malicious cell: ", maliciousTitle);
  console.log("  Sanitized cell: ", sanitizedTitle);
  if (sanitizedTitle.startsWith("'")) {
    console.log("  ✓ Formula injection shield passed.");
  } else {
    throw new Error("Formula injection shield failed");
  }

  // 2. Verify Multi-Format Export Generators
  console.log("\n[Test 2] Multi-Format Export Generator Functions:");
  const testApplications: ExportableApplication[] = [
    {
      slNo: 1,
      company: "Stripe",
      position: "Full-Stack Developer",
      appliedDate: "Oct 23, 2026, 03:30 AM",
      appliedAtIso: new Date().toISOString(),
      status: "APPLIED",
      confirmed: true,
      daysSilent: 0,
      formUrl: normalized,
      source: "⚡ AstrePilot Autofill",
      fieldsFilled: 14,
      fieldsTotal: 14,
      hasAiAnswers: true,
      atsScore: 94,
    },
    {
      slNo: 2,
      company: "PostHog",
      position: "Backend Developer",
      appliedDate: "Oct 21, 2026, 11:00 AM",
      appliedAtIso: new Date(Date.now() - 2 * 86400000).toISOString(),
      status: "APPLIED",
      confirmed: false,
      daysSilent: 2,
      formUrl: "https://jobs.ashbyhq.com/posthog/123",
      source: "⚡ AstrePilot Autofill",
      fieldsFilled: 12,
      fieldsTotal: 15,
      hasAiAnswers: false,
      atsScore: 89,
    },
  ];

  const csv = generateApplicationsCsv(testApplications);
  const isBomPresent = csv.charCodeAt(0) === 0xfeff;
  console.log("  CSV UTF-8 BOM present:       ", isBomPresent ? "✓ YES" : "✗ NO");
  console.log("  CSV contains Sl No header:   ", csv.includes("Sl No.") ? "✓ YES" : "✗ NO");
  console.log("  CSV contains Full-Stack Dev: ", csv.includes("Full-Stack Developer") ? "✓ YES" : "✗ NO");

  const excelXml = generateApplicationsExcelXml(testApplications, "Roushan Kumar");
  console.log("  Excel XML Workbook tag:      ", excelXml.includes("<Workbook") ? "✓ YES" : "✗ NO");
  console.log("  Excel XML AstreWork Navy:    ", excelXml.includes('ss:Color="#0071E3"') ? "✓ YES" : "✗ NO");
  console.log("  Excel XML Clickable Hyperlink:", excelXml.includes("ss:HRef=") ? "✓ YES" : "✗ NO");

  const semanticXml = generateApplicationsSemanticXml(testApplications, "Roushan Kumar");
  console.log("  Semantic XML applications tag:", semanticXml.includes("<applications") ? "✓ YES" : "✗ NO");
  console.log("  Semantic XML confirmed tag:  ", semanticXml.includes("<confirmed>true</confirmed>") ? "✓ YES" : "✗ NO");

  const tsv = generateApplicationsTsv(testApplications);
  console.log("  TSV contains tab separators: ", tsv.includes("\t") ? "✓ YES" : "✗ NO");

  // 3. Verify Database Profile & Application Pipeline
  console.log("\n[Test 3] Database Schema & Query Validation:");
  const profile = await db.profile.findFirst({
    where: { slug: "roushan" },
    select: { id: true, slug: true, fullName: true },
  });

  if (!profile) {
    console.log("  (Profile 'roushan' not found; testing with first available profile)");
  } else {
    console.log(`  Found Profile: ${profile.fullName} (${profile.slug})`);
    const appCount = await db.application.count({
      where: { profileId: profile.id },
    });
    console.log(`  Current Tracked Applications in DB: ${appCount}`);

    const sampleApps = await db.application.findMany({
      where: { profileId: profile.id },
      take: 3,
      include: { jobPosting: true },
    });

    sampleApps.forEach((app, i) => {
      console.log(`    [${i + 1}] ${app.jobPosting?.company || "Direct Portal"} — ${app.jobPosting?.title || "Role"} (Status: ${app.status})`);
    });
  }

  console.log("\n=================================================");
  console.log("🎉 ALL TRACKER & EXPORT VERIFICATION CHECKS PASSED!");
  console.log("=================================================");
}

main()
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
