/**
 * Stride StudyPilot Popup Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  const speedInputs = document.querySelectorAll('input[name="speed-mode"]');
  const toggleAutoSubmit = document.getElementById('toggle-auto-submit');
  const toggleAutoAdvance = document.getElementById('toggle-auto-advance');
  const inputGroq = document.getElementById('input-groq-key');
  const inputGemini = document.getElementById('input-gemini-key');
  const btnLaunch = document.getElementById('btn-launch-hud');
  const btnSave = document.getElementById('btn-save');
  const statusEl = document.getElementById('save-status');

  // 1. Load preferences
  chrome.storage.sync.get(
    ['sp_speed_mode', 'sp_auto_submit', 'sp_auto_advance', 'sp_groq_key', 'sp_gemini_key'],
    (res) => {
      const mode = (res && res.sp_speed_mode) || 'humanized';
      speedInputs.forEach((r) => {
        if (r.value === mode) r.checked = true;
      });

      if (toggleAutoSubmit) toggleAutoSubmit.checked = res && res.sp_auto_submit === true;
      if (toggleAutoAdvance) toggleAutoAdvance.checked = res && res.sp_auto_advance === true;
      if (inputGroq && res && res.sp_groq_key) inputGroq.value = res.sp_groq_key;
      if (inputGemini && res && res.sp_gemini_key) inputGemini.value = res.sp_gemini_key;
    }
  );

  // 2. Launch HUD directly into active tab
  if (btnLaunch) {
    btnLaunch.onclick = async () => {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab && activeTab.id) {
        chrome.tabs.sendMessage(activeTab.id, { action: 'SHOW_HUD', forceOpen: true }, (res) => {
          if (chrome.runtime.lastError || !res) {
            // Fallback: programmatic injection if page was opened before extension reload
            if (chrome.scripting && chrome.scripting.executeScript) {
              chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                files: [
                  'hud-ui.js',
                  'agent/scribe.js',
                  'agent/scholar.js',
                  'agent/auditor.js',
                  'agent/sentry.js',
                  'agent/navigator.js',
                  'agent/inspector.js',
                  'content.js'
                ]
              }).then(() => {
                if (chrome.scripting.insertCSS) {
                  chrome.scripting.insertCSS({ target: { tabId: activeTab.id }, files: ['hud.css'] }).catch(() => {});
                }
                setTimeout(() => {
                  chrome.tabs.sendMessage(activeTab.id, { action: 'SHOW_HUD', forceOpen: true }).catch(() => {});
                  window.close();
                }, 200);
              }).catch(() => {
                window.close();
              });
            } else {
              window.close();
            }
          } else {
            window.close();
          }
        });
      }
    };
  }

  // 3. Save preferences
  if (btnSave) {
    btnSave.onclick = () => {
      let selectedSpeed = 'humanized';
      speedInputs.forEach((r) => {
        if (r.checked) selectedSpeed = r.value;
      });

      const payload = {
        sp_speed_mode: selectedSpeed,
        sp_auto_submit: toggleAutoSubmit ? toggleAutoSubmit.checked : false,
        sp_auto_advance: toggleAutoAdvance ? toggleAutoAdvance.checked : false,
        sp_groq_key: inputGroq ? inputGroq.value.trim() : '',
        sp_gemini_key: inputGemini ? inputGemini.value.trim() : ''
      };

      chrome.storage.sync.set(payload, () => {
        if (statusEl) {
          statusEl.textContent = 'Preferences saved successfully!';
          setTimeout(() => {
            statusEl.textContent = '';
          }, 2000);
        }
      });
    };
  }
});
