import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { generateDigestHtml } from "@/lib/digestEmail";
// Note: In a real app we'd use a transactional email provider like Resend or Sendgrid
// import { Resend } from 'resend';
// const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { alertPreference: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let pref = user.alertPreference;
    if (!pref) {
      pref = await prisma.userAlertPreference.create({
        data: { userId: user.id }
      });
    }

    return NextResponse.json(pref);
  } catch (error) {
    console.error("Error fetching alert preferences:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { alertPreference: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const pref = await prisma.userAlertPreference.upsert({
      where: { userId: user.id },
      update: {
        emailDigest: data.emailDigest,
        frequency: data.frequency,
        matchScoreThreshold: data.matchScoreThreshold,
        categories: JSON.stringify(data.categories || [])
      },
      create: {
        userId: user.id,
        emailDigest: data.emailDigest ?? true,
        frequency: data.frequency ?? "DAILY",
        matchScoreThreshold: data.matchScoreThreshold ?? 70,
        categories: JSON.stringify(data.categories || [])
      }
    });

    return NextResponse.json(pref);
  } catch (error) {
    console.error("Error updating alert preferences:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST endpoint to trigger a test digest manually
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch some recent opportunities to simulate a digest
    const recentOpps = await prisma.opportunity.findMany({
      take: 3,
      orderBy: { firstSeenAt: 'desc' }
    });

    const html = generateDigestHtml({
      userName: user.name || "Candidate",
      opportunities: recentOpps,
      totalMatches: 12,
      preferencesUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/settings`,
      appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    });

    // In a real app we'd send the email here
    // await resend.emails.send({ ... })

    return NextResponse.json({ 
      success: true, 
      message: "Test digest generated successfully",
      htmlPreview: html // Return HTML for UI preview
    });
  } catch (error) {
    console.error("Error generating test digest:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
