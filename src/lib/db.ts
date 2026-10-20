import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export function cleanDbUrl(raw?: string): { url: string; isRemote: boolean } {
  if (!raw) return { url: "", isRemote: false };
  let str = String(raw).trim();
  str = str.replace(/^[A-Za-z0-9_]+=\s*/, '');
  str = str.replace(/^['"`]+|['"`]+$/g, '').trim();

  const match = str.match(/(?:libsql|https?):\/\/[^\s"'`]+/);
  if (match) {
    let clean = match[0];
    if (clean.startsWith("https://")) clean = "libsql://" + clean.slice(8);
    if (clean.startsWith("http://")) clean = "libsql://" + clean.slice(7);
    return { url: clean, isRemote: true };
  }

  const tursoMatch = str.match(/[a-zA-Z0-9_.-]+\.turso\.io[^\s"'`]*/);
  if (tursoMatch) {
    return { url: "libsql://" + tursoMatch[0], isRemote: true };
  }

  const isRemote = str.startsWith("libsql://") || str.startsWith("wss://");
  return { url: str, isRemote };
}

export function cleanAuthToken(raw?: string): string | undefined {
  if (!raw) return undefined;
  let str = String(raw).trim();
  str = str.replace(/^[A-Za-z0-9_]+=\s*/, '');
  str = str.replace(/^['"`]+|['"`]+$/g, '').trim();
  const jwtMatch = str.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  if (jwtMatch) return jwtMatch[0];
  return str || undefined;
}

function createPrismaClient() {
  const rawTursoUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  const { url: remoteUrl, isRemote } = cleanDbUrl(rawTursoUrl);

  let url: string;
  let authToken: string | undefined;

  if (isRemote) {
    url = remoteUrl;
    authToken = cleanAuthToken(process.env.TURSO_AUTH_TOKEN);
    console.log(`[DB] Connected to Turso Cloud LibSQL (${url.replace(/:\/\/.*@/, "://***@")})`);
  } else {
    if (process.env.CI || process.env.NODE_ENV === "production") {
      console.warn(`[DB WARNING] No remote Turso URL detected in CI/Production! Falling back to local SQLite.`);
    }
    url = `file:${path.join(process.cwd(), "prisma", "dev.db").replace(/\\/g, "/")}`;
  }

  const adapter = new PrismaLibSql({ url, authToken });
  
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

