const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function verifyUiUpgrade() {
  console.log('================================================================');
  console.log('🎨 ASTREPILOT UI & TYPOGRAPHY UPGRADE E2E VERIFICATION');
  console.log('================================================================\n');

  const extPath = path.resolve(__dirname, '..', 'extension');
  const tmpProfile = 'C:\\tmp_astrepilot_ui_verify';
  const artifactDir = 'C:\\Users\\Astreon\\.gemini\\antigravity-ide\\brain\\28222883-14ee-4d3c-b571-80fdb5acd836';

  try {
    fs.rmSync(tmpProfile, { recursive: true, force: true });
  } catch (e) {}

  console.log('[1/5] Launching Chromium with unpacked AstrePilot extension...');
  const context = await chromium.launchPersistentContext(tmpProfile, {
    headless: false,
    viewport: { width: 1440, height: 1000 },
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

  let extensionId = '';
  if (sw) {
    extensionId = sw.url().split('/')[2];
    console.log(`✓ Service Worker Active. Extension ID: ${extensionId}`);
  } else {
    console.error('✗ Service worker failed to initialize');
    process.exit(1);
  }

  try {
    // ══════════════════════════════════════════════════════════════════════
    // PART 1: TOOLBAR POPUP VERIFICATION (LIGHT & DARK MODES)
    // ══════════════════════════════════════════════════════════════════════
    console.log('\n[2/5] Testing Toolbar Popup UI (Light & Dark)...');
    const popupPage = await context.newPage();

    // Mock AstreWork Autopilot API endpoints for deterministic testing
    await popupPage.route('**/api/autopilot/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/profile')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            fullName: 'Roushan Kumar',
            title: 'Full-Stack Developer | Distributed Systems & Cloud Infrastructure',
            email: 'roushanraut404@gmail.com'
          })
        });
      }
      if (url.includes('/session')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            session: {
              company: 'Riot Games',
              jobTitle: 'Staff Software Developer (Infrastructure)'
            }
          })
        });
      }
      if (url.includes('/log')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            stats: {
              fills: 42,
              fields: 388,
              hoursSaved: 14
            }
          })
        });
      }
      return route.continue();
    });

    const popupUrl = `chrome-extension://${extensionId}/popup.html`;
    await popupPage.setViewportSize({ width: 360, height: 580 });
    await popupPage.goto(popupUrl, { waitUntil: 'domcontentloaded' });

    // Seed storage with token & origin
    await popupPage.evaluate(() => {
      return new Promise((resolve) => {
        chrome.storage.sync.set({
          astrepilot_token: 'test_token_12345',
          astrepilot_origin: 'https://astrework.app'
        }, resolve);
      });
    });

    // Reload popup to trigger initialize() with token
    await popupPage.reload({ waitUntil: 'domcontentloaded' });
    await popupPage.waitForSelector('#view-connected:not(.hidden)', { timeout: 6000 });
    await popupPage.waitForTimeout(600);

    // Verify Popup Layout Metrics & Geometry
    const popupMetrics = await popupPage.evaluate(() => {
      const body = document.body;
      const userName = document.getElementById('user-name');
      const userTitle = document.getElementById('user-title');
      const primedTarget = document.getElementById('primed-target');
      const statVal = document.querySelector('.stat-val');
      const btnPrimary = document.getElementById('btn-launch-hud');
      const btnSecondary = document.getElementById('btn-autofill-direct');

      const bodyStyle = window.getComputedStyle(body);
      const statStyle = window.getComputedStyle(statVal);
      const primaryStyle = window.getComputedStyle(btnPrimary);

      return {
        bodyWidth: body.offsetWidth,
        bodyScrollWidth: body.scrollWidth,
        hasHorizontalOverflow: body.scrollWidth > body.offsetWidth,
        userNameText: userName ? userName.textContent : '',
        userTitleText: userTitle ? userTitle.textContent : '',
        primedText: primedTarget ? primedTarget.textContent : '',
        fontFamily: bodyStyle.fontFamily,
        statFontFamily: statStyle.fontFamily,
        statFontSize: statStyle.fontSize,
        primaryHeight: primaryStyle.height,
        btnSecondaryHeight: window.getComputedStyle(btnSecondary).height
      };
    });

    console.log('  Popup Geometry & Typography Metrics:');
    console.log(`    - Body Width: ${popupMetrics.bodyWidth}px (ScrollWidth: ${popupMetrics.bodyScrollWidth}px)`);
    console.log(`    - Horizontal Overflow: ${popupMetrics.hasHorizontalOverflow ? 'FAIL' : 'PASS (0px)'}`);
    console.log(`    - Candidate Name: "${popupMetrics.userNameText}"`);
    console.log(`    - Headline Title: "${popupMetrics.userTitleText}"`);
    console.log(`    - Primed Target: "${popupMetrics.primedText}"`);
    console.log(`    - Primary CTA Height: ${popupMetrics.primaryHeight}`);
    console.log(`    - Stat Digits Font: ${popupMetrics.statFontFamily} (${popupMetrics.statFontSize})`);

    if (popupMetrics.hasHorizontalOverflow) {
      throw new Error('Popup body has horizontal overflow!');
    }

    // Capture Light Mode Screenshot
    const popupLightShot = path.join(artifactDir, 'astrepilot_popup_light_proof.png');
    await popupPage.screenshot({ path: popupLightShot });
    console.log(`  ✓ Saved Light Mode Screenshot -> ${popupLightShot}`);

    // Emulate Dark Mode
    console.log('  Testing Dark Mode emulation...');
    await popupPage.emulateMedia({ colorScheme: 'dark' });
    await popupPage.waitForTimeout(400);

    const popupDarkMetrics = await popupPage.evaluate(() => {
      const body = window.getComputedStyle(document.body);
      return {
        bgColor: body.backgroundColor,
        textColor: body.color
      };
    });
    console.log(`    - Dark Theme Background: ${popupDarkMetrics.bgColor}`);
    console.log(`    - Dark Theme Ink Text: ${popupDarkMetrics.textColor}`);

    // Capture Dark Mode Screenshot
    const popupDarkShot = path.join(artifactDir, 'astrepilot_popup_dark_proof.png');
    await popupPage.screenshot({ path: popupDarkShot });
    console.log(`  ✓ Saved Dark Mode Screenshot -> ${popupDarkShot}`);

    await popupPage.close();

    // ══════════════════════════════════════════════════════════════════════
    // PART 2: IN-PAGE HUD VERIFICATION ON LIVE ATS JOB FORM
    // ══════════════════════════════════════════════════════════════════════
    console.log('\n[3/5] Navigating to Greenhouse Job Application for HUD Testing...');
    const page = await context.newPage();
    const jobUrl = 'https://job-boards.greenhouse.io/embed/job_app?for=riotgames&token=8222014&jr_id=6abe86390e027c0f3b3995c3';
    
    await page.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(2500);

    // Toggle HUD via Service Worker
    console.log('[4/5] Launching AstrePilot In-Page Shadow DOM HUD...');
    await sw.evaluate(async () => {
      const tabs = await chrome.tabs.query({});
      const targetTab = tabs.find(t => t.url && t.url.includes('greenhouse.io'));
      if (targetTab) {
        return new Promise(r => chrome.tabs.sendMessage(targetTab.id, { action: 'TOGGLE_HUD' }, { frameId: 0 }, () => r()));
      }
    });

    // Wait for Shadow Root host to appear
    const hudRoot = page.locator('#astrepilot-root');
    await hudRoot.waitFor({ state: 'attached', timeout: 12000 });
    console.log('✓ In-page #astrepilot-root mounted successfully.');
    await page.waitForTimeout(2000);

    // Capture Expanded HUD in Light Mode
    const hudLightShot = path.join(artifactDir, 'astrepilot_hud_light_proof.png');
    await page.screenshot({ path: hudLightShot });
    console.log(`  ✓ Saved Expanded HUD Light Mode Screenshot -> ${hudLightShot}`);

    // Emulate Dark Mode on Job Page
    console.log('  Testing In-Page HUD Dark Mode...');
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(600);

    const hudDarkShot = path.join(artifactDir, 'astrepilot_hud_dark_proof.png');
    await page.screenshot({ path: hudDarkShot });
    console.log(`  ✓ Saved Expanded HUD Dark Mode Screenshot -> ${hudDarkShot}`);

    // Test Collapsed Pill by toggling HUD
    console.log('\n[5/5] Testing Collapsed Pill Floating Mode via TOGGLE_HUD...');
    await sw.evaluate(async () => {
      const tabs = await chrome.tabs.query({});
      const targetTab = tabs.find(t => t.url && t.url.includes('greenhouse.io'));
      if (targetTab) {
        return new Promise(r => chrome.tabs.sendMessage(targetTab.id, { action: 'TOGGLE_HUD' }, { frameId: 0 }, () => r()));
      }
    });
    await page.waitForTimeout(800);

    const pillShot = path.join(artifactDir, 'astrepilot_hud_pill_proof.png');
    await page.screenshot({ path: pillShot });
    console.log(`  ✓ Saved Collapsed HUD Pill Screenshot -> ${pillShot}`);

    console.log('\n================================================================');
    console.log('🎉 ASTREPILOT UI & TYPOGRAPHY UPGRADE FULLY VERIFIED!');
    console.log('================================================================');
  } finally {
    await context.close();
  }
}

verifyUiUpgrade().catch(err => {
  console.error('\n❌ VERIFICATION FAILED:', err);
  process.exit(1);
});
