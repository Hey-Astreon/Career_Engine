const fs = require('fs');
const path = 'x:/Career_Engine/1_RCMS/CAREER_ENGINE_MASTER_MEMORY_BACKUP.md';
let code = fs.readFileSync(path, 'utf8');

if (!code.includes('HUD Settings Button Fix')) {
  code = code.replace(
    '- **8. Premium Apple/Google Glass UI Redesign:',
    '- **9. HUD Settings Button Fix:** Fixed an issue where clicking the settings gear icon in the injected HUD did nothing. Added a message listener in `background.js` for `OPEN_OPTIONS` to properly route the user to their AstreWork settings page (`/settings`).\n  - **8. Premium Apple/Google Glass UI Redesign:'
  );
  fs.writeFileSync(path, code);
  console.log('Master memory updated with HUD settings button fix');
}
