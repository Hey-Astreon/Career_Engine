import { describe, it, expect } from "vitest";
import {
  acquireTabLock,
  refreshTabLockHeartbeat,
  releaseTabLock,
  pruneExpiredLocks,
  isLockExpired,
  isDuplicateApplication,
  formatSyncMessage,
  TabLockRecord,
} from "@/lib/autopilot/multiTabEngine";

describe("Pillar E: Multi-Tab Concurrency & Sync Engine (multiTabEngine.ts)", () => {
  it("acquires an active fill lock for a fresh tab", () => {
    const locks = new Map<string, TabLockRecord>();
    const res = acquireTabLock(locks, {
      tabId: 101,
      siteUrl: "https://boards.greenhouse.io/stripe/jobs/12345?gh_src=linkedin",
      company: "Stripe",
      jobTitle: "Software Developer",
    });

    expect(res.success).toBe(true);
    expect(res.lock).toBeDefined();
    expect(res.lock?.tabId).toBe(101);
    expect(res.lock?.company).toBe("Stripe");
    expect(locks.size).toBe(1);
  });

  it("rejects lock acquisition when another active tab holds the lock", () => {
    const locks = new Map<string, TabLockRecord>();
    const now = 100000;

    // Tab 101 acquires lock
    acquireTabLock(
      locks,
      {
        tabId: 101,
        siteUrl: "https://boards.greenhouse.io/stripe/jobs/12345",
        company: "Stripe",
        jobTitle: "Software Developer",
      },
      45000,
      now
    );

    // Tab 102 attempts to acquire lock on the same job
    const res = acquireTabLock(
      locks,
      {
        tabId: 102,
        siteUrl: "https://boards.greenhouse.io/stripe/jobs/12345#app",
        company: "Stripe",
        jobTitle: "Software Developer",
      },
      45000,
      now + 5000 // 5 seconds later (within 45s TTL)
    );

    expect(res.success).toBe(false);
    expect(res.error).toContain("Active fill in progress in another tab");
    expect(res.lock?.tabId).toBe(101);
  });

  it("allows lock acquisition if the previous lock has expired", () => {
    const locks = new Map<string, TabLockRecord>();
    const now = 100000;

    // Tab 101 acquires lock with 45s TTL
    acquireTabLock(
      locks,
      {
        tabId: 101,
        siteUrl: "https://boards.greenhouse.io/stripe/jobs/12345",
        company: "Stripe",
        jobTitle: "Software Developer",
      },
      45000,
      now
    );

    // Tab 102 attempts to acquire lock 50s later (after TTL expiration)
    const res = acquireTabLock(
      locks,
      {
        tabId: 102,
        siteUrl: "https://boards.greenhouse.io/stripe/jobs/12345",
        company: "Stripe",
        jobTitle: "Software Developer",
      },
      45000,
      now + 50000 // 50s later
    );

    expect(res.success).toBe(true);
    expect(res.lock?.tabId).toBe(102);
  });

  it("allows the same tab to re-acquire and refresh its own lock", () => {
    const locks = new Map<string, TabLockRecord>();
    const now = 100000;

    acquireTabLock(
      locks,
      {
        tabId: 101,
        siteUrl: "https://jobs.lever.co/linear/abcde",
        company: "Linear",
        jobTitle: "Full-Stack Developer",
      },
      45000,
      now
    );

    const refreshRes = acquireTabLock(
      locks,
      {
        tabId: 101,
        siteUrl: "https://jobs.lever.co/linear/abcde",
        company: "Linear",
        jobTitle: "Full-Stack Developer",
      },
      45000,
      now + 10000
    );

    expect(refreshRes.success).toBe(true);
    expect(refreshRes.lock?.tabId).toBe(101);
  });

  it("extends lock TTL via refreshTabLockHeartbeat", () => {
    const locks = new Map<string, TabLockRecord>();
    const now = 100000;

    acquireTabLock(
      locks,
      {
        tabId: 101,
        siteUrl: "https://jobs.ashbyhq.com/supabase/dev",
        company: "Supabase",
        jobTitle: "Systems Architect",
      },
      45000,
      now
    );

    // Heartbeat after 20 seconds
    const refreshed = refreshTabLockHeartbeat(
      locks,
      101,
      "https://jobs.ashbyhq.com/supabase/dev",
      "Supabase",
      "Systems Architect",
      45000,
      now + 20000
    );

    expect(refreshed).toBe(true);
    const lock = locks.get("url:https://jobs.ashbyhq.com/supabase/dev");
    expect(lock?.expiresAt).toBe(now + 20000 + 45000);
  });

  it("releases lock explicitly or via tab sweep", () => {
    const locks = new Map<string, TabLockRecord>();

    acquireTabLock(locks, {
      tabId: 202,
      siteUrl: "https://boards.greenhouse.io/figma/jobs/99",
      company: "Figma",
      jobTitle: "Frontend Developer",
    });

    expect(locks.size).toBe(1);

    // Release explicitly
    const released = releaseTabLock(locks, 202, "https://boards.greenhouse.io/figma/jobs/99");
    expect(released).toBe(true);
    expect(locks.size).toBe(0);
  });

  it("prunes expired locks cleanly", () => {
    const locks = new Map<string, TabLockRecord>();
    const now = 100000;

    acquireTabLock(locks, { tabId: 1, siteUrl: "https://a.com/job1" }, 10000, now);
    acquireTabLock(locks, { tabId: 2, siteUrl: "https://b.com/job2" }, 60000, now);

    // At now + 20000, job 1 expired, job 2 still active
    const prunedCount = pruneExpiredLocks(locks, now + 20000);
    expect(prunedCount).toBe(1);
    expect(locks.size).toBe(1);
    expect(locks.has("url:https://b.com/job2")).toBe(true);
  });

  describe("Duplicate Application Detection", () => {
    const mockExistingApps = [
      {
        id: "app-1",
        company: "Stripe",
        title: "Software Developer",
        status: "APPLIED",
        confirmed: true,
        canonicalUrl: "https://boards.greenhouse.io/stripe/jobs/12345",
      },
      {
        id: "app-2",
        company: "Linear",
        title: "Full-Stack Developer",
        status: "SCREENING",
        confirmed: true,
        canonicalUrl: "https://jobs.lever.co/linear/abcde",
      },
    ];

    it("detects duplicates by canonical URL match", () => {
      const res = isDuplicateApplication(
        mockExistingApps,
        "https://boards.greenhouse.io/stripe/jobs/12345?gh_src=feed#app",
        "Stripe",
        "Developer"
      );

      expect(res.isDuplicate).toBe(true);
      expect(res.matchedApp?.id).toBe("app-1");
      expect(res.matchReason).toBe("CANONICAL_URL_MATCH");
    });

    it("detects duplicates by company and title match", () => {
      const res = isDuplicateApplication(
        mockExistingApps,
        "https://jobs.ashbyhq.com/linear/different-url",
        "Linear",
        "Full-Stack Developer"
      );

      expect(res.isDuplicate).toBe(true);
      expect(res.matchedApp?.id).toBe("app-2");
      expect(res.matchReason).toBe("COMPANY_TITLE_MATCH");
    });

    it("returns false for fresh jobs with no prior application", () => {
      const res = isDuplicateApplication(
        mockExistingApps,
        "https://jobs.lever.co/openai/research-assistant",
        "OpenAI",
        "Software Developer"
      );

      expect(res.isDuplicate).toBe(false);
      expect(res.matchedApp).toBeNull();
    });
  });

  it("formats typed BroadcastChannel sync messages properly", () => {
    const msg = formatSyncMessage(
      "APPLICATION_CONFIRMED",
      { applicationId: "app-999", company: "Stripe" },
      101
    );

    expect(msg.type).toBe("APPLICATION_CONFIRMED");
    expect(msg.senderTabId).toBe(101);
    expect(msg.payload.applicationId).toBe("app-999");
    expect(typeof msg.timestamp).toBe("number");
  });
});
