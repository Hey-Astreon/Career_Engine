import axios from "axios";
import { PlatformSource, RemoteScope } from "@prisma/client";
import {
  JobSourceProvider,
  NormalizedJob,
  ProviderEndpointTelemetry,
  ProviderResult,
  ProviderStageDiagnostics,
} from "./types";
import {
  cleanCompanySlug,
  cleanHtmlText,
  determineCategory,
  isStrictlyRemoteDeveloperRole,
  determineOpportunitySignals,
  sanitizeRoleTitle,
} from "./normalize";

const ENDPOINT_TIMEOUT_MS = 6000;

interface ParsedProject {
  project: string;
  title: string;
  description: string;
  skills: string[];
}

export class LFXMentorshipProvider implements JobSourceProvider {
  name = "LFX Mentorship (Linux Foundation)";
  providerKey = PlatformSource.LFX_MENTORSHIP;
  timeoutMs = 15000;

  private parseTermMarkdown(md: string): ParsedProject[] {
    const sections = md.split(/^###\s+/m);
    const parsed: ParsedProject[] = [];

    const metaHeadings = new Set([
      "Timeline",
      "Project Instructions",
      "Application instructions",
      "Program committee",
    ]);

    for (const section of sections) {
      const lines = section.split("\n");
      const heading = lines[0].trim();

      if (metaHeadings.has(heading)) continue;

      const subHeadingIdx = lines.findIndex((l) => l.startsWith("#### "));
      if (subHeadingIdx !== -1) {
        const rawTitle = lines[subHeadingIdx].replace("#### ", "").trim();
        const body = lines.slice(subHeadingIdx + 1).join("\n");

        const descMatch =
          /- Description:\s*([\s\S]*?)(?=- Expected Outcome:|- Recommended Skills:|- Mentor|- Upstream Issue:|$)/i.exec(
            body
          );
        const skillsMatch =
          /- Recommended Skills:\s*([\s\S]*?)(?=- Mentor|- Expected Outcome:|- Description:|- Upstream Issue:|$)/i.exec(
            body
          );

        const skills = skillsMatch
          ? skillsMatch[1]
              .split(/[,;\n]/)
              .map((s) => s.trim().replace(/^-\s*/, ""))
              .filter((s) => s.length > 1 && !s.startsWith("http"))
          : [];

        parsed.push({
          project: heading,
          title: rawTitle,
          description: descMatch ? cleanHtmlText(descMatch[1].trim()) : "",
          skills,
        });
      }
    }

    return parsed;
  }

  async fetch(): Promise<ProviderResult> {
    const startTime = Date.now();
    const jobs: NormalizedJob[] = [];
    let discoveredCount = 0;
    let rejectedCount = 0;

    const termUrls = [
      {
        key: "lfx_cncf_2025_01",
        url: "https://raw.githubusercontent.com/cncf/mentoring/main/programs/lfx-mentorship/2025/01-Mar-May/README.md",
      },
      {
        key: "lfx_cncf_2024_03",
        url: "https://raw.githubusercontent.com/cncf/mentoring/main/programs/lfx-mentorship/2024/03-Sep-Nov/README.md",
      },
      {
        key: "lfx_cncf_2024_02",
        url: "https://raw.githubusercontent.com/cncf/mentoring/main/programs/lfx-mentorship/2024/02-Jun-Aug/README.md",
      },
    ];

    const endpointTelemetry: ProviderEndpointTelemetry[] = [];

    const results = await Promise.allSettled(
      termUrls.map(async ({ key, url }) => {
        const reqStart = Date.now();
        try {
          const res = await axios.get<string>(url, {
            headers: {
              "User-Agent":
                "CareerAgent/2.0 (Job Discovery Engine; https://github.com/Hey-Astreon/CareerAgent)",
              Accept: "text/plain",
            },
            timeout: ENDPOINT_TIMEOUT_MS,
          });

          endpointTelemetry.push({
            endpointKey: key,
            endpoint: url,
            latencyMs: Date.now() - reqStart,
            attempts: 1,
            success: true,
            statusCode: res.status,
          });

          return res.data;
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          endpointTelemetry.push({
            endpointKey: key,
            endpoint: url,
            latencyMs: Date.now() - reqStart,
            attempts: 1,
            success: false,
            error: errMsg,
          });
          return null;
        }
      })
    );

    const diagnostics: ProviderStageDiagnostics = {
      rawCandidates: 0,
      missingTitle: 0,
      invalidUrl: 0,
      roleGateRejected: 0,
      accepted: 0,
      instrumented: true,
    };

    for (const r of results) {
      if (r.status !== "fulfilled" || !r.value) continue;

      const projects = this.parseTermMarkdown(r.value);
      for (const p of projects) {
        discoveredCount++;
        diagnostics.rawCandidates++;

        if (!p.title) {
          diagnostics.missingTitle++;
          rejectedCount++;
          continue;
        }

        const roleTitle = sanitizeRoleTitle(
          `LFX Mentorship (${p.project}): ${p.title}`
        );
        const companyName = `Linux Foundation - ${p.project}`;
        const location = "Remote (Worldwide)";
        const desc = p.description || `${p.title} - Linux Foundation Mentorship`;

        // Check developer role & remote criteria
        if (!isStrictlyRemoteDeveloperRole(roleTitle, location, desc)) {
          diagnostics.roleGateRejected++;
          rejectedCount++;
          continue;
        }

        const { company, companySlug } = cleanCompanySlug(companyName);
        const slugifiedTitle = roleTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .slice(0, 50);

        const sourceJobId = `lfx-${companySlug}-${slugifiedTitle}`;
        const canonicalAppUrl = "https://mentorship.lfx.linuxfoundation.org/";

        jobs.push({
          sourceJobId,
          providerKey: PlatformSource.LFX_MENTORSHIP,
          company,
          companySlug,
          title: roleTitle,
          category: determineCategory(roleTitle, desc),
          jobType: "Remote Internship",
          experienceLevel: "Fresher / Entry Level (0-1 Yr)",
          location,
          isRemote: true,
          remoteScope: RemoteScope.WORLDWIDE,
          discoveryUrl: canonicalAppUrl,
          canonicalAppUrl,
          applicationUrlType: "DIRECT_ATS",
          verificationStatus: "VERIFIED_DIRECT_ATS",
          postedAt: null, // Terms are seasonal cohorts without microsecond posting timestamps
          applicantCount: null,
          opportunitySignals: determineOpportunitySignals({
            providerKey: PlatformSource.LFX_MENTORSHIP,
            applicationUrlType: "DIRECT_ATS",
            canonicalAppUrl,
          }),
          rawDescription: desc,
          hasFullText: true,
          technologies: p.skills.length > 0 ? p.skills : ["Go", "Kubernetes", "Cloud Native"],
        });

        diagnostics.accepted++;
      }
    }

    const failedEndpoints = endpointTelemetry.filter((e) => !e.success);
    const endpointTelemetrySummary = {
      totalEndpoints: endpointTelemetry.length,
      successfulEndpoints: endpointTelemetry.length - failedEndpoints.length,
      failedEndpoints: failedEndpoints.length,
      failureRatePercent: endpointTelemetry.length
        ? Math.round((failedEndpoints.length / endpointTelemetry.length) * 100)
        : 0,
      averageLatencyMs: endpointTelemetry.length
        ? Math.round(
            endpointTelemetry.reduce((acc, curr) => acc + curr.latencyMs, 0) /
              endpointTelemetry.length
          )
        : 0,
    };

    return {
      providerKey: PlatformSource.LFX_MENTORSHIP,
      jobs,
      success: jobs.length > 0,
      durationMs: Date.now() - startTime,
      jobsDiscovered: discoveredCount,
      jobsRejected: rejectedCount,
      diagnostics,
      endpointTelemetry,
      endpointTelemetrySummary,
    };
  }
}
