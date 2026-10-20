// scripts/verify-turso.cjs
const fs = require('fs');
const { createClient } = require('@libsql/client');

function extractUrl(raw) {
  if (!raw) return null;
  const str = String(raw);
  const match = str.match(/(?:libsql|https?):\/\/[^\s"'`]+/);
  if (!match) return null;
  let clean = match[0];
  if (clean.startsWith('https://')) {
    clean = 'libsql://' + clean.slice(8);
  } else if (clean.startsWith('http://')) {
    clean = 'libsql://' + clean.slice(7);
  }
  return clean;
}

function extractToken(raw) {
  if (!raw) return null;
  const str = String(raw);
  const jwtMatch = str.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  if (jwtMatch) return jwtMatch[0];
  const cleaned = str.trim().replace(/^[\r\n'"]+|[\r\n'"]+$/g, '').trim();
  return cleaned || null;
}

async function verify() {
  const rawUrl = process.env.RAW_TURSO_URL || process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  const rawToken = process.env.RAW_TURSO_TOKEN || process.env.TURSO_AUTH_TOKEN;

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
