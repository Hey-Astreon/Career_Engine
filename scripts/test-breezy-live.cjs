const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testBreezyLive(activeContext = 'roushan') {
  console.log('================================================================');
  console.log(`🧪 LIVE ASTREPILOT TEST ON BREEZY HR (Profile: ${activeContext})`);
  console.log('URL: https://1-glance-inc.breezy.hr/p/9ef34bc35794-full-stack-developer-intern/apply');
  console.log('================================================================\n');

  const extPath = path.resolve(__dirname, '..', 'extension');
  const tmpProfile = `C:\\tmp_astrepilot_breezy_${activeContext}`;

  if (fs.existsSync(tmpProfile)) {
    try { fs.rmSync(tmpProfile, { recursive: true, force: true }); } catch (e) {}
  }

  const context = await chromium.launchPersistentContext(tmpProfile, {
    headless: false,
    viewport: { width: 1440, height: 1100 },
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
  console.log(`✓ Service Worker: ${sw ? 'Active and Running' : 'Fallback'}`);

  // Configure active context in storage
  if (sw) {
    await sw.evaluate(async (ctx) => {
      await chrome.storage.sync.set({ astrepilot_active_context: ctx });
      await chrome.storage.local.set({ astrepilot_active_context: ctx });
    }, activeContext);
  }

  const page = await context.newPage();

  page.on('console', msg => {
    const txt = msg.text();
    if (txt.includes('[AstrePilot]') || txt.includes('Breezy') || txt.includes('Error')) {
      console.log('  [Page Console]:', txt);
    }
  });

  const targetUrl = 'https://1-glance-inc.breezy.hr/p/9ef34bc35794-full-stack-developer-intern/apply';
  console.log(`Navigating to: ${targetUrl}...`);
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(3500);

  // Trigger HUD via Service Worker
  console.log('\n[Trigger 1] Dispatching TOGGLE_HUD via Service Worker...');
  if (sw) {
    const res = await sw.evaluate(async (ctx) => {
      const tabs = await chrome.tabs.query({});
      const targetTab = tabs.find(t => t.url && t.url.includes('breezy.hr'));
      if (!targetTab) return 'no-tab';
      if (ctx) {
        await chrome.storage.sync.set({ astrepilot_active_context: ctx });
        await chrome.storage.local.set({ astrepilot_active_context: ctx });
      }
      return new Promise(resolve => {
        chrome.tabs.sendMessage(targetTab.id, { action: 'TOGGLE_HUD' }, { frameId: 0 }, (resp) => resolve(resp));
      });
    }, activeContext);
    console.log('TOGGLE_HUD response:', res);
  }

  await page.waitForTimeout(3000);

  // Check detected fields via SCAN_FIELDS
  console.log('\n[Field Scan] Querying AstrePilot detected fields with specialized Breezy HR driver...');
  if (sw) {
    const scanRes = await sw.evaluate(async () => {
      const tabs = await chrome.tabs.query({});
      const targetTab = tabs.find(t => t.url && t.url.includes('breezy.hr'));
      return new Promise(resolve => {
        chrome.tabs.sendMessage(targetTab.id, { action: 'SCAN_FIELDS' }, { frameId: 0 }, (resp) => resolve(resp));
      });
    });
    console.log('SCAN_FIELDS response:', JSON.stringify(scanRes, null, 2));
  }

  // Save HUD screenshot to artifacts
  const artifactDir = 'C:\\Users\\Astreon\\.gemini\\antigravity-ide\\brain\\28222883-14ee-4d3c-b571-80fdb5acd836';
  const hudScreenshot = path.join(artifactDir, `breezy_hud_${activeContext}.png`);
  await page.screenshot({ path: hudScreenshot, fullPage: false });
  console.log(`HUD screenshot saved: ${hudScreenshot}`);

  // Trigger AUTOFILL
  console.log('\n[Trigger 2] Dispatching AUTOFILL via Service Worker...');
  if (sw) {
    const fillRes = await sw.evaluate(async () => {
      const tabs = await chrome.tabs.query({});
      const targetTab = tabs.find(t => t.url && t.url.includes('breezy.hr'));
      return new Promise(resolve => {
        chrome.tabs.sendMessage(targetTab.id, { action: 'AUTOFILL' }, { frameId: 0 }, (resp) => resolve(resp));
      });
    });
    console.log('AUTOFILL response:', fillRes);
  }

  console.log('Waiting 22 seconds for typing animations and Angular model sync...');
  await page.waitForTimeout(22000);

  // Form audit
  console.log('\n[Form Audit] Reading live form values on Breezy HR...');
  const audit = await page.evaluate(() => {
    const getVal = (sel) => {
      const el = document.querySelector(sel);
      return el ? { value: el.value, checked: el.checked } : null;
    };
    return {
      cName: getVal('input[name="cName"]'),
      cEmail: getVal('input[name="cEmail"]'),
      cPhoneNumber: getVal('input[name="cPhoneNumber"]'),
      cAddress: getVal('input[name="cAddress"], #fullAddress'),
      smsConsent: getVal('input[name="smsConsent"]'),
      cSummary: getVal('textarea[name="cSummary"]'),
      cCoverLetter: getVal('textarea[name="cCoverLetter"]'),
      honeypot: getVal('input[name*="hp_"], input[id*="hp_"]'),
      resumeFilesCount: (() => {
        const fi = document.querySelector('input#main-attachment, input[name="cResume"]');
        return fi ? (fi.files ? fi.files.length : 0) : 0;
      })()
    };
  });

  console.log('Final Live Audit Result:\n', JSON.stringify(audit, null, 2));

  // Save filled screenshot to artifacts
  const filledScreenshot = path.join(artifactDir, `breezy_filled_${activeContext}.png`);
  await page.screenshot({ path: filledScreenshot, fullPage: true });
  console.log(`Filled screenshot saved: ${filledScreenshot}`);

  await context.close();
  return audit;
}

async function main() {
  console.log('--- TEST RUN 1: ROUSHAN KUMAR ---');
  await testBreezyLive('roushan');
  console.log('\n--- TEST RUN 2: AYUSHI RAJ ---');
  await testBreezyLive('ayushi');
  console.log('\n🎉 ALL BREEZY HR TESTS COMPLETED!');
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
