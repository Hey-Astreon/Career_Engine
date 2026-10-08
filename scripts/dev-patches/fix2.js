const fs = require('fs');
const path = 'x:/Career_Engine/1_RCMS/extension/content.js';
let code = fs.readFileSync(path, 'utf8');

// Fix the top-level injection guard
code = code.replace(
  /if \(window\.__ASTREPILOT_CLEANUP__\) \{\s*try \{ window\.__ASTREPILOT_CLEANUP__\(\); \} catch \(e\) \{\}\s*\}/g,
  ''
);
code = code.replace(
  /window\.__ASTREPILOT_INJECTED__ = true;/g,
  'if (window.__ASTREPILOT_CLEANUP__) {\n    try { window.__ASTREPILOT_CLEANUP__(); } catch (e) {}\n  }\n  window.__ASTREPILOT_INJECTED__ = true;'
);

// Fix the keydown listener to be named and added to cleanup
code = code.replace(
  /window\.addEventListener\('keydown', \(e\) => \{/g,
  'const keydownListener = (e) => {'
);
code = code.replace(
  /    if \(e\.altKey && !e\.shiftKey[\s\S]*?return;\n    \}\n  \}\);/g,
  (match) => {
    return match.replace(/\}\);$/, '};\n  window.addEventListener(\'keydown\', keydownListener);\n\n  // Update cleanup to remove keydown listener\n  const oldCleanup = window.__ASTREPILOT_CLEANUP__;\n  window.__ASTREPILOT_CLEANUP__ = () => {\n    if (oldCleanup) try { oldCleanup(); } catch(e) {}\n    window.removeEventListener(\'keydown\', keydownListener);\n  };');
  }
);

fs.writeFileSync(path, code);
console.log('done');
