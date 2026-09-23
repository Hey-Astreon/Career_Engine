import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Public metrics endpoint for the landing page.
 * Returns live, real numbers from the AstreWork database.
 * No authentication required — these are public trust signals.
 */
export async function GET() {
  try {
    const [totalJobs, totalProviders, totalProfiles] = await Promise.all([
      db.opportunity.count(),
      db.providerSyncState.count(),
      db.profile.count(),
    ]);

    return NextResponse.json({
      totalJobsIndexed: totalJobs,
      totalProviders: totalProviders,
      totalProfiles: totalProfiles,
    });
  } catch (error: any) {
    console.error("[Public Metrics Error]", error);
    return NextResponse.json({
      totalJobsIndexed: 0,
      totalProviders: 0,
      totalProfiles: 0,
    });
  }
}
