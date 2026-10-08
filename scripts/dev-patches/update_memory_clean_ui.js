const fs = require('fs');
const path = 'x:/Career_Engine/1_RCMS/CAREER_ENGINE_MASTER_MEMORY_BACKUP.md';
let code = fs.readFileSync(path, 'utf8');

if (!code.includes('High-Trust Clean UI')) {
  code = code.replace(
    '- **8. Premium Popup Redesign:** Overhauled the extension `popup.html` and `popup.css` to feature a stunning dark-mode glassmorphic aesthetic matching the AstreWork brand (`#0f172a` slate, `#1d5fd1` blue, `#7c3aed` violet glow, frosted glass buttons).',
    '- **8. High-Trust Clean UI Redesign:** Completely stripped away the neon purple, blue gradients, and dark-mode glows from the entire extension suite (Popup + HUD). Re-engineered the UI to a clean, professional, Apple/Google-grade Light Theme featuring `Slate 900` solid accents, `#f8fafc` surfaces, and minimalist structural hierarchy to maximize user trust on first sight.'
  );
  fs.writeFileSync(path, code);
  console.log('Master memory updated with clean UI redesign');
}
