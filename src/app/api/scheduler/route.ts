import { NextResponse } from "next/server";
import { discoveryScheduler } from "@/lib/scheduler";

export async function GET() {
  try {
    const status = discoveryScheduler.getStatus();
    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error("Scheduler GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to get scheduler status" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });

    const { action, hours } = body;

    switch (action) {
      case "start":
        discoveryScheduler.start();
        return NextResponse.json({ success: true, status: discoveryScheduler.getStatus() });
      case "stop":
        discoveryScheduler.stop();
        return NextResponse.json({ success: true, status: discoveryScheduler.getStatus() });
      case "trigger":
        // Don't await this if it takes a long time, but for the API we might want to return immediately
        // and let it run in the background.
        discoveryScheduler.executeRun("MANUAL").catch(console.error);
        return NextResponse.json({ success: true, message: "Run triggered in background" });
      case "setInterval":
        if (typeof hours === "number" && hours > 0) {
          discoveryScheduler.setIntervalHours(hours);
          return NextResponse.json({ success: true, status: discoveryScheduler.getStatus() });
        }
        return NextResponse.json({ success: false, error: "Invalid hours" }, { status: 400 });
      default:
        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Scheduler POST error:", error);
    return NextResponse.json({ success: false, error: "Failed to update scheduler" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    discoveryScheduler.stop();
    return NextResponse.json({ success: true, status: discoveryScheduler.getStatus() });
  } catch (error) {
    console.error("Scheduler DELETE error:", error);
    return NextResponse.json({ success: false, error: "Failed to stop scheduler" }, { status: 500 });
  }
}
