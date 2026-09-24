import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const isTursoRemote = process.env.TURSO_DATABASE_URL && process.env.TURSO_DATABASE_URL.startsWith("libsql://");
  
  const url = isTursoRemote 
    ? process.env.TURSO_DATABASE_URL! 
    : `file:${path.join(process.cwd(), "prisma", "dev.db").replace(/\\/g, "/")}`;

  const authToken = isTursoRemote ? process.env.TURSO_AUTH_TOKEN : undefined;

  const adapter = new PrismaLibSql({ url, authToken });
  
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

