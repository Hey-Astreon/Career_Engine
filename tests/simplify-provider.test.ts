import axios from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SimplifyProvider } from "../src/lib/providers/simplify";

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    isAxiosError: vi.fn(),
  },
}));

type Listing = {
  id: string;
  title: string;
  company_name: string;
  active: boolean;
  date_posted: number;
  url: string;
  locations: string[];
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
}

function remoteListing(id: string): Listing {
  return {
    id,
    title: "Software Engineer Intern",
    company_name: "Example Co",
    active: true,
    date_posted: Math.floor(Date.now() / 1000) - 3600,
    url: `https://example.com/jobs/${id}`,
    locations: ["Remote"],
  };
}

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("SimplifyProvider endpoint handling", () => {
  it("starts all endpoint fetches concurrently before a response resolves", async () => {
    const requests = [
      deferred<{ data: Listing[]; status: number }>(),
      deferred<{ data: Listing[]; status: number }>(),
      deferred<{ data: Listing[]; status: number }>(),
    ];
    const queue = [...requests];
    vi.mocked(axios.get).mockImplementation(() => queue.shift()!.promise as never);
    vi.mocked(axios.isAxiosError).mockReturnValue(false);
    const telemetryLog = vi.spyOn(console, "info").mockImplementation(() => undefined);

    const run = new SimplifyProvider().fetch();

    await vi.waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(3);
    });

    requests[0].resolve({ data: [remoteListing("new-grad")], status: 200 });
    requests[1].resolve({ data: [remoteListing("summer-2026")], status: 200 });
    requests[2].resolve({ data: [remoteListing("summer-2025")], status: 200 });

    const result = await run;

    expect(result.success).toBe(true);
    expect(result.jobs).toHaveLength(3);
    expect(result.endpointTelemetrySummary).toMatchObject({
      totalEndpoints: 3,
      successfulEndpoints: 3,
      failedEndpoints: 0,
      failureRatePercent: 0,
    });
    expect(telemetryLog).toHaveBeenCalledTimes(3);
  });

  it("keeps healthy endpoint results and exposes a per-run failure rate when one non-retryable endpoint fails", async () => {
    const endpointError = Object.assign(new Error("Not found"), {
      response: { status: 404, headers: {} },
    });
    vi.mocked(axios.isAxiosError).mockReturnValue(true);
    vi.mocked(axios.get)
      .mockRejectedValueOnce(endpointError)
      .mockResolvedValueOnce({ data: [remoteListing("summer-2026")], status: 200 } as never)
      .mockResolvedValueOnce({ data: [remoteListing("summer-2025")], status: 200 } as never);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const result = await new SimplifyProvider().fetch();

    expect(result.success).toBe(true);
    expect(result.jobs).toHaveLength(2);
    expect(result.endpointTelemetrySummary).toMatchObject({
      totalEndpoints: 3,
      successfulEndpoints: 2,
      failedEndpoints: 1,
      failureRatePercent: 33,
    });
    expect(result.endpointTelemetry?.[0]).toMatchObject({ success: false, attempts: 1, statusCode: 404 });
    expect(axios.get).toHaveBeenCalledTimes(3);
  });

  it("retries a transient endpoint failure once with exponential backoff and records the second attempt", async () => {
    vi.useFakeTimers();
    vi.mocked(axios.isAxiosError).mockReturnValue(false);
    vi.mocked(axios.get)
      .mockRejectedValueOnce(new Error("Temporary network failure"))
      .mockResolvedValueOnce({ data: [remoteListing("summer-2026")], status: 200 } as never)
      .mockResolvedValueOnce({ data: [remoteListing("summer-2025")], status: 200 } as never)
      .mockResolvedValueOnce({ data: [remoteListing("new-grad")], status: 200 } as never);
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    const run = new SimplifyProvider().fetch();
    await vi.advanceTimersByTimeAsync(300);
    const result = await run;

    expect(axios.get).toHaveBeenCalledTimes(4);
    expect(result.success).toBe(true);
    expect(result.endpointTelemetry?.[0]).toMatchObject({ success: true, attempts: 2 });
    expect(result.endpointTelemetrySummary?.failureRatePercent).toBe(0);
  });
});
