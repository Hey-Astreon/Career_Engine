import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const parsed = parseInt(searchParams.get("limit") || "20", 10);
    const limit = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 100) : 20;

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
