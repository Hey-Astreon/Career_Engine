import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const history = await db.schedulerRun.findMany({
      orderBy: { startedAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ success: true, history });
  } catch (error) {
    console.error("Scheduler history GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to get scheduler history" }, { status: 500 });
  }
}
