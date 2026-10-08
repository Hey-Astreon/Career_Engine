/**
 * cleanup_test_users.mjs
 * Removes all test/diagnostic users that are not real accounts.
 *
 * SAFE BY DEFAULT: runs as a dry run and only reports what it would delete.
 * Pass --confirm to actually delete.
 *
 *   node cleanup_test_users.mjs            # dry run
 *   node cleanup_test_users.mjs --confirm  # really delete
 */

import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const dotenv = require("dotenv");
dotenv.config();

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
const confirm = process.argv.includes("--confirm");

if (!url) {
  console.error("❌ TURSO_DATABASE_URL is not set — refusing to run.");
  process.exit(1);
}

const adapter = new PrismaLibSql({ url, authToken });
const prisma = new PrismaClient({ adapter });

async function main() {
  // These are test/diagnostic users to remove
  const testEmails = [
    "test_cli_1@example.com",
    "test_cli_3@example.com",
    "test_onboard_999@example.com",
    "test.jane.999@example.com",
    "diagnostics-1790311567738@astrework.com",
  ];

  console.log(`🎯 Target database: ${url}`);
  console.log(
    confirm
      ? "⚠️  --confirm given: users WILL be deleted.\n"
      : "🔍 DRY RUN: nothing will be deleted. Re-run with --confirm to delete.\n"
  );
  console.log("🗑️  Cleaning up test/diagnostic users...\n");

  let failures = 0;

  for (const email of testEmails) {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        include: { profile: true, accounts: true, sessions: true },
      });

      if (!user) {
        console.log(`  ⏭️  ${email} — not found, skipping`);
        continue;
      }

      console.log(`  🗑️  ${confirm ? "Deleting" : "Would delete"}: ${email} | name: ${user.name} | profile: ${user.profile?.fullName || "none"}`);
      if (!confirm) continue;

      // Cascade delete handles profile, accounts, sessions, alertPreferences (onDelete: Cascade in schema)
      await prisma.user.delete({ where: { id: user.id } });
      console.log(`     ✅ Deleted user (+ profile, accounts, sessions via cascade)`);
    } catch (e) {
      failures++;
      console.error(`     ❌ Failed for ${email}: ${e.message}`);
    }
  }

  console.log("\n📊 Final state:\n");

  const users = await prisma.user.findMany({
    include: { accounts: true, profile: true },
  });

  console.log(`Total users: ${users.length}`);
  for (const u of users) {
    const providers = u.accounts.map((a) => a.provider).join(" + ") || "email/password";
    console.log(`  ✓ ${u.email} | ${providers} | Profile: ${u.profile?.fullName || "none"}`);
  }

  const profiles = await prisma.profile.findMany();
  console.log(`\nTotal profiles: ${profiles.length}`);
  for (const p of profiles) {
    console.log(`  ✓ "${p.fullName}" (slug: ${p.slug}) | email: ${p.email} | linked: ${p.userId ? "yes" : "no"}`);
  }

  if (failures > 0) {
    console.error(`\n❌ Finished with ${failures} failure(s).\n`);
    process.exitCode = 1;
  } else {
    console.log(confirm ? "\n✅ Cleanup complete!\n" : "\n✅ Dry run complete. Nothing was changed.\n");
  }
}

main()
  .catch((e) => { console.error("❌", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
