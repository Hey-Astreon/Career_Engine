const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const extDir = path.join(__dirname, '..', 'extension');
const outDir = path.join(__dirname, '..', 'public', 'downloads');
const zipFile = path.join(outDir, 'astrepilot-extension.zip');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log('[AstrePilot] Packaging extension from:', extDir);

try {
  if (process.platform === 'win32') {
    execSync(`powershell -Command "Compress-Archive -Path '${extDir}\\*' -DestinationPath '${zipFile}' -Force"`, { stdio: 'inherit' });
  } else {
    execSync(`cd "${extDir}" && zip -r "${zipFile}" ./*`, { stdio: 'inherit' });
  }
  const stats = fs.statSync(zipFile);
  console.log(`[AstrePilot] Successfully created astrepilot-extension.zip (${(stats.size / 1024).toFixed(1)} KB)`);
} catch (err) {
  console.error('[AstrePilot] Packaging failed:', err);
  process.exit(1);
}
