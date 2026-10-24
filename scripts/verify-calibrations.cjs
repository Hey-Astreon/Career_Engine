const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function verifyCalibrations() {
  const extPath = path.resolve(__dirname, '..', 'extension');
  const tmpProfile = 'C:\\tmp_astrepilot_verify_calibrations';

  console.log('[1/4] Launching Browser with updated AstrePilot Extension...');
  const context = await chromium.launchPersistentContext(tmpProfile, {
    headless: false,
    viewport: { width: 1400, height: 1200 },
    args: [
      `--disable-extensions-except=${extPath}`,
      `--load-extension=${extPath}`,
      '--no-sandbox'
    ]
  });

  let sw = context.serviceWorkers()[0];
  if (!sw) {
    try {
      sw = await context.waitForEvent('serviceworker', { timeout: 7000 });
    } catch (e) {
      sw = context.serviceWorkers()[0];
    }
  }
  console.log('✓ Extension Service Worker:', sw ? 'Active' : 'Using direct page evaluation');

  try {
    const page = await context.newPage();
    const targetUrl = 'https://job-boards.greenhouse.io/embed/job_app?for=riotgames&token=8222014&jr_id=6abe86390e027c0f3b3995c3';
    console.log('[2/4] Navigating to Riot Games job application...');
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(3000);

    console.log('[3/4] Triggering AstrePilot Autofill via Extension Service Worker...');
    await sw.evaluate(async () => {
      const tabs = await chrome.tabs.query({});
      const ghTab = tabs.find(t => t.url && t.url.includes('greenhouse.io'));
      if (!ghTab) return;

      await new Promise(r => {
        chrome.tabs.sendMessage(ghTab.id, { action: 'TOGGLE_HUD' }, { frameId: 0 }, () => r());
      });
      await new Promise(r => setTimeout(r, 1500));
      return new Promise(resolve => {
        chrome.tabs.sendMessage(ghTab.id, { action: 'AUTOFILL' }, { frameId: 0 }, (res) => resolve(res));
      });
    });

    // Wait for full autofill sequence to complete
    console.log('Waiting for autofill sequence to finish (24s)...');
    await page.waitForTimeout(24000);

    console.log('[4/4] Verifying the 9 Calibrated Fields...');
    const results = await page.evaluate(() => {
      const getSingleVal = (selector) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const container = el.closest('.select-shell') || el.closest('[class*="select"]');
        const single = container ? container.querySelector('.select__single-value, [class*="singleValue"]') : null;
        return (single && (single.getAttribute('data-astrework-display') || single.textContent.trim())) || (el.value || null);
      };

      const getInputValue = (selector) => {
        const el = document.querySelector(selector);
        return el ? (el.value || el.textContent || '').trim() : null;
      };

      // 1. Country (React Select #country)
      const countryVal = getSingleVal('#country');

      // 2. Location (React Select or input #candidate-location)
      const locationVal = getSingleVal('#candidate-location') || getInputValue('#candidate-location');

      // 3. School (React Select #school--0)
      const schoolVal = getSingleVal('#school--0');

      // 4. Start date month
      const startMonthVal = getSingleVal('#start-month--0') || getInputValue('[name*="start_month"]');

      // 5. Start date year
      const startYearVal = getInputValue('#start-year--0');

      // 6. End date month
      const endMonthVal = getSingleVal('#end-month--0') || getInputValue('[name*="end_month"]');

      // 7. End date year
      const endYearVal = getInputValue('#end-year--0');

      // 8. Anticipated Graduation Year
      const gradYearVal = getSingleVal('#question_69351114');

      // 9. Gender (screening)
      const genderScreeningVal = getSingleVal('#question_69351130');
      // Gender (EEO)
      const genderEeoVal = getSingleVal('#gender');

      return {
        country: countryVal,
        location: locationVal,
        school: schoolVal,
        startMonth: startMonthVal,
        startYear: startYearVal,
        endMonth: endMonthVal,
        endYear: endYearVal,
        gradYear: gradYearVal,
        genderScreening: genderScreeningVal,
        genderEeo: genderEeoVal
      };
    });

    console.log('\n========================================');
    console.log('📊 CALIBRATION AUDIT REPORT:');
    console.log('1. Country:                      ', results.country, results.country?.includes('+91') || results.country?.includes('India') ? '✅ PASS' : '❌ FAIL');
    console.log('2. Location:                     ', results.location, results.location?.includes('Patna') && !results.location?.includes('Rural') ? '✅ PASS' : '❌ FAIL');
    console.log('3. School:                       ', results.school, results.school?.includes('Amity') ? '✅ PASS' : '❌ FAIL');
    console.log('4. Start Month:                  ', results.startMonth, results.startMonth === 'July' ? '✅ PASS' : '❌ FAIL');
    console.log('5. Start Year:                   ', results.startYear, results.startYear === '2025' ? '✅ PASS' : '❌ FAIL');
    console.log('6. End Month:                    ', results.endMonth, results.endMonth === 'July' ? '✅ PASS' : '❌ FAIL');
    console.log('7. End Year:                     ', results.endYear, results.endYear === '2028' ? '✅ PASS' : '❌ FAIL');
    console.log('8. Anticipated Grad Year:        ', results.gradYear, results.gradYear === '2028' ? '✅ PASS' : '❌ FAIL');
    console.log('9. Gender (Please indicate...):  ', results.genderScreening, results.genderScreening === 'Male' ? '✅ PASS' : '❌ FAIL');
    console.log('   Gender (Voluntary Self-ID):   ', results.genderEeo, results.genderEeo === 'Male' ? '✅ PASS' : '❌ FAIL');
    console.log('========================================\n');

    // Save proof screenshot
    const proofPath = 'C:\\Users\\Astreon\\.gemini\\antigravity-ide\\brain\\28222883-14ee-4d3c-b571-80fdb5acd836\\riot_games_calibrated_proof.png';
    await page.screenshot({ path: proofPath, fullPage: true });
    console.log('📸 Proof screenshot saved to:', proofPath);

    await context.close();
  } catch (err) {
    console.error('Error during verification:', err);
    await context.close();
  }
}

verifyCalibrations().catch(console.error);
