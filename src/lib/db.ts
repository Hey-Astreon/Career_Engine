import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export function cleanDbUrl(raw?: string): { url: string; isRemote: boolean } {
  if (!raw) return { url: "", isRemote: false };
  let trimmed = String(raw).trim().replace(/^[\r\n]+|[\r\n]+$/g, "").trim().replace(/^['"]+|['"]+$/g, "").trim();
  if (!trimmed) return { url: "", isRemote: false };

  if (trimmed.startsWith("https://")) {
    trimmed = "libsql://" + trimmed.slice("https://".length);
  } else if (trimmed.startsWith("http://")) {
    trimmed = "libsql://" + trimmed.slice("http://".length);
  }

  const isRemote = trimmed.startsWith("libsql://") || trimmed.startsWith("wss://");
  return { url: trimmed, isRemote };
}

function createPrismaClient() {
  const rawTursoUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  const { url: remoteUrl, isRemote } = cleanDbUrl(rawTursoUrl);

  let url: string;
  let authToken: string | undefined;

  if (isRemote) {
    url = remoteUrl;
    authToken = process.env.TURSO_AUTH_TOKEN
      ? String(process.env.TURSO_AUTH_TOKEN).trim().replace(/^[\r\n]+|[\r\n]+$/g, "").trim().replace(/^['"]+|['"]+$/g, "").trim()
      : undefined;
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

