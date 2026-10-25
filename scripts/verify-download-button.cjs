const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testAstrePilotDownloadButton() {
  console.log('================================================================');
  console.log('🧪 ASTREPILOT RESUME DOWNLOAD BUTTON LIVE VERIFICATION');
  console.log('================================================================\n');

  const extPath = path.resolve(__dirname, '..', 'extension');
  const tmpProfile = 'C:\\tmp_astrepilot_download_verify';

  // Clean tmpProfile
  try {
    fs.rmSync(tmpProfile, { recursive: true, force: true });
  } catch (e) {}

  console.log('[1/4] Launching Chromium with AstrePilot Unpacked Extension...');
  const context = await chromium.launchPersistentContext(tmpProfile, {
    headless: false,
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
    args: [
      `--disable-extensions-except=${extPath}`,
      `--load-extension=${extPath}`,
      '--no-sandbox'
    ]
  });

  let sw = context.serviceWorkers()[0];
  if (!sw) {
    try {
      sw = await context.waitForEvent('serviceworker', { timeout: 8000 });
    } catch (e) {
      sw = context.serviceWorkers()[0];
    }
  }
  console.log(`✓ Extension Service Worker: ${sw ? 'Active' : 'Fallback'}`);

  try {
    const page = await context.newPage();
    page.on('console', msg => {
      const txt = msg.text();
      if (txt.includes('[AstrePilot]') || txt.includes('Error') || txt.includes('Download') || txt.includes('download')) {
        console.log('  [Page Console]:', txt);
      }
    });

    const targetUrl = 'https://job-boards.greenhouse.io/embed/job_app?for=riotgames&token=8222014&jr_id=6abe86390e027c0f3b3995c3';
    console.log(`[2/4] Navigating to: ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(3000);

    // Toggle HUD
    console.log('[3/4] Mounting AstrePilot HUD...');
    if (sw) {
      await sw.evaluate(async () => {
        const tabs = await chrome.tabs.query({});
        const ghTab = tabs.find(t => t.url && t.url.includes('greenhouse.io'));
        if (!ghTab) return;
        return new Promise(r => chrome.tabs.sendMessage(ghTab.id, { action: 'TOGGLE_HUD' }, { frameId: 0 }, () => r()));
      });
    }
    await page.waitForTimeout(3000);

    // Verify HUD is mounted
    const hudHost = page.locator('#astrepilot-root');
    await hudHost.waitFor({ state: 'attached', timeout: 10000 });
    console.log('✓ AstrePilot HUD Root (#astrepilot-root) mounted successfully');

    // Setup download listener before clicking
    console.log('[4/4] Triggering Download Resume Action in AstrePilot Top Frame...');
    const downloadPromise = page.waitForEvent('download', { timeout: 25000 });

    const actionStatus = await sw.evaluate(async () => {
      const tabs = await chrome.tabs.query({});
      const ghTab = tabs.find(t => t.url && t.url.includes('greenhouse.io'));
      if (!ghTab) return 'no-tab';
      return new Promise(r => {
        chrome.tabs.sendMessage(ghTab.id, { action: 'DOWNLOAD_RESUME' }, { frameId: 0 }, (res) => r(res));
      });
    });
    console.log('Action dispatch status:', actionStatus);

    const download = await downloadPromise;
    const filename = download.suggestedFilename();
    console.log(`\n🎉 BROWSER DOWNLOAD CAPTURED SUCCESSFULLY!`);
    console.log(`  - Suggested Filename: ${filename}`);

    const savePath = path.resolve('C:\\tmp_astrepilot_download_verify', filename);
    await download.saveAs(savePath);
    const stats = fs.statSync(savePath);
    console.log(`  - Saved to disk at:   ${savePath}`);
    console.log(`  - File Size:          ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB)`);

    const isPdf = filename.toLowerCase().endsWith('.pdf') && stats.size > 10000;
    console.log(`\n----------------------------------------------------------------`);
    console.log(`Download Verification: ${isPdf ? '✅ PASSED (Valid PDF Downloaded)' : '❌ FAILED'}`);
    console.log(`----------------------------------------------------------------`);

    // Screenshot proof
    const proofPath = 'C:\\Users\\Astreon\\.gemini\\antigravity-ide\\brain\\28222883-14ee-4d3c-b571-80fdb5acd836\\astrepilot_download_verified_proof.png';
    await page.screenshot({ path: proofPath });
    console.log(`📸 Proof screenshot saved to:\n   ${proofPath}`);

    await context.close();
    process.exit(isPdf ? 0 : 1);
  } catch (err) {
    console.error('❌ Download test failed:', err);
    await context.close();
    process.exit(1);
  }
}

testAstrePilotDownloadButton();
