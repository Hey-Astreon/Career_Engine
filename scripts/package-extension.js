const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const extDir = path.join(__dirname, '..', 'extension');
const outDir = path.join(__dirname, '..', 'public', 'downloads');
const strideZipFile = path.join(outDir, 'stridepilot-extension.zip');
const astreZipFile = path.join(outDir, 'astrepilot-extension.zip');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log('[StridePilot] Packaging extension from:', extDir);

try {
  if (process.platform === 'win32') {
    execSync(`powershell -NoProfile -Command "$ProgressPreference = 'SilentlyContinue'; Compress-Archive -Path '${extDir}\\*' -DestinationPath '${strideZipFile}' -Force"`, { stdio: 'inherit' });
  } else {
    execSync(`cd "${extDir}" && zip -r "${strideZipFile}" ./*`, { stdio: 'inherit' });
  }
  fs.copyFileSync(strideZipFile, astreZipFile);
  const stats = fs.statSync(strideZipFile);
  console.log(`[StridePilot] Successfully created stridepilot-extension.zip and astrepilot-extension.zip (${(stats.size / 1024).toFixed(1)} KB)`);
} catch (err) {
  if (fs.existsSync(strideZipFile) || fs.existsSync(astreZipFile)) {
    console.warn('[StridePilot] Packaging warning, but existing pre-packaged zip found. Continuing build.');
  } else {
    console.error('[StridePilot] Packaging failed:', err);
    process.exit(1);
  }
}
