const fs = require('fs');
const path = 'x:/Career_Engine/1_RCMS/CAREER_ENGINE_MASTER_MEMORY_BACKUP.md';
let code = fs.readFileSync(path, 'utf8');

if (!code.includes('Premium Popup Redesign')) {
  code = code.replace(
    '- **7. Butter-Smooth CSS Transitions:** Fixed the "Full UI to Pill" animation jank by removing the `position: absolute` layout toggle on collapse. Replaced it with a transparent, click-through bounding box (`pointer-events: none`) enabling pure GPU-accelerated compositing (`transform` and `opacity`) for 60fps transitions without reflows.',
    '- **7. Butter-Smooth CSS Transitions:** Fixed the "Full UI to Pill" animation jank by removing the `position: absolute` layout toggle on collapse. Replaced it with a transparent, click-through bounding box (`pointer-events: none`) enabling pure GPU-accelerated compositing (`transform` and `opacity`) for 60fps transitions without reflows.\n  - **8. Premium Popup Redesign:** Overhauled the extension `popup.html` and `popup.css` to feature a stunning dark-mode glassmorphic aesthetic matching the AstreWork brand (`#0f172a` slate, `#1d5fd1` blue, `#7c3aed` violet glow, frosted glass buttons).'
  );
  fs.writeFileSync(path, code);
  console.log('Master memory updated with Popup Redesign');
}
