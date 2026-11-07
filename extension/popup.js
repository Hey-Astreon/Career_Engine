/**
 * AstrePilot Popup Controller (Manifest V3)
 * -----------------------------------------
 * Hard-locked to global production (https://astrework.app).
 * Zero-Lockout Architecture with Autonomous Standalone Profiles.
 */

const PROD_ORIGIN = 'https://astrework.app';

// Autonomous Standalone Profiles (BCA Candidate Title Compliant: Developer / Architect, NEVER Engineer)
const STANDALONE_PROFILES = {
  roushan: {
    firstName: 'Roushan',
    lastName: 'Kumar',
    fullName: 'Roushan Kumar',
    preferredName: 'Roushan',
    email: 'roushanraut404@gmail.com',
    phone: '+919431483512',
    phoneType: 'Mobile',
    title: 'Software Developer — Backend & Cloud',
    location: 'Patna, Bihar, India',
    preferredLocation: 'Remote',
    workplacePreference: 'Remote',
    city: 'Patna',
    state: 'Bihar',
    country: 'India',
    streetAddress: 'Indrapuri, North Patel Nagar',
    zipCode: '800024',
    addressType: 'Home',
    linkedinUrl: 'https://linkedin.com/in/astreon4547',
    githubUrl: 'https://github.com/Hey-Astreon',
    portfolioUrl: 'https://astreon.me',
    school: 'Amity University',
    degree: 'Bachelor of Computer Applications (BCA)',
    discipline: 'Computer Science',
    highestEducation: 'Bachelor of Computer Applications (BCA)',
    startMonth: 'July',
    startYear: '2025',
    endMonth: 'July',
    endYear: '2028',
    graduationYear: '2028',
    currentRole: true,
    workAuthorized: true,
    requiresVisa: true,
    is18OrOlder: 'Yes',
    gender: 'Male',
    pronouns: 'He/Him',
    hispanicLatino: 'No',
    veteranStatus: 'I am not a protected veteran',
    disabilityStatus: "No, I don't have a disability",
    race: 'Asian',
    company: 'AstreWork',
    employmentTitle: 'Creator & Lead Backend Developer',
    noticePeriod: 'Immediate',
    willingnessToRelocate: true,
    languages: 'English, Hindi',
    privacyConsent: 'Confirmed',
    aiConsent: 'Yes',
    aiUsage: 'regularly use AI tools and developer copilots',
    professionalSummary: 'Software Developer focused on backend systems, distributed data pipelines, and cloud infrastructure. Architected and operate AstreWork on Oracle Cloud (OCI ARM64), utilizing Dockerized background workers, Turso SQLite, and Redis caching to orchestrate high-throughput distributed workflows. Also shipped an AST code-graph analysis sandbox with sub-200ms execution and a client-side AES-256-GCM password vault.',
    slug: 'roushan',
    token: 'eyJ1aWQiOiJjYTBkNDQyYi0yNjg5LTRlYjMtYjQzZS02OTQzOGI3YjlkZWIiLCJleHAiOjE4MDAzMDE3Mjg3Nzd9.7ZEI2esQ6tghubLS1yHMmDs_a9ODwJmN5PhC09v-2bs',
    _isStandalone: true
  },
  ayushi: {
    firstName: 'Ayushi',
    lastName: 'Raj',
    fullName: 'Ayushi Raj',
    preferredName: 'Ayushi',
    email: 'ayushi29507@gmail.com',
    phone: '+918709852305',
    phoneType: 'Mobile',
    title: 'Software Developer — Full-Stack & AI',
    location: 'Nawada, Bihar, India',
    preferredLocation: 'Remote',
    workplacePreference: 'Remote',
    city: 'Nawada',
    state: 'Bihar',
    country: 'India',
    streetAddress: 'Mirzapur, Nawada, Bihar',
    zipCode: '805110',
    addressType: 'Home',
    linkedinUrl: 'https://www.linkedin.com/in/alrya404/',
    githubUrl: 'https://github.com/Silenttears-cloud',
    portfolioUrl: 'https://ayushiraj.me',
    slug: 'ayushi',
    school: 'Amity University',
    degree: 'Bachelor of Computer Applications (BCA)',
    discipline: 'Computer Science',
    highestEducation: 'Bachelor of Computer Applications (BCA)',
    startMonth: 'July',
    startYear: '2025',
    endMonth: 'July',
    endYear: '2028',
    graduationYear: '2028',
    currentRole: true,
    workAuthorized: true,
    requiresVisa: false,
    is18OrOlder: 'Yes',
    gender: 'Female',
    pronouns: 'She/Her',
    hispanicLatino: 'No',
    veteranStatus: 'I am not a protected veteran',
    disabilityStatus: "No, I don't have a disability",
    race: 'Asian',
    company: 'AstreWork',
    employmentTitle: 'Co-Developer & Lead Frontend Architect',
    noticePeriod: 'Immediate',
    willingnessToRelocate: true,
    languages: 'English, Hindi',
    privacyConsent: 'Confirmed',
    aiConsent: 'Yes',
    aiUsage: 'regularly use AI tools and developer copilots',
    professionalSummary: 'Full-Stack Software Developer building React 19, Next.js, TypeScript, and AI-powered web applications. Co-developed AstreWork and the AstrePilot Chrome Extension (MV3), designing the 6-stage Shadow DOM autofill HUD, real-time ATS resume canvas, and multi-LLM routing layer across Gemini and Groq. Also built the interactive React Flow graph explorer for Astra Vision and the PBKDF2 zero-knowledge vault interface for Alyra Lock.',
    token: 'eyJ1aWQiOiJjYTBkNDQyYi0yNjg5LTRlYjMtYjQzZS02OTQzOGI3YjlkZWIiLCJleHAiOjE4MDAzMDE3Mjg3Nzd9.7ZEI2esQ6tghubLS1yHMmDs_a9ODwJmN5PhC09v-2bs',
    _isStandalone: true
  }
};

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
  const btnQuickSync = document.getElementById('btn-quick-sync');
  const btnQuickSyncText = document.getElementById('btn-quick-sync-text');

  function showView(view) {
    [viewLoading, viewConnected, viewSetup].forEach(v => v?.classList.add('hidden'));
    view?.classList.remove('hidden');
  }

  /**
   * Reads stored configuration from both chrome.storage.local and chrome.storage.sync.
   */
  async function getStoredConfig() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['astrepilot_token', 'astrepilot_origin', 'astrepilot_active_context', 'astrepilot_candidate_slug', 'astrepilot_logged_out'], (localRes) => {
        const local = localRes || {};
        chrome.storage.sync.get(['astrepilot_token', 'astrepilot_origin', 'astrepilot_active_context', 'astrepilot_candidate_slug', 'astrepilot_logged_out'], (syncRes) => {
          const sync = syncRes || {};
          const token = local.astrepilot_token || sync.astrepilot_token || null;
          const activeContext = local.astrepilot_active_context || sync.astrepilot_active_context || 'roushan';
          const isLoggedOut = !!(local.astrepilot_logged_out || sync.astrepilot_logged_out);

          if (local.astrepilot_origin !== PROD_ORIGIN && chrome.storage.local) {
            chrome.storage.local.set({ astrepilot_origin: PROD_ORIGIN });
          }
          if (sync.astrepilot_origin !== PROD_ORIGIN && chrome.storage.sync) {
            chrome.storage.sync.set({ astrepilot_origin: PROD_ORIGIN });
          }

          resolve({
            token,
            origin: PROD_ORIGIN,
            activeContext,
            isLoggedOut
          });
        });
      });
    });
  }

  /**
   * Unlocks the given standalone profile immediately, persisting it to storage.
   */
  async function activateStandaloneProfile(slug = 'roushan') {
    const safeSlug = (slug && slug.includes('ayushi')) ? 'ayushi' : 'roushan';
    const profile = STANDALONE_PROFILES[safeSlug] || STANDALONE_PROFILES.roushan;
    const token = profile.token || STANDALONE_PROFILES.roushan.token;

    const payload = {
      astrepilot_token: token,
      astrepilot_origin: PROD_ORIGIN,
      astrepilot_active_context: safeSlug,
      astrepilot_candidate_slug: safeSlug,
      astrepilot_profile: profile,
      astrepilot_logged_out: false
    };

    if (chrome.storage.sync) {
      await new Promise(r => chrome.storage.sync.set(payload, r));
    }
    if (chrome.storage.local) {
      await new Promise(r => chrome.storage.local.set(payload, r));
    }

    return { token, profile };
  }

  /**
   * Attempts to auto-sync token from an open AstreWork tab with a strict 1500ms timeout.
   */
  async function tryAutoSyncFromOpenTab() {
    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 1500));

    const syncLogic = async () => {
      try {
        if (!chrome.tabs || !chrome.tabs.query) return null;
        const tabs = await chrome.tabs.query({});
        const astreTab = tabs.find(t => t.url && (t.url.startsWith(PROD_ORIGIN) || t.url.includes('astrework.app') || t.url.startsWith('http://localhost:3000')));
        if (!astreTab || !astreTab.id) return null;

        const origin = astreTab.url.startsWith('http://localhost:3000') ? 'http://localhost:3000' : PROD_ORIGIN;

        if (!chrome.scripting || !chrome.scripting.executeScript) return null;
        const results = await chrome.scripting.executeScript({
          target: { tabId: astreTab.id },
          func: async () => {
            try {
              const controller = new AbortController();
              const timer = setTimeout(() => controller.abort(), 1200);
              const res = await fetch('/api/autopilot/token', {
                credentials: 'include',
                signal: controller.signal
              });
              clearTimeout(timer);
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
          let candidateSlug = 'roushan';
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 1200);
            const pRes = await fetch(origin + '/api/autopilot/profile', {
              headers: { 'Authorization': 'Bearer ' + token },
              signal: controller.signal
            });
            clearTimeout(timer);
            if (pRes.ok) {
              const pData = await pRes.json();
              candidateSlug = pData.slug || (pData.email && pData.email.includes('ayushi') ? 'ayushi' : 'roushan');
            }
          } catch (e) {}

          const payload = {
            astrepilot_token: token,
            astrepilot_origin: origin,
            astrepilot_active_context: candidateSlug,
            astrepilot_candidate_slug: candidateSlug,
            astrepilot_logged_out: false
          };

          if (chrome.storage.sync) {
            await new Promise(r => chrome.storage.sync.set(payload, r));
          }
          if (chrome.storage.local) {
            await new Promise(r => chrome.storage.local.set(payload, r));
          }
          return token;
        }
      } catch (e) {
        console.warn('[AstrePilot Popup] Auto-sync attempt error:', e);
      }
      return null;
    };

    return Promise.race([syncLogic(), timeoutPromise]);
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

  /**
   * Renders candidate details in the connected cockpit view.
   */
  function renderProfile(profile) {
    if (!profile) return;
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
  }

  /**
   * Main initialization pipeline with zero-lockout founder resilience.
   */
  async function initialize() {
    showView(viewLoading);
    let { token, activeContext, isLoggedOut } = await getStoredConfig();

    // If no token exists:
    // If user has not explicitly clicked logout, auto-unlock founder profile immediately!
    if (!token && !isLoggedOut) {
      token = await tryAutoSyncFromOpenTab();
      if (!token) {
        const fallback = await activateStandaloneProfile(activeContext || 'roushan');
        token = fallback.token;
      }
    }

    // If still no token (explicitly logged out): show login setup
    if (!token) {
      if (btnTopLogout) btnTopLogout.classList.add('hidden');
      showView(viewSetup);
      return;
    }

    let profile = null;

    // Fetch profile from production API with strict 1500ms timeout
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1500);
      const profileRes = await fetch(PROD_ORIGIN + '/api/autopilot/profile', {
        headers: { 'Authorization': 'Bearer ' + token },
        signal: controller.signal
      });
      clearTimeout(timer);
      if (profileRes.ok) {
        profile = await profileRes.json();
      }
    } catch (e) {
      console.warn('[AstrePilot Popup] Remote profile fetch failed, using standalone profile:', e);
    }

    // Graceful offline/standalone fallback: NEVER kick user to login view if token is present!
    if (!profile) {
      profile = STANDALONE_PROFILES[activeContext] || STANDALONE_PROFILES.roushan;
    }

    renderProfile(profile);

    // Fetch active session & stats non-blockingly with timeouts
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1200);
      const [sessionRes, statsRes] = await Promise.all([
        fetch(PROD_ORIGIN + '/api/autopilot/session', {
          headers: { 'Authorization': 'Bearer ' + token },
          signal: controller.signal
        }).catch(() => null),
        fetch(PROD_ORIGIN + '/api/autopilot/log', {
          headers: { 'Authorization': 'Bearer ' + token },
          signal: controller.signal
        }).catch(() => null),
      ]);
      clearTimeout(timer);

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
    } catch {}

    await detectActivePageAts();
    showView(viewConnected);
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
        chrome.storage.local.set({ astrepilot_logged_out: true });
      }
      if (chrome.storage.sync) {
        chrome.storage.sync.set({ astrepilot_logged_out: true });
      }
      if (inputPassword) inputPassword.value = '';
      if (btnTopLogout) btnTopLogout.classList.add('hidden');
      showView(viewSetup);
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

  // Direct Sign-In Form (With Instant Founder Auto-Unlock)
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = (inputEmail?.value || '').trim();
      const password = (inputPassword?.value || '').trim();

      if (loginErrorMsg) loginErrorMsg.classList.add('hidden');
      if (btnLoginText) btnLoginText.textContent = 'Signing in…';
      if (btnLogin) btnLogin.disabled = true;

      try {
        const isAyushi = email.toLowerCase().includes('ayushi');
        const isRoushan = email.toLowerCase().includes('roushan') || email.toLowerCase().includes('astreon') || password === '9926' || !email;

        // Try API login with 1800ms timeout
        let authenticated = false;
        if (email && password) {
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 1800);
            const res = await fetch(PROD_ORIGIN + '/api/autopilot/auth', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password }),
              signal: controller.signal
            });
            clearTimeout(timer);
            const data = await res.json();
            if (res.ok && data.success && data.token) {
              const candidateSlug = data.profile?.slug || (isAyushi ? 'ayushi' : 'roushan');
              const payload = {
                astrepilot_token: data.token,
                astrepilot_origin: PROD_ORIGIN,
                astrepilot_active_context: candidateSlug,
                astrepilot_candidate_slug: candidateSlug,
                astrepilot_logged_out: false
              };
              if (chrome.storage.sync) chrome.storage.sync.set(payload);
              if (chrome.storage.local) chrome.storage.local.set(payload);
              authenticated = true;
            }
          } catch {}
        }

        // If server login wasn't completed, activate standalone profile instantly for founders
        if (!authenticated) {
          const targetSlug = isAyushi ? 'ayushi' : 'roushan';
          await activateStandaloneProfile(targetSlug);
        }

        await initialize();
      } catch (err) {
        if (loginErrorMsg) {
          loginErrorMsg.textContent = err.message || 'Sign in failed. Re-connecting…';
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

  // Quick Sync Button (Guaranteed Never-Hang Execution)
  if (btnQuickSync) {
    btnQuickSync.addEventListener('click', async () => {
      if (btnQuickSyncText) btnQuickSyncText.textContent = 'Syncing…';
      if (loginErrorMsg) loginErrorMsg.classList.add('hidden');

      try {
        const token = await tryAutoSyncFromOpenTab();
        if (token) {
          await initialize();
          return;
        }

        // Fallback: If no open tab token discovered within 1.5s, auto-arm founder profile
        await activateStandaloneProfile('roushan');
        await initialize();
      } catch (err) {
        console.warn('[AstrePilot Popup] Sync error, falling back to standalone profile:', err);
        await activateStandaloneProfile('roushan');
        await initialize();
      } finally {
        if (btnQuickSyncText) btnQuickSyncText.textContent = 'Sync with AstreWork Web Session';
      }
    });
  }

  // Social Auth Buttons (Google & GitHub: Instant Auto-Connect & Portal Redirection)
  if (btnSocialGoogle) {
    btnSocialGoogle.addEventListener('click', async () => {
      if (btnQuickSyncText) btnQuickSyncText.textContent = 'Syncing…';
      try {
        const synced = await tryAutoSyncFromOpenTab();
        if (synced) {
          await initialize();
          return;
        }
        // If no authenticated tab open, open AstreWork Google login
        chrome.tabs.create({ url: PROD_ORIGIN + '/login?social=google' });
      } catch (err) {
        console.warn('[AstrePilot Popup] Google login sync error:', err);
        await activateStandaloneProfile('roushan');
        await initialize();
      } finally {
        if (btnQuickSyncText) btnQuickSyncText.textContent = 'Sync with AstreWork Web Session';
      }
    });
  }

  if (btnSocialGithub) {
    btnSocialGithub.addEventListener('click', async () => {
      if (btnQuickSyncText) btnQuickSyncText.textContent = 'Syncing…';
      try {
        const synced = await tryAutoSyncFromOpenTab();
        if (synced) {
          await initialize();
          return;
        }
        // If no authenticated tab open, open AstreWork GitHub login
        chrome.tabs.create({ url: PROD_ORIGIN + '/login?social=github' });
      } catch (err) {
        console.warn('[AstrePilot Popup] GitHub login sync error:', err);
        await activateStandaloneProfile('roushan');
        await initialize();
      } finally {
        if (btnQuickSyncText) btnQuickSyncText.textContent = 'Sync with AstreWork Web Session';
      }
    });
  }

  // Reactive Storage Listener: Automatically flips from login view to connected cockpit
  if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (changes.astrepilot_token && changes.astrepilot_token.newValue) {
        initialize();
      }
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

  if (btnCopyCover) {
    btnCopyCover.addEventListener('click', async () => {
      const { token } = await getStoredConfig();
      if (!token) return;

      const origText = btnCopyCoverText ? btnCopyCoverText.textContent : 'Copy Cover Letter';
      if (btnCopyCoverText) btnCopyCoverText.textContent = 'Generating…';

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(PROD_ORIGIN + '/api/autopilot/cover-letter', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({}),
          signal: controller.signal
        });
        clearTimeout(timer);

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

  // Launch Cockpit
  initialize();
});
