// scripts/sync-master-profiles.cjs
const { createClient } = require('@libsql/client');
const { randomUUID } = require('crypto');
require('dotenv').config();

function resolveTursoCredentials() {
  const inputs = [
    process.env.TURSO_DATABASE_URL,
    process.env.TURSO_AUTH_TOKEN,
    process.env.DATABASE_URL
  ].filter(Boolean);

  let url = null;
  let token = null;

  for (const item of inputs) {
    let str = String(item).trim().replace(/^[A-Za-z0-9_]+=\s*/, '').replace(/^['"`]+|['"`]+$/g, '').trim();

    if (!url && !str.startsWith('eyJ') && !/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(str)) {
      const match = str.match(/(?:libsql|https?):\/\/[^\s"'`]+/);
      if (match) {
        let clean = match[0];
        if (clean.startsWith('https://')) clean = 'libsql://' + clean.slice(8);
        if (clean.startsWith('http://')) clean = 'libsql://' + clean.slice(7);
        url = clean;
      } else {
        const tursoMatch = str.match(/[a-zA-Z0-9_.-]+\.turso\.io[^\s"'`]*/);
        if (tursoMatch) url = 'libsql://' + tursoMatch[0];
        else if (str.startsWith('libsql://') || str.startsWith('wss://')) url = str;
      }
    }

    if (!token) {
      const jwtMatch = str.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
      if (jwtMatch) token = jwtMatch[0];
      else if (!str.includes('.turso.io') && !str.startsWith('libsql://') && !str.startsWith('http')) token = str;
    }
  }

  return { url, token };
}

async function run() {
  const { url, token } = resolveTursoCredentials();
  if (!url || !token) {
    console.error('Missing Turso credentials. Check TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in environment.');
    process.exit(1);
  }

  console.log(`Connecting to Turso: ${url.replace(/:\/\/.*@/, '://***@')}`);
  const client = createClient({ url, authToken: token });

  // 1. Update Roushan Profile
  console.log('Syncing Roushan Kumar profile...');
  await client.execute({
    sql: `UPDATE profiles 
          SET title = ?, fullName = ?, location = ?, streetAddress = ?, apartment = ?, zipCode = ?,
              highestEducation = ?, gender = ?, pronouns = ?, careerStage = ?, workType = ?,
              noticePeriod = ?, willingnessToRelocate = ?
          WHERE slug = ?`,
    args: [
      'Full-Stack Developer | Distributed Systems & Cloud Infrastructure',
      'ROUSHAN KUMAR',
      'Patna, Bihar, India',
      'Kankarbagh, Patna',
      'Flat 204',
      '800020',
      'Bachelor of Computer Applications (BCA)',
      'Male',
      'He/Him',
      'student',
      'remote',
      'Immediate',
      1,
      'roushan'
    ]
  });

  const roushanRow = await client.execute({
    sql: `SELECT id FROM profiles WHERE slug = ?`,
    args: ['roushan']
  });

  if (roushanRow.rows.length > 0) {
    const roushanId = roushanRow.rows[0].id;
    // Remove old IDBI FinSync or AstreWork if exists to avoid duplicates
    await client.execute({
      sql: `DELETE FROM projects WHERE profileId = ? AND (title LIKE '%IDBI%' OR title LIKE '%AstreWork%')`,
      args: [roushanId]
    });

    const roushanAstreWorkBullets = JSON.stringify([
      "Creator & Lead Backend Developer: Engineered distributed scrapers on Oracle Cloud (OCI ARM64) aggregating 14,000+ remote opportunities daily across 7 platforms with 0% duplication.",
      "Cloud Infrastructure & Microservices: Deployed on Oracle Cloud (OCI Ampere ARM64) within multi-stage Docker containers managed by Watchtower CI/CD and Caddy HTTP/3 reverse proxy with automated SSL, maintaining 99.9% uptime and sub-50ms global API latency.",
      "Distributed Caching & Concurrency: Architected data persistence across Turso Cloud LibSQL (distributed SQLite WAL) and Redis 7 LRU caching, cutting duplicate job ingestion to 0% and reducing repeated query latency by 85%."
    ]);

    await client.execute({
      sql: `INSERT INTO projects (id, profileId, title, techStack, liveDemoUrl, githubUrl, architecture, bulletPoints, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [
        randomUUID(),
        roushanId,
        "AstreWork — Autonomous Career Intelligence Engine & Distributed Harvester (OCI, Docker, Redis)",
        "Next.js 16, TypeScript, Python, Playwright, Puppeteer, Selenium, Turso LibSQL, Redis 7, Oracle Cloud (OCI), Docker, Caddy",
        "https://astrework.app",
        "https://github.com/Hey-Astreon/Career_Engine",
        "Distributed multi-provider job harvesting engine on Oracle Cloud running containerized headless scrapers with Redis caching and Turso LibSQL WAL persistence.",
        roushanAstreWorkBullets
      ]
    });
    console.log('✅ Roushan Kumar profile and AstreWork project synced in Turso Cloud.');
  }

  // 2. Update Ayushi Profile
  console.log('Syncing Ayushi Raj profile...');
  await client.execute({
    sql: `UPDATE profiles 
          SET title = ?, fullName = ?, location = ?, streetAddress = ?, apartment = ?, zipCode = ?,
              highestEducation = ?, gender = ?, pronouns = ?, careerStage = ?, workType = ?,
              noticePeriod = ?, willingnessToRelocate = ?
          WHERE slug = ?`,
    args: [
      'Full-Stack Developer | AI Systems & Interactive Web Applications',
      'AYUSHI RAJ',
      'Patna, Bihar, India',
      'Boring Road, Patna',
      '',
      '800001',
      'Bachelor of Computer Applications (BCA)',
      'Female',
      'She/Her',
      'student',
      'remote',
      'Immediate',
      1,
      'ayushi'
    ]
  });

  const ayushiRow = await client.execute({
    sql: `SELECT id FROM profiles WHERE slug = ?`,
    args: ['ayushi']
  });

  if (ayushiRow.rows.length > 0) {
    const ayushiId = ayushiRow.rows[0].id;
    // Remove old IDBI FinSync or AstreWork if exists
    await client.execute({
      sql: `DELETE FROM projects WHERE profileId = ? AND (title LIKE '%IDBI%' OR title LIKE '%AstreWork%')`,
      args: [ayushiId]
    });

    const ayushiAstreWorkBullets = JSON.stringify([
      "Co-Developer & Lead Frontend Architect: Engineered client-side ATS match engine and Gemini-powered scoring studio on Next.js 16, achieving sub-second evaluation across live postings.",
      "AstrePilot Chrome Extension (Manifest V3): Built a cross-browser extension with an isolated glassmorphic Shadow-DOM HUD and HMAC-SHA256 token authorization, executing 1-click ATS application autofill across Greenhouse, Lever, and Ashby in ~15 seconds per application.",
      "High-Density Reactive UI Architecture: Engineered a responsive, accessible workspace in Next.js 16 App Router and React 19 with Zustand state management, real-time ATS audit checklists, and print-perfect A4 CSS layout rendering with zero layout shift."
    ]);

    await client.execute({
      sql: `INSERT INTO projects (id, profileId, title, techStack, liveDemoUrl, githubUrl, architecture, bulletPoints, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [
        randomUUID(),
        ayushiId,
        "AstreWork — Autonomous Career Platform & AstrePilot Extension (Next.js 16, Chrome MV3, Gemini API)",
        "Next.js 16, React 19, TypeScript, Google Gemini API, Chrome Extension (Manifest V3), Turso LibSQL, Redis 7, TailwindCSS",
        "https://astrework.app",
        "https://github.com/Silenttears-cloud/Career_Engine",
        "Intelligent candidate matching engine and AstrePilot Chrome Extension (MV3) with isolated Shadow DOM HUD and HMAC-SHA256 authorization.",
        ayushiAstreWorkBullets
      ]
    });
    console.log('✅ Ayushi Raj profile and AstreWork project synced in Turso Cloud.');
  }

  // Verification count
  const pCount = await client.execute(`SELECT count(*) as count FROM projects WHERE title LIKE '%AstreWork%'`);
  console.log(`🎉 Master Profile Sync Verified! Total AstreWork project rows in DB: ${pCount.rows[0].count}`);
}

run().catch((err) => {
  console.error('Error during profile sync:', err);
  process.exit(1);
});
