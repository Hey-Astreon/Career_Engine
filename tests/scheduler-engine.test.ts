import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { discoveryScheduler, pruneStaleJobs, SENIOR_OR_NUMBERED_REGEX } from "../src/lib/scheduler";

describe("DiscoveryScheduler Lifecycle & Status", () => {
  afterEach(() => {
    discoveryScheduler.stop();
  });

  it("reports correct default initial or stopped status", () => {
    discoveryScheduler.stop();
    const status = discoveryScheduler.getStatus();
    expect(status.isRunning).toBe(false);
    expect(status.intervalMs).toBe(60 * 60 * 1000);
    expect(status.nextRunAt).toBeNull();
  });

  it("starts and reports running status with scheduled next run", () => {
    discoveryScheduler.start();
    const status = discoveryScheduler.getStatus();
    expect(status.isRunning).toBe(true);
    expect(status.nextRunAt).toBeInstanceOf(Date);
    expect(status.nextRunAt!.getTime()).toBeGreaterThan(Date.now());
  });

  it("stops cleanly and clears next run time", () => {
    discoveryScheduler.start();
    expect(discoveryScheduler.getStatus().isRunning).toBe(true);

    discoveryScheduler.stop();
    expect(discoveryScheduler.getStatus().isRunning).toBe(false);
    expect(discoveryScheduler.getStatus().nextRunAt).toBeNull();
  });

  it("adjusts interval hours accurately", () => {
    discoveryScheduler.setIntervalHours(3);
    const status = discoveryScheduler.getStatus();
    expect(status.intervalMs).toBe(3 * 60 * 60 * 1000);

    // Reset back to 1 hour
    discoveryScheduler.setIntervalHours(1);
    expect(discoveryScheduler.getStatus().intervalMs).toBe(60 * 60 * 1000);
  });
});

describe("pruneStaleJobs Lifecycle & Seniority Enforcement", () => {
  it("detects senior and numbered levels accurately via SENIOR_OR_NUMBERED_REGEX", () => {
    expect(SENIOR_OR_NUMBERED_REGEX.test("Software Engineer II")).toBe(true);
    expect(SENIOR_OR_NUMBERED_REGEX.test("Senior Backend Engineer")).toBe(true);
    expect(SENIOR_OR_NUMBERED_REGEX.test("SDE 3")).toBe(true);
    expect(SENIOR_OR_NUMBERED_REGEX.test("Staff Infrastructure Engineer")).toBe(true);
    expect(SENIOR_OR_NUMBERED_REGEX.test("Lead Full Stack Developer")).toBe(true);
    expect(SENIOR_OR_NUMBERED_REGEX.test("Principal Architect")).toBe(true);
    expect(SENIOR_OR_NUMBERED_REGEX.test("Software Engineer Intern")).toBe(false);
    expect(SENIOR_OR_NUMBERED_REGEX.test("Junior React Developer")).toBe(false);
    expect(SENIOR_OR_NUMBERED_REGEX.test("Entry Level Software Engineer")).toBe(false);
  });

  it("executes pruneStaleJobs with a mocked prisma database instance", async () => {
    const mockDb = {
      jobPosting: {
        updateMany: vi.fn().mockResolvedValue({ count: 2 }),
        findMany: vi.fn().mockResolvedValue([
          { id: "job-1", title: "Software Engineer Intern" },
          { id: "job-2", title: "Senior Developer" },
        ]),
      },
      opportunity: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findMany: vi.fn().mockResolvedValue([
          { id: "opp-1", title: "Node.js Intern" },
          { id: "opp-2", title: "Staff SRE" },
        ]),
      },
    } as any;

    const metrics = await pruneStaleJobs(mockDb);
    expect(metrics.expiredJobsCount).toBe(3); // 2 date expired + 1 senior
    expect(metrics.expiredOppsCount).toBe(2); // 1 date expired + 1 senior
    expect(mockDb.jobPosting.updateMany).toHaveBeenCalledTimes(2);
    expect(mockDb.opportunity.updateMany).toHaveBeenCalledTimes(2);
  });
});

