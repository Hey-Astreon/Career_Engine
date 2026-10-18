import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clampHistoryDays, PROVIDER_FAILURE_ALERT_THRESHOLD_PERCENT, summarizeDailyEndpointRuns, summarizeProviderFailureAlerts } from "@/lib/providerEndpointTelemetry";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = clampHistoryDays(searchParams.get("days"));
    const providerKey = searchParams.get("provider")?.trim().toUpperCase() || undefined;
    const endpointKey = searchParams.get("endpointKey")?.trim() || undefined;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const runs = await db.providerEndpointRun.findMany({
      where: {
        observedAt: { gte: since },
        ...(providerKey ? { providerKey } : {}),
        ...(endpointKey ? { endpointKey } : {}),
      },
      select: {
        providerKey: true,
        endpointKey: true,
        observedAt: true,
        success: true,
        latencyMs: true,
      },
      orderBy: { observedAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      readOnly: true,
      since: since.toISOString(),
      days,
      filters: { providerKey: providerKey ?? null, endpointKey: endpointKey ?? null },
      totalEndpointRuns: runs.length,
      alerts: summarizeProviderFailureAlerts(runs),
      alertThreshold: {
        windowHours: days * 24,
        failureRatePercent: PROVIDER_FAILURE_ALERT_THRESHOLD_PERCENT,
        comparison: "greater_than",
      },
      daily: summarizeDailyEndpointRuns(runs),
    });
  } catch (error) {
    console.error("Provider endpoint diagnostics error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve provider endpoint diagnostics" },
      { status: 500 }
    );
  }
}
