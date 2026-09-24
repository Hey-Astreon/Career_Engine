import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db as prisma } from "@/lib/db";
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
      totalMatches: recentOpps.length > 0 ? recentOpps.length : 5,
      preferencesUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/settings`,
      appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    });

    let emailSent = false;
    if (process.env.EMAIL_SERVER && user.email) {
      try {
        const nodemailer = await import("nodemailer");
        const transporter = nodemailer.createTransport(process.env.EMAIL_SERVER);
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || "noreply@astrework.com",
          to: user.email,
          subject: "✨ AstreWork Career Digest: Your Curated Matches",
          html: html,
        });
        emailSent = true;
      } catch (mailErr) {
        console.warn("Failed to dispatch email via nodemailer:", mailErr);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: emailSent 
        ? "Test digest email sent directly to your inbox!" 
        : "Test digest preview generated successfully.",
      emailSent,
      htmlPreview: html
    });
  } catch (error) {
    console.error("Error generating test digest:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
