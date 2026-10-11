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

  console.log("\n=== Migration Completed! Verifying Profiles Table... ===");
  const pCols = (await tursoClient.execute('PRAGMA table_info("profiles")')).rows;
  console.log("Turso profiles columns now:", pCols.map((c) => c.name));

  const countRes = await tursoClient.execute("SELECT count(*) as count FROM profiles");
  console.log("Total Profiles in Turso:", countRes.rows[0].count);
}

main().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
