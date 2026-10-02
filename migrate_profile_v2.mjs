import { createClient } from "@libsql/client";
import { config } from "dotenv";
config({ path: [".env.local", ".env"] });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const migrations = [
  `ALTER TABLE profiles ADD COLUMN careerStage TEXT`,
  `ALTER TABLE profiles ADD COLUMN yearsOfExperience INTEGER`,
  `ALTER TABLE profiles ADD COLUMN workType TEXT`,
  `ALTER TABLE profiles ADD COLUMN salaryRange TEXT`,
  `ALTER TABLE profiles ADD COLUMN workAuthorized INTEGER DEFAULT 1`,
  `ALTER TABLE profiles ADD COLUMN requiresVisa INTEGER DEFAULT 0`,
  `ALTER TABLE profiles ADD COLUMN targetCountries TEXT DEFAULT '[]'`,
  `ALTER TABLE profiles ADD COLUMN primarySkills TEXT DEFAULT '[]'`,
];

for (const sql of migrations) {
  const col = sql.split("COLUMN ")[1];
  try {
    await client.execute(sql);
    console.log(`✅ Added: ${col}`);
  } catch (e) {
    if (e.message?.includes("duplicate column")) {
      console.log(`⏭  Already exists: ${col}`);
    } else {
      console.error(`❌ Error on [${col}]:`, e.message);
    }
  }
}

console.log("\n✅ Profile V2 migration complete.");
