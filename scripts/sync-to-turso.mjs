import { createClient } from "@libsql/client";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config();

const localDbPath = path.join(process.cwd(), "prisma", "dev.db");
if (!fs.existsSync(localDbPath)) {
  console.error("Local database file not found at:", localDbPath);
  process.exit(1);
}

const localClient = createClient({
  url: `file:${localDbPath.replace(/\\/g, "/")}`,
});

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl || !tursoToken) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in .env");
  process.exit(1);
}

const tursoClient = createClient({
  url: tursoUrl,
  authToken: tursoToken,
});

async function syncTable(tableName, batchSize = 100) {
  console.log(`\nSyncing table: ${tableName}...`);
  const rowsRes = await localClient.execute(`SELECT * FROM ${tableName}`);
  const rows = rowsRes.rows;
  console.log(`Found ${rows.length} rows in local ${tableName}`);

  if (rows.length === 0) return;

  const columns = rowsRes.columns;
  const placeholders = columns.map(() => "?").join(", ");
  const colNames = columns.map((c) => `"${c}"`).join(", ");
  const sql = `INSERT OR REPLACE INTO ${tableName} (${colNames}) VALUES (${placeholders})`;

  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const batchStatements = chunk.map((row) => ({
      sql,
      args: columns.map((col) => row[col]),
    }));

    await tursoClient.batch(batchStatements, "write");
    process.stdout.write(`  Synced ${Math.min(i + batchSize, rows.length)}/${rows.length} rows\r`);
  }
  console.log(`\nCompleted syncing ${tableName}`);
}

async function main() {
  console.log("=== Syncing Local Database to Turso Cloud ===");
  console.log(`Target Turso: ${tursoUrl}`);

  // Disable FK constraints temporarily during bulk migration
  try {
    await tursoClient.execute("PRAGMA foreign_keys = OFF");
  } catch (e) {
    console.warn("Notice: PRAGMA foreign_keys = OFF skipped:", e.message);
  }

  // Ordered strictly from independent to dependent tables
  const tables = [
    "users",
    "accounts",
    "sessions",
    "verification_tokens",
    "profiles",
    "projects",
    "virtual_experiences",
    "provider_sync_states",
    "provider_endpoint_runs",
    "job_postings",
    "opportunities",
    "job_occurrences",
    "match_scores",
    "resume_variants",
    "applications",
    "scheduler_runs",
    "user_alert_preferences",
  ];

  for (const table of tables) {
    try {
      await syncTable(table);
    } catch (err) {
      console.error(`Error syncing ${table}:`, err.message);
    }
  }

  console.log("\n=== Verifying Turso Cloud Database Counts ===");
  for (const table of ["profiles", "projects", "virtual_experiences", "provider_sync_states", "job_postings", "opportunities", "job_occurrences", "users"]) {
    try {
      const res = await tursoClient.execute(`SELECT count(*) as c FROM ${table}`);
      console.log(`Turso ${table}: ${res.rows[0].c}`);
    } catch (err) {
      console.error(`Error counting ${table}:`, err.message);
    }
  }

  console.log("\nSync to Turso completed successfully!");
}

main().catch((err) => {
  console.error("Fatal sync error:", err);
  process.exit(1);
});
