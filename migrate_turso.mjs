import { createClient } from "@libsql/client";
import "dotenv/config";

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    throw new Error("Missing Turso credentials");
  }

  const client = createClient({
    url,
    authToken,
  });

  const sqls = [
    `CREATE TABLE IF NOT EXISTS "autopilot_sessions" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "profileId" TEXT NOT NULL,
      "company" TEXT,
      "jobTitle" TEXT,
      "jdText" TEXT NOT NULL,
      "tailoredSummary" TEXT NOT NULL,
      "keySkills" TEXT NOT NULL DEFAULT '[]',
      "salaryRange" TEXT,
      "workType" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "autopilot_sessions_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE INDEX IF NOT EXISTS "autopilot_sessions_profileId_idx" ON "autopilot_sessions"("profileId");`,
    `CREATE INDEX IF NOT EXISTS "autopilot_sessions_createdAt_idx" ON "autopilot_sessions"("createdAt");`
  ];

  for (const sql of sqls) {
    console.log("Executing:", sql);
    await client.execute(sql);
  }

  console.log("Migration successful!");
}

main().catch(console.error);
