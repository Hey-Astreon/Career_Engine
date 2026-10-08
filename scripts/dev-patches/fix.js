const fs = require('fs');
const path = 'x:/Career_Engine/1_RCMS/extension/content.js';
let code = fs.readFileSync(path, 'utf8');
code = code.replace(
  'if (window.__ASTREPILOT_INJECTED__) return;',
  'if (window.__ASTREPILOT_CLEANUP__) {\n    try { window.__ASTREPILOT_CLEANUP__(); } catch (e) {}\n  }'
);
code = code.replace(
  'chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {',
  'const messageListener = (request, sender, sendResponse) => {'
);
code = code.replace(
  '    return true;\r\n  });',
  '    return true;\n  };\n  chrome.runtime.onMessage.addListener(messageListener);\n  window.__ASTREPILOT_CLEANUP__ = () => {\n    chrome.runtime.onMessage.removeListener(messageListener);\n  };'
);
code = code.replace(
  '    return true;\n  });',
  '    return true;\n  };\n  chrome.runtime.onMessage.addListener(messageListener);\n  window.__ASTREPILOT_CLEANUP__ = () => {\n    chrome.runtime.onMessage.removeListener(messageListener);\n  };'
);
fs.writeFileSync(path, code);
console.log('done');
