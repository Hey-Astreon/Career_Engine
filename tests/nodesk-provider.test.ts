import { describe, it, expect } from "vitest";
import { NoDeskProvider } from "@/lib/providers/nodesk";
import { PlatformSource } from "@prisma/client";

describe("NoDeskProvider", () => {
  it("initializes with correct name, providerKey, and timeout", () => {
    const provider = new NoDeskProvider();
    expect(provider.name).toBe("NoDesk Remote");
    expect(provider.providerKey).toBe(PlatformSource.NODESK);
    expect(provider.timeoutMs).toBe(12000);
  });

  it("fetches and normalizes remote jobs from NoDesk RSS feed", async () => {
    const provider = new NoDeskProvider();
    const result = await provider.fetch();

    expect(result).toBeDefined();
    expect(result.providerKey).toBe(PlatformSource.NODESK);
    expect(result.success).toBe(true);
    expect(result.jobsDiscovered).toBeGreaterThan(0);

    // If developer jobs were discovered from the live feed, verify their normalized attributes
    if (result.jobs.length > 0) {
      const sample = result.jobs[0];
      expect(sample.providerKey).toBe(PlatformSource.NODESK);
      expect(sample.isRemote).toBe(true);
      expect(sample.discoveryUrl).toMatch(/^https:\/\/nodesk\.co\//);
      expect(sample.canonicalAppUrl).toMatch(/^https:\/\/nodesk\.co\//);
      expect(sample.applicationUrlType).toBe("AGGREGATOR_PAGE");
      expect(sample.verificationStatus).toBe("VERIFIED_AGGREGATOR");
      expect(sample.opportunitySignals).toContain("NICHE_SOURCE");
    }

    // Verify telemetry
    expect(result.endpointTelemetry).toBeDefined();
    expect(result.endpointTelemetry!.length).toBe(1);
    expect(result.endpointTelemetry![0].endpointKey).toBe("nodesk_rss_feed");
    expect(result.endpointTelemetrySummary).toBeDefined();
  }, 15000);
});
