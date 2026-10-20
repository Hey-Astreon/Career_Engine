// scripts/verify-turso.cjs
const fs = require('fs');
const { createClient } = require('@libsql/client');

function tryExtractUrl(s) {
  if (!s) return null;
  let str = String(s).trim();
  str = str.replace(/^[A-Za-z0-9_]+=\s*/, '');
  str = str.replace(/^['"`]+|['"`]+$/g, '').trim();

  // If it starts with eyJ (JWT auth token), it is definitely NOT a URL
  if (str.startsWith('eyJ') || /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(str)) {
    return null;
  }

  const match = str.match(/(?:libsql|https?):\/\/[^\s"'`]+/);
  if (match) {
    let clean = match[0];
    if (clean.startsWith('https://')) clean = 'libsql://' + clean.slice(8);
    if (clean.startsWith('http://')) clean = 'libsql://' + clean.slice(7);
    return clean;
  }

  const tursoMatch = str.match(/[a-zA-Z0-9_.-]+\.turso\.io[^\s"'`]*/);
  if (tursoMatch) {
    return 'libsql://' + tursoMatch[0];
  }

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(str)) {
    return str;
  }
  return null;
}

function tryExtractToken(s) {
  if (!s) return null;
  let str = String(s).trim();
  str = str.replace(/^[A-Za-z0-9_]+=\s*/, '');
  str = str.replace(/^['"`]+|['"`]+$/g, '').trim();

  const jwtMatch = str.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  if (jwtMatch) return jwtMatch[0];

  // If it looks like a URL or hostname, it is NOT an auth token
  if (str.includes('.turso.io') || str.startsWith('libsql://') || str.startsWith('http')) {
    return null;
  }

  return str || null;
}

function resolveTursoCredentials(inputs) {
  let url = null;
  let token = null;

  for (const item of inputs) {
    if (!url) url = tryExtractUrl(item);
    if (!token) token = tryExtractToken(item);
  }

  return { url, token };
}

async function verify() {
  const inputs = [
    process.env.RAW_TURSO_URL,
    process.env.RAW_TURSO_TOKEN,
    process.env.TURSO_DATABASE_URL,
    process.env.TURSO_AUTH_TOKEN,
    process.env.DATABASE_URL
  ].filter(Boolean);

  console.log(`[Turso Preflight] Processing ${inputs.length} secret inputs...`);

  const { url: cleanUrl, token: cleanToken } = resolveTursoCredentials(inputs);

  if (!cleanUrl) {
    console.error('::error::Could not resolve a valid Turso Database URL from repository secrets!');
    console.error('Please configure TURSO_DATABASE_URL in repository Settings -> Secrets and variables -> Actions');
    process.exit(1);
  }

  if (!cleanToken) {
    console.error('::error::Could not resolve a valid Turso Auth Token from repository secrets!');
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
  console.log(`🔐 Successfully Resolved Turso Cloud URL: ${maskedUrl}`);
  console.log(`🔑 Successfully Resolved Turso Cloud Token: eyJ... (length: ${cleanToken.length})`);

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
