/**
 * merge_duplicate_users.mjs
 * 
 * Merges duplicate OAuth users with the same email into one account,
 * links both Google + GitHub providers, and removes Jane Doe profile.
 * 
 * Run: node merge_duplicate_users.mjs
 */

import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const dotenv = require("dotenv");
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isTursoRemote = process.env.TURSO_DATABASE_URL && process.env.TURSO_DATABASE_URL.startsWith("libsql://");

const url = isTursoRemote
  ? process.env.TURSO_DATABASE_URL
  : `file:${path.join(__dirname, "prisma", "dev.db").replace(/\\/g, "/")}`;

const authToken = isTursoRemote ? process.env.TURSO_AUTH_TOKEN : undefined;

console.log(`🔗 Connecting to: ${isTursoRemote ? "Turso Remote (Cloud)" : "Local SQLite"}`);
console.log(`   URL: ${(url || "").substring(0, 60)}`);

const adapter = new PrismaLibSql({ url, authToken });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("\n📊 Step 1: Auditing current state...\n");

  const users = await prisma.user.findMany({
    include: { accounts: true, profile: true, sessions: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${users.length} total users:\n`);
  for (const u of users) {
    console.log(`  User: ${u.id}`);
    console.log(`    Email: ${u.email}`);
    console.log(`    Name: ${u.name}`);
    console.log(`    Providers: ${u.accounts.map((a) => a.provider).join(", ") || "none"}`);
    console.log(`    Profile: ${u.profile ? `"${u.profile.fullName}" (slug: ${u.profile.slug})` : "none"}`);
    console.log(`    Sessions: ${u.sessions.length}`);
    console.log("");
  }

  const allProfiles = await prisma.profile.findMany();
  console.log(`Found ${allProfiles.length} total profiles:`);
  for (const p of allProfiles) {
    console.log(`  "${p.fullName}" | slug: ${p.slug} | email: ${p.email} | userId: ${p.userId || "unlinked"}`);
  }

  // ─────────────────────────────────────────
  // STEP 2: Remove Jane Doe profile
  // ─────────────────────────────────────────
  console.log("\n🗑️  Step 2: Removing Jane Doe profile...\n");

  const janeDoe = await prisma.profile.findFirst({
    where: {
      OR: [
        { fullName: { contains: "Jane" } },
        { slug: "jane-doe" },
      ],
    },
  });

  if (janeDoe) {
    console.log(`  Found: "${janeDoe.fullName}" (id: ${janeDoe.id}, slug: ${janeDoe.slug})`);
    await prisma.profile.delete({ where: { id: janeDoe.id } });
    console.log(`  ✅ Deleted Jane Doe and all related data (cascade)`);
  } else {
    console.log(`  ℹ️  No Jane Doe profile found`);
  }

  // ─────────────────────────────────────────
  // STEP 3: Merge duplicate users by email
  // ─────────────────────────────────────────
  console.log("\n🔀 Step 3: Merging duplicate users by email...\n");

  const freshUsers = await prisma.user.findMany({
    include: { accounts: true, profile: true, sessions: true },
    orderBy: { createdAt: "asc" },
  });

  const emailMap = new Map();
  for (const user of freshUsers) {
    if (!user.email) continue;
    if (!emailMap.has(user.email)) emailMap.set(user.email, []);
    emailMap.get(user.email).push(user);
  }

  let mergeCount = 0;
  for (const [email, dupeUsers] of emailMap.entries()) {
    if (dupeUsers.length <= 1) continue;

    console.log(`  📧 ${email}: ${dupeUsers.length} duplicate accounts → merging!`);

    // Prefer the user with a linked profile as primary; otherwise use oldest
    const primary = dupeUsers.find((u) => u.profile) || dupeUsers[0];
    const duplicates = dupeUsers.filter((u) => u.id !== primary.id);

    console.log(`    → Primary: ${primary.id} [${primary.accounts.map((a) => a.provider).join(", ")}]`);
    console.log(`    → Merging: ${duplicates.map((d) => `${d.id} [${d.accounts.map((a) => a.provider).join(", ")}]`).join(", ")}`);

    for (const dupe of duplicates) {
      console.log(`\n    Processing: ${dupe.id} [${dupe.accounts.map((a) => a.provider).join(", ")}]`);

      // Move OAuth accounts to primary
      for (const acc of dupe.accounts) {
        const alreadyLinked = await prisma.account.findFirst({
          where: { userId: primary.id, provider: acc.provider },
        });
        if (!alreadyLinked) {
          await prisma.account.update({ where: { id: acc.id }, data: { userId: primary.id } });
          console.log(`      ✅ Moved ${acc.provider} OAuth account → primary`);
        } else {
          await prisma.account.delete({ where: { id: acc.id } });
          console.log(`      🗑️  Primary already has ${acc.provider}, deleted duplicate account row`);
        }
      }

      // Move sessions
      if (dupe.sessions.length > 0) {
        await prisma.session.updateMany({ where: { userId: dupe.id }, data: { userId: primary.id } });
        console.log(`      ✅ Moved ${dupe.sessions.length} session(s) → primary`);
      }

      // Handle profile
      if (dupe.profile) {
        if (!primary.profile) {
          await prisma.profile.update({ where: { id: dupe.profile.id }, data: { userId: primary.id } });
          console.log(`      ✅ Re-linked profile "${dupe.profile.fullName}" → primary user`);
        } else {
          console.log(`      ⚠️  Both users have profiles. Keeping primary's: "${primary.profile.fullName}"`);
          await prisma.profile.delete({ where: { id: dupe.profile.id } });
          console.log(`      🗑️  Deleted duplicate profile: "${dupe.profile.fullName}"`);
        }
      }

      // Move alert preferences
      const dupeAlert = await prisma.userAlertPreference.findUnique({ where: { userId: dupe.id } });
      if (dupeAlert) {
        const primaryAlert = await prisma.userAlertPreference.findUnique({ where: { userId: primary.id } });
        if (!primaryAlert) {
          await prisma.userAlertPreference.update({ where: { userId: dupe.id }, data: { userId: primary.id } });
          console.log(`      ✅ Moved alert preferences → primary`);
        } else {
          await prisma.userAlertPreference.delete({ where: { userId: dupe.id } });
          console.log(`      🗑️  Deleted duplicate alert preferences`);
        }
      }

      // Delete duplicate user record
      await prisma.user.delete({ where: { id: dupe.id } });
      console.log(`      ✅ Deleted duplicate user ${dupe.id}`);
      mergeCount++;
    }
  }

  if (mergeCount === 0) {
    console.log("  ℹ️  No duplicates found — database is already clean");
  } else {
    console.log(`\n  ✅ Merged ${mergeCount} duplicate user(s)`);
  }

  // ─────────────────────────────────────────
  // STEP 4: Final state report
  // ─────────────────────────────────────────
  console.log("\n📊 Step 4: Final state after cleanup\n");

  const finalUsers = await prisma.user.findMany({
    include: { accounts: true, profile: true },
  });

  console.log(`Total users: ${finalUsers.length}`);
  for (const u of finalUsers) {
    const providers = u.accounts.map((a) => a.provider).join(" + ") || "no-oauth";
    console.log(`  ✓ ${u.email} | ${providers} | Profile: ${u.profile?.fullName || "none"}`);
  }

  const finalProfiles = await prisma.profile.findMany();
  console.log(`\nTotal profiles: ${finalProfiles.length}`);
  for (const p of finalProfiles) {
    console.log(`  ✓ "${p.fullName}" (slug: ${p.slug}) | userId: ${p.userId || "unlinked"}`);
  }

  console.log("\n✅ Migration complete!\n");
}

main()
  .catch((err) => {
    console.error("\n❌ Error:", err.message || err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
