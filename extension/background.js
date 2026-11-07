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
  'breezy.hr',
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

// Pillar E: Multi-Tab Active Fill Concurrency Lock Registry
const activeTabLocks = new Map();

function broadcastToTabs(message, excludeTabId = null) {
  chrome.tabs.query({}, (tabs) => {
    if (!tabs || !tabs.length) return;
    tabs.forEach((tab) => {
      if (tab.id && tab.id !== excludeTabId) {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {});
      }
    });
  });
}

// Sweep locks held by closed tabs (Pillar E auto-cleanup) & detach CDP
chrome.tabs.onRemoved.addListener((tabId) => {
  detachCdp(tabId);
  let releasedAny = false;
  for (const [key, lock] of activeTabLocks.entries()) {
    if (lock.tabId === tabId) {
      activeTabLocks.delete(key);
      releasedAny = true;
    }
  }
  if (releasedAny) {
    broadcastToTabs({ type: 'FILL_LOCK_RELEASED', payload: { tabId } });
  }
});

// 1. Detect ATS on page navigation & set badge
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (Date.now() - lastApplyClickTime < 5000) {
      lastApplyClickTime = 0; // Consume the event
      // Wait slightly to ensure page and content scripts are fully ready
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, { action: 'TOGGLE_HUD' }, { frameId: 0 }).catch(() => {
          // Fallback: Auto-inject if not already present
          chrome.scripting.executeScript({ target: { tabId, frameIds: [0] }, files: ['hud-ui.js'] }).then(() => {
            chrome.scripting.insertCSS({ target: { tabId, frameIds: [0] }, files: ['hud.css'] });
            chrome.scripting.executeScript({ target: { tabId, frameIds: [0] }, files: ['content.js'] }).then(() => {
              setTimeout(() => {
                chrome.tabs.sendMessage(tabId, { action: 'TOGGLE_HUD' }, { frameId: 0 }).catch(() => {});
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
      chrome.tabs.sendMessage(activeTab.id, { action: 'TOGGLE_HUD' }, { frameId: 0 }).catch(() => {
        // Fallback: auto-inject into tab if not already running
        chrome.scripting.executeScript({ target: { tabId: activeTab.id, frameIds: [0] }, files: ['hud-ui.js'] }).then(() => {
          chrome.scripting.insertCSS({ target: { tabId: activeTab.id, frameIds: [0] }, files: ['hud.css'] });
          chrome.scripting.executeScript({ target: { tabId: activeTab.id, frameIds: [0] }, files: ['content.js'] }).then(() => {
            setTimeout(() => {
              chrome.tabs.sendMessage(activeTab.id, { action: 'TOGGLE_HUD' }, { frameId: 0 }).catch(() => {});
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
    chrome.tabs.create({ url: 'https://astrework.app/settings' });
    return false;
  }

  if (request.type === 'OPEN_CUSTOM_JD') {
    chrome.tabs.create({ url: 'https://astrework.app/resume-builder?mode=custom&loadSession=true' });
    return false;
  }

async function getBundledResumeBinary(activeCtx) {
  const isAyushi = String(activeCtx || '').toLowerCase().includes('ayushi');
  const localFileName = isAyushi ? 'Ayushi_Raj_Resume.pdf' : 'Roushan_Kumar_Resume.pdf';
  const downloadFileName = isAyushi ? 'AYUSHI_RAJ_Resume.pdf' : 'ROUSHAN_KUMAR_Resume.pdf';
  const localUrl = chrome.runtime.getURL('resumes/' + localFileName);

  const response = await fetch(localUrl);
  if (!response.ok) {
    throw new Error('Local bundled resume not found: ' + localUrl);
  }
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const CHUNK_SIZE = 0x8000; // 32KB
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK_SIZE));
  }
  const base64 = btoa(binary);
  return {
    success: true,
    base64: base64,
    filename: downloadFileName,
    variant: 'Canonical Master',
    mimeType: 'application/pdf',
    size: buffer.byteLength,
    isBundled: true
  };
}

  if (request.type === 'DOWNLOAD_RESUME') {
    chrome.storage.sync.get(['astrepilot_token', 'astrepilot_active_context'], async (res) => {
      const safeRes = res || {};
      const activeCtx = request.activeContext || safeRes.astrepilot_active_context || 'roushan';
      try {
        const bundled = await getBundledResumeBinary(activeCtx);
        const dataUrl = 'data:application/pdf;base64,' + bundled.base64;
        const filename = request.filename || bundled.filename;

        if (typeof chrome.downloads !== 'undefined' && chrome.downloads.download) {
          chrome.downloads.download({
            url: dataUrl,
            filename: filename,
            saveAs: false
          });
        }
      } catch (e) {
        console.error('[AstrePilot Background] Download resume error:', e);
      }
    });
    return false;
  }

  if (request.type === 'GET_RESUME_BINARY') {
    chrome.storage.sync.get(['astrepilot_token', 'astrepilot_active_context', 'astrepilot_origin'], async (res) => {
      const safeRes = res || {};
      const origin = safeRes.astrepilot_origin || 'https://astrework.app';
      const activeCtx = request.activeContext || safeRes.astrepilot_active_context || 'roushan';
      const token = safeRes.astrepilot_token || '';

      // 1. Try remote tailored resume with 3.5s timeout
      try {
        const url = origin + '/api/resume/download/latest?token=' + encodeURIComponent(token) + '&slug=' + encodeURIComponent(activeCtx);
        const headers = {};
        if (token) {
          headers['Authorization'] = 'Bearer ' + token;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const response = await fetch(url, { headers, signal: controller.signal });
        clearTimeout(timeoutId);

        const contentType = response.headers.get('content-type') || '';
        if (response.ok && contentType.includes('application/pdf')) {
          const buffer = await response.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          const CHUNK_SIZE = 0x8000;
          let binary = '';
          for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK_SIZE));
          }
          const base64 = btoa(binary);
          const disposition = response.headers.get('content-disposition') || '';
          const match = disposition.match(/filename="?([^"]+)"?/);
          const filename = match ? match[1] : (response.headers.get('x-resume-filename') || (activeCtx === 'ayushi' ? 'AYUSHI_RAJ_Resume.pdf' : 'ROUSHAN_KUMAR_Resume.pdf'));
          const variant = response.headers.get('x-resume-variant') || 'Tailored';

          return sendResponse({
            success: true,
            base64: base64,
            filename: filename,
            variant: variant,
            mimeType: 'application/pdf',
            size: buffer.byteLength,
            isBundled: false
          });
        }
      } catch (remoteErr) {
        console.warn('[AstrePilot Background] Remote tailored resume unavailable, using local bundled canonical PDF:', remoteErr.message);
      }

      // 2. Infallible Local Bundled Fallback (Zero network requirement, 0ms, guaranteed valid PDF)
      try {
        const bundled = await getBundledResumeBinary(activeCtx);
        return sendResponse(bundled);
      } catch (localErr) {
        console.error('[AstrePilot Background] Fatal: Failed to load bundled resume:', localErr);
        sendResponse({ success: false, error: 'Resume unavailable: ' + localErr.message });
      }
    });
    return true; // Keep message channel open for async response
  }

  if (request.type === 'GET_COVER_LETTER_BINARY') {
    chrome.storage.sync.get(['astrepilot_token', 'astrepilot_active_context'], async (res) => {
      try {
        const safeRes = res || {};
        const origin = 'https://astrework.app';
        const activeCtx = request.activeContext || safeRes.astrepilot_active_context || '';
        const token = safeRes.astrepilot_token || '';
        const url = origin + '/api/autopilot/cover-letter';
        const headers = { 'Content-Type': 'application/json' };
        if (token) {
          headers['Authorization'] = 'Bearer ' + token;
        }
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            candidateId: activeCtx,
            company: request.company,
            jobTitle: request.jobTitle,
            jobDescription: request.jobDescription,
            format: 'pdf'
          })
        });
        if (!response.ok) {
          return sendResponse({ success: false, error: 'Cover letter generation failed with status ' + response.status });
        }
        const data = await response.json();
        if (!data || !data.success || !data.pdfBase64) {
          return sendResponse({ success: false, error: (data && data.error) || 'Failed to generate cover letter PDF' });
        }
        sendResponse({
          success: true,
          base64: data.pdfBase64,
          filename: data.fileName || 'Candidate_Cover_Letter.pdf',
          mimeType: 'application/pdf',
          coverLetter: data.coverLetter
        });
      } catch (err) {
        sendResponse({ success: false, error: err.message || 'Failed to stream cover letter' });
      }
    });
    return true; // Keep message channel open for async response
  }

  // Pillar E: Multi-Tab Concurrency Lock Handlers
  if (request.type === 'ACQUIRE_FILL_LOCK') {
    const tabId = (sender && sender.tab) ? sender.tab.id : request.tabId;
    const key = (request.url || '').trim().toLowerCase();
    const now = Date.now();
    const existing = activeTabLocks.get(key);

    if (existing && now < existing.expiresAt && String(existing.tabId) !== String(tabId)) {
      sendResponse({ success: false, lock: existing, error: 'Fill in progress in another tab' });
      return false;
    }

    const lock = {
      tabId: tabId,
      url: request.url,
      company: request.company,
      jobTitle: request.jobTitle,
      lockedAt: now,
      lastHeartbeat: now,
      expiresAt: now + (request.ttlMs || 45000)
    };
    activeTabLocks.set(key, lock);
    broadcastToTabs({ type: 'FILL_LOCK_ACQUIRED', payload: lock }, tabId);
    sendResponse({ success: true, lock });
    return false;
  }

  if (request.type === 'HEARTBEAT_FILL_LOCK') {
    const tabId = (sender && sender.tab) ? sender.tab.id : request.tabId;
    const key = (request.url || '').trim().toLowerCase();
    const existing = activeTabLocks.get(key);
    if (existing && String(existing.tabId) === String(tabId)) {
      existing.lastHeartbeat = Date.now();
      existing.expiresAt = Date.now() + (request.ttlMs || 45000);
      activeTabLocks.set(key, existing);
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false });
    }
    return false;
  }

  if (request.type === 'RELEASE_FILL_LOCK') {
    const tabId = (sender && sender.tab) ? sender.tab.id : request.tabId;
    const key = (request.url || '').trim().toLowerCase();
    const existing = activeTabLocks.get(key);
    if (existing && String(existing.tabId) === String(tabId)) {
      activeTabLocks.delete(key);
      broadcastToTabs({ type: 'FILL_LOCK_RELEASED', payload: { tabId, url: request.url } });
    }
    sendResponse({ success: true });
    return false;
  }

  if (request.type === 'BROADCAST_CROSS_TAB') {
    broadcastToTabs(request.message, (sender && sender.tab) ? sender.tab.id : null);
    sendResponse({ success: true });
    return false;
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

  // Pillar F: CDP (Chrome DevTools Protocol) Hardware Input Engine
  if (request.type === 'CDP_DISPATCH_INPUT') {
    const tabId = (sender && sender.tab && sender.tab.id) ? sender.tab.id : request.tabId;
    if (!tabId) {
      sendResponse({ success: false, error: 'No active tab ID for CDP' });
      return false;
    }

    (async () => {
      const attachRes = await ensureCdpAttached(tabId);
      if (!attachRes.success) {
        return sendResponse({ success: false, error: attachRes.error });
      }

      const action = request.action;
      try {
        if (action === 'ATTACH') {
          return sendResponse({ success: true });
        }

        if (action === 'DETACH') {
          await detachCdp(tabId);
          return sendResponse({ success: true });
        }

        if (action === 'CLICK') {
          const intX = Math.round(request.x);
          const intY = Math.round(request.y);
          await sendCdpCommand(tabId, 'Input.dispatchMouseEvent', {
            type: 'mouseMoved',
            x: intX,
            y: intY
          });
          await sendCdpCommand(tabId, 'Input.dispatchMouseEvent', {
            type: 'mousePressed',
            x: intX,
            y: intY,
            button: 'left',
            clickCount: 1
          });
          await new Promise(r => setTimeout(r, 40));
          await sendCdpCommand(tabId, 'Input.dispatchMouseEvent', {
            type: 'mouseReleased',
            x: intX,
            y: intY,
            button: 'left',
            clickCount: 1
          });
          return sendResponse({ success: true });
        }

        if (action === 'INSERT_TEXT') {
          const text = String(request.text || '');
          await sendCdpCommand(tabId, 'Input.insertText', { text });
          return sendResponse({ success: true });
        }

        if (action === 'SELECT_ALL_AND_TYPE') {
          const text = String(request.text || '');
          // Ctrl+A / Backspace to clear existing placeholder/text
          await sendCdpCommand(tabId, 'Input.dispatchKeyEvent', {
            type: 'rawKeyDown',
            windowsVirtualKeyCode: 65,
            key: 'a',
            code: 'KeyA',
            modifiers: 2
          });
          await sendCdpCommand(tabId, 'Input.dispatchKeyEvent', {
            type: 'keyUp',
            windowsVirtualKeyCode: 65,
            key: 'a',
            code: 'KeyA'
          });
          await sendCdpCommand(tabId, 'Input.dispatchKeyEvent', {
            type: 'rawKeyDown',
            windowsVirtualKeyCode: 8,
            key: 'Backspace',
            code: 'Backspace'
          });
          await sendCdpCommand(tabId, 'Input.dispatchKeyEvent', {
            type: 'keyUp',
            windowsVirtualKeyCode: 8,
            key: 'Backspace',
            code: 'Backspace'
          });
          await new Promise(r => setTimeout(r, 40));
          await sendCdpCommand(tabId, 'Input.insertText', { text });
          return sendResponse({ success: true });
        }

        if (action === 'TYPE') {
          const text = String(request.text || '');
          const delay = request.delay || 35;
          for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const code = 'Key' + char.toUpperCase();
            await sendCdpCommand(tabId, 'Input.dispatchKeyEvent', {
              type: 'keyDown',
              text: char,
              unmodifiedText: char,
              key: char,
              code: code
            });
            await new Promise(r => setTimeout(r, 10));
            await sendCdpCommand(tabId, 'Input.dispatchKeyEvent', {
              type: 'keyUp',
              key: char,
              code: code
            });
            await new Promise(r => setTimeout(r, delay));
          }
          return sendResponse({ success: true });
        }

        if (action === 'KEY') {
          const key = request.key;
          if (key === 'Enter') {
            await sendCdpCommand(tabId, 'Input.dispatchKeyEvent', {
              type: 'rawKeyDown',
              windowsVirtualKeyCode: 13,
              nativeVirtualKeyCode: 13,
              key: 'Enter',
              code: 'Enter',
              text: '\r',
              unmodifiedText: '\r'
            });
            await sendCdpCommand(tabId, 'Input.dispatchKeyEvent', {
              type: 'keyUp',
              windowsVirtualKeyCode: 13,
              nativeVirtualKeyCode: 13,
              key: 'Enter',
              code: 'Enter'
            });
          } else if (key === 'ArrowDown') {
            await sendCdpCommand(tabId, 'Input.dispatchKeyEvent', {
              type: 'rawKeyDown',
              windowsVirtualKeyCode: 40,
              nativeVirtualKeyCode: 40,
              key: 'ArrowDown',
              code: 'ArrowDown'
            });
            await sendCdpCommand(tabId, 'Input.dispatchKeyEvent', {
              type: 'keyUp',
              windowsVirtualKeyCode: 40,
              nativeVirtualKeyCode: 40,
              key: 'ArrowDown',
              code: 'ArrowDown'
            });
          } else if (key === 'Escape') {
            await sendCdpCommand(tabId, 'Input.dispatchKeyEvent', {
              type: 'rawKeyDown',
              windowsVirtualKeyCode: 27,
              key: 'Escape',
              code: 'Escape'
            });
            await sendCdpCommand(tabId, 'Input.dispatchKeyEvent', {
              type: 'keyUp',
              windowsVirtualKeyCode: 27,
              key: 'Escape',
              code: 'Escape'
            });
          } else if (key === 'Tab') {
            await sendCdpCommand(tabId, 'Input.dispatchKeyEvent', {
              type: 'rawKeyDown',
              windowsVirtualKeyCode: 9,
              key: 'Tab',
              code: 'Tab'
            });
            await sendCdpCommand(tabId, 'Input.dispatchKeyEvent', {
              type: 'keyUp',
              windowsVirtualKeyCode: 9,
              key: 'Tab',
              code: 'Tab'
            });
          }
          return sendResponse({ success: true });
        }

        sendResponse({ success: false, error: 'Unknown action: ' + action });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true; // Keep channel open for async response
  }
});

// 4. Initialize default settings on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ astrepilot_origin: 'https://astrework.app' });
  if (chrome.storage.local) {
    chrome.storage.local.set({ astrepilot_origin: 'https://astrework.app' });
  }
  console.log('[AstrePilot] Extension installed successfully.');
});

// 5. CDP Helper Core
const attachedTabs = new Set();

async function ensureCdpAttached(tabId) {
  if (attachedTabs.has(tabId)) return { success: true };
  return new Promise((resolve) => {
    chrome.debugger.attach({ tabId }, '1.3', () => {
      if (chrome.runtime.lastError) {
        const msg = chrome.runtime.lastError.message || '';
        if (msg.includes('already attached')) {
          attachedTabs.add(tabId);
          return resolve({ success: true });
        }
        console.warn('[AstrePilot CDP] Attach error:', msg);
        return resolve({ success: false, error: msg });
      }
      attachedTabs.add(tabId);
      resolve({ success: true });
    });
  });
}

function detachCdp(tabId) {
  if (!attachedTabs.has(tabId)) return Promise.resolve({ success: true });
  return new Promise((resolve) => {
    chrome.debugger.detach({ tabId }, () => {
      attachedTabs.delete(tabId);
      resolve({ success: true });
    });
  });
}

if (chrome.debugger && chrome.debugger.onDetach) {
  chrome.debugger.onDetach.addListener((source) => {
    if (source && source.tabId) {
      attachedTabs.delete(source.tabId);
    }
  });
}

function sendCdpCommand(tabId, method, params = {}) {
  return new Promise((resolve) => {
    chrome.debugger.sendCommand({ tabId }, method, params, (result) => {
      if (chrome.runtime.lastError) {
        return resolve({ success: false, error: chrome.runtime.lastError.message });
      }
      resolve({ success: true, result });
    });
  });
}

