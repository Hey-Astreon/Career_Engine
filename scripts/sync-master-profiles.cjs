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
      'Software Developer — Backend & Cloud',
      'ROUSHAN KUMAR',
      'Patna, Bihar, India (Open to Remote)',
      'Indrapuri, North Patel Nagar, Patna, Bihar',
      '',
      '800024',
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
      "Creator & Lead Backend Developer: Built and run distributed scrapers on Oracle Cloud (OCI ARM64) that collect and deduplicate 14,000+ remote jobs daily across 7 platforms.",
      "Cloud Infrastructure: Deployed multi-stage Docker containers on OCI Ampere ARM64 behind Caddy HTTP/3 and Watchtower CI/CD, holding 99.9% uptime and sub-50ms API latency.",
      "Storage & Caching: Designed the data layer across Turso Cloud LibSQL (SQLite WAL) and Redis 7 LRU cache, cutting repeat query latency by 85%."
    ]);

    await client.execute({
      sql: `INSERT INTO projects (id, profileId, title, techStack, liveDemoUrl, githubUrl, architecture, bulletPoints, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [
        randomUUID(),
        roushanId,
        "AstreWork — Autonomous Career Engine & Distributed Harvester",
        "Next.js 16, Python, OCI, Docker, Redis",
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
              noticePeriod = ?, willingnessToRelocate = ?, requiresVisa = ?
          WHERE slug = ?`,
    args: [
      'Software Developer — Full-Stack & AI',
      'AYUSHI RAJ',
      'Bihar, India (Open to Remote)',
      'Mirzapur, Nawada, Bihar',
      '',
      '805110',
      'Bachelor of Computer Applications (BCA)',
      'Female',
      'She/Her',
      'student',
      'remote',
      'Immediate',
      1,
      0,
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
      "Co-Developer & Lead Frontend Architect: Built AstreWork's client-side ATS match engine and Gemini-powered scoring studio in Next.js 16, grading live job posts in under a second.",
      "AstrePilot Chrome Extension (MV3): Created an isolated Shadow-DOM HUD with HMAC-SHA256 token auth that autofills Greenhouse, Lever, and Ashby forms in ~15 seconds.",
      "Workspace & Print Engine: Built the React 19 and Zustand workspace with live resume-audit checks and a single-page A4 print layout with zero layout shift."
    ]);

    await client.execute({
      sql: `INSERT INTO projects (id, profileId, title, techStack, liveDemoUrl, githubUrl, architecture, bulletPoints, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [
        randomUUID(),
        ayushiId,
        "AstreWork — AI Career Platform & AstrePilot Extension",
        "Next.js 16, React 19, Chrome MV3, Gemini API",
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
