import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export function resolveTursoConfig() {
  const inputs = [
    process.env.TURSO_DATABASE_URL,
    process.env.TURSO_AUTH_TOKEN,
    process.env.DATABASE_URL
  ].filter(Boolean) as string[];

  let url: string | undefined;
  let authToken: string | undefined;

  for (const item of inputs) {
    let str = String(item).trim();
    str = str.replace(/^[A-Za-z0-9_]+=\s*/, '');
    str = str.replace(/^['"`]+|['"`]+$/g, '').trim();

    if (!url && !str.startsWith('eyJ') && !/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(str)) {
      const match = str.match(/(?:libsql|https?):\/\/[^\s"'`]+/);
      if (match) {
        let clean = match[0];
        if (clean.startsWith('https://')) clean = 'libsql://' + clean.slice(8);
        if (clean.startsWith('http://')) clean = 'libsql://' + clean.slice(7);
        url = clean;
      } else {
        const tursoMatch = str.match(/[a-zA-Z0-9_.-]+\.turso\.io[^\s"'`]*/);
        if (tursoMatch) {
          url = 'libsql://' + tursoMatch[0];
        } else if (str.startsWith('libsql://') || str.startsWith('wss://')) {
          url = str;
        }
      }
    }

    if (!authToken) {
      const jwtMatch = str.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
      if (jwtMatch) {
        authToken = jwtMatch[0];
      } else if (!str.includes('.turso.io') && !str.startsWith('libsql://') && !str.startsWith('http')) {
        authToken = str || undefined;
      }
    }
  }

  const isRemote = Boolean(url && (url.startsWith('libsql://') || url.startsWith('wss://')));
  return { url: url || '', authToken, isRemote };
}

export function cleanDbUrl(): { url: string; isRemote: boolean } {
  return resolveTursoConfig();
}

function createPrismaClient() {
  const { url: remoteUrl, authToken: remoteAuthToken, isRemote } = resolveTursoConfig();

  let url: string;
  let authToken: string | undefined;

  if (isRemote) {
    url = remoteUrl;
    authToken = remoteAuthToken;
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

