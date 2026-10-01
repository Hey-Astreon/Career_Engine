import crypto from "crypto";

const SECRET = process.env.NEXTAUTH_SECRET ?? "fallback-secret";
const TOKEN_TTL = 90 * 24 * 60 * 60 * 1000; // 90 days in ms

/**
 * Generate a signed, stateless autopilot token for a user.
 * Format: base64url(payload).hmac_signature
 */
export function generateAutopilotToken(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, exp: Date.now() + TOKEN_TTL })
  ).toString("base64url");

  const sig = crypto
    .createHmac("sha256", SECRET)
    .update(payload)
    .digest("base64url");

  return `${payload}.${sig}`;
}

/**
 * Verify a token. Returns the userId if valid, null if expired or tampered.
 */
export function verifyAutopilotToken(token: string): string | null {
  try {
    const dotIdx = token.lastIndexOf(".");
    if (dotIdx === -1) return null;

    const payload = token.slice(0, dotIdx);
    const sig = token.slice(dotIdx + 1);

    const expected = crypto
      .createHmac("sha256", SECRET)
      .update(payload)
      .digest("base64url");

    // Constant-time comparison to prevent timing attacks
    if (
      sig.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    ) {
      return null;
    }

    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (Date.now() > data.exp) return null; // expired

    return data.uid as string;
  } catch {
    return null;
  }
}

/**
 * Extract the Bearer token from an Authorization header.
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7).trim();
}
