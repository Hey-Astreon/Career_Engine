const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const extDir = path.join(__dirname, '..', 'studypilot');
const outDir = path.join(__dirname, '..', 'public', 'downloads');
const studyZipFile = path.join(outDir, 'studypilot-extension.zip');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log('[StudyPilot] Packaging extension from:', extDir);

try {
  if (process.platform === 'win32') {
    execSync(`powershell -NoProfile -Command "$ProgressPreference = 'SilentlyContinue'; Compress-Archive -Path '${extDir}\\*' -DestinationPath '${studyZipFile}' -Force"`, { stdio: 'inherit' });
  } else {
    execSync(`cd "${extDir}" && zip -r "${studyZipFile}" ./*`, { stdio: 'inherit' });
  }
  const stats = fs.statSync(studyZipFile);
  console.log(`[StudyPilot] Successfully created studypilot-extension.zip (${(stats.size / 1024).toFixed(1)} KB)`);
} catch (err) {
  if (fs.existsSync(studyZipFile)) {
    console.warn('[StudyPilot] Packaging warning, but existing pre-packaged zip found.');
  } else {
    console.error('[StudyPilot] Packaging failed:', err);
    process.exit(1);
  }
}
