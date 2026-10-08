const fs = require('fs');
const path = 'x:/Career_Engine/1_RCMS/CAREER_ENGINE_MASTER_MEMORY_BACKUP.md';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  '- **4. Keyboard Accessibility:** Implemented robust event listeners for `Alt+Shift+A` and `Alt+A` to instantly toggle the HUD visibility globally across candidate sessions.',
  '- **4. Keyboard Accessibility:** Implemented robust event listeners for `Alt+Shift+A` and `Alt+A` to instantly toggle the HUD visibility globally across candidate sessions.\n  - **5. Extension Reload Resilience & Injection Guard Patch:** Resolved the "Launch button not working" issue caused by orphaned content script contexts and multiple injection guard locking (`window.__ASTREPILOT_INJECTED__`). Implemented `window.__ASTREPILOT_CLEANUP__` to safely tear down old `message` and `keydown` listeners before registering new ones, ensuring flawless recovery on extension reloads without duplicating event handlers.\n  - **6. Secure CSS Injection via CSP Bypass:** Upgraded `hud-ui.js` CSS fetching mechanism to avoid zero-dimension/invisible HUDs on strict Content Security Policy (CSP) websites (e.g., GitHub, Twitter). Shadow DOM CSS is now securely requested via `chrome.runtime.sendMessage({ action: \'GET_SHADOW_CSS\' })`, passing the stylesheet directly from the background service worker to perfectly bypass `connect-src` restrictions.'
);

fs.writeFileSync(path, code);
console.log('Master memory updated');
