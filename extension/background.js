/**
 * AstrePilot Background Service Worker (Manifest V3)
 * ----------------------------------------------------
 * - Manages keyboard shortcuts (Alt+Shift+A)
 * - Detects ATS portals on tab navigation and displays an "ATS" badge
 * - Synchronizes configuration between popup and content scripts
 */

const ATS_URL_PATTERNS = [
  'boards.greenhouse.io',
  'jobs.lever.co',
  'myworkdayjobs.com',
  'jobs.ashbyhq.com',
  'smartrecruiters.com',
  'bamboohr.com',
  'jobvite.com',
  'workable.com',
  'recruitee.com',
  'linkedin.com/jobs',
  'indeed.com',
  'icims.com',
  'job-apply',
  '/careers/',
  '/careers?'
];

function isAtsUrl(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  return ATS_URL_PATTERNS.some(pattern => lower.includes(pattern));
}

let lastApplyClickTime = 0;

// 1. Detect ATS on page navigation & set badge
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (Date.now() - lastApplyClickTime < 5000) {
      lastApplyClickTime = 0; // Consume the event
      // Wait slightly to ensure page and content scripts are fully ready
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, { action: 'TOGGLE_HUD' }).catch(() => {
          // Fallback: Auto-inject if not already present
          chrome.scripting.executeScript({ target: { tabId }, files: ['hud-ui.js'] }).then(() => {
            chrome.scripting.insertCSS({ target: { tabId }, files: ['hud.css'] });
            chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] }).then(() => {
              setTimeout(() => {
                chrome.tabs.sendMessage(tabId, { action: 'TOGGLE_HUD' }).catch(() => {});
              }, 500);
            });
          }).catch(err => console.error(err));
        });
      }, 500);
    }

    if (isAtsUrl(tab.url)) {
      chrome.action.setBadgeText({ text: 'ATS', tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#2563eb', tabId });
      chrome.action.setTitle({
        title: 'AstrePilot: ATS Job Application detected! Click to autofill.',
        tabId
      });
    } else {
      chrome.action.setBadgeText({ text: '', tabId });
    }
  }
});

// 2. Handle keyboard shortcut (Alt+Shift+A)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle_astrepilot') {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab && activeTab.id) {
      chrome.tabs.sendMessage(activeTab.id, { action: 'TOGGLE_HUD' }).catch(() => {
        // Fallback: auto-inject into tab if not already running
        chrome.scripting.executeScript({ target: { tabId: activeTab.id }, files: ['hud-ui.js'] }).then(() => {
          chrome.scripting.insertCSS({ target: { tabId: activeTab.id }, files: ['hud.css'] });
          chrome.scripting.executeScript({ target: { tabId: activeTab.id }, files: ['content.js'] }).then(() => {
            setTimeout(() => {
              chrome.tabs.sendMessage(activeTab.id, { action: 'TOGGLE_HUD' }).catch(() => {});
            }, 300);
          });
        }).catch(() => {});
      });
    }
  }
});

// 3. Message Listener for CSP bypass & HUD Actions
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'NOTIFY_CLICK_APPLY') {
    lastApplyClickTime = Date.now();
    return false;
  }

  if (request.action === 'GET_SHADOW_CSS') {
    fetch(chrome.runtime.getURL('hud.shadow.css'))
      .then(r => r.text())
      .then(css => sendResponse({ css }))
      .catch(err => {
        console.error('[AstrePilot Background] CSS Fetch Error:', err);
        sendResponse({ css: null });
      });
    return true; // Keep message channel open for async response
  }
  
  if (request.type === 'OPEN_OPTIONS') {
    chrome.storage.sync.get(['astrepilot_origin'], (res) => {
      const safeRes = res || {};
      let origin = (safeRes.astrepilot_origin || 'https://astrework.app').replace(/\/$/, '');
      if (origin.includes('vercel.app')) {
        origin = 'https://astrework.app';
        chrome.storage.sync.set({ astrepilot_origin: origin });
      }
      chrome.tabs.create({ url: origin + '/settings' });
    });
    return false; // no response is sent, so do not keep the channel open
  }

  if (request.type === 'OPEN_CUSTOM_JD') {
    chrome.storage.sync.get(['astrepilot_origin'], (res) => {
      const safeRes = res || {};
      let origin = (safeRes.astrepilot_origin || 'https://astrework.app').replace(/\/$/, '');
      if (origin.includes('vercel.app')) {
        origin = 'https://astrework.app';
        chrome.storage.sync.set({ astrepilot_origin: origin });
      }
      chrome.tabs.create({ url: origin + '/resume-builder?mode=custom&loadSession=true' });
    });
    return false;
  }

  if (request.type === 'DOWNLOAD_RESUME') {
    chrome.storage.sync.get(['astrepilot_origin', 'astrepilot_token'], (res) => {
      const safeRes = res || {};
      let origin = (safeRes.astrepilot_origin || 'https://astrework.app').replace(/\/$/, '');
      if (origin.includes('vercel.app')) {
        origin = 'https://astrework.app';
        chrome.storage.sync.set({ astrepilot_origin: origin });
      }
      const token = safeRes.astrepilot_token || '';
      const url = origin + '/api/resume/download/latest?token=' + token;
      chrome.tabs.create({ url, active: false });
    });
    return false;
  }

  if (request.type === 'GET_RESUME_BINARY') {
    chrome.storage.sync.get(['astrepilot_origin', 'astrepilot_token'], async (res) => {
      try {
        const safeRes = res || {};
        let origin = (safeRes.astrepilot_origin || 'https://astrework.app').replace(/\/$/, '');
        if (origin.includes('vercel.app')) {
          origin = 'https://astrework.app';
          chrome.storage.sync.set({ astrepilot_origin: origin });
        }
        const token = safeRes.astrepilot_token || '';
        const url = origin + '/api/resume/download/latest?token=' + encodeURIComponent(token);
        const response = await fetch(url, {
          headers: {
            'Authorization': 'Bearer ' + token
          }
        });
        if (!response.ok) {
          return sendResponse({ success: false, error: 'Resume download failed with status ' + response.status });
        }
        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        const disposition = response.headers.get('content-disposition') || '';
        const match = disposition.match(/filename="?([^"]+)"?/);
        const filename = match ? match[1] : (response.headers.get('x-resume-filename') || 'Candidate_Resume.pdf');
        const variant = response.headers.get('x-resume-variant') || '';
        sendResponse({
          success: true,
          base64: base64,
          filename: filename,
          variant: variant,
          mimeType: 'application/pdf',
          size: buffer.byteLength
        });
      } catch (err) {
        sendResponse({ success: false, error: err.message || 'Failed to stream resume' });
      }
    });
    return true; // Keep message channel open for async response
  }

  if (request.type === 'PROXY_FETCH') {
    fetch(request.url, request.options || {})
      .then(async res => {
        const data = await res.json().catch(() => null);
        sendResponse({
          ok: res.ok,
          status: res.status,
          data: data
        });
      })
      .catch(err => {
        sendResponse({
          error: err.message || 'Fetch failed',
          status: 500
        });
      });
    return true; // Keep channel open for async response
  }
});

// 4. Initialize default settings on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['astrepilot_origin'], (res) => {
    const safeRes = res || {};
    if (!safeRes.astrepilot_origin || safeRes.astrepilot_origin.includes('vercel.app')) {
      chrome.storage.sync.set({
        astrepilot_origin: 'https://astrework.app'
      });
    }
  });
  console.log('[AstrePilot] Extension installed successfully.');
});
