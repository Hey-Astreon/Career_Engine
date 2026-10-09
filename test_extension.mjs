import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.join(__dirname, 'extension');

async function runTest() {
  console.log('Launching browser with extension...');
  const browser = await puppeteer.launch({
    headless: 'new', // new headless mode supports extensions
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`
    ]
  });

  const page = await browser.newPage();
  console.log('Navigating to simulator...');
  await page.goto('http://localhost:3000/simulate', { waitUntil: 'networkidle2' });

  console.log('Triggering AstrePilot (Alt+Shift+A)...');
  // Sometimes puppeteer doesn't easily trigger extension keyboard shortcuts natively in headless.
  // We can just trigger the content script directly via evaluate.
  await page.evaluate(() => {
    // Send message to trigger HUD (simulate background script command)
    window.postMessage({ type: 'TEST_TOGGLE_HUD' }, '*');
    // Actually we need to just call the toggle function if it was exposed, 
    // or simulate the keypress on document
  });
  
  // Actually, since we can't easily trigger the command shortcut programmatically from page context
  // let's just dispatch the keyboard event and hope the content script catches it.
  await page.keyboard.down('Alt');
  await page.keyboard.down('Shift');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Shift');
  await page.keyboard.up('Alt');

  console.log('Waiting for HUD to appear in Shadow DOM...');
  await new Promise(r => setTimeout(r, 2000));

  const hudData = await page.evaluate(() => {
    const root = document.getElementById('astrepilot-root');
    if (!root) return { error: 'HUD root not found' };
    const shadow = root.shadowRoot;
    if (!shadow) return { error: 'No shadow root' };
    const extractBtn = shadow.querySelector('.action-extract');
    if (extractBtn) {
       extractBtn.click();
       return { success: true, clickedExtract: true };
    }
    return { success: false, found: false, html: shadow.innerHTML };
  });

  console.log('HUD Data:', hudData);

  if (hudData.clickedExtract) {
     console.log('Clicked extract! Waiting 3 seconds for backend to process...');
     await new Promise(r => setTimeout(r, 3000));
     // See if we navigated or what the state is
     console.log('Current URL:', page.url());
  }

  await browser.close();
  console.log('Test complete.');
}

runTest().catch(console.error);
