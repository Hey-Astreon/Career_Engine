import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import os from 'os';

async function verifyAstrePilotLiveChrome() {
  const extensionPath = path.resolve('extension');
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome_astranis_master_'));

  const browserContext = await chromium.launchPersistentContext(userDataDir, {
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    viewport: { width: 1366, height: 960 },
  });

  const page = await browserContext.newPage();
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[AstrePilot]') || text.includes('Pass 2') || text.includes('Error') || text.includes('race') || text.includes('8652804006')) {
      console.log(`[Browser] ${text}`);
    }
  });
  page.on('pageerror', err => console.log(`[PageError] ${err.message}`));
  const url = 'https://job-boards.greenhouse.io/embed/job_app?for=astranis&token=4704598006&jr_id=6ab30c0a326574570a004b90';

  console.log(`[MasterLive] Navigating to: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Inject Extension Scripts
  console.log('[MasterLive] Injecting hud-ui.js and content.js...');
  await page.addStyleTag({ path: path.join(extensionPath, 'hud.css') });
  await page.addScriptTag({ path: path.join(extensionPath, 'hud-ui.js') });
  await page.addScriptTag({ path: path.join(extensionPath, 'content.js') });
  await page.waitForTimeout(1000);

  // Execute AstrePilot Autofill
  console.log('[MasterLive] Triggering and awaiting window.__ASTREPILOT_RUN_AUTOFILL__()...');
  const triggerRes = await page.evaluate(async () => {
    try {
      if (typeof window.__ASTREPILOT_RUN_AUTOFILL__ === 'function') {
        await window.__ASTREPILOT_RUN_AUTOFILL__();
        return { success: true, method: 'window.__ASTREPILOT_RUN_AUTOFILL__' };
      }
      return { success: false, reason: 'window.__ASTREPILOT_RUN_AUTOFILL__ not found' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  console.log('[MasterLive] Trigger Result:', JSON.stringify(triggerRes));

  // Small settle wait for final React state transitions
  console.log('[MasterLive] Waiting 2 seconds for final React state settlement...');
  await page.waitForTimeout(2000);

  // Deep DOM Audit
  const audit = await page.evaluate(() => {
    const getVal = (sel) => {
      const el = document.querySelector(sel);
      return el ? (el.value || el.textContent || '').trim() : 'NOT_FOUND';
    };

    // React-Select comboboxes (De-duplicated by id)
    const seenIds = new Set();
    const comboboxes = [];
    const elements = Array.from(document.querySelectorAll('.select__container, .select, [class*="react-select"]'));

    for (const c of elements) {
      const input = c.querySelector('input');
      const id = input?.id || '';
      if (!id || seenIds.has(id)) continue;
      seenIds.add(id);

      const field = c.closest('.field, .form-group') || c.parentElement;
      const label = field ? (field.querySelector('label')?.textContent || '') : '';
      const single = c.querySelector('.select__single-value, [class*="singleValue"]');
      const placeholder = c.querySelector('.select__placeholder, [class*="placeholder"]');

      comboboxes.push({
        id,
        label: label.trim().replace(/\s+/g, ' ').slice(0, 60),
        singleValue: single ? single.textContent.trim() : null,
        placeholder: placeholder ? placeholder.textContent.trim() : null,
        isVerified: !!(single && single.textContent.trim().length > 0 && !/^(select|choose|\.\.\.)/i.test(single.textContent.trim()))
      });
    }

    // Textareas
    const textareas = Array.from(document.querySelectorAll('textarea')).map(t => {
      const field = t.closest('.field, .form-group') || t.parentElement;
      const label = field ? (field.querySelector('label')?.textContent || '') : '';
      return {
        id: t.id,
        label: label.trim().replace(/\s+/g, ' ').slice(0, 60),
        value: t.value.trim()
      };
    });

    return {
      basic: {
        firstName: getVal('#first_name'),
        lastName: getVal('#last_name'),
        email: getVal('#email'),
        phone: getVal('#phone'),
        linkedin: getVal('#question_8622928006'),
      },
      comboboxes,
      textareas
    };
  });

  console.log('\n================ MASTER DOM AUDIT RESULTS ================');
  console.log('[Basic Fields]:', JSON.stringify(audit.basic, null, 2));
  console.log(`[Comboboxes Total: ${audit.comboboxes.length}]:`);
  audit.comboboxes.forEach((cb, idx) => {
    const icon = cb.isVerified ? '✓' : '✗';
    console.log(`  ${icon} [${idx + 1}] ${cb.id} (${cb.label}): singleValue="${cb.singleValue}" (verified: ${cb.isVerified})`);
  });
  console.log(`\n[Textarea Screening Questions: ${audit.textareas.length}]:`);
  audit.textareas.forEach((ta, idx) => {
    console.log(`  [${idx + 1}] ${ta.label}`);
    console.log(`      Content Preview (${ta.value.length} chars): "${ta.value.slice(0, 140)}..."`);
  });

  // Capture Full Page Screenshot Proof
  const proofPath = path.resolve('live_proof_astrepilot_master_dom.png');
  await page.screenshot({ path: proofPath, fullPage: true });
  console.log(`\n[MasterLive] Full page screenshot saved to: ${proofPath}`);

  // Also capture targeted section screenshots
  const topProofPath = path.resolve('live_proof_top_fields.png');
  await page.screenshot({ path: topProofPath, clip: { x: 0, y: 0, width: 1366, height: 900 } });

  // Copy to Artifact Directory for UI view
  const artifactDir = 'C:\\Users\\playb\\.gemini\\antigravity\\brain\\aac1ae76-3afb-41f1-b191-e45a37b73b21';
  try {
    fs.copyFileSync(proofPath, path.join(artifactDir, 'live_proof_astrepilot_master_dom.png'));
    fs.copyFileSync(topProofPath, path.join(artifactDir, 'live_proof_top_fields.png'));
    console.log('[MasterLive] Successfully copied proof screenshots to artifact directory');
  } catch (copyErr) {
    console.warn('[MasterLive] Artifact copy warning:', copyErr.message);
  }

  await browserContext.close();
}

verifyAstrePilotLiveChrome().catch(console.error);
