/**
 * Stride StudyPilot Background Service Worker (Manifest V3)
 * ---------------------------------------------------------
 * - Manages Alt+Shift+S keyboard shortcut
 * - Relays solve requests via Stride API / direct AI proxies
 * - Serves shadow CSS for isolated glassmorphic HUD
 */

function isMoodleUrl(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes('amigo.amityonline.com') ||
    lower.includes('moodle') ||
    lower.includes('/mod/quiz/')
  );
}

// 1. Detect Moodle/Amigo Quiz and set badge
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (isMoodleUrl(tab.url)) {
      if (tab.url.includes('/mod/quiz/')) {
        chrome.action.setBadgeText({ text: 'QUIZ', tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#10b981', tabId }); // Green
        chrome.action.setTitle({
          title: 'Stride StudyPilot: Quiz detected! Press Alt+Shift+S to auto-solve.',
          tabId
        });
      } else {
        chrome.action.setBadgeText({ text: 'LMS', tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#2563eb', tabId }); // Blue
        chrome.action.setTitle({
          title: 'Stride StudyPilot: Learning portal ready.',
          tabId
        });
      }
    } else {
      chrome.action.setBadgeText({ text: '', tabId });
    }
  }
});

// 2. Handle keyboard shortcut (Alt+Shift+S)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle_studypilot') {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab && activeTab.id) {
      chrome.tabs.sendMessage(activeTab.id, { action: 'TOGGLE_HUD' }).catch(() => {
        // Fallback: auto-inject if needed
        chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          files: [
            'hud-ui.js',
            'agent/scribe.js',
            'agent/scholar.js',
            'agent/auditor.js',
            'agent/sentry.js',
            'content.js'
          ]
        }).then(() => {
          chrome.scripting.insertCSS({ target: { tabId: activeTab.id }, files: ['hud.css'] });
          setTimeout(() => {
            chrome.tabs.sendMessage(activeTab.id, { action: 'TOGGLE_HUD' }).catch(() => {});
          }, 300);
        }).catch(() => {});
      });
    }
  }
});

// 3. Message listener for Shadow CSS and API Proxying
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'GET_SHADOW_CSS') {
    fetch(chrome.runtime.getURL('hud.shadow.css'))
      .then((r) => r.text())
      .then((css) => sendResponse({ css }))
      .catch((err) => {
        console.error('[StudyPilot Background] Shadow CSS fetch error:', err);
        sendResponse({ css: null });
      });
    return true; // async response
  }

  if (request.action === 'SOLVE_QUIZ_API') {
    // Proxy call to avoid page-level CSP restrictions
    const { endpoint, payload, headers } = request;
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(headers || {}) },
      body: JSON.stringify(payload)
    })
      .then(async (res) => {
        const data = await res.json();
        sendResponse({ success: res.ok, data });
      })
      .catch((err) => {
        console.error('[StudyPilot Background] API fetch error:', err);
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }
});
