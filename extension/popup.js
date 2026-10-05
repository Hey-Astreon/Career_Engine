/**
 * AstrePilot Popup Controller (Manifest V3)
 * -----------------------------------------
 */

document.addEventListener('DOMContentLoaded', async () => {
  const viewLoading = document.getElementById('view-loading');
  const viewConnected = document.getElementById('view-connected');
  const viewSetup = document.getElementById('view-setup');

  const connBadge = document.getElementById('conn-badge');
  const connText = document.getElementById('conn-text');

  const userName = document.getElementById('user-name');
  const userTitle = document.getElementById('user-title');
  const userAvatar = document.getElementById('user-avatar');

  const primedBox = document.getElementById('primed-box');
  const primedTarget = document.getElementById('primed-target');

  const statFills = document.getElementById('stat-fills');
  const statFields = document.getElementById('stat-fields');
  const statHours = document.getElementById('stat-hours');

  const btnLaunchHud = document.getElementById('btn-launch-hud');
  const btnAutofillDirect = document.getElementById('btn-autofill-direct');
  const btnConnect = document.getElementById('btn-connect');
  const btnAutoToken = document.getElementById('btn-auto-token');
  const btnSettingsToggle = document.getElementById('btn-settings-toggle');

  const inputOrigin = document.getElementById('input-origin');
  const inputToken = document.getElementById('input-token');

  const linkDashboard = document.getElementById('link-dashboard');
  const linkGetToken = document.getElementById('link-get-token');

  function showView(view) {
    [viewLoading, viewConnected, viewSetup].forEach(v => v.classList.add('hidden'));
    view.classList.remove('hidden');
  }

  function setConnectedBadge(isConnected) {
    if (isConnected) {
      connBadge.className = 'badge badge-connected';
      connText.textContent = 'Connected';
    } else {
      connBadge.className = 'badge badge-disconnected';
      connText.textContent = 'Disconnected';
    }
  }

  async function getStoredConfig() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['astrepilot_token', 'astrepilot_origin'], (res) => {
        resolve({
          token: res.astrepilot_token || null,
          origin: res.astrepilot_origin || 'https://astrework.vercel.app'
        });
      });
    });
  }

  async function saveConfig(token, origin) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ astrepilot_token: token, astrepilot_origin: origin }, resolve);
    });
  }

  async function initialize() {
    showView(viewLoading);
    const { token, origin } = await getStoredConfig();
    inputOrigin.value = origin;

    linkDashboard.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: origin + '/dashboard' });
    });

    linkGetToken.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: origin + '/settings' });
    });

    if (!token) {
      setConnectedBadge(false);
      showView(viewSetup);
      return;
    }

    try {
      const cleanOrigin = origin.replace(/\/$/, '');
      const [profileRes, sessionRes, statsRes] = await Promise.all([
        fetch(cleanOrigin + '/api/autopilot/profile', {
          headers: { 'Authorization': 'Bearer ' + token }
        }),
        fetch(cleanOrigin + '/api/autopilot/session', {
          headers: { 'Authorization': 'Bearer ' + token }
        }).catch(() => null),
        fetch(cleanOrigin + '/api/autopilot/log', {
          headers: { 'Authorization': 'Bearer ' + token }
        }).catch(() => null),
      ]);

      if (!profileRes.ok) throw new Error('Invalid token');
      const profile = await profileRes.json();

      setConnectedBadge(true);
      userName.textContent = profile.fullName || 'AstreWork Candidate';
      userTitle.textContent = profile.title || 'Engineer';

      // Initials
      const parts = (profile.fullName || 'AW').trim().split(/\s+/);
      const initials = parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase();
      userAvatar.textContent = initials;

      // Session
      if (sessionRes && sessionRes.ok) {
        const sData = await sessionRes.json();
        if (sData.session && sData.session.company) {
          primedTarget.textContent = sData.session.company + (sData.session.jobTitle ? ' (' + sData.session.jobTitle + ')' : '');
          primedBox.classList.remove('hidden');
        } else {
          primedBox.classList.add('hidden');
        }
      }

      // Stats
      if (statsRes && statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.stats) {
          statFills.textContent = statsData.stats.fills || 0;
          statFields.textContent = statsData.stats.fields || 0;
          statHours.textContent = (statsData.stats.hoursSaved || 0) + 'h';
        }
      }

      showView(viewConnected);
    } catch (err) {
      console.warn('[AstrePilot Popup] Connection failed:', err);
      setConnectedBadge(false);
      showView(viewSetup);
    }
  }

  // Launch HUD
  btnLaunchHud.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_HUD' }).catch(() => {
        // If content script wasn't active, inject it
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
      });
      window.close();
    }
  });

  // Autofill Direct
  btnAutofillDirect.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'AUTOFILL' }).catch(() => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
      });
      window.close();
    }
  });

  // Connect Manual
  btnConnect.addEventListener('click', async () => {
    const token = inputToken.value.trim();
    const origin = inputOrigin.value.trim();
    if (!token) {
      alert('Please enter your AstrePilot token.');
      return;
    }
    await saveConfig(token, origin);
    initialize();
  });

  // Auto Token Detection from open AstreWork tab
  btnAutoToken.addEventListener('click', async () => {
    btnAutoToken.textContent = '…';
    try {
      const tabs = await chrome.tabs.query({});
      const origin = inputOrigin.value.trim().replace(/\/$/, '');
      const astreTab = tabs.find(t => t.url && (t.url.startsWith(origin) || t.url.includes('localhost:3000') || t.url.includes('astrework.vercel.app')));

      if (!astreTab) {
        alert(`No open AstreWork tab found at ${origin}. Please open AstreWork in a tab and sign in.`);
        btnAutoToken.textContent = 'Auto';
        return;
      }

      // Execute fetch on the open tab
      const results = await chrome.scripting.executeScript({
        target: { tabId: astreTab.id },
        func: async () => {
          try {
            const res = await fetch('/api/autopilot/token');
            if (res.ok) {
              const data = await res.json();
              return data.token;
            }
          } catch (e) {}
          return null;
        }
      });

      const token = results && results[0] && results[0].result;
      if (token) {
        inputToken.value = token;
        await saveConfig(token, origin);
        initialize();
      } else {
        alert('Could not auto-fetch token. Please ensure you are logged into AstreWork on that tab.');
      }
    } catch (e) {
      alert('Auto-detection error: ' + e.message);
    } finally {
      btnAutoToken.textContent = 'Auto';
    }
  });

  // Settings Toggle
  btnSettingsToggle.addEventListener('click', () => {
    if (viewConnected.classList.contains('hidden')) {
      initialize();
    } else {
      showView(viewSetup);
    }
  });

  initialize();
});
