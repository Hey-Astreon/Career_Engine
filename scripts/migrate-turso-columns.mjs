import { createClient } from "@libsql/client";
import dotenv from "dotenv";
dotenv.config();

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl || !tursoToken) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
  process.exit(1);
}

const tursoClient = createClient({
  url: tursoUrl,
  authToken: tursoToken,
});

async function addColumnIfNotExists(table, column, colTypeAndDefault) {
  const tableInfo = await tursoClient.execute(`PRAGMA table_info("${table}")`);
  const existingCols = tableInfo.rows.map((r) => r.name);

  if (existingCols.includes(column)) {
    console.log(`✓ Table '${table}' already has column '${column}'`);
    return;
  }

  const sql = `ALTER TABLE "${table}" ADD COLUMN "${column}" ${colTypeAndDefault}`;
  console.log(`Adding column: ${sql}`);
  await tursoClient.execute(sql);
  console.log(`✓ Added column '${column}' to table '${table}'`);
}

async function main() {
  console.log("=== Migrating Missing Columns on Turso Cloud ===");
  console.log(`Target: ${tursoUrl}`);

  // Profiles table
  await addColumnIfNotExists("profiles", "noticePeriod", "TEXT");
  await addColumnIfNotExists("profiles", "willingnessToRelocate", "BOOLEAN NOT NULL DEFAULT 0");
  await addColumnIfNotExists("profiles", "highestEducation", "TEXT");
  await addColumnIfNotExists("profiles", "gender", "TEXT");
  await addColumnIfNotExists("profiles", "pronouns", "TEXT");
  await addColumnIfNotExists("profiles", "streetAddress", "TEXT");
  await addColumnIfNotExists("profiles", "apartment", "TEXT");
  await addColumnIfNotExists("profiles", "zipCode", "TEXT");

  // Autopilot sessions table
  await addColumnIfNotExists("autopilot_sessions", "astraShieldLegit", "BOOLEAN NOT NULL DEFAULT 1");
  await addColumnIfNotExists("autopilot_sessions", "astraShieldScore", "INTEGER NOT NULL DEFAULT 100");
  await addColumnIfNotExists("autopilot_sessions", "astraShieldReason", "TEXT");
  await addColumnIfNotExists("autopilot_sessions", "recruiterName", "TEXT");
  await addColumnIfNotExists("autopilot_sessions", "recruiterTitle", "TEXT");
  await addColumnIfNotExists("autopilot_sessions", "recruiterLinkedInUrl", "TEXT");
  await addColumnIfNotExists("autopilot_sessions", "recruiterId", "TEXT");

  // Screening question vault table (Pillar D)
  console.log("\nMigrating screening_question_vault table...");
  await tursoClient.execute(`
    CREATE TABLE IF NOT EXISTS "screening_question_vault" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "profileId" TEXT NOT NULL,
      "category" TEXT NOT NULL DEFAULT 'GENERAL',
      "questionPattern" TEXT NOT NULL,
      "keywords" TEXT NOT NULL DEFAULT '[]',
      "answerText" TEXT NOT NULL,
      "isFavorite" BOOLEAN NOT NULL DEFAULT 0,
      "timesUsed" INTEGER NOT NULL DEFAULT 0,
      "lastUsedAt" DATETIME,
      "companyContext" TEXT,
      "roleContext" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "screening_question_vault_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await tursoClient.execute(`
    CREATE INDEX IF NOT EXISTS "screening_question_vault_profileId_idx" ON "screening_question_vault"("profileId")
  `);
  await tursoClient.execute(`
    CREATE INDEX IF NOT EXISTS "screening_question_vault_category_idx" ON "screening_question_vault"("category")
  `);
  console.log("✓ screening_question_vault table & indexes ready on Turso Cloud!");

  // Site credentials table (Pillar F)
  console.log("\nMigrating site_credentials table...");
  await tursoClient.execute(`
    CREATE TABLE IF NOT EXISTS "site_credentials" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "sitePattern" TEXT NOT NULL,
      "loginId" TEXT NOT NULL,
      "password" TEXT NOT NULL,
      "notes" TEXT,
      "lastUsedAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "site_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await tursoClient.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS "site_credentials_userId_sitePattern_key" ON "site_credentials"("userId", "sitePattern")
  `);
  await tursoClient.execute(`
    CREATE INDEX IF NOT EXISTS "site_credentials_userId_sitePattern_idx" ON "site_credentials"("userId", "sitePattern")
  `);
  console.log("✓ site_credentials table & indexes ready on Turso Cloud!");

  console.log("\n=== Migration Completed! Verifying AutopilotSessions Table... ===");
  const aCols = (await tursoClient.execute('PRAGMA table_info("autopilot_sessions")')).rows;
  console.log("Turso autopilot_sessions columns now:", aCols.map((c) => c.name));

  console.log("\n=== Verifying Profiles Table... ===");
  const pCols = (await tursoClient.execute('PRAGMA table_info("profiles")')).rows;
  console.log("Turso profiles columns now:", pCols.map((c) => c.name));

  const countRes = await tursoClient.execute("SELECT count(*) as count FROM profiles");
  console.log("Total Profiles in Turso:", countRes.rows[0].count);
}

main().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
