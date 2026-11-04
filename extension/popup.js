/**
 * AstrePilot Popup Controller (Manifest V3) — Silicon Valley Grade (Zapply-Killer)
 * --------------------------------------------------------------------------------
 * Full lifecycle controller for the high-density toolbar popup:
 * - Direct authentication via bcrypt password / founder master code (9926)
 * - Top floating utility pills (Dashboard, AstreShield, Settings, Sign Out, Close)
 * - Inset Feather icon inputs with password show/hide toggle
 * - Tactile 3D action buttons
 * - Live active tab ATS engine detection & AstreShield trust status
 * - Quick copy tailored cover letter & 1-click synthetic resume studio access
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Views
  const viewLoading = document.getElementById('view-loading');
  const viewConnected = document.getElementById('view-connected');
  const viewSetup = document.getElementById('view-setup');

  // Candidate Profile Elements
  const userName = document.getElementById('user-name');
  const userTitle = document.getElementById('user-title');
  const userAvatar = document.getElementById('user-avatar');
  const rolePillBadge = document.getElementById('role-pill-badge');

  // ATS Radar & AstreShield Elements
  const atsEngineLabel = document.getElementById('ats-engine-label');
  const atsRadarSub = document.getElementById('ats-radar-sub');
  const astreshieldBadge = document.getElementById('astreshield-badge');

  // Primed Kit Elements
  const primedBox = document.getElementById('primed-box');
  const primedTarget = document.getElementById('primed-target');

  // Metrics
  const statFills = document.getElementById('stat-fills');
  const statFields = document.getElementById('stat-fields');
  const statHours = document.getElementById('stat-hours');

  // Action Buttons
  const btnLaunchHud = document.getElementById('btn-launch-hud');
  const btnAutofillDirect = document.getElementById('btn-autofill-direct');
  const btnCopyCover = document.getElementById('btn-copy-cover');
  const btnCopyCoverText = document.getElementById('btn-copy-cover-text');
  const btnOpenResume = document.getElementById('btn-open-resume');

  // Top Floating Utility Buttons
  const btnTopDashboard = document.getElementById('btn-top-dashboard');
  const btnTopShield = document.getElementById('btn-top-shield');
  const btnTopSettings = document.getElementById('btn-top-settings');
  const btnTopLogout = document.getElementById('btn-top-logout');
  const btnTopClose = document.getElementById('btn-top-close');

  // Form & Setup Elements
  const inputOrigin = document.getElementById('input-origin');
  const inputToken = document.getElementById('input-token');
  const inputEmail = document.getElementById('input-email');
  const inputPassword = document.getElementById('input-password');
  const btnTogglePassword = document.getElementById('btn-toggle-password');
  const iconEyeShow = document.getElementById('icon-eye-show');
  const iconEyeHide = document.getElementById('icon-eye-hide');
  const loginErrorMsg = document.getElementById('login-error-msg');
  const btnLogin = document.getElementById('btn-login');
  const btnLoginText = document.getElementById('btn-login-text');
  const linkSignup = document.getElementById('link-signup');

  // Social Auth Pills
  const btnSocialGoogle = document.getElementById('btn-social-google');
  const btnSocialGithub = document.getElementById('btn-social-github');
  const btnQuickFounder = document.getElementById('btn-quick-founder');

  // Advanced Token Elements
  const btnConnect = document.getElementById('btn-connect');
  const btnAutoToken = document.getElementById('btn-auto-token');

  // Environment Switchers
  const btnEnvProd = document.getElementById('btn-env-prod');
  const btnEnvLocal = document.getElementById('btn-env-local');

  // Footer Status
  const footerStatusDot = document.getElementById('footer-status-dot');
  const footerStatusText = document.getElementById('footer-status-text');
  const linkDashboard = document.getElementById('link-dashboard');

  function showView(view) {
    [viewLoading, viewConnected, viewSetup].forEach(v => v?.classList.add('hidden'));
    view?.classList.remove('hidden');
  }

  function setStatus(text, isOk = true) {
    if (footerStatusText) footerStatusText.textContent = text;
    if (footerStatusDot) {
      footerStatusDot.style.background = isOk ? 'var(--aw-green)' : '#f59e0b';
    }
  }

  async function getStoredConfig() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['astrepilot_token', 'astrepilot_origin'], (res) => {
        const safeRes = res || {};
        let origin = (safeRes.astrepilot_origin || 'https://astrework.app').trim();
        if (!origin || origin.includes('vercel.app')) {
          origin = 'https://astrework.app';
          chrome.storage.sync.set({ astrepilot_origin: origin });
        }
        resolve({
          token: safeRes.astrepilot_token || null,
          origin
        });
      });
    });
  }

  async function saveConfig(token, origin) {
    let cleanOrigin = (origin || 'https://astrework.app').trim();
    if (cleanOrigin.includes('vercel.app')) {
      cleanOrigin = 'https://astrework.app';
    }
    return new Promise((resolve) => {
      chrome.storage.sync.set({ astrepilot_token: token, astrepilot_origin: cleanOrigin }, resolve);
    });
  }

  /**
   * Ensures hud-ui.js + content.js are injected into the active tab,
   * then delivers the requested action message.
   */
  async function sendToTab(tabId, action) {
    try {
      await chrome.tabs.sendMessage(tabId, { action }, { frameId: 0 });
    } catch {
      try {
        await chrome.scripting.executeScript({ target: { tabId, frameIds: [0] }, files: ['hud-ui.js'] });
        await chrome.scripting.insertCSS({ target: { tabId, frameIds: [0] }, files: ['hud.css'] });
        await chrome.scripting.executeScript({ target: { tabId, frameIds: [0] }, files: ['content.js'] });
        await new Promise(r => setTimeout(r, 400));
        await chrome.tabs.sendMessage(tabId, { action }, { frameId: 0 }).catch(() => {});
      } catch (injectErr) {
        console.error('[AstrePilot Popup] Injection failed:', injectErr);
        if (injectErr.message && injectErr.message.includes('Cannot access')) {
          alert('AstrePilot cannot run on internal browser URLs. Please navigate to a standard job application page first.');
        }
      }
    }
  }

  /**
   * Inspects the active browser tab to identify ATS engine and security posture.
   */
  async function detectActivePageAts() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url) return;

      const url = tab.url.toLowerCase();

      if (url.includes('wellfound.com')) {
        if (atsEngineLabel) atsEngineLabel.textContent = 'Wellfound Remote Active';
        if (atsRadarSub) atsRadarSub.textContent = 'Universal Combobox Engine & Notes Ready';
      } else if (url.includes('greenhouse.io') || url.includes('boards.greenhouse.io')) {
        if (atsEngineLabel) atsEngineLabel.textContent = 'Greenhouse ATS Active';
        if (atsRadarSub) atsRadarSub.textContent = 'Multi-step form & resume dropzone ready';
      } else if (url.includes('lever.co')) {
        if (atsEngineLabel) atsEngineLabel.textContent = 'Lever ATS Active';
        if (atsRadarSub) atsRadarSub.textContent = 'Universal Combobox & auto-fill ready';
      } else if (url.includes('ashbyhq.com')) {
        if (atsEngineLabel) atsEngineLabel.textContent = 'Ashby ATS Active';
        if (atsRadarSub) atsRadarSub.textContent = 'Synthetic PDF & question mapper ready';
      } else if (url.includes('myworkdayjobs.com')) {
        if (atsEngineLabel) atsEngineLabel.textContent = 'Workday Active';
        if (atsRadarSub) atsRadarSub.textContent = 'UCDE comboboxes & multi-page stepper ready';
      } else if (url.startsWith('http')) {
        if (atsEngineLabel) atsEngineLabel.textContent = 'Universal Job Page Active';
        if (atsRadarSub) atsRadarSub.textContent = 'Universal Combobox & field detector armed';
      } else {
        if (atsEngineLabel) atsEngineLabel.textContent = 'Standby (Browser Page)';
        if (atsRadarSub) atsRadarSub.textContent = 'Navigate to any job application to autofill';
      }
    } catch (err) {
      console.warn('[AstrePilot] ATS detection error:', err);
    }
  }

  async function initialize() {
    showView(viewLoading);
    const { token, origin } = await getStoredConfig();
    if (inputOrigin) inputOrigin.value = origin;

    // Highlight active server pill
    const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1');
    if (btnEnvProd && btnEnvLocal) {
      btnEnvProd.classList.toggle('active', !isLocal);
      btnEnvLocal.classList.toggle('active', isLocal);
    }

    if (!token) {
      setStatus('Sign In Required', false);
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

      setStatus('Connected & Synced', true);
      if (userName) {
        userName.textContent = profile.fullName || 'AstreWork Candidate';
        userName.title = userName.textContent;
      }
      if (userTitle) {
        userTitle.textContent = profile.title || 'Software Developer';
        userTitle.title = userTitle.textContent;
      }

      // Avatar Initials
      const parts = (profile.fullName || 'AW').trim().split(/\s+/);
      const initials = parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase();
      if (userAvatar) userAvatar.textContent = initials;

      // Active Target Application Session
      if (sessionRes && sessionRes.ok) {
        const sData = await sessionRes.json();
        if (sData.session && sData.session.company) {
          const targetStr = sData.session.company + (sData.session.jobTitle ? ' (' + sData.session.jobTitle + ')' : '');
          if (primedTarget) {
            primedTarget.textContent = targetStr;
            primedTarget.title = targetStr;
          }
          primedBox?.classList.remove('hidden');
        } else {
          primedBox?.classList.add('hidden');
        }
      }

      // Metrics
      if (statsRes && statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.stats) {
          if (statFills) statFills.textContent = statsData.stats.fills || 0;
          if (statFields) statFields.textContent = statsData.stats.fields || 0;
          if (statHours) statHours.textContent = (statsData.stats.hoursSaved || 0) + 'h';
        }
      }

      // Run live ATS detection on current tab
      await detectActivePageAts();

      showView(viewConnected);
    } catch (err) {
      console.warn('[AstrePilot Popup] Connection failed:', err);
      setStatus('Sign In Required', false);
      showView(viewSetup);
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // EVENT LISTENERS: TOP UTILITY PILLS (ZAPPLY-GRADE NAVIGATION)
  // ══════════════════════════════════════════════════════════════════════
  if (btnTopDashboard) {
    btnTopDashboard.addEventListener('click', async () => {
      const { origin } = await getStoredConfig();
      chrome.tabs.create({ url: origin.replace(/\/$/, '') + '/dashboard' });
    });
  }

  if (btnTopShield) {
    btnTopShield.addEventListener('click', async () => {
      const { origin } = await getStoredConfig();
      chrome.tabs.create({ url: origin.replace(/\/$/, '') + '/dashboard?tab=shield' });
    });
  }

  if (btnTopSettings) {
    btnTopSettings.addEventListener('click', () => {
      if (viewConnected && !viewConnected.classList.contains('hidden')) {
        showView(viewSetup);
      } else {
        initialize();
      }
    });
  }

  if (btnTopLogout) {
    btnTopLogout.addEventListener('click', async () => {
      await new Promise((resolve) => {
        chrome.storage.sync.remove([
          'astrepilot_token',
          'astrepilot_active_context',
          'astrepilot_candidate_slug',
          'astrepilot_profile'
        ], resolve);
      });
      initialize();
    });
  }

  if (btnTopClose) {
    btnTopClose.addEventListener('click', () => {
      window.close();
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  // EVENT LISTENERS: PASSWORD SHOW / HIDE TOGGLE
  // ══════════════════════════════════════════════════════════════════════
  if (btnTogglePassword && inputPassword) {
    btnTogglePassword.addEventListener('click', () => {
      const isPassword = inputPassword.type === 'password';
      inputPassword.type = isPassword ? 'text' : 'password';
      iconEyeShow?.classList.toggle('hidden', isPassword);
      iconEyeHide?.classList.toggle('hidden', !isPassword);
      inputPassword.focus();
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  // EVENT LISTENERS: 1-CLICK ENVIRONMENT SWITCHING
  // ══════════════════════════════════════════════════════════════════════
  if (btnEnvProd) {
    btnEnvProd.addEventListener('click', async () => {
      const { token } = await getStoredConfig();
      if (inputOrigin) inputOrigin.value = 'https://astrework.app';
      await saveConfig(token, 'https://astrework.app');
      initialize();
    });
  }

  if (btnEnvLocal) {
    btnEnvLocal.addEventListener('click', async () => {
      const { token } = await getStoredConfig();
      if (inputOrigin) inputOrigin.value = 'http://localhost:3000';
      await saveConfig(token, 'http://localhost:3000');
      initialize();
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  // EVENT LISTENERS: AUTHENTICATION (DIRECT & FOUNDER CODE 9926)
  // ══════════════════════════════════════════════════════════════════════
  if (btnLogin) {
    btnLogin.addEventListener('click', async () => {
      const email = (inputEmail?.value || '').trim();
      const password = (inputPassword?.value || '').trim();
      const origin = (inputOrigin?.value || 'https://astrework.app').trim().replace(/\/$/, '');

      if (!email || !password) {
        if (loginErrorMsg) {
          loginErrorMsg.textContent = 'Please enter both email and password / access code.';
          loginErrorMsg.classList.remove('hidden');
        }
        return;
      }

      if (loginErrorMsg) loginErrorMsg.classList.add('hidden');
      if (btnLoginText) btnLoginText.textContent = 'Signing in…';
      btnLogin.disabled = true;

      try {
        const res = await fetch(origin + '/api/autopilot/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok || !data.success || !data.token) {
          throw new Error(data.error || 'Invalid credentials');
        }

        const candidateSlug = data.profile?.slug || (email.toLowerCase().includes('ayushi') ? 'ayushi' : 'roushan');
        await new Promise((resolve) => {
          chrome.storage.sync.set({
            astrepilot_token: data.token,
            astrepilot_origin: origin,
            astrepilot_active_context: candidateSlug,
            astrepilot_candidate_slug: candidateSlug
          }, resolve);
        });

        initialize();
      } catch (err) {
        if (loginErrorMsg) {
          loginErrorMsg.textContent = err.message || 'Login failed. Please check your credentials.';
          loginErrorMsg.classList.remove('hidden');
        }
      } finally {
        if (btnLoginText) btnLoginText.textContent = 'Sign In to AstreWork';
        btnLogin.disabled = false;
      }
    });
  }

  // Social Auth Buttons (Google, GitHub, Founder Key)
  if (btnSocialGoogle) {
    btnSocialGoogle.addEventListener('click', async () => {
      const { origin } = await getStoredConfig();
      chrome.tabs.create({ url: origin.replace(/\/$/, '') + '/login?provider=google' });
    });
  }

  if (btnSocialGithub) {
    btnSocialGithub.addEventListener('click', async () => {
      const { origin } = await getStoredConfig();
      chrome.tabs.create({ url: origin.replace(/\/$/, '') + '/login?provider=github' });
    });
  }

  // 1-Click Founder Access Key (Auto-fills Roushan's Founder Credentials)
  if (btnQuickFounder) {
    btnQuickFounder.addEventListener('click', () => {
      if (inputEmail) inputEmail.value = 'playboxstation460@gmail.com';
      if (inputPassword) inputPassword.value = '9926';
      if (btnLogin) btnLogin.click();
    });
  }

  // "New Here? Sign Up" Link
  if (linkSignup) {
    linkSignup.addEventListener('click', async (e) => {
      e.preventDefault();
      const { origin } = await getStoredConfig();
      chrome.tabs.create({ url: origin.replace(/\/$/, '') + '/register' });
    });
  }

  // Advanced Token Connect
  if (btnConnect) {
    btnConnect.addEventListener('click', async () => {
      const token = inputToken?.value?.trim();
      const origin = inputOrigin?.value?.trim() || 'https://astrework.app';
      if (!token) {
        alert('Please enter your AstrePilot HMAC token.');
        return;
      }
      await saveConfig(token, origin);
      initialize();
    });
  }

  // Auto Token Detection from open tab
  if (btnAutoToken) {
    btnAutoToken.addEventListener('click', async () => {
      btnAutoToken.textContent = '…';
      try {
        const tabs = await chrome.tabs.query({});
        let origin = (inputOrigin?.value || 'https://astrework.app').trim().replace(/\/$/, '');
        const astreTab = tabs.find(t => t.url && (t.url.startsWith('https://astrework.app') || t.url.includes('localhost:3000'))) ||
                         tabs.find(t => t.url && (t.url.startsWith(origin) || t.url.includes('/dashboard')));

        if (!astreTab) {
          alert('No open AstreWork tab detected. Please sign into AstreWork in a browser tab first.');
          btnAutoToken.textContent = 'Auto';
          return;
        }

        const results = await chrome.scripting.executeScript({
          target: { tabId: astreTab.id },
          func: async () => {
            try {
              const res = await fetch('/api/autopilot/token');
              if (res.ok) {
                const data = await res.json();
                return data.token;
              }
            } catch {}
            return null;
          }
        });

        const token = results && results[0] && results[0].result;
        if (token) {
          if (inputToken) inputToken.value = token;
          await saveConfig(token, origin);
          initialize();
        } else {
          alert('Could not auto-fetch token. Ensure you are signed into AstreWork on that tab.');
        }
      } catch (e) {
        alert('Auto-detection error: ' + e.message);
      } finally {
        btnAutoToken.textContent = 'Auto';
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  // EVENT LISTENERS: APPLICATION ACTIONS (AUTOFILL & HUD)
  // ══════════════════════════════════════════════════════════════════════
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

  // Quick Copy Tailored Cover Letter
  if (btnCopyCover) {
    btnCopyCover.addEventListener('click', async () => {
      const { token, origin } = await getStoredConfig();
      if (!token) return;

      const origText = btnCopyCoverText ? btnCopyCoverText.textContent : 'Tailored Cover Letter';
      if (btnCopyCoverText) btnCopyCoverText.textContent = 'Generating…';

      try {
        const cleanOrigin = origin.replace(/\/$/, '');
        const res = await fetch(cleanOrigin + '/api/autopilot/cover-letter', {
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
          if (btnCopyCoverText) btnCopyCoverText.textContent = 'Copied! ✍️';
          setTimeout(() => {
            if (btnCopyCoverText) btnCopyCoverText.textContent = origText;
          }, 2200);
        } else {
          throw new Error('No tailored cover letter generated');
        }
      } catch (err) {
        console.warn('[AstrePilot] Copy cover letter error:', err);
        if (btnCopyCoverText) btnCopyCoverText.textContent = 'Failed to copy';
        setTimeout(() => {
          if (btnCopyCoverText) btnCopyCoverText.textContent = origText;
        }, 2000);
      }
    });
  }

  // Open Resume Studio
  if (btnOpenResume) {
    btnOpenResume.addEventListener('click', async () => {
      const { origin } = await getStoredConfig();
      chrome.tabs.create({ url: origin.replace(/\/$/, '') + '/resume-maker' });
    });
  }

  if (linkDashboard) {
    linkDashboard.addEventListener('click', async (e) => {
      e.preventDefault();
      const { origin } = await getStoredConfig();
      chrome.tabs.create({ url: origin.replace(/\/$/, '') + '/dashboard' });
    });
  }

  // Initial render
  initialize();
});
