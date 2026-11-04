/**
 * AstrePilot Popup Controller (Manifest V3)
 * -----------------------------------------
 * Hard-locked to global production (https://astrework.app).
 */

const PROD_ORIGIN = 'https://astrework.app';

document.addEventListener('DOMContentLoaded', async () => {
  const viewLoading = document.getElementById('view-loading');
  const viewConnected = document.getElementById('view-connected');
  const viewSetup = document.getElementById('view-setup');

  const userName = document.getElementById('user-name');
  const userTitle = document.getElementById('user-title');
  const userAvatar = document.getElementById('user-avatar');

  const atsEngineLabel = document.getElementById('ats-engine-label');
  const primedBox = document.getElementById('primed-box');
  const primedTarget = document.getElementById('primed-target');

  const statFills = document.getElementById('stat-fills');
  const statFields = document.getElementById('stat-fields');
  const statHours = document.getElementById('stat-hours');

  const btnLaunchHud = document.getElementById('btn-launch-hud');
  const btnAutofillDirect = document.getElementById('btn-autofill-direct');
  const btnCopyCover = document.getElementById('btn-copy-cover');
  const btnCopyCoverText = document.getElementById('btn-copy-cover-text');
  const btnOpenResume = document.getElementById('btn-open-resume');

  const btnTopDashboard = document.getElementById('btn-top-dashboard');
  const btnTopShield = document.getElementById('btn-top-shield');
  const btnTopSettings = document.getElementById('btn-top-settings');
  const btnTopLogout = document.getElementById('btn-top-logout');
  const btnTopClose = document.getElementById('btn-top-close');

  const loginForm = document.getElementById('login-form');
  const inputEmail = document.getElementById('input-email');
  const inputPassword = document.getElementById('input-password');
  const btnTogglePassword = document.getElementById('btn-toggle-password');
  const iconEyeShow = document.getElementById('icon-eye-show');
  const iconEyeHide = document.getElementById('icon-eye-hide');
  const loginErrorMsg = document.getElementById('login-error-msg');
  const btnLogin = document.getElementById('btn-login');
  const btnLoginText = document.getElementById('btn-login-text');
  const linkSignup = document.getElementById('link-signup');

  const btnSocialGoogle = document.getElementById('btn-social-google');
  const btnSocialGithub = document.getElementById('btn-social-github');

  function showView(view) {
    [viewLoading, viewConnected, viewSetup].forEach(v => v?.classList.add('hidden'));
    view?.classList.remove('hidden');
  }

  /**
   * Always returns PROD_ORIGIN ('https://astrework.app') and purges any stale
   * non-production origins from both sync and local storage.
   */
  async function getStoredConfig() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['astrepilot_token', 'astrepilot_origin'], (res) => {
        const safeRes = res || {};
        if (safeRes.astrepilot_origin !== PROD_ORIGIN) {
          chrome.storage.sync.set({ astrepilot_origin: PROD_ORIGIN });
        }
        if (chrome.storage.local) {
          chrome.storage.local.set({ astrepilot_origin: PROD_ORIGIN });
        }
        resolve({
          token: safeRes.astrepilot_token || null,
          origin: PROD_ORIGIN
        });
      });
    });
  }

  /**
   * Attempts to auto-sync token if user already has an authenticated
   * https://astrework.app tab open in Chrome.
   */
  async function tryAutoSyncFromOpenTab() {
    try {
      const tabs = await chrome.tabs.query({});
      const astreTab = tabs.find(t => t.url && t.url.startsWith(PROD_ORIGIN));
      if (!astreTab || !astreTab.id) return null;

      const results = await chrome.scripting.executeScript({
        target: { tabId: astreTab.id },
        func: async () => {
          try {
            const res = await fetch('/api/autopilot/token');
            if (res.ok) {
              const data = await res.json();
              return data.token || null;
            }
          } catch {}
          return null;
        }
      });

      const token = results && results[0] && results[0].result;
      if (token) {
        await new Promise((r) => chrome.storage.sync.set({ astrepilot_token: token, astrepilot_origin: PROD_ORIGIN }, r));
        if (chrome.storage.local) {
          await new Promise((r) => chrome.storage.local.set({ astrepilot_token: token, astrepilot_origin: PROD_ORIGIN }, r));
        }
        return token;
      }
    } catch {}
    return null;
  }

  async function sendToTab(tabId, action) {
    try {
      await chrome.tabs.sendMessage(tabId, { action }, { frameId: 0 });
    } catch {
      try {
        await chrome.scripting.executeScript({ target: { tabId, frameIds: [0] }, files: ['hud-ui.js'] });
        await chrome.scripting.insertCSS({ target: { tabId, frameIds: [0] }, files: ['hud.css'] });
        await chrome.scripting.executeScript({ target: { tabId, frameIds: [0] }, files: ['content.js'] });
        await new Promise(r => setTimeout(r, 350));
        await chrome.tabs.sendMessage(tabId, { action }, { frameId: 0 }).catch(() => {});
      } catch (injectErr) {
        if (injectErr.message && injectErr.message.includes('Cannot access')) {
          alert('Please navigate to a job application page first.');
        }
      }
    }
  }

  async function detectActivePageAts() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url || !atsEngineLabel) return;
      const url = tab.url.toLowerCase();

      if (url.includes('wellfound.com')) {
        atsEngineLabel.textContent = 'Wellfound Remote Active';
      } else if (url.includes('greenhouse.io')) {
        atsEngineLabel.textContent = 'Greenhouse ATS Active';
      } else if (url.includes('lever.co')) {
        atsEngineLabel.textContent = 'Lever ATS Active';
      } else if (url.includes('ashbyhq.com')) {
        atsEngineLabel.textContent = 'Ashby ATS Active';
      } else if (url.includes('myworkdayjobs.com')) {
        atsEngineLabel.textContent = 'Workday ATS Active';
      } else if (url.startsWith('http')) {
        atsEngineLabel.textContent = 'Universal Autofill Armed';
      } else {
        atsEngineLabel.textContent = 'Ready on Job Forms';
      }
    } catch {}
  }

  async function initialize() {
    showView(viewLoading);
    let { token } = await getStoredConfig();

    if (!token) {
      token = await tryAutoSyncFromOpenTab();
    }

    if (!token) {
      if (btnTopLogout) btnTopLogout.classList.add('hidden');
      showView(viewSetup);
      return;
    }

    try {
      const [profileRes, sessionRes, statsRes] = await Promise.all([
        fetch(PROD_ORIGIN + '/api/autopilot/profile', {
          headers: { 'Authorization': 'Bearer ' + token }
        }),
        fetch(PROD_ORIGIN + '/api/autopilot/session', {
          headers: { 'Authorization': 'Bearer ' + token }
        }).catch(() => null),
        fetch(PROD_ORIGIN + '/api/autopilot/log', {
          headers: { 'Authorization': 'Bearer ' + token }
        }).catch(() => null),
      ]);

      if (!profileRes.ok) throw new Error('Session expired');
      const profile = await profileRes.json();

      if (btnTopLogout) btnTopLogout.classList.remove('hidden');

      if (userName) {
        userName.textContent = profile.fullName || 'Candidate';
        userName.title = userName.textContent;
      }
      if (userTitle) {
        userTitle.textContent = profile.title || 'Software Developer';
        userTitle.title = userTitle.textContent;
      }

      const parts = (profile.fullName || 'AW').trim().split(/\s+/);
      const initials = parts.length > 1
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : parts[0].slice(0, 2).toUpperCase();
      if (userAvatar) userAvatar.textContent = initials;

      if (sessionRes && sessionRes.ok) {
        const sData = await sessionRes.json();
        if (sData.session && sData.session.company) {
          const targetStr = sData.session.company + (sData.session.jobTitle ? ' — ' + sData.session.jobTitle : '');
          if (primedTarget) {
            primedTarget.textContent = targetStr;
            primedTarget.title = targetStr;
          }
          primedBox?.classList.remove('hidden');
        } else {
          primedBox?.classList.add('hidden');
        }
      }

      if (statsRes && statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.stats) {
          if (statFills) statFills.textContent = statsData.stats.fills || 0;
          if (statFields) statFields.textContent = statsData.stats.fields || 0;
          if (statHours) statHours.textContent = (statsData.stats.hoursSaved || 0) + 'h';
        }
      }

      await detectActivePageAts();
      showView(viewConnected);
    } catch {
      if (btnTopLogout) btnTopLogout.classList.add('hidden');
      showView(viewSetup);
    }
  }

  // Top Utility Pills (All strictly routed to https://astrework.app)
  if (btnTopDashboard) {
    btnTopDashboard.addEventListener('click', () => {
      chrome.tabs.create({ url: PROD_ORIGIN + '/dashboard' });
    });
  }

  if (btnTopShield) {
    btnTopShield.addEventListener('click', () => {
      chrome.tabs.create({ url: PROD_ORIGIN + '/applications' });
    });
  }

  if (btnTopSettings) {
    btnTopSettings.addEventListener('click', () => {
      chrome.tabs.create({ url: PROD_ORIGIN + '/settings' });
    });
  }

  if (btnTopLogout) {
    btnTopLogout.addEventListener('click', async () => {
      const keysToRemove = [
        'astrepilot_token',
        'astrepilot_active_context',
        'astrepilot_candidate_slug',
        'astrepilot_profile'
      ];
      await new Promise((resolve) => chrome.storage.sync.remove(keysToRemove, resolve));
      if (chrome.storage.local) {
        await new Promise((resolve) => chrome.storage.local.remove(keysToRemove, resolve));
      }
      if (inputPassword) inputPassword.value = '';
      initialize();
    });
  }

  if (btnTopClose) {
    btnTopClose.addEventListener('click', () => {
      window.close();
    });
  }

  // Password Visibility Toggle
  if (btnTogglePassword && inputPassword) {
    btnTogglePassword.addEventListener('click', () => {
      const isPassword = inputPassword.type === 'password';
      inputPassword.type = isPassword ? 'text' : 'password';
      iconEyeShow?.classList.toggle('hidden', isPassword);
      iconEyeHide?.classList.toggle('hidden', !isPassword);
      inputPassword.focus();
    });
  }

  // Direct Email & Password Sign-In Form
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = (inputEmail?.value || '').trim();
      const password = (inputPassword?.value || '').trim();

      if (!email || !password) {
        if (loginErrorMsg) {
          loginErrorMsg.textContent = 'Please enter your email and password.';
          loginErrorMsg.classList.remove('hidden');
        }
        return;
      }

      if (loginErrorMsg) loginErrorMsg.classList.add('hidden');
      if (btnLoginText) btnLoginText.textContent = 'Signing in…';
      if (btnLogin) btnLogin.disabled = true;

      try {
        const res = await fetch(PROD_ORIGIN + '/api/autopilot/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok || !data.success || !data.token) {
          throw new Error(data.error || 'Invalid email or password');
        }

        const candidateSlug = data.profile?.slug || '';
        const payload = {
          astrepilot_token: data.token,
          astrepilot_origin: PROD_ORIGIN,
          astrepilot_active_context: candidateSlug,
          astrepilot_candidate_slug: candidateSlug
        };
        await new Promise((resolve) => chrome.storage.sync.set(payload, resolve));
        if (chrome.storage.local) {
          await new Promise((resolve) => chrome.storage.local.set(payload, resolve));
        }

        initialize();
      } catch (err) {
        if (loginErrorMsg) {
          loginErrorMsg.textContent = err.message || 'Sign in failed. Please check your credentials.';
          loginErrorMsg.classList.remove('hidden');
        }
      } finally {
        if (btnLoginText) btnLoginText.textContent = 'Login';
        if (btnLogin) btnLogin.disabled = false;
      }
    });
  }

  // Sign Up Link
  if (linkSignup) {
    linkSignup.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: PROD_ORIGIN + '/register' });
    });
  }

  // Social Auth Pills (Route to https://astrework.app/login)
  if (btnSocialGoogle) {
    btnSocialGoogle.addEventListener('click', () => {
      chrome.tabs.create({ url: PROD_ORIGIN + '/login' });
    });
  }

  if (btnSocialGithub) {
    btnSocialGithub.addEventListener('click', () => {
      chrome.tabs.create({ url: PROD_ORIGIN + '/login' });
    });
  }

  // Connected Cockpit Actions
  if (btnAutofillDirect) {
    btnAutofillDirect.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id) {
        await sendToTab(tab.id, 'AUTOFILL');
        window.close();
      }
    });
  }

  if (btnLaunchHud) {
    btnLaunchHud.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id) {
        await sendToTab(tab.id, 'TOGGLE_HUD');
        window.close();
      }
    });
  }

  if (btnCopyCover) {
    btnCopyCover.addEventListener('click', async () => {
      const { token } = await getStoredConfig();
      if (!token) return;

      const origText = btnCopyCoverText ? btnCopyCoverText.textContent : 'Copy Cover Letter';
      if (btnCopyCoverText) btnCopyCoverText.textContent = 'Generating…';

      try {
        const res = await fetch(PROD_ORIGIN + '/api/autopilot/cover-letter', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({})
        });

        const data = await res.json();
        if (data.success && data.coverLetter) {
          await navigator.clipboard.writeText(data.coverLetter);
          if (btnCopyCoverText) btnCopyCoverText.textContent = 'Copied! ✓';
          setTimeout(() => {
            if (btnCopyCoverText) btnCopyCoverText.textContent = origText;
          }, 2000);
        } else {
          throw new Error('Failed');
        }
      } catch {
        if (btnCopyCoverText) btnCopyCoverText.textContent = 'Error';
        setTimeout(() => {
          if (btnCopyCoverText) btnCopyCoverText.textContent = origText;
        }, 2000);
      }
    });
  }

  if (btnOpenResume) {
    btnOpenResume.addEventListener('click', () => {
      chrome.tabs.create({ url: PROD_ORIGIN + '/resume-maker' });
    });
  }

  initialize();
});
