#!/usr/bin/env node

/**
 * Deploy Antigravity Agent Core to Heroku Container Registry
 * ============================================================
 * Uses the free GitHub Student Developer Pack Heroku credit ($13/mo for 24 months)
 * to deploy an autonomous Python agent gateway to the cloud.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const pythonAgentsDir = path.join(rootDir, 'python_agents');

const APP_NAME = process.env.HEROKU_APP_NAME || 'astrework-agent-core';

function run(cmd, opts = {}) {
  console.log(`\x1b[36m> ${cmd}\x1b[0m`);
  return execSync(cmd, { stdio: 'inherit', cwd: rootDir, ...opts });
}

function runSilent(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf-8', cwd: rootDir }).trim();
  } catch {
    return null;
  }
}

console.log('\n============================================================');
console.log('  🚀 Deploying Antigravity Python Agent Core to Heroku');
console.log('============================================================\n');

// 1. Verify Heroku CLI
const herokuVersion = runSilent('heroku --version');
if (!herokuVersion) {
  console.error('\x1b[31m[ERROR] Heroku CLI is not installed or not in PATH.\x1b[0m');
  console.log('Please install Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli');
  console.log('Then run: heroku login');
  process.exit(1);
}
console.log(`\x1b[32m✔ Detected ${herokuVersion}\x1b[0m\n`);

// 2. Extract GEMINI_API_KEY from .env
let geminiApiKey = process.env.GEMINI_API_KEY;
if (!geminiApiKey) {
  const envPath = path.join(rootDir, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/^GEMINI_API_KEY=(.*)$/m);
    if (match) {
      geminiApiKey = match[1].trim();
    }
  }
}

if (!geminiApiKey) {
  console.warn('\x1b[33m[WARN] GEMINI_API_KEY not found in .env. Remember to set it on Heroku manually.\x1b[0m');
}

// 3. Create or inspect app
console.log(`[1/5] Checking Heroku app: ${APP_NAME}...`);
const appInfo = runSilent(`heroku apps:info --app ${APP_NAME}`);
if (!appInfo) {
  console.log(`Creating new Heroku app: ${APP_NAME}...`);
  run(`heroku apps:create ${APP_NAME}`);
} else {
  console.log(`\x1b[32m✔ App ${APP_NAME} exists\x1b[0m`);
}

// 4. Configure Container Stack
console.log(`\n[2/5] Setting stack to container...`);
run(`heroku stack:set container --app ${APP_NAME}`);

// 5. Set Environment Variables
if (geminiApiKey) {
  console.log(`\n[3/5] Syncing GEMINI_API_KEY to Heroku config...`);
  run(`heroku config:set GEMINI_API_KEY="${geminiApiKey}" --app ${APP_NAME}`);
}

// 6. Build & Push Docker Container
console.log(`\n[4/5] Building and pushing Docker container to Heroku Registry...`);
run(`heroku container:push web --app ${APP_NAME}`, { cwd: pythonAgentsDir });

// 7. Release Container
console.log(`\n[5/5] Releasing container to production...`);
run(`heroku container:release web --app ${APP_NAME}`);

const liveUrl = `https://${APP_NAME}.herokuapp.com`;
console.log('\n============================================================');
console.log(`\x1b[32m✔ Successfully deployed Antigravity Agent Core!\x1b[0m`);
console.log(`  Live URL: \x1b[1m${liveUrl}\x1b[0m`);
console.log(`  Health Check: \x1b[36m${liveUrl}/health\x1b[0m`);
console.log('\nNext steps:');
console.log(`1. Add to your production .env: AGENT_GATEWAY_URL=${liveUrl}`);
console.log(`2. AstreWork and AstrePilot will now use this cloud agent automatically!`);
console.log('============================================================\n');
