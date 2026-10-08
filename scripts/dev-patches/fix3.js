const fs = require('fs');
const path = 'x:/Career_Engine/1_RCMS/extension/content.js';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  '    }\n  });\n\n  /* ',
  '    }\n  };\n  window.addEventListener(\'keydown\', keydownListener);\n\n  const oldCleanup = window.__ASTREPILOT_CLEANUP__;\n  window.__ASTREPILOT_CLEANUP__ = () => {\n    if (oldCleanup) try { oldCleanup(); } catch(e) {}\n    window.removeEventListener(\'keydown\', keydownListener);\n  };\n\n  /* '
);

fs.writeFileSync(path, code);
console.log('done');
