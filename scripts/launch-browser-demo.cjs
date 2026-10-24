const { chromium } = require('playwright');
const path = require('path');

async function launchLiveDemo() {
  const extPath = path.resolve(__dirname, '..', 'extension');
  const tmpProfile = 'C:\\tmp_astrepilot_live_demo';

  console.log('[1/4] Launching Browser with AstrePilot Extension...');
  const context = await chromium.launchPersistentContext(tmpProfile, {
    headless: false,
    viewport: null,
    args: [
      `--disable-extensions-except=${extPath}`,
      `--load-extension=${extPath}`,
      '--no-sandbox',
      '--start-maximized'
    ]
  });

  // Service worker is available immediately in persistent context
  const sw = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', { timeout: 10000 });
  console.log('✓ AstrePilot Service Worker detected & connected.');

  try {
    // Tab 1: AstreWork Web App
    console.log('[2/4] Opening Tab 1: AstreWork Web App (http://localhost:3000)...');
    const pageAstreWork = context.pages()[0] || await context.newPage();
    await pageAstreWork.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('✓ AstreWork loaded successfully.');

    // Tab 2: Greenhouse Job Application
    console.log('[3/4] Opening Tab 2: Riot Games Greenhouse Job Application...');
    const pageGreenhouse = await context.newPage();
    const targetUrl = 'https://job-boards.greenhouse.io/embed/job_app?for=riotgames&token=8222014&jr_id=6abe86390e027c0f3b3995c3';
    await pageGreenhouse.goto(targetUrl, { waitUntil: 'networkidle', timeout: 45000 });
    console.log('✓ Riot Games application loaded.');

    await pageGreenhouse.bringToFront();
    await pageGreenhouse.waitForTimeout(2000);

    // 4. Trigger AstrePilot HUD and Autofill on Tab 2
    console.log('[4/4] Activating AstrePilot HUD and triggering Autofill...');
    const fillRes = await sw.evaluate(async () => {
      const tabs = await chrome.tabs.query({});
      const ghTab = tabs.find(t => t.url && t.url.includes('greenhouse.io'));
      if (!ghTab) return { error: 'No Greenhouse tab found' };

      // 1. Mount / Toggle HUD
      await new Promise(r => {
        chrome.tabs.sendMessage(ghTab.id, { action: 'TOGGLE_HUD' }, { frameId: 0 }, () => r());
      });

      await new Promise(r => setTimeout(r, 2000));

      // 2. Trigger Autofill
      return new Promise(resolve => {
        chrome.tabs.sendMessage(ghTab.id, { action: 'AUTOFILL' }, { frameId: 0 }, (res) => {
          resolve(res || { status: 'autofilling' });
        });
      });
    });

    console.log('✓ AstrePilot AUTOFILL response:', fillRes);
    console.log('\n======================================================');
    console.log('🚀 LIVE BROWSER IS RUNNING ON YOUR SCREEN!');
    console.log('- Tab 1: AstreWork Web App (http://localhost:3000)');
    console.log('- Tab 2: Riot Games Job Application with AstrePilot HUD in action');
    console.log('The browser window is held open for you to view and interact with.');
    console.log('======================================================\n');

    // Keep process open indefinitely
    await new Promise(() => {});

  } catch (err) {
    console.error('[Error in live demo]', err);
  }
}

launchLiveDemo();
