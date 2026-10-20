// scripts/verify-turso.cjs
const fs = require('fs');
const { createClient } = require('@libsql/client');

function extractUrl(raw) {
  if (!raw) return null;
  let str = String(raw).trim();
  // Strip TURSO_DATABASE_URL= or DATABASE_URL= prefix if present
  str = str.replace(/^[A-Za-z0-9_]+=\s*/, '');
  // Strip surrounding quotes/backticks
  str = str.replace(/^['"`]+|['"`]+$/g, '').trim();

  // 1. Check if contains full URL with scheme (libsql://, https://, http://)
  const match = str.match(/(?:libsql|https?):\/\/[^\s"'`]+/);
  if (match) {
    let clean = match[0];
    if (clean.startsWith('https://')) clean = 'libsql://' + clean.slice(8);
    if (clean.startsWith('http://')) clean = 'libsql://' + clean.slice(7);
    return clean;
  }

  // 2. Check if it is a turso hostname (e.g. astrework-db-hey-astreon.aws-ap-south-1.turso.io)
  const tursoMatch = str.match(/[a-zA-Z0-9_.-]+\.turso\.io[^\s"'`]*/);
  if (tursoMatch) {
    return 'libsql://' + tursoMatch[0];
  }

  // 3. Any standard URI scheme (e.g. wss://, file:)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(str)) {
    return str;
  }

  return null;
}

function extractToken(raw) {
  if (!raw) return null;
  let str = String(raw).trim();
  // Strip TURSO_AUTH_TOKEN= prefix if present
  str = str.replace(/^[A-Za-z0-9_]+=\s*/, '');
  // Strip surrounding quotes/backticks
  str = str.replace(/^['"`]+|['"`]+$/g, '').trim();

  // Extract JWT if present
  const jwtMatch = str.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  if (jwtMatch) return jwtMatch[0];

  return str || null;
}

async function verify() {
  const rawUrl = process.env.RAW_TURSO_URL || process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  const rawToken = process.env.RAW_TURSO_TOKEN || process.env.TURSO_AUTH_TOKEN;

  console.log(`[Turso Preflight] Raw URL received: ${rawUrl ? `length=${rawUrl.length}` : 'EMPTY'}`);
  console.log(`[Turso Preflight] Raw Token received: ${rawToken ? `length=${rawToken.length}` : 'EMPTY'}`);

  const cleanUrl = extractUrl(rawUrl);
  const cleanToken = extractToken(rawToken);

  if (!cleanUrl) {
    console.error('::error::TURSO_DATABASE_URL secret is missing or does not contain a valid URL in GitHub Repository Secrets!');
    console.error('Please configure TURSO_DATABASE_URL in repository Settings -> Secrets and variables -> Actions');
    process.exit(1);
  }

  if (!cleanToken) {
    console.error('::error::TURSO_AUTH_TOKEN secret is missing or empty in GitHub Repository Secrets!');
    console.error('Please configure TURSO_AUTH_TOKEN in repository Settings -> Secrets and variables -> Actions');
    process.exit(1);
  }

  // Export to GITHUB_ENV if running in GitHub Actions CI
  if (process.env.GITHUB_ENV) {
    fs.appendFileSync(
      process.env.GITHUB_ENV,
      `TURSO_DATABASE_URL=${cleanUrl}\nDATABASE_URL=${cleanUrl}\nTURSO_AUTH_TOKEN=${cleanToken}\n`
    );
  }

  // Also expose to current process env for subsequent in-process calls
  process.env.TURSO_DATABASE_URL = cleanUrl;
  process.env.DATABASE_URL = cleanUrl;
  process.env.TURSO_AUTH_TOKEN = cleanToken;

  const maskedUrl = cleanUrl.replace(/:\/\/.*@/, '://***@');
  console.log(`🔐 Extracted Turso Cloud URL: ${maskedUrl}`);

  try {
    const client = createClient({ url: cleanUrl, authToken: cleanToken });
    const res = await client.execute('SELECT count(*) as count FROM opportunities');
    const count = res.rows[0].count;
    console.log(`✅ Turso Cloud Connected & Verified: Schema is intact with ${count} existing opportunities.`);
  } catch (err) {
    console.error('❌ Turso Cloud Preflight Verification Failed:', err.message);
    process.exit(1);
  }
}

verify();
