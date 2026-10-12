import { describe, it, expect } from "vitest";
import { LFXMentorshipProvider } from "@/lib/providers/lfx";
import { PlatformSource, RemoteScope } from "@prisma/client";

describe("LFXMentorshipProvider", () => {
  it("initializes with correct name, providerKey, and timeout", () => {
    const provider = new LFXMentorshipProvider();
    expect(provider.name).toBe("LFX Mentorship (Linux Foundation)");
    expect(provider.providerKey).toBe(PlatformSource.LFX_MENTORSHIP);
    expect(provider.timeoutMs).toBe(15000);
  });

  it("fetches and normalizes active CNCF / Linux Foundation mentorship projects", async () => {
    const provider = new LFXMentorshipProvider();
    const result = await provider.fetch();

    expect(result).toBeDefined();
    expect(result.providerKey).toBe(PlatformSource.LFX_MENTORSHIP);
    expect(result.success).toBe(true);
    expect(result.jobs.length).toBeGreaterThan(0);
    expect(result.jobsDiscovered).toBeGreaterThan(0);

    // Verify first normalized job properties
    const sample = result.jobs[0];
    expect(sample.providerKey).toBe(PlatformSource.LFX_MENTORSHIP);
    expect(sample.company).toContain("Linux Foundation");
    expect(sample.isRemote).toBe(true);
    expect(sample.remoteScope).toBe(RemoteScope.WORLDWIDE);
    expect(sample.jobType).toBe("Remote Internship");
    expect(sample.experienceLevel).toBe("Fresher / Entry Level (0-1 Yr)");
    expect(sample.applicationUrlType).toBe("DIRECT_ATS");
    expect(sample.verificationStatus).toBe("VERIFIED_DIRECT_ATS");
    expect(sample.opportunitySignals).toContain("NICHE_SOURCE");
    expect(sample.opportunitySignals).toContain("DIRECT_APPLICATION");
    expect(sample.canonicalAppUrl).toBe("https://mentorship.lfx.linuxfoundation.org/");
    expect(sample.rawDescription.length).toBeGreaterThan(20);

    // Verify telemetry
    expect(result.endpointTelemetry).toBeDefined();
    expect(result.endpointTelemetry!.length).toBeGreaterThan(0);
    expect(result.endpointTelemetrySummary).toBeDefined();
    expect(result.endpointTelemetrySummary!.totalEndpoints).toBeGreaterThan(0);
  }, 20000);
});
