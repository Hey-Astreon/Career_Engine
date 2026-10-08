const fs = require('fs');
const path = 'x:/Career_Engine/1_RCMS/CAREER_ENGINE_MASTER_MEMORY_BACKUP.md';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  '- **6. Secure CSS Injection via CSP Bypass:** Upgraded `hud-ui.js` CSS fetching mechanism to avoid zero-dimension/invisible HUDs on strict Content Security Policy (CSP) websites (e.g., GitHub, Twitter). Shadow DOM CSS is now securely requested via `chrome.runtime.sendMessage({ action: \'GET_SHADOW_CSS\' })`, passing the stylesheet directly from the background service worker to perfectly bypass `connect-src` restrictions.',
  '- **6. Secure CSS Injection via CSP Bypass:** Upgraded `hud-ui.js` CSS fetching mechanism to avoid zero-dimension/invisible HUDs on strict Content Security Policy (CSP) websites (e.g., GitHub, Twitter). Shadow DOM CSS is now securely requested via `chrome.runtime.sendMessage({ action: \'GET_SHADOW_CSS\' })`, passing the stylesheet directly from the background service worker to perfectly bypass `connect-src` restrictions.\n  - **7. Butter-Smooth CSS Transitions:** Fixed the "Full UI to Pill" animation jank by removing the `position: absolute` layout toggle on collapse. Replaced it with a transparent, click-through bounding box (`pointer-events: none`) enabling pure GPU-accelerated compositing (`transform` and `opacity`) for 60fps transitions without reflows.'
);

fs.writeFileSync(path, code);
console.log('Master memory updated');
