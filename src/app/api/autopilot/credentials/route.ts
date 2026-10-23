import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyAutopilotToken, extractBearerToken } from "@/lib/autopilot/tokenUtils";
import { encryptPassword, decryptPassword, generateCompliantPassword } from "@/lib/autopilot/vaultCrypto";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/**
 * Resolves authenticated user ID from either extension Bearer token or web session.
 */
async function resolveUserId(req: Request): Promise<string | null> {
  // 1. Try Bearer token from Extension
  const authHeader = req.headers.get("Authorization");
  const bearerUserId = verifyAutopilotToken(extractBearerToken(authHeader) ?? "");
  if (bearerUserId) return bearerUserId;

  // 2. Try NextAuth session from web dashboard
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) return session.user.id;
  } catch (e) {}

  return null;
}

/**
 * Normalizes a URL or site string to a clean, canonical hostname.
 * e.g., "https://careers-cotiviti.icims.com/jobs/123/apply" -> "careers-cotiviti.icims.com"
 */
function normalizeSitePattern(input: string): string {
  if (!input) return "";
  let clean = input.trim().toLowerCase();
  try {
    if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
      clean = "https://" + clean;
    }
    const parsed = new URL(clean);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return clean.replace(/^[a-z]+:\/\//i, "").split(/[/:]/)[0].replace(/^www\./, "");
  }
}

/**
 * GET /api/autopilot/credentials
 * - If ?siteUrl=... is passed: looks up credential for that domain
 * - If ?generate=true is passed: returns a freshly generated ATS-compliant password
 * - Otherwise: returns all saved site credentials for the user
 */
export async function GET(req: Request) {
  try {
    const userId = await resolveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });
    }

    const { searchParams } = new URL(req.url);

    // Dynamic compliant password generator
    if (searchParams.get("generate") === "true") {
      const generated = generateCompliantPassword(16);
      return NextResponse.json({ password: generated }, { headers: CORS });
    }

    const siteUrl = searchParams.get("siteUrl");

    if (siteUrl) {
      const host = normalizeSitePattern(siteUrl);
      if (!host) {
        return NextResponse.json({ credential: null }, { headers: CORS });
      }

      // 1. Exact match on normalized host
      let credential = await db.siteCredential.findUnique({
        where: {
          userId_sitePattern: {
            userId,
            sitePattern: host,
          },
        },
      });

      // 2. Subdomain / parent domain match if exact not found
      if (!credential) {
        const allUserCreds = await db.siteCredential.findMany({
          where: { userId },
        });
        credential =
          allUserCreds.find(
            (c) =>
              host.endsWith("." + c.sitePattern) ||
              c.sitePattern.endsWith("." + host) ||
              host.includes(c.sitePattern) ||
              c.sitePattern.includes(host)
          ) ?? null;
      }

      if (!credential) {
        return NextResponse.json({ credential: null }, { headers: CORS });
      }

      // Update lastUsedAt asynchronously
      db.siteCredential
        .update({
          where: { id: credential.id },
          data: { lastUsedAt: new Date() },
        })
        .catch(() => {});

      return NextResponse.json(
        {
          credential: {
            id: credential.id,
            sitePattern: credential.sitePattern,
            loginId: credential.loginId,
            password: decryptPassword(credential.password),
            notes: credential.notes,
            lastUsedAt: credential.lastUsedAt,
          },
        },
        { headers: CORS }
      );
    }

    // Return list for dashboard (passwords decrypted for authorized owner)
    const credentials = await db.siteCredential.findMany({
      where: { userId },
      orderBy: [{ lastUsedAt: "desc" }, { updatedAt: "desc" }],
    });

    const safeList = credentials.map((c) => ({
      id: c.id,
      sitePattern: c.sitePattern,
      loginId: c.loginId,
      password: decryptPassword(c.password),
      notes: c.notes,
      lastUsedAt: c.lastUsedAt,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    return NextResponse.json({ credentials: safeList }, { headers: CORS });
  } catch (err: any) {
    console.error("[api/autopilot/credentials/GET]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500, headers: CORS });
  }
}

/**
 * POST /api/autopilot/credentials
 * Body: { siteUrl, loginId, password, notes }
 * Saves or updates a site credential in the encrypted vault.
 */
export async function POST(req: Request) {
  try {
    const userId = await resolveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });
    }

    const body = await req.json();
    const { siteUrl, loginId, password, notes } = body;

    if (!siteUrl || !loginId || !password) {
      return NextResponse.json(
        { error: "Missing required fields: siteUrl, loginId, password" },
        { status: 400, headers: CORS }
      );
    }

    const host = normalizeSitePattern(siteUrl);
    if (!host) {
      return NextResponse.json({ error: "Invalid siteUrl" }, { status: 400, headers: CORS });
    }

    const encrypted = encryptPassword(String(password).trim());

    const saved = await db.siteCredential.upsert({
      where: {
        userId_sitePattern: {
          userId,
          sitePattern: host,
        },
      },
      create: {
        userId,
        sitePattern: host,
        loginId: String(loginId).trim(),
        password: encrypted,
        notes: notes ? String(notes).trim() : null,
        lastUsedAt: new Date(),
      },
      update: {
        loginId: String(loginId).trim(),
        password: encrypted,
        notes: notes !== undefined ? (notes ? String(notes).trim() : null) : undefined,
        lastUsedAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        credential: {
          id: saved.id,
          sitePattern: saved.sitePattern,
          loginId: saved.loginId,
        },
      },
      { headers: CORS }
    );
  } catch (err: any) {
    console.error("[api/autopilot/credentials/POST]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500, headers: CORS });
  }
}

/**
 * DELETE /api/autopilot/credentials
 * Query: ?id=<id> or Body: { id }
 */
export async function DELETE(req: Request) {
  try {
    const userId = await resolveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });
    }

    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");

    if (!id) {
      try {
        const body = await req.json();
        id = body.id;
      } catch (e) {}
    }

    if (!id) {
      return NextResponse.json({ error: "Missing credential id" }, { status: 400, headers: CORS });
    }

    const existing = await db.siteCredential.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Credential not found" }, { status: 404, headers: CORS });
    }

    await db.siteCredential.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, deletedId: id }, { headers: CORS });
  } catch (err: any) {
    console.error("[api/autopilot/credentials/DELETE]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500, headers: CORS });
  }
}
