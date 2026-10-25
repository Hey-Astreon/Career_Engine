/**
 * AstrePilot Content Script (Manifest V3)
 * ---------------------------------------
 * Injected on web pages to scan form fields, render the glassmorphic HUD,
 * and execute AI-powered autofill animations.
 */

(function () {
  'use strict';

  // Prevent multiple injections: tear down any previous instance (listeners + HUD)
  if (window.__ASTREPILOT_CLEANUP__) {
    try { window.__ASTREPILOT_CLEANUP__(); } catch (e) {}
  }
  window.__ASTREPILOT_INJECTED__ = true;

  let activeHud = null;
  let detectedFields = [];
  let userProfile = null;
  let activeSession = null;
  let mountPromise = null; // set while the HUD is initialising (prevents double mounts)
  let isFilling = false;  // re-entrancy guard for runAutofill
  let fillHeartbeatTimer = null; // heartbeat timer for active fill locks

  // Autonomous Standalone / Offline Profiles (BCA Candidate Title Compliant)
  const STANDALONE_PROFILES = {
    roushan: {
      firstName: 'Roushan',
      lastName: 'Kumar',
      fullName: 'Roushan Kumar',
      preferredName: 'Roushan',
      email: 'roushanraut404@gmail.com',
      phone: '+919431483512',
      phoneType: 'Mobile',
      title: 'Full-Stack Developer | Distributed Systems & Cloud Infrastructure',
      location: 'Patna, Bihar, India',
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
      discipline: 'Computer Science / Applications',
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
      professionalSummary: 'Full-Stack Developer and Creator of AstreWork, with hands-on experience designing and operating distributed web scrapers, Playwright/Puppeteer automation, and cloud infrastructure on Oracle Cloud. Operates containerized headless browser pipelines processing thousands of postings daily with a focus on high-throughput reliability.',
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
      title: 'Full-Stack Developer | AI Systems & Interactive Web Applications',
      location: 'Bihar, India',
      city: 'Patna',
      state: 'Bihar',
      country: 'India',
      streetAddress: 'Patna, Bihar',
      zipCode: '800001',
      addressType: 'Home',
      linkedinUrl: 'https://www.linkedin.com/in/alrya404/',
      githubUrl: 'https://github.com/Silenttears-cloud',
      portfolioUrl: 'https://ayushiraj.me',
      school: 'Amity University',
      degree: 'Bachelor of Computer Applications (BCA)',
      discipline: 'Computer Science / Applications',
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
      professionalSummary: 'Full-Stack Software Developer and Co-Developer of AstreWork, specializing in AI-integrated web applications, autonomous browser extensions, and high-craft user interfaces. Architected AstreWork client-side ATS optimization engine, Gemini scoring studio, and the AstrePilot Chrome Extension.',
      _isStandalone: true
    }
  };

  // Pillar E: Cross-Tab Broadcast Channel & Message Bus
  let syncChannel = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      syncChannel = new BroadcastChannel('astrepilot_application_sync');
      syncChannel.onmessage = (event) => {
        const msg = event && event.data;
        if (!msg) return;
        handleCrossTabSyncMessage(msg);
      };
    }
  } catch (e) {
    /* BroadcastChannel fallback */
  }

  function handleCrossTabSyncMessage(msg) {
    if (!msg || !msg.type) return;
    if (msg.type === 'FILL_LOCK_ACQUIRED') {
      const payload = msg.payload || {};
      const currentUrl = (window.location.href || '').toLowerCase();
      const lockUrl = (payload.url || '').toLowerCase();
      if (lockUrl && currentUrl.includes(lockUrl) && activeHud) {
        activeHud.setRemoteLock(payload);
      }
    } else if (msg.type === 'FILL_LOCK_RELEASED') {
      if (activeHud) {
        activeHud.clearRemoteLock();
      }
    } else if (msg.type === 'APPLICATION_CONFIRMED') {
      const payload = msg.payload || {};
      const currentUrl = (window.location.href || '').toLowerCase();
      const confirmedUrl = (payload.siteUrl || '').toLowerCase();
      if (confirmedUrl && currentUrl.includes(confirmedUrl) && activeHud) {
        activeHud.setState('done', { isConfirmed: true });
      }
    }
  }

  async function acquireFillLock(force = false) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: 'ACQUIRE_FILL_LOCK',
        url: window.location.href,
        company: activeSession ? activeSession.company : document.title.replace(/ \|.*/, '').trim().slice(0, 80),
        jobTitle: activeSession ? activeSession.jobTitle : '',
        ttlMs: 45000,
        force: force
      }, (res) => {
        resolve(res || { success: true });
      });
    });
  }

  function startFillHeartbeat() {
    if (fillHeartbeatTimer) clearInterval(fillHeartbeatTimer);
    fillHeartbeatTimer = setInterval(() => {
      chrome.runtime.sendMessage({
        type: 'HEARTBEAT_FILL_LOCK',
        url: window.location.href,
        ttlMs: 45000
      });
    }, 10000);
  }

  function releaseFillLock() {
    if (fillHeartbeatTimer) {
      clearInterval(fillHeartbeatTimer);
      fillHeartbeatTimer = null;
    }
    chrome.runtime.sendMessage({
      type: 'RELEASE_FILL_LOCK',
      url: window.location.href
    });
    if (syncChannel) {
      try {
        syncChannel.postMessage({
          type: 'FILL_LOCK_RELEASED',
          timestamp: Date.now(),
          payload: { url: window.location.href }
        });
      } catch (e) {}
    }
  }

  /* -- PILLAR F: CDP HARDWARE INPUT BRIDGE -- */
  function cdpInput(action, params = {}) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({
          type: 'CDP_DISPATCH_INPUT',
          action,
          ...params
        }, (res) => {
          if (chrome.runtime.lastError) {
            return resolve({ success: false, error: chrome.runtime.lastError.message });
          }
          resolve(res || { success: true });
        });
      } catch (e) {
        resolve({ success: false, error: e.message });
      }
    });
  }

  /* -- MESSAGE LISTENER -- */
  // All responses are synchronous, so the channel is not kept open.
  const messageListener = (request, sender, sendResponse) => {
    // Top-level window guard: subframes (tracking pixels, analytics, recaptcha) must ignore HUD/page actions
    if (window !== window.top && (
      request.action === 'TOGGLE_HUD' ||
      request.action === 'SCAN_FIELDS' ||
      request.action === 'AUTOFILL' ||
      request.action === 'EXTRACT_PAGE' ||
      request.action === 'CLICK_APPLY'
    )) {
      return false;
    }

    if (request.action === 'TOGGLE_HUD') {
      toggleAstrePilotHUD();
      sendResponse({ status: 'toggled' });
    } else if (request.action === 'SCAN_FIELDS') {
      const fields = scanFields();
      sendResponse({ count: fields.length, fields: fields.map(f => ({ type: f.type, id: f.id })) });
    } else if (request.action === 'AUTOFILL') {
      // Wait for the HUD to finish loading profile + scan instead of guessing a delay
      (async () => {
        if (!activeHud) await toggleAstrePilotHUD();
        else if (mountPromise) await mountPromise;
        await runAutofill();
      })();
      sendResponse({ status: 'autofilling' });
    } else if (request.action === 'EXTRACT_PAGE') {
      sendResponse(extractPageContent());
    } else if (request.action === 'CLICK_APPLY') {
      sendResponse({ success: findAndClickApplyButton() });
    } else if (request.type === 'FILL_LOCK_ACQUIRED' || request.type === 'FILL_LOCK_RELEASED' || request.type === 'APPLICATION_CONFIRMED') {
      handleCrossTabSyncMessage(request);
      sendResponse({ status: 'handled' });
    }
    return false;
  };
  chrome.runtime.onMessage.addListener(messageListener);
  window.__ASTREPILOT_CLEANUP__ = () => {
    chrome.runtime.onMessage.removeListener(messageListener);
    if (syncChannel) {
      try { syncChannel.close(); } catch (e) {}
      syncChannel = null;
    }
    if (fillHeartbeatTimer) {
      clearInterval(fillHeartbeatTimer);
      fillHeartbeatTimer = null;
    }
    if (activeHud) { try { activeHud.destroy(); } catch (e) {} activeHud = null; }
  };

  /* -- IN-PAGE KEYBOARD SHORTCUT LISTENER -- */
  // Shortcut: Alt+Shift+A (primary), Alt+A when not in a text field (secondary)
  // Note: On Windows, Alt+Shift may be consumed by IME/language switcher.
  // The extension command in manifest.json also triggers this via background.js -> TOGGLE_HUD message.
  const keydownListener = (e) => {
    const tag = document.activeElement ? document.activeElement.tagName : '';
    const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || Boolean(document.activeElement && document.activeElement.isContentEditable);
    // Alt+Shift+A — works regardless of focus
    if (e.altKey && e.shiftKey && (e.key === 'a' || e.key === 'A')) {
      e.preventDefault();
      e.stopPropagation();
      toggleAstrePilotHUD();
      return;
    }
    // Alt+A — only when not focused inside a text field
    if (e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey && (e.key === 'a' || e.key === 'A') && !isEditable) {
      e.preventDefault();
      toggleAstrePilotHUD();
      return;
    }
  };
  window.addEventListener('keydown', keydownListener);

  /* -- MULTI-STEP STATE MACHINE & NAVIGATIONAL MEMORY (PILLAR C) -- */
  const STEP_CATEGORY_LABELS = {
    GATEKEEPER: 'Login / Gateway',
    CONTACT_INFO: 'Contact Information',
    EXPERIENCE: 'Work Experience',
    EDUCATION: 'Education & Academics',
    EEO_COMPLIANCE: 'Voluntary Self-ID / EEO',
    SCREENING: 'Screening & Questions',
    REVIEW_SUBMIT: 'Review & Submit',
    GENERIC_STEP: 'Application Step'
  };

  const NEXT_STEP_REGEX = /^(next|continue|save\s*&\s*continue|save\s*and\s*continue|next\s*step|proceed|review(?:\s*application)?|go\s*to\s*next\s*step|continue\s*to\s*next\s*step|step\s*\d+\s*->|log\s*in|login|sign\s*in|signin|get\s*started|start\s*application|enter|submit\s*profile|update\s*profile)$/i;
  const SUBMIT_APPLICATION_REGEX = /^(submit|submit\s*application|complete\s*application|apply|apply\s*now|send\s*application|finish\s*and\s*submit)$/i;

  let navSession = null;
  function getNavSession() {
    if (navSession) return navSession;
    try {
      const raw = sessionStorage.getItem('ap_nav_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.currentStepIndex === 'number') {
          navSession = parsed;
        }
      }
    } catch (e) {}
    return navSession;
  }

  function saveNavSession(session) {
    navSession = session;
    try {
      sessionStorage.setItem('ap_nav_session', JSON.stringify(session));
      sessionStorage.setItem('ap_auto_open', 'true');
    } catch (e) {}
  }

  function clearNavSession() {
    navSession = null;
    try {
      sessionStorage.removeItem('ap_nav_session');
      sessionStorage.removeItem('ap_auto_open');
    } catch (e) {}
  }

  function isGatekeeperStep(fields = detectedFields, url = window.location.href) {
    if (!fields || !fields.length) return false;
    const cleanUrl = url.toLowerCase();
    const isAuthUrl = cleanUrl.includes('/login') || cleanUrl.includes('/signin') || cleanUrl.includes('/sign-in') || cleanUrl.includes('/auth') || cleanUrl.includes('from=login') || cleanUrl.includes('login_or_register') || cleanUrl.includes('login.jsp');
    
    const AUTH_TYPES = new Set(['EMAIL', 'LOGIN_ID', 'PASSWORD', 'CONFIRM_PASSWORD']);
    const nonAuthFields = fields.filter(f => !AUTH_TYPES.has(f.type));
    
    // If only 1 or 2 fields and all are auth types
    if (nonAuthFields.length === 0 && fields.length <= 2) {
      return true;
    }
    // Or on an auth URL with at most 1 other field (e.g. remember me / terms checkbox)
    if (isAuthUrl && nonAuthFields.length <= 1) {
      return true;
    }
    return false;
  }

  function createDefaultNavSession(siteUrl, company, jobTitle) {
    return {
      sessionId: 'nav_' + Math.random().toString(36).slice(2, 9),
      siteUrl: siteUrl || window.location.href,
      company: company || '',
      jobTitle: jobTitle || '',
      currentStepIndex: 0,
      stepName: STEP_CATEGORY_LABELS.CONTACT_INFO,
      stepCategory: 'CONTACT_INFO',
      stepHistory: [],
      cumulativeFieldsTotal: 0,
      cumulativeFieldsFilled: 0,
      activeFillId: null,
      activeApplicationId: null,
      isFinalStep: false,
      lastUpdated: Date.now()
    };
  }

  function classifyCurrentStep(url = '', stepIndicatorsText = '', fieldTypes = []) {
    const combined = `${url} ${stepIndicatorsText}`.toLowerCase();
    if (combined.includes('login') || combined.includes('signin') || combined.includes('sign-in') || isGatekeeperStep(detectedFields, url)) {
      return { category: 'GATEKEEPER', label: STEP_CATEGORY_LABELS.GATEKEEPER };
    }
    if (combined.includes('review') || combined.includes('confirm') || combined.includes('summary') || combined.includes('final')) {
      return { category: 'REVIEW_SUBMIT', label: STEP_CATEGORY_LABELS.REVIEW_SUBMIT };
    }
    if (combined.includes('eeo') || combined.includes('diversity') || combined.includes('self-id') || combined.includes('voluntary')) {
      return { category: 'EEO_COMPLIANCE', label: STEP_CATEGORY_LABELS.EEO_COMPLIANCE };
    }
    if (combined.includes('experience') || combined.includes('employment') || combined.includes('work_history')) {
      return { category: 'EXPERIENCE', label: STEP_CATEGORY_LABELS.EXPERIENCE };
    }
    if (combined.includes('education') || combined.includes('academic') || combined.includes('school')) {
      return { category: 'EDUCATION', label: STEP_CATEGORY_LABELS.EDUCATION };
    }
    if (combined.includes('contact') || combined.includes('personal') || combined.includes('candidate_info')) {
      return { category: 'CONTACT_INFO', label: STEP_CATEGORY_LABELS.CONTACT_INFO };
    }
    if (fieldTypes && fieldTypes.length > 0) {
      const counts = {};
      fieldTypes.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
      const scoreContact = ['FIRST_NAME', 'LAST_NAME', 'FULL_NAME', 'EMAIL', 'PHONE', 'ADDRESS', 'CITY', 'STATE', 'ZIP', 'RESUME'].reduce((acc, k) => acc + (counts[k] || 0), 0);
      const scoreExp = ['COMPANY', 'EMPLOYMENT_TITLE', 'START_MONTH', 'START_YEAR', 'END_MONTH', 'END_YEAR', 'CURRENT_ROLE'].reduce((acc, k) => acc + (counts[k] || 0), 0);
      const scoreEdu = ['SCHOOL', 'DEGREE', 'DISCIPLINE'].reduce((acc, k) => acc + (counts[k] || 0), 0);
      const scoreEeo = ['GENDER', 'PRONOUNS', 'VETERAN', 'DISABILITY', 'RACE_ETHNICITY', 'HISPANIC_LATINO'].reduce((acc, k) => acc + (counts[k] || 0), 0);
      const scoreScreen = ['SCREENING', 'SCREENING_SELECT', 'COVER_LETTER', 'WORK_AUTH', 'VISA', 'SALARY', 'NOTICE_PERIOD'].reduce((acc, k) => acc + (counts[k] || 0), 0);
      const max = Math.max(scoreContact, scoreExp, scoreEdu, scoreEeo, scoreScreen);
      if (max > 0) {
        if (max === scoreContact) return { category: 'CONTACT_INFO', label: STEP_CATEGORY_LABELS.CONTACT_INFO };
        if (max === scoreExp) return { category: 'EXPERIENCE', label: STEP_CATEGORY_LABELS.EXPERIENCE };
        if (max === scoreEdu) return { category: 'EDUCATION', label: STEP_CATEGORY_LABELS.EDUCATION };
        if (max === scoreEeo) return { category: 'EEO_COMPLIANCE', label: STEP_CATEGORY_LABELS.EEO_COMPLIANCE };
        if (max === scoreScreen) return { category: 'SCREENING', label: STEP_CATEGORY_LABELS.SCREENING };
      }
    }
    return { category: 'GENERIC_STEP', label: STEP_CATEGORY_LABELS.GENERIC_STEP };
  }

  function isNextStepButton(btn) {
    if (!btn) return false;
    const txt = (btn.innerText || btn.textContent || btn.value || '').trim();
    const ariaLabel = (btn.getAttribute ? btn.getAttribute('aria-label') : '') || '';
    const automationId = (btn.getAttribute ? btn.getAttribute('data-automation-id') : '') || '';
    const isGate = isGatekeeperStep(detectedFields, window.location.href);
    if (!isGate && SUBMIT_APPLICATION_REGEX.test(txt)) return false;
    if (NEXT_STEP_REGEX.test(txt)) return true;
    if (isGate && /^(submit|log\s*in|login|sign\s*in|signin|enter|continue|next)$/i.test(txt)) return true;
    if (automationId.toLowerCase().includes('next') || automationId.toLowerCase().includes('continue')) return true;
    if (ariaLabel && NEXT_STEP_REGEX.test(ariaLabel)) return true;
    return false;
  }

  function findNextStepButton(targetDoc = document) {
    const selectors = [
      'button[data-automation-id*="next"]',
      'button[data-automation-id*="continue"]',
      'button[data-automation-id="bottom-navigation-next-button"]',
      'input[type="submit"][value*="Next" i]',
      'input[type="button"][value*="Next" i]',
      'input[type="submit"][value*="Log In" i]',
      'input[type="submit"][value*="Login" i]',
      'input[type="submit"][value*="Sign In" i]',
      'input[name="profileButton"]',
      'input#cp_form_submit_1',
      'input[value*="Submit Profile" i]',
      'input[value*="Update Profile" i]',
      'input[type="submit"]:not([disabled])',
      'button:not([disabled])',
      'a[role="button"]:not([disabled])'
    ].join(', ');
    const elements = targetDoc.querySelectorAll(selectors);
    for (let i = 0; i < elements.length; i++) {
      if (isNextStepButton(elements[i])) {
        return elements[i];
      }
    }
    // Also traverse same-origin iframes
    try {
      const iframes = targetDoc.querySelectorAll('iframe');
      for (let f = 0; f < iframes.length; f++) {
        try {
          const idoc = iframes[f].contentDocument || (iframes[f].contentWindow && iframes[f].contentWindow.document);
          if (idoc) {
            const btn = findNextStepButton(idoc);
            if (btn) return btn;
          }
        } catch (err) {}
      }
    } catch (e) {}
    return null;
  }

  let activeStepObserver = null;
  function watchForStepTransition(onReady) {
    if (activeStepObserver) {
      activeStepObserver.disconnect();
      activeStepObserver = null;
    }
    let debounceTimer = null;
    const startTime = Date.now();
    const safetyTimeout = setTimeout(() => {
      if (activeStepObserver) {
        activeStepObserver.disconnect();
        activeStepObserver = null;
      }
      if (onReady) onReady();
    }, 4000);

    activeStepObserver = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const inputs = document.querySelectorAll('input:not([type="hidden"]), select, textarea, button[role="combobox"]');
        if (inputs.length > 0 || Date.now() - startTime > 1500) {
          clearTimeout(safetyTimeout);
          if (activeStepObserver) {
            activeStepObserver.disconnect();
            activeStepObserver = null;
          }
          if (onReady) onReady();
        }
      }, 300);
    });

    activeStepObserver.observe(document.body, { childList: true, subtree: true });
  }

  async function runContinueNextStep() {
    const hud = activeHud;
    if (!hud) return;

    const nextBtn = findNextStepButton(document);
    if (!nextBtn) {
      hud.setState('done', { isConfirmed: false });
      return;
    }

    hud.setState('transitioning', { step: 'Advancing to next ATS stage...' });

    // Click next button
    try {
      nextBtn.focus();
      nextBtn.click();
    } catch (e) {
      try { nextBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); } catch (err) {}
    }

    watchForStepTransition(async () => {
      if (!activeHud) return;
      rescanFields();
    });
  }

  const clickNavListener = (e) => {
    const target = e.target && e.target.closest ? e.target.closest('button, a, input[type="submit"], input[type="button"]') : null;
    if (!target) return;
    if (isNextStepButton(target)) {
      try { sessionStorage.setItem('ap_auto_open', 'true'); } catch (err) {}
      if (activeHud) {
        activeHud.setState('transitioning', { step: 'Advancing to next step...' });
        watchForStepTransition(() => {
          if (activeHud && !isFilling) {
            rescanFields();
          }
        });
      }
    }
  };
  function attachFrameClickListeners() {
    try {
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(frame => {
        try {
          const doc = frame.contentDocument || (frame.contentWindow && frame.contentWindow.document);
          if (doc && !doc.__ap_click_bound) {
            doc.addEventListener('click', clickNavListener, true);
            doc.__ap_click_bound = true;
          }
        } catch (e) {}
      });
    } catch (e) {}
  }
  document.addEventListener('click', clickNavListener, true);
  setInterval(attachFrameClickListeners, 2000);

  const oldCleanup = window.__ASTREPILOT_CLEANUP__;
  window.__ASTREPILOT_CLEANUP__ = () => {
    if (oldCleanup) try { oldCleanup(); } catch(e) {}
    window.removeEventListener('keydown', keydownListener);
    document.removeEventListener('click', clickNavListener, true);
    if (activeStepObserver) {
      try { activeStepObserver.disconnect(); } catch (e) {}
      activeStepObserver = null;
    }
  };

  /* -- HELPERS -- */
  function el(tag, attrs, children) {
    const e = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (k === 'style') e.style.cssText = v;
      else if (k === 'className') e.className = v;
      else e.setAttribute(k, v);
    });
    (children || []).forEach(c => {
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }

  async function getStoredConfig() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['astrepilot_token', 'astrepilot_origin', 'astrepilot_active_context'], (res) => {
        const safeRes = res || {};
        let origin = (safeRes.astrepilot_origin || 'https://astrework.app').trim();
        if (!origin || origin.includes('vercel.app')) {
          origin = 'https://astrework.app';
          chrome.storage.sync.set({ astrepilot_origin: origin });
        }
        resolve({
          token: safeRes.astrepilot_token || null,
          origin,
          activeContext: safeRes.astrepilot_active_context || 'roushan'
        });
      });
    });
  }

  async function apFetch(path, opts = {}) {
    const config = await getStoredConfig();
    const headers = Object.assign(
      { 'Authorization': 'Bearer ' + config.token },
      opts.headers || {}
    );
    if (opts.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    const cleanOrigin = config.origin.replace(/\/$/, '');
    const url = cleanOrigin + (path.startsWith('/api/') ? path : ('/api/autopilot' + path));

    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        type: 'PROXY_FETCH',
        url: url,
        options: {
          method: opts.method || 'GET',
          headers: headers,
          body: opts.body
        }
      }, (response) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        if (!response || response.error) {
          return resolve({
            ok: false,
            status: (response && response.status) ? response.status : 500,
            json: async () => ({ error: (response && response.error) ? response.error : 'Network error' })
          });
        }
        resolve({
          ok: response.ok,
          status: response.status,
          json: async () => response.data
        });
      });
    });
  }

  function extractRecruiterInfo() {
    try {
      // 1. LinkedIn Job View Hiring Team Card Selectors
      const hirerCard = document.querySelector(
        '.hirer-card__hirer-information, [data-view-name="job-details-hiring-team"], .jobs-poster, .job-details-jobs-unified-top-card__hiring-team, .hirer-card'
      );
      
      if (hirerCard) {
        const linkEl = hirerCard.querySelector('a[href*="/in/"], a[href*="linkedin.com/in/"]');
        const nameEl = hirerCard.querySelector('.jobs-poster__name, .hirer-card__hirer-information a, .inline-show-more-text, strong, h3');
        const titleEl = hirerCard.querySelector('.jobs-poster__title, .hirer-card__job-poster-headline, .jobs-poster__headline, .linked-area');
        
        let profileUrl = linkEl ? linkEl.href : null;
        if (profileUrl) {
          profileUrl = profileUrl.split('?')[0].replace(/\/+$/, '');
        }
        
        const rawName = nameEl ? nameEl.innerText.trim() : null;
        const rawTitle = titleEl ? titleEl.innerText.trim() : 'Recruiter / Hiring Lead';
        
        let linkedinId = null;
        if (profileUrl) {
          const match = profileUrl.match(/\/in\/([a-zA-Z0-9_%-]+)/);
          if (match) linkedinId = decodeURIComponent(match[1]);
        }
        
        if (profileUrl || rawName) {
          return {
            name: rawName || 'Hiring Lead',
            title: rawTitle,
            profileUrl: profileUrl,
            linkedinId: linkedinId,
          };
        }
      }

      // 2. Generic ATS / Career Page Scans (e.g. Greenhouse, Ashby, Lever hiring manager link)
      const genericLink = document.querySelector(
        'a[href*="linkedin.com/in/"]:not([href*="linkedin.com/company/"])'
      );
      if (genericLink && (window.location.hostname.includes('greenhouse.io') || window.location.hostname.includes('ashbyhq.com') || window.location.hostname.includes('lever.co') || window.location.hostname.includes('jobs.'))) {
        let profileUrl = genericLink.href.split('?')[0].replace(/\/+$/, '');
        let linkedinId = null;
        const match = profileUrl.match(/\/in\/([a-zA-Z0-9_%-]+)/);
        if (match) linkedinId = decodeURIComponent(match[1]);
        const name = genericLink.innerText.trim() || genericLink.closest('.team-member, .hiring-lead')?.querySelector('h3, h4, strong')?.innerText.trim() || 'Hiring Lead';
        return {
          name: name,
          title: 'Hiring Lead',
          profileUrl: profileUrl,
          linkedinId: linkedinId,
        };
      }
    } catch (e) {
      console.warn('[AstrePilot] Recruiter extraction error:', e);
    }
    return null;
  }

  function extractCatalogJobs() {
    try {
      const hostname = window.location.hostname.toLowerCase();
      const isWellfound = hostname.includes('wellfound.com');
      const isJobright = hostname.includes('jobright.ai');
      const isInternList = hostname.includes('intern-list.com');
      
      if (!isWellfound && !isJobright && !isInternList) return null;
      
      const source = isInternList ? 'INTERN_LIST' : (isJobright ? 'JOBRIGHT' : 'WELLFOUND');
      const harvested = [];
      const seenUrls = new Set();

      if (isWellfound) {
        // 1. First-class Loophole: Apollo Store & __NEXT_DATA__ in-memory extraction
        try {
          const nextScript = document.getElementById('__NEXT_DATA__');
          if (nextScript && nextScript.textContent) {
            const parsed = JSON.parse(nextScript.textContent);
            const store = parsed?.props?.pageProps?.apolloState || parsed?.props?.pageProps?.initialApolloState;
            if (store) {
              for (const [key, val] of Object.entries(store)) {
                if ((key.includes('JobListing') || key.includes('JobPosting') || key.startsWith('Job:')) && val && val.title) {
                  let company = 'Startup';
                  if (val.startup && val.startup.name) {
                    company = val.startup.name;
                  } else if (val.company && val.company.name) {
                    company = val.company.name;
                  } else if (val.startup && val.startup.__ref && store[val.startup.__ref]) {
                    company = store[val.startup.__ref].name || company;
                  } else if (val.company && val.company.__ref && store[val.company.__ref]) {
                    company = store[val.company.__ref].name || company;
                  }
                  const isRemote = val.remote === true || val.remote === 'REMOTE' || val.remoteType === 'REMOTE' || 
                    (Array.isArray(val.locationNames) && val.locationNames.some(l => typeof l === 'string' && l.toLowerCase().includes('remote')));
                  const loc = isRemote ? 'Remote' : ((Array.isArray(val.locationNames) && val.locationNames[0]) || 'Remote');
                  const slug = val.slug || (val.id ? `job-${val.id}` : 'startup-job');
                  const url = val.id ? `https://wellfound.com/jobs/${val.id}-${slug}` : `https://wellfound.com/jobs/${slug}`;
                  if (seenUrls.has(url)) continue;
                  seenUrls.add(url);

                  harvested.push({
                    title: val.title,
                    company,
                    location: loc,
                    salary: val.compensation || null,
                    url,
                    rawDescription: val.description || `${val.title} at ${company}. Live startup role on Wellfound.`,
                  });
                }
              }
            }
          }
        } catch (apolloErr) {
          console.warn('[AstrePilot] Apollo store parsing note:', apolloErr);
        }

        // 2. DOM fallback for rendered search cards
        if (harvested.length === 0) {
          const jobLinks = document.querySelectorAll('a[href*="/jobs/"]');
          jobLinks.forEach(linkEl => {
            try {
              let url = linkEl.getAttribute('href');
              if (!url || ['/signup', '/faq', '/login'].some(s => url.includes(s)) || url.endsWith('/jobs')) return;
              if (url.startsWith('/')) url = 'https://wellfound.com' + url;
              if (seenUrls.has(url)) return;

              const card = linkEl.closest('div[class*="styles_jobListing"], div[class*="styles_company"], div[class*="styles_result"], [data-test*="JobListing"], [data-test*="JobCard"], li, tr, article') || linkEl.parentElement;
              const titleEl = card ? card.querySelector('a[class*="title"], h2, h3, [data-test="JobTitle"]') : null;
              const title = (titleEl ? titleEl.innerText : linkEl.innerText).split('\n')[0].trim();
              if (!title || title.length < 3 || title.toLowerCase().includes('open position')) return;

              let company = 'Startup';
              const companyEl = card ? card.querySelector('a[href*="/company/"], [data-test="StartupName"], h4, strong') : null;
              if (companyEl) {
                company = companyEl.innerText.split('\n')[0].trim() || company;
              }

              const locEl = card ? card.querySelector('span[class*="location"], [data-test="Location"]') : null;
              const compEl = card ? card.querySelector('span[class*="compensation"], span[class*="salary"]') : null;

              if (title && url) {
                seenUrls.add(url);
                harvested.push({
                  title,
                  company,
                  location: locEl ? locEl.innerText.trim() : 'Remote',
                  salary: compEl ? compEl.innerText.trim() : null,
                  url,
                  rawDescription: `${title} at ${company}. Live startup role on Wellfound.`,
                });
              }
            } catch (e) {}
          });
        }
      } else if (isJobright || isInternList) {
        // 1. Minisite Next.js __NEXT_DATA__ in-memory extraction
        try {
          const nextScript = document.getElementById('__NEXT_DATA__');
          if (nextScript && nextScript.textContent) {
            const parsed = JSON.parse(nextScript.textContent);
            const initialJobs = parsed?.props?.pageProps?.initialJobs;
            if (Array.isArray(initialJobs) && initialJobs.length > 0) {
              for (const job of initialJobs) {
                const title = job.title;
                const company = job.company || 'Tech Startup';
                const isRemote = job.workModel === 'Remote' || (job.location && job.location.toLowerCase().includes('remote'));
                const location = isRemote ? (job.location ? `Remote (${job.location})` : 'Remote') : (job.location || 'Remote');
                const url = job.applyUrl || `https://jobright.ai/jobs/info/${job.id}`;
                if (!title || seenUrls.has(url)) continue;
                seenUrls.add(url);
                harvested.push({
                  title,
                  company,
                  location,
                  salary: job.salary || null,
                  url,
                  rawDescription: `${title} at ${company}. ${job.qualifications || ''}`,
                });
              }
            }
          }
        } catch (nextErr) {
          console.warn('[AstrePilot] Jobright Next.js extraction note:', nextErr);
        }

        // 2. DOM fallback for rendered cards or table rows
        if (harvested.length === 0) {
          // Check for minisite table rows & links
          const applyLinks = document.querySelectorAll('a[class*="airtableApplyLink"], a[href*="/jobs/info/"], a[class*="apply"]');
          applyLinks.forEach(linkEl => {
            try {
              const url = linkEl.href;
              if (!url || seenUrls.has(url)) return;
              const row = linkEl.closest('tr, div[class*="row"], div[role="row"], div[role="listitem"], li, article');
              if (!row) return;

              const titleEl = row.querySelector('[class*="title"], [class*="jobtitle"], strong, h3, h4');
              const companyEl = row.querySelector('[class*="company"], [class*="companyname"], span, p');
              const locEl = row.querySelector('[class*="location"], [class*="badge"], [class*="tag"]');

              const title = titleEl ? titleEl.innerText.trim() : null;
              const company = companyEl ? companyEl.innerText.trim() : 'Tech Startup';
              const location = locEl ? locEl.innerText.trim() : 'Remote';

              if (title && url) {
                seenUrls.add(url);
                harvested.push({
                  title,
                  company,
                  location,
                  url,
                  rawDescription: `${title} at ${company}. Harvested from ${source}.`,
                });
              }
            } catch (e) {}
          });

          // Check standard job cards (Jobright main site)
          if (harvested.length === 0) {
            const cards = document.querySelectorAll('[class*="job-card"], [class*="JobCard"], div[role="article"]');
            cards.forEach(card => {
              try {
                const titleEl = card.querySelector('h2, h3, a[class*="title"]');
                const companyEl = card.querySelector('p[class*="company"], span[class*="company"], strong');
                const linkEl = card.querySelector('a[href*="/job/"], a[href*="http"]');
                const locEl = card.querySelector('[class*="location"]');

                const title = titleEl ? titleEl.innerText.trim() : null;
                const company = companyEl ? companyEl.innerText.trim() : null;
                const url = linkEl ? linkEl.href : null;

                if (title && company && url) {
                  if (seenUrls.has(url)) return;
                  seenUrls.add(url);
                  harvested.push({
                    title,
                    company,
                    location: locEl ? locEl.innerText.trim() : 'Remote',
                    url,
                    rawDescription: `${title} at ${company}. Harvested from ${source}.`,
                  });
                }
              } catch (e) {}
            });
          }
        }
      }

      return harvested.length > 0 ? { source, jobs: harvested, count: harvested.length } : null;
    } catch (err) {
      console.warn('[AstrePilot Harvester] Error detecting jobs:', err);
      return null;
    }
  }

  function extractPageContent() {
    // 1. Gather text from same-origin iframes FIRST (crucial for iCIMS, embedded Workday, Taleo)
    let iframeTextChunks = [];
    try {
      const iframes = document.querySelectorAll('iframe');
      for (let i = 0; i < iframes.length; i++) {
        try {
          const doc = iframes[i].contentDocument || (iframes[i].contentWindow && iframes[i].contentWindow.document);
          if (doc && doc.body) {
            const cloneFrame = doc.body.cloneNode(true);
            const removeSelectors = ['nav', 'footer', 'header', 'script', 'style', 'noscript', 'svg', 'img'];
            removeSelectors.forEach(s => {
              const els = cloneFrame.querySelectorAll(s);
              for (let j = 0; j < els.length; j++) els[j].remove();
            });
            const frameText = (cloneFrame.textContent || '').replace(/\s+/g, ' ').trim();
            if (frameText.length > 80) {
              iframeTextChunks.push(frameText);
            }
          }
        } catch (frameErr) {
          // Cross-origin iframe, cannot read directly
        }
      }
    } catch (e) {
      console.warn('[AstrePilot] iframe text extraction note:', e);
    }

    const clone = document.body.cloneNode(true);
    const removeSelectors = ['nav', 'footer', 'header', 'script', 'style', 'noscript', 'iframe', 'svg', 'img'];
    removeSelectors.forEach(s => {
      const els = clone.querySelectorAll(s);
      for (let i = 0; i < els.length; i++) els[i].remove();
    });
    
    // textContent is safer on disconnected nodes than innerText
    let text = clone.textContent || '';
    text = text.replace(/\s+/g, ' ').trim();

    // If iframe text exists, append it with priority
    if (iframeTextChunks.length > 0) {
      text = (text + '\n\n' + iframeTextChunks.join('\n\n')).trim();
    }
    
    return {
      pageText: text,
      pageUrl: window.location.href,
      pageTitle: document.title,
      recruiter: extractRecruiterInfo()
    };
  }

  function findAndClickApplyButton() {
    const keywords = /^(apply|apply now|apply for this job|apply for this job online|apply online|easy apply|submit application)$/i;
    const targetDocs = [document];
    try {
      const iframes = document.querySelectorAll('iframe');
      for (let i = 0; i < iframes.length; i++) {
        try {
          const doc = iframes[i].contentDocument || (iframes[i].contentWindow && iframes[i].contentWindow.document);
          if (doc && doc.body) targetDocs.push(doc);
        } catch (e) {}
      }
    } catch (e) {}

    for (const targetDoc of targetDocs) {
      const elements = targetDoc.querySelectorAll('a, button, [role="button"]');
      for (let i = 0; i < elements.length; i++) {
        const txt = (elements[i].innerText || elements[i].textContent || '').trim();
        if (keywords.test(txt)) {
          try { chrome.runtime.sendMessage({ type: 'NOTIFY_CLICK_APPLY' }); } catch(e) {}
          sessionStorage.setItem('ap_auto_open', 'true');
          elements[i].click();
          return true;
        }
      }
    }
    return false;
  }

  /* -- FIELD CLASSIFIER -- */
  /* -- FIELD CLASSIFIER -- */
  const FIELD_PATTERNS = [
    { type: 'FIRST_NAME',   kw: ['first_name', 'firstname', 'fname', 'given_name', 'first-name', 'first name', 'givenname'] },
    { type: 'LAST_NAME',    kw: ['last_name', 'lastname', 'lname', 'family_name', 'surname', 'last-name', 'last name', 'familyname'] },
    { type: 'FULL_NAME',    kw: ['full_name', 'fullname', 'legal_name', 'full-name', 'full-legal', 'full legal'] },
    { type: 'EMAIL',        kw: ['email', 'e-mail', 'email_address', 'emailaddress'] },
    { type: 'PHONE_TYPE',   kw: ['phone_type', 'phone type', 'phonetype', 'number_type', 'number type', 'telephone_type', 'telephonetype'] },
    { type: 'PHONE',        kw: ['phone', 'telephone', 'mobile', 'cell', 'contact_number', 'phone_number', 'phonenumber', 'phone number', 'contact number', 'mobile number'] },
    { type: 'ADDRESS_TYPE', kw: ['address_type', 'address type', 'addresstype', 'location_type', 'location type'] },
    { type: 'APT',          kw: ['apartment', 'suite', 'apt', 'address line 2', 'address_line_2', 'address2', 'address 2', 'line 2', 'line2', 'address_2'] },
    { type: 'ZIP',          kw: ['zip', 'zip_code', 'zip code', 'postal code', 'postal_code', 'postal', 'postcode', 'pin code', 'pincode'] },
    { type: 'ADDRESS',      kw: ['street_address', 'street address', 'address line 1', 'address_line_1', 'address 1', 'address_1', 'address1', 'street', 'address'] },
    { type: 'CITY',         kw: ['city', 'town', 'municipality'] },
    { type: 'STATE',        kw: ['state', 'province', 'state_province', 'state/province', 'region', 'state or province'] },
    { type: 'COUNTRY',      kw: ['country', 'nation', 'country_region', 'country/region'] },
    { type: 'LOCATION',     kw: ['current_location', 'city_state', 'city_country', 'current location', 'location'] },
    { type: 'HEAR_ABOUT_DETAIL', kw: ['specify further', 'please specify', 'source detail', 'referral detail', 'specify'] },
    { type: 'HEAR_ABOUT',   kw: ['how did you hear', 'hear about us', 'source', 'referral_source', 'how_did_you_hear', 'hear_about', 'hear about', 'referral'] },
    { type: 'LINKEDIN',     kw: ['linkedin', 'linkedin_url', 'linkedin_profile'] },
    { type: 'GITHUB',       kw: ['github', 'github_url', 'github_profile'] },
    { type: 'PORTFOLIO',    kw: ['portfolio', 'portfolio_url', 'personal_website', 'personal_site', 'website'] },
    { type: 'RESUME',       kw: ['resume', 'cv', 'curriculum', 'curriculum vitae', 'curriculum_vitae', 'resume/cv', 'resume_file', 'cv_file', 'attach_resume', 'upload_resume', 'attach resume', 'upload resume', 'resume document'] },
    { type: 'TITLE',        kw: ['headline', 'current_title', 'job_title', 'current_role', 'current_position'] },
    { type: 'COVER_LETTER', kw: ['cover_letter', 'coverletter', 'cover letter', 'motivation_letter', 'brief summary', 'cover note'] },
    { type: 'SUMMARY',      kw: ['summary', 'about_yourself', 'professional_summary', 'about you'] },
    { type: 'WORK_AUTH',    kw: ['work_auth', 'work_authorization', 'authorized to work', 'legally authorized', 'authorized'] },
    { type: 'VISA',         kw: ['visa', 'sponsorship', 'require sponsorship', 'sponsor'] },
    { type: 'SALARY',       kw: ['salary', 'expected_salary', 'desired_salary', 'salary_expectation', 'compensation'] },
    { type: 'NOTICE_PERIOD',kw: ['notice_period', 'notice period', 'availability', 'start date', 'how soon'] },
    { type: 'RELOCATE',     kw: ['relocate', 'willing to relocate', 'relocation'] },
    { type: 'EDUCATION',    kw: ['highest_education', 'highest education', 'degree', 'education level', 'education'] },
    { type: 'GENDER',       kw: ['gender', 'sex', 'identify as'] },
    { type: 'PRONOUNS',     kw: ['pronouns', 'preferred pronouns'] },
    // Employment granular patterns
    { type: 'COMPANY',      kw: ['company_name', 'company name', 'employer', 'organization', 'company'] },
    { type: 'EMPLOYMENT_TITLE', kw: ['employment_title', 'role_title', 'position title'] },
    { type: 'EXP_STATE',    kw: ['company_state', 'work_state', 'employer_state'] },
    { type: 'EXP_CITY',     kw: ['company_city', 'work_city', 'employer_city'] },
    { type: 'EXP_COUNTRY',  kw: ['company_country', 'work_country', 'employer_country'] },
    { type: 'START_MONTH',  kw: ['start_date_month', 'start date month', 'start month', 'start_month'] },
    { type: 'START_DAY',    kw: ['start_date_day', 'start date day', 'start day', 'start_day'] },
    { type: 'START_YEAR',   kw: ['start_date_year', 'start date year', 'start year', 'start_year'] },
    { type: 'END_MONTH',    kw: ['end_date_month', 'end date month', 'end month', 'end_month'] },
    { type: 'END_DAY',      kw: ['end_date_day', 'end date day', 'end day', 'end_day'] },
    { type: 'END_YEAR',     kw: ['end_date_year', 'end date year', 'end year', 'end_year'] },
    { type: 'CURRENT_ROLE', kw: ['current_role', 'current role', 'currently work here', 'i currently work here'] },
    { type: 'REASON_FOR_LEAVING', kw: ['reason for leaving', 'reason_for_leaving', 'leaving reason', 'reason_leaving', 'reason'] },
    // Education granular patterns
    { type: 'SCHOOL',       kw: ['school_name', 'school name', 'university', 'college', 'institution', 'school'] },
    { type: 'DEGREE',       kw: ['degree_type', 'degree level', 'degree'] },
    { type: 'DISCIPLINE',   kw: ['discipline', 'major', 'field of study', 'specialization', 'branch'] },
    // Compliance & Voluntary self-identification
    { type: 'TEXT_CONSENT', kw: ['text consent', 'text messages', 'receive text messages', 'sms consent', 'text_consent', 'sms'] },
    { type: 'AGE_18',       kw: ['18 years', '18 years of age', 'at least 18', 'age 18', 'legal age', '18 or older'] },
    { type: 'PREVIOUS_EMPLOYED', kw: ['previously been employed', 'previously employed', 'prior employment', 'former employee', 'worked here before', 'worked for coinbase'] },
    { type: 'PRIVACY_CONSENT', kw: ['privacy notice', 'privacy policy', 'arbitration agreement', 'global data privacy', 'receipt of the above linked'] },
    { type: 'AI_CONSENT',   kw: ['may use ai tools', 'use ai tools to assist', 'ai tools assist'] },
    { type: 'AI_USAGE',     kw: ['how you use ai tools', 'use ai tools today', 'describe how you use ai'] },
    { type: 'GOVT_OFFICIAL',kw: ['government official', 'civil service position', 'holder of public office'] },
    { type: 'GOVT_RELATIVE',kw: ['relative of a government official', 'relative of a government', 'close relative of a government'] },
    { type: 'CONFLICT_INTEREST', kw: ['conflict of interest', 'perceived conflict', 'actual or perceived conflict'] },
    { type: 'REFERRED_BY_LEADER', kw: ['referred to this position by a senior', 'senior leader or decision-maker'] },
    { type: 'HISPANIC_LATINO', kw: ['hispanic/latino', 'hispanic or latino', 'hispanic', 'latino'] },
    { type: 'VETERAN',      kw: ['veteran status', 'protected veteran', 'veterans act', 'vevraa'] },
    { type: 'DISABILITY',   kw: ['disability status', 'have a disability', 'disability'] },
    { type: 'RACE_ETHNICITY', kw: ['race & ethnicity', 'race and ethnicity', 'race/ethnicity', 'ethnicity', 'race'] },
    // Work Experience Granular Description
    { type: 'WORK_DESCRIPTION', kw: ['job_description', 'role_description', 'work_description', 'responsibilities', 'duties', 'describe your role', 'describe your responsibilities', 'role description', 'job description'] },
    // Authentication & Credential Vault
    { type: 'PASSWORD',     kw: ['password', 'create password', 'new password', 'set password', 'choose password', 'user password'] },
    { type: 'CONFIRM_PASSWORD', kw: ['confirm password', 're-enter password', 'repeat password', 'verify password', 'confirm_password'] },
    { type: 'LOGIN_ID',     kw: ['username', 'login', 'user id', 'user name', 'account id', 'login id', 'login_id'] },
  ];

  function parseLocation(loc) {
    if (!loc) return { city: '', state: '', country: '' };
    const parts = String(loc).split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length >= 3) {
      return { city: parts[0], state: parts[1], country: parts[parts.length - 1] };
    }
    if (parts.length === 2) {
      return { city: parts[0], state: parts[1], country: parts[1] };
    }
    return { city: parts[0] || '', state: '', country: parts[0] || '' };
  }

  function getLabelText(input) {
    const ariaLabel = (input.getAttribute('aria-label') || '').toLowerCase();
    let labelText = '';
    const labelEl = input.labels && input.labels[0];
    if (labelEl) {
      for (let n = 0; n < labelEl.childNodes.length; n++) {
        if (labelEl.childNodes[n].nodeType === 3) labelText += labelEl.childNodes[n].textContent;
      }
      if (!labelText) labelText = labelEl.textContent || '';
    }
    // Check aria-labelledby if label is empty
    const ownerDoc = input.ownerDocument || document;
    if (!labelText && input.getAttribute('aria-labelledby')) {
      const labelledByEl = ownerDoc.getElementById(input.getAttribute('aria-labelledby'));
      if (labelledByEl) labelText = labelledByEl.textContent || '';
    }
    // Check explicit label[for="id"]
    if (!labelText && input.id && ownerDoc) {
      try {
        const forLabel = ownerDoc.querySelector(`label[for="${CSS.escape(input.id)}"]`);
        if (forLabel) labelText = forLabel.textContent || '';
      } catch (e) {}
    }
    // Check parent or sibling container label (crucial for iCIMS, Workday, Taleo table rows)
    if (!labelText) {
      const container = input.closest('.form-group, .field, .form-row, tr, div');
      if (container) {
        const nearLabel = container.querySelector('label, .iCIMS_Label, .field-label, [class*="label" i]');
        if (nearLabel) labelText = nearLabel.textContent || '';
      }
    }
    const placeholder = (input.placeholder || '').toLowerCase();
    return [ariaLabel, labelText.toLowerCase(), placeholder].join(' ').replace(/\s+/g, ' ');
  }

  // Short keywords that appear inside unrelated words ("excellent", "electricity", "advisable")
  // must match on word boundaries; longer, specific keywords keep substring matching.
  const BOUNDARY_KW = new Set(['cell', 'city', 'visa', 'apt']);
  function kwMatch(signal, kw) {
    if (!BOUNDARY_KW.has(kw)) return signal.includes(kw);
    return new RegExp('(^|[^a-z])' + kw + '($|[^a-z])').test(signal);
  }

  function isComboboxOrSelect(el) {
    if (!el) return false;
    if (el.tagName === 'SELECT') return true;
    if (el.tagName === 'TEXTAREA') return false;
    const role = (el.getAttribute && el.getAttribute('role') || '').toLowerCase();
    const hasPopup = (el.getAttribute && el.getAttribute('aria-haspopup') || '').toLowerCase();
    if (role === 'combobox' || hasPopup === 'listbox') return true;
    if (el.hasAttribute && (el.hasAttribute('data-radix-collection-item') || el.hasAttribute('data-headlessui-state') || el.hasAttribute('data-state'))) return true;
    const autoId = (el.getAttribute && el.getAttribute('data-automation-id') || '').toLowerCase();
    if (autoId.includes('select-box') || autoId.includes('promptoption') || autoId.includes('searchbox')) return true;
    if (el.classList && (el.classList.contains('select__input') || el.classList.contains('select-shell') || el.classList.contains('react-select__input') || el.classList.contains('select__control'))) return true;
    if (el.closest && el.closest('.select-shell, .select__control, .select__container, [class*="react-select"], [class*="Select-control"], [data-automation-id="select-box"], [data-radix-popper-content-wrapper], [role="combobox"]')) return true;
    return false;
  }

  function isReactSelect(el) {
    if (!el || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') return false;
    if (el.classList && (el.classList.contains('select__input') || el.classList.contains('select-shell') || el.classList.contains('react-select__input'))) return true;
    if (el.getAttribute && el.getAttribute('role') === 'combobox') return true;
    if (el.closest && el.closest('.select-shell, .select__control, .select__container, [class*="react-select"], [class*="Select-control"]')) return true;
    return false;
  }

  function detectComboboxType(el) {
    if (!el) return 'WAI_ARIA';
    if (el.tagName === 'SELECT') return 'NATIVE';
    const autoId = (el.getAttribute && el.getAttribute('data-automation-id') || '').toLowerCase();
    const cls = (el.className || '').toLowerCase();
    const id = (el.id || '').toLowerCase();
    if (autoId.includes('select-box') || autoId.includes('promptoption') || autoId.includes('searchbox') || cls.includes('workday') || id.includes('wd-')) {
      return 'WORKDAY';
    }
    if (cls.includes('select__control') || cls.includes('select__input') || cls.includes('select-shell') || cls.includes('react-select') || id.includes('react-select') || (el.closest && el.closest('.select-shell, .select__control, .select__container, [class*="react-select"], .select'))) {
      return 'REACT_SELECT';
    }
    if (isGreenhouseEnvironment() && ((el.getAttribute && el.getAttribute('role') === 'combobox') || (el.closest && el.closest('.select-shell, [class*="select"]')))) {
      return 'REACT_SELECT';
    }
    if ((el.hasAttribute && (el.hasAttribute('data-radix-collection-item') || el.hasAttribute('data-state'))) || cls.includes('radix') || id.includes('radix') || (el.closest && el.closest('[data-radix-popper-content-wrapper], [data-radix-select-viewport]'))) {
      return 'RADIX';
    }
    if ((el.hasAttribute && el.hasAttribute('data-headlessui-state')) || cls.includes('headlessui') || id.includes('headlessui')) {
      return 'HEADLESS_UI';
    }
    return 'WAI_ARIA';
  }

  function classifyField(input) {
    const attrSignal = [
      (input.getAttribute('name') || '').toLowerCase(),
      (input.getAttribute('id') || '').toLowerCase(),
      (input.getAttribute('placeholder') || '').toLowerCase(),
      (input.getAttribute('autocomplete') || '').toLowerCase(),
      (input.getAttribute('data-automation-id') || '').toLowerCase(),
    ].join(' ');

    const labelSignal = getLabelText(input);

    let contextSignal = '';
    let curr = input.parentElement;
    for (let depth = 0; depth < 4 && curr; depth++) {
      const cls = curr.getAttribute('class') || '';
      const id = curr.id || '';
      const ariaLabel = curr.getAttribute('aria-label') || '';
      const heading = curr.querySelector('h1, h2, h3, h4, legend, .section-title, .form-title');
      const headingText = heading ? (heading.textContent || '') : '';
      contextSignal += ' ' + cls + ' ' + id + ' ' + ariaLabel + ' ' + headingText;
      curr = curr.parentElement;
    }
    contextSignal = contextSignal.toLowerCase();

    const isCB = isComboboxOrSelect(input);
    const isSelect = input.tagName === 'SELECT' || isCB;

    // 0. SECTION-AWARE FAST HEURISTICS: Employment pre-detection
    const isEmploymentSection = contextSignal.includes('employment') || contextSignal.includes('experience') || attrSignal.includes('employment') || attrSignal.includes('job_history') || labelSignal.includes('experience') || attrSignal.includes('experience');

    // 1. SELECT-SPECIFIC FAST HEURISTICS
    if (isSelect) {
      if ((labelSignal.includes('type') || attrSignal.includes('type')) && (contextSignal.includes('phone') || attrSignal.includes('phone'))) return 'PHONE_TYPE';
      if (attrSignal.includes('phone_type') || attrSignal.includes('phonetype')) return 'PHONE_TYPE';
      if ((labelSignal.includes('type') || attrSignal.includes('type')) && (contextSignal.includes('address') || attrSignal.includes('address'))) return 'ADDRESS_TYPE';
      if (labelSignal.includes('text consent') || labelSignal.includes('text message') || labelSignal.includes('sms') || attrSignal.includes('text_consent') || attrSignal.includes('sms')) {
        return 'TEXT_CONSENT';
      }
      if (labelSignal.includes('country') || attrSignal.includes('country')) return isEmploymentSection ? 'EXP_COUNTRY' : 'COUNTRY';
      if (labelSignal.includes('state') || labelSignal.includes('province') || attrSignal.includes('state') || attrSignal.includes('province')) {
        return isEmploymentSection ? 'EXP_STATE' : 'STATE';
      }
      if (labelSignal.includes('city') || attrSignal.includes('city') || labelSignal.includes('town')) {
        return isEmploymentSection ? 'EXP_CITY' : 'CITY';
      }
      if (labelSignal.includes('hear about') || labelSignal.includes('how did you hear') || labelSignal.includes('source') || attrSignal.includes('source') || attrSignal.includes('referral')) {
        if (labelSignal.includes('further') || labelSignal.includes('specify') || attrSignal.includes('specify') || attrSignal.includes('detail')) {
          return 'HEAR_ABOUT_DETAIL';
        }
        return 'HEAR_ABOUT';
      }
      if (labelSignal.includes('gender') || attrSignal.includes('gender') || labelSignal.includes('sex')) return 'GENDER';
      if (labelSignal.includes('pronoun') || attrSignal.includes('pronoun')) return 'PRONOUNS';
      if (labelSignal.includes('education') || labelSignal.includes('degree') || attrSignal.includes('education')) return 'EDUCATION';
      if (labelSignal.includes('relocate') || attrSignal.includes('relocate')) return 'RELOCATE';
      if (labelSignal.includes('authorized') || labelSignal.includes('work auth') || attrSignal.includes('work_auth')) return 'WORK_AUTH';
      if (labelSignal.includes('sponsorship') || labelSignal.includes('visa') || attrSignal.includes('visa')) return 'VISA';
      if (labelSignal.includes('phone') || attrSignal.includes('phone')) return 'PHONE_TYPE'; // A select with phone is ALWAYS a phone type!
    }

    // 2. INPUT-SPECIFIC FAST HEURISTICS
    if (!isSelect) {
      if (input.type === 'file' || (input.tagName === 'INPUT' && input.type === 'file')) {
        if (labelSignal.includes('cover') || attrSignal.includes('cover') || labelSignal.includes('letter')) return 'COVER_LETTER';
        if (labelSignal.includes('transcript') || attrSignal.includes('transcript')) return null;
        if (labelSignal.includes('portfolio') || attrSignal.includes('portfolio')) return 'PORTFOLIO';
        return 'RESUME';
      }

      if (attrSignal.includes('dropzone') || attrSignal.includes('upload') || attrSignal.includes('resume-upload')) {
        if (labelSignal.includes('cover') || attrSignal.includes('cover')) return 'COVER_LETTER';
        if (labelSignal.includes('transcript') || attrSignal.includes('transcript')) return null;
        if (labelSignal.includes('resume') || labelSignal.includes('cv') || attrSignal.includes('resume') || attrSignal.includes('cv') || Boolean(input.querySelector && input.querySelector('input[type="file"]'))) {
          return 'RESUME';
        }
      }

      if (input.type === 'password' || attrSignal.includes('password') || labelSignal.includes('password')) {
        if (labelSignal.includes('confirm') || attrSignal.includes('confirm') || labelSignal.includes('re-enter') || labelSignal.includes('repeat') || labelSignal.includes('verify')) {
          return 'CONFIRM_PASSWORD';
        }
        return 'PASSWORD';
      }
      if (attrSignal.includes('username') || labelSignal.includes('username') || attrSignal.includes('login_id') || labelSignal.includes('login id')) {
        return 'LOGIN_ID';
      }

      if (input.type === 'tel') return 'PHONE';
      if ((labelSignal.includes('number') || attrSignal.includes('number')) && (contextSignal.includes('phone') || attrSignal.includes('phone'))) {
        return 'PHONE';
      }

      // Check ZIP and APT before generic ADDRESS so that compound IDs (e.g. iCIMS Address_PostalCode) don't hijack singleton ADDRESS
      if (labelSignal.includes('zip') || labelSignal.includes('postal') || attrSignal.includes('zip') || attrSignal.includes('postal') || labelSignal.includes('pin code') || labelSignal.includes('pincode') || attrSignal.includes('postalcode') || attrSignal.includes('postal_code') || attrSignal.includes('postal-code')) {
        return 'ZIP';
      }
      if (labelSignal.includes('address 2') || labelSignal.includes('address line 2') || attrSignal.includes('address2') || attrSignal.includes('address_2') || attrSignal.includes('line2') || attrSignal.includes('line_2') || labelSignal.includes('apartment') || labelSignal.includes('suite') || labelSignal.includes('apt')) {
        return 'APT';
      }
      if ((labelSignal.includes('address') || attrSignal.includes('address') || labelSignal.includes('street') || attrSignal.includes('street')) &&
          !labelSignal.includes('email') && !attrSignal.includes('email') &&
          !labelSignal.includes('web') && !attrSignal.includes('url') &&
          !labelSignal.includes('zip') && !attrSignal.includes('zip') &&
          !labelSignal.includes('postal') && !attrSignal.includes('postal') &&
          !labelSignal.includes('city') && !attrSignal.includes('city') &&
          !labelSignal.includes('state') && !attrSignal.includes('state') &&
          !labelSignal.includes('country') && !attrSignal.includes('country')) {
        return 'ADDRESS';
      }
      if (labelSignal.includes('city') || attrSignal.includes('city') || labelSignal.includes('town')) {
        return isEmploymentSection ? 'EXP_CITY' : 'CITY';
      }
      if (labelSignal.includes('state') || labelSignal.includes('province') || attrSignal.includes('state') || attrSignal.includes('province')) {
        return isEmploymentSection ? 'EXP_STATE' : 'STATE';
      }
      if (labelSignal.includes('country') || attrSignal.includes('country')) {
        return isEmploymentSection ? 'EXP_COUNTRY' : 'COUNTRY';
      }
    }

    // 3. SECTION-AWARE FAST HEURISTICS: Employment
    if (isEmploymentSection) {
      if (labelSignal.includes('company') || attrSignal.includes('company') || labelSignal.includes('employer') || attrSignal.includes('employer') || labelSignal.includes('organization')) return 'COMPANY';
      if ((labelSignal.includes('title') || attrSignal.includes('title')) && !labelSignal.includes('degree')) return 'EMPLOYMENT_TITLE';
      
      if (labelSignal.includes('reason for leaving') || labelSignal.includes('reason') || attrSignal.includes('reason_for_leaving') || attrSignal.includes('leaving_reason')) {
        return 'REASON_FOR_LEAVING';
      }

      if (input.type === 'checkbox' && (labelSignal.includes('current') || attrSignal.includes('current'))) return 'CURRENT_ROLE';
      if (input.tagName === 'TEXTAREA' || labelSignal.includes('description') || labelSignal.includes('responsibilities') || labelSignal.includes('duties') || attrSignal.includes('description') || attrSignal.includes('responsibilities')) {
        return 'WORK_DESCRIPTION';
      }
    }

    // 4. ANTICIPATED GRADUATION YEAR (High Priority before generic date parser)
    if (labelSignal.includes('anticipate graduating') || labelSignal.includes('graduation year') || labelSignal.includes('graduating year') || labelSignal.includes('year you anticipate') || attrSignal.includes('graduation_year')) {
      return 'GRADUATION_YEAR';
    }

    // 4b. GLOBAL DATE DISAMBIGUATION (Month, Day, Year) in Employment or Education
    const isStart = labelSignal.includes('start') || attrSignal.includes('start') || labelSignal.includes('from') || attrSignal.includes('from');
    const isEnd = labelSignal.includes('end') || attrSignal.includes('end') || labelSignal.includes('to') || attrSignal.includes('to') || (labelSignal.includes('graduat') && !labelSignal.includes('anticipate'));
    if (isStart || isEnd) {
      if (attrSignal.includes('year') || (labelSignal.includes('year') && !labelSignal.includes('month'))) {
        return isEnd ? 'END_YEAR' : 'START_YEAR';
      }
      if (attrSignal.includes('day') || (labelSignal.includes('day') && !labelSignal.includes('month') && !labelSignal.includes('year'))) {
        return isEnd ? 'END_DAY' : 'START_DAY';
      }
      if (attrSignal.includes('month') || (labelSignal.includes('month') && !labelSignal.includes('year'))) {
        return isEnd ? 'END_MONTH' : 'START_MONTH';
      }
      if (isStart) return (labelSignal.includes('month') || isSelect) ? 'START_MONTH' : 'START_YEAR';
      if (isEnd) return (labelSignal.includes('month') || isSelect) ? 'END_MONTH' : 'END_YEAR';
    }

    if (labelSignal.includes('which language') || labelSignal.includes('business fluent') || (labelSignal.includes('language') && labelSignal.includes('fluent')) || attrSignal.includes('language')) {
      return 'LANGUAGES';
    }

    // 5. GLOBAL EDUCATION HEURISTICS (School, Degree, Discipline)
    if (labelSignal.includes('school') || labelSignal.includes('university') || labelSignal.includes('college') || labelSignal.includes('institution') || attrSignal.includes('school')) return 'SCHOOL';
    if (labelSignal.includes('degree') || attrSignal.includes('degree')) return 'DEGREE';
    if (labelSignal.includes('discipline') || labelSignal.includes('major') || labelSignal.includes('field of study') || attrSignal.includes('discipline') || attrSignal.includes('major')) return 'DISCIPLINE';

    // 5. SPECIFIC QUESTIONS & COMPLIANCE HEURISTICS
    if (labelSignal.includes('text consent') || labelSignal.includes('text message') || labelSignal.includes('sms') || attrSignal.includes('text_consent') || attrSignal.includes('sms')) return 'TEXT_CONSENT';
    if (labelSignal.includes('18 years') || labelSignal.includes('at least 18') || attrSignal.includes('18_years') || attrSignal.includes('age_18')) return 'AGE_18';
    if (labelSignal.includes('previously been employed') || labelSignal.includes('previously employed') || labelSignal.includes('employed by coinbase') || labelSignal.includes('prior employment')) return 'PREVIOUS_EMPLOYED';
    if (labelSignal.includes('privacy notice') || labelSignal.includes('arbitration agreement') || labelSignal.includes('global data privacy') || labelSignal.includes('receipt of the above linked')) return 'PRIVACY_CONSENT';
    if (labelSignal.includes('may use ai tools') || labelSignal.includes('use ai tools to assist')) return 'AI_CONSENT';
    if (labelSignal.includes('how you use ai') || labelSignal.includes('use ai tools today') || labelSignal.includes('describes how you use ai')) return 'AI_USAGE';
    if (labelSignal.includes('close relative') && (labelSignal.includes('government') || labelSignal.includes('official'))) return 'GOVT_RELATIVE';
    if ((labelSignal.includes('government official') || labelSignal.includes('civil service') || labelSignal.includes('holder of public office')) && !labelSignal.includes('relative')) return 'GOVT_OFFICIAL';
    if (labelSignal.includes('conflict of interest') || labelSignal.includes('perceived conflict') || labelSignal.includes('actual or perceived conflict')) return 'CONFLICT_INTEREST';
    if (labelSignal.includes('referred to this position by a senior') || labelSignal.includes('senior leader or decision-maker') || labelSignal.includes('institutional client, business partner, or vendor')) return 'REFERRED_BY_LEADER';
    if (labelSignal.includes('hispanic') || labelSignal.includes('latino')) return 'HISPANIC_LATINO';
    if (labelSignal.includes('veteran') || labelSignal.includes('vevraa')) return 'VETERAN';
    if (labelSignal.includes('disability') || labelSignal.includes('impairment')) return 'DISABILITY';
    if ((labelSignal.includes('race') || labelSignal.includes('ethnicity')) && !labelSignal.includes('hispanic')) return 'RACE_ETHNICITY';

    let best = { type: null, score: 0 };
    FIELD_PATTERNS.forEach(p => {
      if (isSelect && p.type === 'PHONE') return;
      let score = 0;
      p.kw.forEach(k => {
        if (kwMatch(attrSignal, k)) score += 10;
        if (kwMatch(labelSignal, k)) score += 3;
        if (kwMatch(contextSignal, k)) score += 1;
      });
      if (score > best.score) best = { type: p.type, score };
    });

    if (!best.type || best.score < 3) {
      if (input.tagName === 'TEXTAREA') return 'SCREENING';
      if (isSelect) {
        if (labelSignal.includes('?') || labelSignal.includes('*') || input.getAttribute('aria-required') === 'true' || attrSignal.includes('question') || Boolean(input.closest && input.closest('.field, .question, [class*="question"], [class*="field"], .field-wrapper'))) {
          return 'SCREENING_SELECT';
        }
      }
      if (input.tagName === 'INPUT' && (labelSignal.includes('?') || labelSignal.includes('*') || labelSignal.includes('please list') || labelSignal.includes('please describe') || labelSignal.includes('type n/a') || labelSignal.includes('names of') || input.required || input.getAttribute('aria-required') === 'true' || attrSignal.includes('question_'))) {
        return 'SCREENING';
      }
      return null;
    }
    return best.type;
  }

  /* =========================================================================
     ATS SPECIALIZED DRIVER ENGINE (MODULAR ARCHITECTURE)
     ========================================================================= */

  function isIcimsEnvironment(targetDocs = [document]) {
    try {
      const host = (window.location.hostname || '').toLowerCase();
      const href = (window.location.href || '').toLowerCase();
      if (host.includes('icims.com') || href.includes('icims.com') || href.includes('icims_content_iframe')) return true;
      for (const doc of targetDocs) {
        if (!doc) continue;
        if (doc.querySelector('#icims_content_iframe, [id*="PersonProfileFields"], [id*="PortalProfileFields"], [name*="PersonProfileFields"], [name*="PortalProfileFields"], table.iCIMS_Table, .iCIMS_MainWrapper, .iCIMS_JobHeader')) {
          return true;
        }
      }
    } catch (e) {}
    return false;
  }

  function scanIcimsFields(targetDoc) {
    if (!targetDoc) return { fields: [], seenElements: new Set() };
    const fields = [];
    const seenElements = new Set();

    // Deterministic Selector Mapping Table for iCIMS / Cotiviti Enterprise Portals
    const ICIMS_EXACT_MAP = [
      // 1. Resume File Upload
      {
        type: 'RESUME',
        selectors: [
          'input#PortalProfileFields\\.Resume_File',
          'input[name="PortalProfileFields.Resume_File"]',
          'input[id*="Resume_File"]',
          'input[type="file"][name*="Resume"]',
          'input[type="file"]'
        ]
      },
      // 2. Login Credentials
      {
        type: 'LOGIN_ID',
        selectors: [
          'input#PersonProfileFields\\.Login',
          'input[name="PersonProfileFields.Login"]',
          'input[id$="Login"]'
        ]
      },
      {
        type: 'PASSWORD',
        selectors: [
          'input#PersonProfileFields\\.Password',
          'input[name="PersonProfileFields.Password"]',
          'input[type="password"]:not([id*="Confirm"]):not([name*="Confirm"]):not([id*="_Confirm"])'
        ]
      },
      {
        type: 'CONFIRM_PASSWORD',
        selectors: [
          'input#PersonProfileFields\\.Password_Confirm',
          'input[name="PersonProfileFields.Password_Confirm"]',
          'input[type="password"][id*="Confirm"]',
          'input[type="password"][name*="Confirm"]'
        ]
      },
      // 3. Candidate Identity
      {
        type: 'FIRST_NAME',
        selectors: [
          'input#PersonProfileFields\\.FirstName',
          'input[name="PersonProfileFields.FirstName"]',
          'input[id$="FirstName"]'
        ]
      },
      {
        type: 'LAST_NAME',
        selectors: [
          'input#PersonProfileFields\\.LastName',
          'input[name="PersonProfileFields.LastName"]',
          'input[id$="LastName"]'
        ]
      },
      {
        type: 'EMAIL',
        selectors: [
          'input#PersonProfileFields\\.Email',
          'input[name="PersonProfileFields.Email"]',
          'input[id$="Email"]'
        ]
      },
      {
        type: 'PREFERRED_NAME',
        selectors: [
          'input#rcf2039',
          'input[name="rcf2039"]',
          'input[id$="rcf2039"]'
        ]
      },
      // 4. Phone
      {
        type: 'PHONE_TYPE',
        selectors: [
          'select#-1_PersonProfileFields\\.PhoneType',
          'select[name$="PhoneType"]',
          'select[id$="PhoneType"]'
        ]
      },
      {
        type: 'PHONE',
        selectors: [
          'input#-1_PersonProfileFields\\.PhoneNumber',
          'input[name$="PhoneNumber"]',
          'input[id$="PhoneNumber"]'
        ]
      },
      // 5. SMS / Text Consent
      {
        type: 'TEXT_CONSENT',
        selectors: [
          'select#rcf3553',
          'select[name="rcf3553"]',
          'select[id$="rcf3553"]',
          'select[name*="rcf3553"]'
        ]
      },
      // 6. Address Block
      {
        type: 'ADDRESS_TYPE',
        selectors: [
          'select#-1_PersonProfileFields\\.AddressType',
          'select[name$="AddressType"]',
          'select[id$="AddressType"]'
        ]
      },
      {
        type: 'ADDRESS',
        selectors: [
          'input#-1_PersonProfileFields\\.AddressStreet1',
          'input[name$="AddressStreet1"]',
          'input[id$="AddressStreet1"]'
        ]
      },
      {
        type: 'APT',
        selectors: [
          'input#-1_PersonProfileFields\\.AddressStreet2',
          'input[name$="AddressStreet2"]',
          'input[id$="AddressStreet2"]'
        ]
      },
      {
        type: 'CITY',
        selectors: [
          'input#-1_PersonProfileFields\\.AddressCity',
          'input[name$="AddressCity"]',
          'input[id$="AddressCity"]'
        ]
      },
      {
        type: 'ZIP',
        selectors: [
          'input#-1_PersonProfileFields\\.AddressZip',
          'input[name$="AddressZip"]',
          'input[id$="AddressZip"]'
        ]
      },
      {
        type: 'COUNTRY',
        selectors: [
          'select#-1_PersonProfileFields\\.AddressCountry',
          'select[name$="AddressCountry"]',
          'select[id$="AddressCountry"]'
        ]
      },
      {
        type: 'STATE',
        selectors: [
          'select#-1_PersonProfileFields\\.AddressState',
          'select[name$="AddressState"]',
          'select[id$="AddressState"]'
        ]
      },
      // 7. Referral Sources
      {
        type: 'HEAR_ABOUT',
        selectors: [
          'select#rcf3048',
          'select[name="rcf3048"]',
          'select[id$="rcf3048"]',
          'select[name*="rcf3048"]'
        ]
      },
      {
        type: 'HEAR_ABOUT_DETAIL',
        selectors: [
          'select#rcf3049',
          'select[name="rcf3049"]',
          'select[id$="rcf3049"]',
          'input#rcf3049_Text',
          'input[name="rcf3049_Text"]',
          'input[id$="rcf3049_Text"]'
        ]
      },
      // 8. Work Experience / Employment Block (All custom Cotiviti/iCIMS IDs)
      {
        type: 'COMPANY',
        selectors: [
          'input#-1_PersonProfileFields\\.rcf3212',
          'input[name$="rcf3212"]',
          'input[id$="rcf3212"]',
          'input[name*="rcf3212"]'
        ]
      },
      {
        type: 'EXP_STATE',
        selectors: [
          'select#-1_PersonProfileFields\\.rcf3217',
          'select[name$="rcf3217"]',
          'select[id$="rcf3217"]',
          'select[name*="rcf3217"]'
        ]
      },
      {
        type: 'EMPLOYMENT_TITLE',
        selectors: [
          'input#-1_PersonProfileFields\\.rcf3213',
          'input[name$="rcf3213"]',
          'input[id$="rcf3213"]',
          'input[name*="rcf3213"]'
        ]
      },
      {
        type: 'START_MONTH',
        selectors: [
          'select#-1_PersonProfileFields\\.rcf3214_Month',
          'select[name$="rcf3214_Month"]',
          'select[id$="rcf3214_Month"]'
        ]
      },
      {
        type: 'START_DAY',
        selectors: [
          'select#-1_PersonProfileFields\\.rcf3214_Date',
          'select[name$="rcf3214_Date"]',
          'select[id$="rcf3214_Date"]'
        ]
      },
      {
        type: 'START_YEAR',
        selectors: [
          'input#-1_PersonProfileFields\\.rcf3214_Year',
          'input[name$="rcf3214_Year"]',
          'input[id$="rcf3214_Year"]'
        ]
      },
      {
        type: 'END_MONTH',
        selectors: [
          'select#-1_PersonProfileFields\\.rcf3215_Month',
          'select[name$="rcf3215_Month"]',
          'select[id$="rcf3215_Month"]'
        ]
      },
      {
        type: 'END_DAY',
        selectors: [
          'select#-1_PersonProfileFields\\.rcf3215_Date',
          'select[name$="rcf3215_Date"]',
          'select[id$="rcf3215_Date"]'
        ]
      },
      {
        type: 'END_YEAR',
        selectors: [
          'input#-1_PersonProfileFields\\.rcf3215_Year',
          'input[name$="rcf3215_Year"]',
          'input[id$="rcf3215_Year"]'
        ]
      },
      {
        type: 'WORK_DESCRIPTION',
        selectors: [
          'textarea#-1_PersonProfileFields\\.rcf3219',
          'textarea[name$="rcf3219"]',
          'textarea[id$="rcf3219"]'
        ]
      },
      {
        type: 'REASON_FOR_LEAVING',
        selectors: [
          'textarea#-1_PersonProfileFields\\.rcf3268',
          'textarea[name$="rcf3268"]',
          'textarea[id$="rcf3268"]'
        ]
      }
    ];

    ICIMS_EXACT_MAP.forEach(item => {
      let el = null;
      for (const sel of item.selectors) {
        try {
          const match = targetDoc.querySelector(sel);
          if (match && !seenElements.has(match)) {
            el = match;
            break;
          }
        } catch (e) {}
      }
      if (el) {
        seenElements.add(el);
        const origVal = (el.tagName === 'INPUT' && (el.type === 'radio' || el.type === 'checkbox'))
          ? el.checked
          : (el.value !== undefined ? el.value : (el.innerText || el.textContent || ''));
        const elId = el.id || el.name || '';
        const safeId = elId ? elId.replace(/[^a-zA-Z0-9_-]/g, '_') : ('icims_' + fields.length);
        fields.push({
          element: el,
          type: item.type,
          id: item.type.toLowerCase() + '_' + safeId,
          originalValue: origVal,
          atsDriver: 'iCIMS'
        });
      }
    });

    return { fields, seenElements };
  }

  function isGreenhouseEnvironment(targetDocs = [document]) {
    try {
      const host = (window.location.hostname || '').toLowerCase();
      const href = (window.location.href || '').toLowerCase();
      if (host.includes('greenhouse.io') || href.includes('greenhouse.io') || href.includes('job_app')) return true;
      for (const doc of targetDocs) {
        if (!doc) continue;
        if (doc.querySelector('form#application-form, .job-boards-greenhouse, .select-shell, [id^="school--0"]')) {
          return true;
        }
      }
    } catch (e) {}
    return false;
  }

  function scanGreenhouseFields(targetDoc) {
    if (!targetDoc) return { fields: [], seenElements: new Set() };
    const fields = [];
    const seenElements = new Set();

    const GREENHOUSE_EXACT_MAP = [
      { type: 'FIRST_NAME', selectors: ['input#first_name', 'input[name="first_name"]', '#first_name'] },
      { type: 'LAST_NAME', selectors: ['input#last_name', 'input[name="last_name"]', '#last_name'] },
      { type: 'PREFERRED_NAME', selectors: ['input#preferred_name', 'input[name="preferred_name"]', '#preferred_name'] },
      { type: 'EMAIL', selectors: ['input#email', 'input[name="email"]', '#email'] },
      { type: 'PHONE', selectors: ['input#phone', 'input[name="phone"]', '#phone'] },
      { type: 'COUNTRY', selectors: ['input#country', '#country', 'select#country', '[name*="country" i]'] },
      { type: 'CITY', selectors: ['input#candidate-location', 'input[name="candidate_location"]', '#candidate-location', '[name*="location"]', '[id*="candidate_location"]'] },
      { type: 'ADDRESS', selectors: ['#question_69351126', 'input[name*="address" i]', '#address', '[id*="full_address" i]', '[id*="street_address" i]'] },
      { type: 'RESUME', selectors: ['input#resume[type="file"]', 'input[type="file"][name*="resume"]', 'input[type="file"]'] },
      { type: 'SCHOOL', selectors: ['input#school--0', '#school--0', '[id^="school--"]', '[id*="school"]'] },
      { type: 'DEGREE', selectors: ['input#degree--0', '#degree--0', '[id^="degree--"]', '[id*="degree"]'] },
      { type: 'DISCIPLINE', selectors: ['input#discipline--0', '#discipline--0', '[id^="discipline--"]', '[id*="discipline"]'] },
      { type: 'START_MONTH', selectors: ['#start-month--0', '[id^="start-month--"]', 'select[name*="start_month"]', 'input[name*="start_month"]', '[id*="start_date_month"]', '[name*="start_date_month"]', '[aria-label*="start date month" i]'] },
      { type: 'START_YEAR', selectors: ['#start-year--0', '[id^="start-year--"]', 'input[name*="start_year"]', '[id*="start_date_year"]', '[name*="start_date_year"]', '[aria-label*="start date year" i]'] },
      { type: 'END_MONTH', selectors: ['#end-month--0', '[id^="end-month--"]', 'select[name*="end_month"]', 'input[name*="end_month"]', '[id*="end_date_month"]', '[name*="end_date_month"]', '[aria-label*="end date month" i]'] },
      { type: 'END_YEAR', selectors: ['#end-year--0', '[id^="end-year--"]', 'input[name*="end_year"]', '[id*="end_date_year"]', '[name*="end_date_year"]', '[aria-label*="end date year" i]'] },
      { type: 'GRADUATION_YEAR', selectors: ['#question_69351114', '[id*="graduation_date" i]', '[id*="grad_date" i]', '[aria-label*="graduation date" i]'] },
      { type: 'LINKEDIN', selectors: ['#question_69351116', 'input[name*="linkedin" i]', '#linkedin', '[aria-label*="linkedin" i]'] },
      { type: 'GITHUB', selectors: ['#question_69351117', 'input[name*="github" i]', '#github', '[aria-label*="github" i]'] },
      { type: 'PORTFOLIO', selectors: ['#question_69351119', 'input[name*="website" i]', '#website', '#portfolio', '[aria-label*="website" i]'] },
      { type: 'VISA', selectors: ['#question_69351122', '[id*="sponsorship" i]', '[aria-label*="visa sponsorship" i]'] },
      { type: 'WORK_AUTH', selectors: ['#question_69351123', '[id*="work_auth" i]', '[aria-label*="legally authorized" i]'] },
      { type: 'RELOCATE', selectors: ['#question_69351124', '[id*="relocate" i]', '[aria-label*="relocate" i]'] },
      { type: 'AGE_18', selectors: ['#question_69351127', '[id*="age_18" i]', '[id*="18_years" i]', '[aria-label*="18 years" i]'] },
      { type: 'LANGUAGES', selectors: ['[id*="question_69351128"]', '[id*="language" i]', '[aria-label*="language" i]'] },
      { type: 'PRIVACY_CONSENT', selectors: ['#question_69351131', '#question_69351134', '[id*="privacy_notice" i]', '[aria-label*="privacy notice" i]'] },
      { type: 'PREVIOUS_EMPLOYED', selectors: ['#question_69351132', '#question_69351133', '#question_69351135'] },
      { type: 'GENDER', selectors: ['#question_69351130', '[id*="question_"][aria-label*="gender" i]'] },
      { type: 'GENDER', selectors: ['#gender', 'input#gender', 'select#gender', '[name="gender"]', '[id="gender"]'] },
      { type: 'HISPANIC_LATINO', selectors: ['#hispanic_ethnicity', 'input#hispanic_ethnicity', 'select#hispanic_ethnicity', '[name*="hispanic"]'] },
      { type: 'VETERAN', selectors: ['#veteran_status', 'input#veteran_status', 'select#veteran_status', '[name*="veteran"]'] },
      { type: 'DISABILITY', selectors: ['#disability_status', 'input#disability_status', 'select#disability_status', '[name*="disability"]'] },
      { type: 'SCREENING_SELECT', selectors: ['#question_69351112'] },
      { type: 'SCREENING', selectors: ['#question_69351113'] },
      { type: 'SCREENING_SELECT', selectors: ['#question_69351115'] },
      { type: 'SCREENING', selectors: ['#question_69351125'] }
    ];

    GREENHOUSE_EXACT_MAP.forEach(item => {
      let el = null;
      for (const sel of item.selectors) {
        try {
          const found = targetDoc.querySelector(sel);
          if (found) { el = found; break; }
        } catch (e) {}
      }
      if (el) {
        let interactive = el;
        if (el.tagName !== 'INPUT' && el.tagName !== 'SELECT' && el.tagName !== 'TEXTAREA') {
          const inner = el.querySelector('input, select, textarea, [role="combobox"]');
          if (inner) interactive = inner;
        }
        seenElements.add(interactive);
        seenElements.add(el);
        const origVal = (interactive.tagName === 'INPUT' && (interactive.type === 'radio' || interactive.type === 'checkbox'))
          ? interactive.checked
          : (interactive.value !== undefined ? interactive.value : (interactive.innerText || interactive.textContent || ''));
        const elId = interactive.id || interactive.name || el.id || el.name || '';
        const safeId = elId ? elId.replace(/[^a-zA-Z0-9_-]/g, '_') : ('gh_' + fields.length);
        fields.push({
          element: interactive,
          type: item.type,
          id: item.type.toLowerCase() + '_' + safeId,
          originalValue: origVal,
          atsDriver: 'Greenhouse'
        });
      }
    });

    return { fields, seenElements };
  }

  function scanFields() {
    let frameDocs = [];
    try {
      const iframes = document.querySelectorAll('iframe');
      for (let i = 0; i < iframes.length; i++) {
        try {
          const doc = iframes[i].contentDocument || (iframes[i].contentWindow && iframes[i].contentWindow.document);
          if (doc && doc.body) {
            const count = doc.querySelectorAll('input:not([type="hidden"]), select, textarea').length;
            if (count >= 2) {
              frameDocs.push(doc);
            }
          }
        } catch (e) {}
      }
    } catch (e) {}

    // When an embedded ATS portal is detected inside an iframe (like iCIMS #icims_content_iframe),
    // prioritize frameDocs exclusively so that the host company's outer header/footer search inputs never hijack singleton fields.
    const targetDocs = frameDocs.length > 0 ? frameDocs : [document];

    const results = [];
    const seenTypes = {};
    const SINGLETON_TYPES = new Set([
      'RESUME',
      'FIRST_NAME', 'LAST_NAME', 'FULL_NAME', 'EMAIL', 'PHONE', 'PHONE_TYPE',
      'ADDRESS_TYPE', 'ADDRESS', 'APT', 'CITY', 'STATE', 'COUNTRY', 'ZIP',
      'EXP_STATE', 'EXP_CITY', 'EXP_COUNTRY',
      'LINKEDIN', 'GITHUB', 'PORTFOLIO', 'SUMMARY', 'NOTICE_PERIOD',
      'PRONOUNS', 'RELOCATE', 'WORK_AUTH', 'VISA',
      'AGE_18', 'PREVIOUS_EMPLOYED', 'PRIVACY_CONSENT', 'AI_CONSENT', 'AI_USAGE',
      'GOVT_OFFICIAL', 'GOVT_RELATIVE', 'CONFLICT_INTEREST', 'REFERRED_BY_LEADER',
      'HISPANIC_LATINO', 'VETERAN', 'DISABILITY', 'RACE_ETHNICITY',
      'COMPANY', 'EMPLOYMENT_TITLE', 'WORK_DESCRIPTION',
      'START_MONTH', 'START_DAY', 'START_YEAR', 'END_MONTH', 'END_DAY', 'END_YEAR', 'CURRENT_ROLE',
      'GRADUATION_YEAR', 'LANGUAGES',
      'REASON_FOR_LEAVING', 'TEXT_CONSENT',
      'SCHOOL', 'DEGREE', 'DISCIPLINE',
      'PREFERRED_NAME', 'HEAR_ABOUT', 'HEAR_ABOUT_DETAIL'
    ]);

    const COMBOBOX_QUERY = [
      'input[type="text"]', 'input[type="email"]', 'input[type="tel"]', 'input[type="url"]',
      'input[type="number"]', 'input[type="password"]', 'input[type="radio"]', 'input[type="checkbox"]', 'input[type="search"]',
      'input[type="file"]',
      'input:not([type])', 'textarea', 'select',
      'button[role="combobox"]', 'div[role="combobox"]', '[aria-haspopup="listbox"]',
      '[data-automation-id="select-box"]', '.select-shell', '[class*="select__control"]',
      '[data-automation-id*="upload"]', '[class*="dropzone"]', '[class*="resume-upload"]'
    ].join(', ');

    const isIcims = isIcimsEnvironment(targetDocs);
    const isGreenhouse = isGreenhouseEnvironment(targetDocs);

    targetDocs.forEach(targetDoc => {
      const seenElements = new Set();

      // If on an iCIMS portal, execute the deterministic iCIMS driver first
      if (isIcims) {
        const { fields: icimsFields, seenElements: icimsSeen } = scanIcimsFields(targetDoc);
        icimsFields.forEach(f => {
          results.push(f);
          seenTypes[f.type] = true;
          seenElements.add(f.element);
        });
        icimsSeen.forEach(el => seenElements.add(el));
      }

      // If on a Greenhouse portal, execute the deterministic Greenhouse driver first
      if (isGreenhouse) {
        const { fields: ghFields, seenElements: ghSeen } = scanGreenhouseFields(targetDoc);
        ghFields.forEach(f => {
          results.push(f);
          seenTypes[f.type] = true;
          seenElements.add(f.element);
        });
        ghSeen.forEach(el => seenElements.add(el));
      }

      const inputs = targetDoc.querySelectorAll(COMBOBOX_QUERY);

      inputs.forEach(inp => {
        // Canonicalize container vs inner interactive element to prevent duplicate registrations
        let canonicalEl = inp;
        if (inp.tagName !== 'INPUT' && inp.tagName !== 'SELECT' && inp.tagName !== 'BUTTON' && inp.tagName !== 'TEXTAREA') {
          const innerInteractive = inp.querySelector('input:not([type="hidden"]), button[role="combobox"], [aria-haspopup="listbox"]');
          if (innerInteractive) canonicalEl = innerInteractive;
        }
        if (seenElements.has(canonicalEl)) return;
        seenElements.add(canonicalEl);

        const rect = canonicalEl.getBoundingClientRect();
        const isCheckOrRadio = canonicalEl.tagName === 'INPUT' && (canonicalEl.type === 'radio' || canonicalEl.type === 'checkbox');
        const isCB = isComboboxOrSelect(canonicalEl);
        const isFileInput = canonicalEl.tagName === 'INPUT' && canonicalEl.type === 'file';
        const isDropzone = (canonicalEl.getAttribute && (canonicalEl.getAttribute('data-automation-id') || '').includes('upload')) ||
          (canonicalEl.className && String(canonicalEl.className).includes('dropzone'));

        // Standard visibility check - file inputs & dropzones often use opacity: 0 / 0-height styling
        if (rect.width === 0 && rect.height === 0 && !isCheckOrRadio && !isCB && !isFileInput && !isDropzone) return;
        const computed = (targetDoc.defaultView || window).getComputedStyle(canonicalEl);
        if ((computed.display === 'none' || computed.visibility === 'hidden') && !isCheckOrRadio && !isCB && !isFileInput && !isDropzone) return;

        // Filter out OneTrust / Cookie consent banners & widgets
        if (idAttr.startsWith('ot-') || idAttr.includes('onetrust') || idAttr.includes('vendor-search') || idAttr.includes('cookie') || (canonicalEl.closest && canonicalEl.closest('#onetrust-banner-sdk, [id*="onetrust"], .ot-sdk-container, [id*="cookie"]'))) {
          return;
        }

        // Filter out site-wide career search filters & navigation inputs (e.g. iCIMS footer search)
        if (canonicalEl.type === 'search') return;
        const nameAttr = (canonicalEl.getAttribute('name') || '').toLowerCase();
        const idAttrClean = idAttr;
        if (canonicalEl.closest) {
          const isSearchContainer = canonicalEl.closest('form[role="search"], [role="search"], .search-box, .search-form, .job-search, header, footer, .iCIMS_JobSearch, #job-search, .search-wrapper');
          if (isSearchContainer) {
            const isAppForm = Boolean(canonicalEl.closest('form[id*="apply"], form[class*="apply"], #icims_content_iframe, [data-automation-id*="form"], .application-form, .jobs-apply-form'));
            if (!isAppForm) return;
          }
        }
        if ((nameAttr.includes('search') || idAttr.includes('search')) && !nameAttr.includes('research') && !idAttr.includes('research')) {
          if (!canonicalEl.closest('form[id*="apply"], form[class*="apply"], #icims_content_iframe, [data-automation-id*="form"], .application-form')) {
            return;
          }
        }

        const type = classifyField(canonicalEl);
        if (!type) return;

        if (SINGLETON_TYPES.has(type)) {
          if (seenTypes[type]) return;
          seenTypes[type] = true;
        }

        const origVal = (canonicalEl.tagName === 'INPUT' && (canonicalEl.type === 'radio' || canonicalEl.type === 'checkbox'))
          ? canonicalEl.checked
          : (canonicalEl.value !== undefined ? canonicalEl.value : (canonicalEl.innerText || canonicalEl.textContent || ''));

        const elId = canonicalEl.id || canonicalEl.name || (canonicalEl.getAttribute && canonicalEl.getAttribute('data-automation-id')) || '';
        const safeId = elId ? elId.replace(/[^a-zA-Z0-9_-]/g, '_') : ('idx_' + results.length);
        const fieldId = type.toLowerCase() + '_' + safeId;

        results.push({
          element: canonicalEl,
          type,
          id: fieldId,
          originalValue: origVal
        });
      });
    });

    // Ensure COUNTRY is processed before STATE so dependent options load,
    // and HEAR_ABOUT is processed before HEAR_ABOUT_DETAIL
    results.sort((a, b) => {
      if (a.type === 'COUNTRY' && b.type === 'STATE') return -1;
      if (a.type === 'STATE' && b.type === 'COUNTRY') return 1;
      if (a.type === 'HEAR_ABOUT' && b.type === 'HEAR_ABOUT_DETAIL') return -1;
      if (a.type === 'HEAR_ABOUT_DETAIL' && b.type === 'HEAR_ABOUT') return 1;
      return 0;
    });

    return results;
  }


  /* -- UNIVERSAL COMBOBOX & DROPDOWN ENGINE (UCDE) -- */
  const SYNONYM_DICTIONARY = {
    'male': ['man', 'm', 'he/him', 'he/him/his'],
    'female': ['woman', 'f', 'she/her', 'she/her/hers'],
    'he/him': ['he / him', 'he/him/his', 'male', 'man'],
    'she/her': ['she / her', 'she/her/hers', 'female', 'woman'],
    'mobile': ['cell', 'cellular', 'personal', 'primary', 'mobile phone', 'direct'],
    'home': ['home', 'personal', 'primary', 'residence', 'main', 'permanent'],
    'india': ['india', '+91', '91', 'republic of india'],
    'united states': ['usa', 'us', 'u.s.', 'united states of america'],
    'linkedin': ['job board', 'online job board', 'social network', 'social media', 'internet', 'company website', 'other'],
    'yes': ['confirmed', 'confirm', 'agree', 'i agree', 'i confirm', 'true', '1', 'yes, i am', 'yes, i do', 'yes, i have', 'authorized', 'authorized to work', 'legally authorized', 'us citizen or permanent resident', 'authorized without restriction', 'consent', 'opt in', 'opt-in', 'i consent', 'i accept / i agree', 'i accept'],
    'no': ['false', '0', 'i disagree', 'no, i am not', 'no, i do not', 'no, i have not', "no, i don't", 'not required', 'no sponsorship required', 'will not require'],
    'immediate': ['immediately', 'now', '0 weeks', '1 week', '2 weeks', 'available immediately', 'immediate', '< 2 weeks', 'less than 2 weeks'],
    'bachelor of computer applications (bca)': ['bachelor of computer applications', 'bachelor', 'bachelors', "bachelor's", "bachelor's degree", 'undergraduate', 'bca', 'computer applications', 'b.c.a', 'b.c.a.'],
    'i am not a protected veteran': ['not a protected veteran', 'not a veteran', 'i am not a veteran', 'no', 'i identify as one or more of the classifications of protected veteran: no'],
    'no, i don\'t have a disability': ['no, i do not have a disability', "no, i don't have", 'i do not have a disability', 'no disability', 'no', 'i do not have a physical or mental impairment'],
    'asian': ['asian (not hispanic or latino)', 'asian / pacific islander', 'south asian', 'asian - non hispanic', 'asian (all)'],
    'amity university': ['amity university noida', 'amity university, noida', 'amity university uttar pradesh', 'amity'],
    'computer science / applications': ['computer science', 'computer applications', 'information technology', 'software engineering', 'computing'],
    'i accept / i agree': ['i accept / i agree', 'i accept', 'i agree', 'agree', 'yes', 'confirm', 'true', '1'],
    'league of legends': ['league of legends', 'lol', 'league', 'teamfight tactics', 'valorant', 'technology / platform / infrastructure'],
    'english': ['english', 'en', 'english (fluent)'],
    'hindi': ['hindi', 'hi', 'hindi (fluent)'],
    '2028': ['summer 2028', 'spring 2028', 'fall 2028', 'winter 2028', '2028', 'july 2028', 'may 2028', 'june 2028', 'december 2028'],
    '2027': ['summer 2027', 'spring 2027', 'fall 2027', 'winter 2027', '2027', 'may 2027', 'june 2027'],
    '2026': ['summer 2026', 'spring 2026', 'fall 2026', 'winter 2026', '2026', 'may 2026', 'june 2026', 'december 2026', 'may 2026 (or earlier)'],
    '2025': ['summer 2025', 'spring 2025', 'fall 2025', 'winter 2025', '2025', 'july 2025'],
    'bs': ['bs', 'bs in computer science', 'bachelor of science', 'bachelors', 'yes', 'undergraduate', 'bca'],
    'n/a': ['n/a', 'na', 'not applicable', 'none', 'n / a'],
    'january': ['jan', '01', '1'],
    'february': ['feb', '02', '2'],
    'march': ['mar', '03', '3'],
    'april': ['apr', '04', '4'],
    'may': ['05', '5'],
    'june': ['jun', '06', '6'],
    'july': ['jul', '07', '7'],
    'august': ['aug', '08', '8'],
    'september': ['sep', 'sept', '09', '9'],
    'october': ['oct', '10'],
    'november': ['nov', '11'],
    'december': ['dec', '12'],
    'present': ['current', 'currently', 'present', 'now', 'till date', 'till now', 'june'],
    '1': ['01', '1st', 'day 1', '1'],
    'bihar': ['br', 'bihar, india'],
    'uttar pradesh': ['up', 'u.p.'],
    'delhi': ['nct of delhi', 'new delhi', 'dl'],
    'maharashtra': ['mh'],
    'karnataka': ['ka', 'bangalore', 'bengaluru']
  };

  const PLACEHOLDER_REGEX = /^(select|choose|placeholder|optional|none|--|—|select an option|please select)/i;
  const OTHER_FALLBACK_REGEX = /^(0\s*-\s*other|other\b|not listed\b|unlisted\b|not applicable\b|other institution\b|other school\b)/i;

  function resolveSemanticOptionMatch(options, targetVal, fieldType = '') {
    if (!options || options.length === 0 || !targetVal) return null;
    const targetLower = String(targetVal).trim().toLowerCase();
    if (!targetLower) return null;

    const validOptions = options.filter(o => !o.disabled);
    const pool = validOptions.length > 0 ? validOptions : options;

    // Stage 1: Exact text / value match
    for (const opt of pool) {
      const text = (opt.textContent || opt.text || '').replace(/\u00a0/g, ' ').trim().toLowerCase();
      const val = (opt.value || (opt.getAttribute && opt.getAttribute('data-value')) || '').trim().toLowerCase();
      if (text === targetLower || val === targetLower) return opt;
    }

    // Stage 2: Candidate invariants & compliance rules
    if (fieldType === 'COUNTRY' || fieldType === 'EXP_COUNTRY' || targetLower === 'india' || targetLower === '+91' || targetLower === '91') {
      const indiaMatch = pool.find(o => {
        const t = (o.textContent || o.text || '').trim().toLowerCase();
        const v = (o.value || '').trim().toLowerCase();
        return (t.includes('india') && !t.includes('indian ocean') && !t.includes('indiana')) || t.includes('+91') || v === 'in' || v === 'ind';
      });
      if (indiaMatch) return indiaMatch;
    }

    if (targetLower === 'asian' || targetLower === 'indian' || fieldType === 'RACE_ETHNICITY') {
      const asianMatch = pool.find(o => {
        const t = (o.textContent || o.text || '').trim().toLowerCase();
        return (t === 'asian' || t.startsWith('asian')) && !t.includes('american indian') && !t.includes('alaska native');
      });
      if (asianMatch) return asianMatch;
    }

    if (fieldType === 'GRADUATION_YEAR' || targetLower.includes('graduat')) {
      const targetYearNum = parseInt(targetLower.replace(/\D/g, ''), 10);
      const exactYear = pool.find(o => {
        const t = (o.textContent || o.text || '').trim().toLowerCase();
        return t.includes(String(targetYearNum));
      });
      if (exactYear) return exactYear;

      const yearOpts = pool.map(o => {
        const t = (o.textContent || o.text || '').trim();
        const y = parseInt(t.replace(/\D/g, ''), 10);
        return { opt: o, year: y, text: t.toLowerCase() };
      }).filter(item => !isNaN(item.year) && item.year >= 2000 && item.year <= 2100);

      if (yearOpts.length > 0) {
        yearOpts.sort((a, b) => a.year - b.year);
        const nextFuture = yearOpts.find(item => item.year >= targetYearNum) || yearOpts[0];
        if (nextFuture) return nextFuture.opt;
      }

      const gradMatch = pool.find(o => (o.textContent || o.text || '').toLowerCase().includes('already graduated'));
      if (gradMatch) return gradMatch;
    }

    if (fieldType === 'LANGUAGES') {
      const langMatch = pool.find(o => {
        const t = (o.textContent || o.text || '').trim().toLowerCase();
        return t === targetLower || t.startsWith(targetLower);
      });
      if (langMatch) return langMatch;
    }

    if (targetLower === 'n/a' || targetLower === 'na') {
      const naMatch = pool.find(o => {
        const t = (o.textContent || o.text || '').trim().toLowerCase();
        return t === 'n/a' || t === 'na' || t.includes('not applicable') || t.includes('none');
      });
      if (naMatch) return naMatch;
    }

    if (fieldType === 'DEGREE' || fieldType === 'EDUCATION' || targetLower.includes('bca') || targetLower.includes('computer applications')) {
      const bcaSyns = SYNONYM_DICTIONARY['bachelor of computer applications (bca)'] || [];
      for (const syn of bcaSyns) {
        const match = pool.find(o => {
          const t = (o.textContent || o.text || '').trim().toLowerCase();
          return t === syn || t.includes(syn);
        });
        if (match) return match;
      }
    }

    if (fieldType === 'VETERAN' || targetLower.includes('veteran')) {
      const vetMatch = pool.find(o => {
        const t = (o.textContent || o.text || '').trim().toLowerCase();
        return t.includes('not a protected veteran') || t.includes('not a veteran') || t.includes('i am not a protected') || (t === 'no' && !t.includes('yes'));
      });
      if (vetMatch) return vetMatch;
    }

    if (fieldType === 'DISABILITY' || targetLower.includes('disability')) {
      const disMatch = pool.find(o => {
        const t = (o.textContent || o.text || '').trim().toLowerCase();
        return t.includes("no, i don't have") || t.includes('no, i do not have') || t.includes('no disability') || (t === 'no' && !t.includes('yes'));
      });
      if (disMatch) return disMatch;
    }

    // Invariant: Date Months & Days
    if ((fieldType === 'END_MONTH' || fieldType === 'START_MONTH') && (targetLower === 'present' || targetLower === 'current' || targetLower === 'now')) {
      const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
      const currentMonthName = monthNames[new Date().getMonth()];
      const presentOpt = pool.find(o => {
        const t = (o.textContent || o.text || '').trim().toLowerCase();
        return t.includes('present') || t.includes('current') || t.includes('june');
      });
      if (presentOpt) return presentOpt;

      const curMonthOpt = pool.find(o => {
        const t = (o.textContent || o.text || '').trim().toLowerCase();
        const v = (o.value || '').trim().toLowerCase();
        return t.includes(currentMonthName) || v === String(new Date().getMonth() + 1) || v === String(new Date().getMonth() + 1).padStart(2, '0');
      });
      if (curMonthOpt) return curMonthOpt;
    }

    if (fieldType === 'START_DAY' || fieldType === 'END_DAY' || targetLower === '1') {
      const dayOpt = pool.find(o => {
        const t = (o.textContent || o.text || '').trim().toLowerCase();
        const v = (o.value || '').trim().toLowerCase();
        return t === '1' || t === '01' || v === '1' || v === '01' || t.includes('1st') || t === 'day 1';
      });
      if (dayOpt) return dayOpt;
    }

    // Stage 3: Rich semantic synonyms dictionary
    const synList = SYNONYM_DICTIONARY[targetLower] || [];
    for (const syn of synList) {
      for (const opt of pool) {
        const t = (opt.textContent || opt.text || '').trim().toLowerCase();
        const v = (opt.value || (opt.getAttribute && opt.getAttribute('data-value')) || '').trim().toLowerCase();
        if (t === syn || v === syn || t.includes(syn) || v.includes(syn)) {
          if (targetLower === 'asian' && t.includes('american indian')) continue;
          return opt;
        }
      }
    }

    // Stage 4: Fuzzy substring & word boundary match
    for (const opt of pool) {
      const t = (opt.textContent || opt.text || '').trim().toLowerCase();
      const v = (opt.value || (opt.getAttribute && opt.getAttribute('data-value')) || '').trim().toLowerCase();
      if (PLACEHOLDER_REGEX.test(t)) continue;
      if (t.includes(targetLower) || targetLower.includes(t) || v.includes(targetLower)) {
        if (targetLower === 'asian' && t.includes('american indian')) continue;
        return opt;
      }
    }

    // Stage 5: "Other / Not Listed" fallbacks for School, Degree, etc.
    if (fieldType === 'SCHOOL' || fieldType === 'DEGREE' || fieldType === 'DISCIPLINE' || fieldType === 'HEAR_ABOUT' || targetLower.includes('university') || targetLower.includes('college')) {
      const otherOpt = pool.find(o => {
        const t = (o.textContent || o.text || '').trim().toLowerCase();
        return OTHER_FALLBACK_REGEX.test(t);
      });
      if (otherOpt) return otherOpt;
    }

    // Stage 5b: Smart heuristics for HEAR_ABOUT and boolean consent/authorization fields
    if (fieldType === 'HEAR_ABOUT' || fieldType === 'HEAR_ABOUT_DETAIL') {
      const hearMatch = pool.find(o => {
        const t = (o.textContent || o.text || '').trim().toLowerCase();
        return t.includes('linkedin') || t.includes('job board') || t.includes('online') || t.includes('internet') || t.includes('website') || t.includes('other');
      });
      if (hearMatch) return hearMatch;
    }

    if (['WORK_AUTH', 'AGE_18', 'PRIVACY_CONSENT', 'AI_CONSENT', 'TEXT_CONSENT'].includes(fieldType) || targetLower === 'yes' || targetLower === 'true' || targetLower.includes('agree')) {
      const yesMatch = pool.find(o => {
        const t = (o.textContent || o.text || '').trim().toLowerCase();
        return (t === 'yes' || t.startsWith('yes') || t.includes('authorized') || t.includes('agree') || t.includes('confirm') || t.includes('consent') || t.includes('opt in') || t.includes('opt-in') || t.includes('i accept') || t.includes('acknowledge') || t.includes('i acknowledge')) && !t.includes('no');
      });
      if (yesMatch) return yesMatch;
    }

    if (['VISA', 'PREVIOUS_EMPLOYED', 'GOVT_OFFICIAL', 'GOVT_RELATIVE', 'CONFLICT_INTEREST'].includes(fieldType) || targetLower === 'no' || targetLower === 'false') {
      const noMatch = pool.find(o => {
        const t = (o.textContent || o.text || '').trim().toLowerCase();
        return (t === 'no' || t.startsWith('no') || t.includes('do not') || t.includes('none')) && !t.includes('yes');
      });
      if (noMatch) return noMatch;
    }

    // Stage 6: First non-placeholder fallback for mandatory fields
    if (fieldType === 'SCHOOL' || fieldType === 'COUNTRY' || fieldType === 'EXP_COUNTRY') {
      const otherFallback = pool.find(o => {
        const t = (o.textContent || o.text || '').trim().toLowerCase();
        return OTHER_FALLBACK_REGEX.test(t);
      });
      return otherFallback || null;
    }

    const firstValid = pool.find(o => {
      const t = (o.textContent || o.text || '').trim().toLowerCase();
      const v = o.value !== undefined ? o.value : (o.getAttribute && o.getAttribute('data-value'));
      return t && !PLACEHOLDER_REGEX.test(t) && v !== '' && v !== '0';
    });

    return firstValid || pool[0] || null;
  }

  function cleanupLingeringPopovers() {
    try {
      const popovers = document.querySelectorAll('[role="listbox"]:not([aria-hidden="true"]), [data-radix-popper-content-wrapper], .select__menu, [data-headlessui-state="open"]');
      if (popovers && popovers.length > 0) {
        const active = document.activeElement || document.body;
        active.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
        document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: 0, clientY: 0 }));
        document.body.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: 0, clientY: 0 }));
      }
    } catch (e) {}
  }

  async function fillNativeSelect(el, targetVal, fieldType = '') {
    if (!el || el.tagName !== 'SELECT') return false;
    const options = Array.from(el.options || []);
    if (!options.length) return false;

    const matched = resolveSemanticOptionMatch(options, targetVal, fieldType);
    if (matched) {
      el.value = matched.value;
      matched.selected = true;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
      try {
        const win = (el.ownerDocument && el.ownerDocument.defaultView) ? el.ownerDocument.defaultView : window;
        if (win.$ && win.$(el).trigger) {
          win.$(el).trigger('change');
        }
      } catch (e) {}
      return true;
    }
    return false;
  }

  async function fillGeoAutocomplete(inputEl, targetVal) {
    if (!inputEl) return false;
    try {
      const container = (inputEl.closest && inputEl.closest('.select-shell, .select__container, [class*="react-select"], [class*="Select-control"], .select')) || inputEl.parentElement;
      const doc = (container && container.ownerDocument) || inputEl.ownerDocument || document;
      const win = doc.defaultView || window;
      const valStr = String(targetVal || 'Patna, Bihar, India').trim();
      const searchCity = valStr.split(',')[0].trim() || 'Patna';

      // 1. Open dropdown by clicking the control
      if (container) {
        const control = container.querySelector('.select__control') || container;
        control.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: win }));
        control.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: win }));
        control.click();
        await new Promise(r => setTimeout(r, 350));
      }

      // 2. Focus input and type the city name using execCommand with fallback
      inputEl.focus();
      if (inputEl.select) inputEl.select();
      let typed = false;
      try {
        typed = doc.execCommand && doc.execCommand('insertText', false, searchCity);
      } catch (e) {}
      if (!typed) {
        const proto = win.HTMLInputElement ? win.HTMLInputElement.prototype : Object.getPrototypeOf(inputEl);
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) setter.call(inputEl, searchCity); else inputEl.value = searchCity;
        if (inputEl._valueTracker) inputEl._valueTracker.setValue('');
        inputEl.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: searchCity }));
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        inputEl.dispatchEvent(new Event('change', { bubbles: true }));
      }
      await new Promise(r => setTimeout(r, 500));

      // 3. Wait for options inside container's menu (or id-linked listbox), ensuring Loading... has resolved
      const listboxId = inputEl.getAttribute && (inputEl.getAttribute('aria-controls') || (inputEl.id ? `react-select-${inputEl.id}-listbox` : null));
      let matchedOption = null;
      const startTime = Date.now();
      while (Date.now() - startTime < 4500) {
        let menuEl = container ? container.querySelector('.select__menu, .select__menu-list') : null;
        if (!menuEl && listboxId) {
          menuEl = doc.getElementById(listboxId);
        }
        if (!menuEl) {
          menuEl = doc.querySelector('.select__menu');
        }

        if (menuEl) {
          const isLoading = menuEl.querySelector('.select__menu-notice--loading');
          const opts = Array.from(menuEl.querySelectorAll('.select__option, div[id*="-option-"], [role="option"]')).filter(o => {
            if (o.classList && o.classList.contains('iti__country')) return false;
            const txt = (o.textContent || '').trim();
            return txt.length > 0 && !PLACEHOLDER_REGEX.test(txt);
          });

          if (opts.length > 0 && !isLoading) {
            // Priority: matches searchCity and DOES NOT contain 'rural' (Patna, Bihar, India)
            matchedOption = opts.find(o => {
              const txt = (o.textContent || '').toLowerCase();
              return txt.includes(searchCity.toLowerCase()) && !txt.includes('rural');
            }) || opts.find(o => (o.textContent || '').toLowerCase().includes(searchCity.toLowerCase())) || opts[0];
            break;
          }
        }
        await new Promise(r => setTimeout(r, 100));
      }

      if (matchedOption) {
        const optWin = matchedOption.ownerDocument?.defaultView || win;
        matchedOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: optWin }));
        matchedOption.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: optWin }));
        matchedOption.click();
        await new Promise(r => setTimeout(r, 200));
        cleanupLingeringPopovers();
        return true;
      } else {
        // Fallback: commit typed city with Enter
        inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
        inputEl.dispatchEvent(new Event('change', { bubbles: true }));
        inputEl.dispatchEvent(new Event('blur', { bubbles: true }));
        await new Promise(r => setTimeout(r, 60));
        cleanupLingeringPopovers();
        return (inputEl.value || '').trim().length > 0;
      }
    } catch (e) {
      return false;
    }
  }

  async function fillReactSelectV2(inputEl, targetVal, fieldType = '') {
    if (!inputEl || !targetVal) return false;

    // Handle Geo-autocomplete for city/location
    if (fieldType === 'CITY' || fieldType === 'LOCATION' || (inputEl.id && inputEl.id.includes('location'))) {
      return await fillGeoAutocomplete(inputEl, targetVal);
    }

    const container = (inputEl.closest && inputEl.closest('.select-shell, .select__container, [class*="react-select"], [class*="Select-control"], .select')) || inputEl.parentElement;
    if (!container) return false;

    const control = container.querySelector('.select__control') || container;
    const doc = container.ownerDocument || document;
    const win = doc.defaultView || window;

    // Helper: query currently visible options from local container OR document
    const getVisibleOptions = () => {
      // 1. Check local container menu first
      const localMenu = container.querySelector('.select__menu, [class*="menu"]');
      if (localMenu) {
        const localOpts = Array.from(localMenu.querySelectorAll('.select__option, div[id*="-option-"]'));
        const filtered = localOpts.filter(o => {
          const txt = (o.textContent || o.text || '').trim();
          return txt.length > 0 && !PLACEHOLDER_REGEX.test(txt);
        });
        if (filtered.length > 0) return filtered;
      }

      // 2. Check full document (including portals and body, strictly excluding telephone iti dropdown options)
      const selectors = [
        '.select__menu .select__option',
        '#react-portal-mount-point .select__option',
        '#react-portal-mount-point div[id*="-option-"]',
        '.select__option:not(.iti__country)',
        'div[id*="-option-"]:not(.iti__country)'
      ];
      const raw = Array.from(doc.querySelectorAll(selectors.join(', ')));
      return raw.filter(o => {
        const txt = (o.textContent || o.text || '').trim();
        return txt.length > 0 && !PLACEHOLDER_REGEX.test(txt);
      });
    };

    // Helper: check if a valid selection has already been rendered in this container
    const isContainerPopulated = () => {
      const single = container.querySelector('.select__single-value, [class*="singleValue"], .select__multi-value__label, [class*="multiValue"]');
      if (single && single.textContent.trim().length > 0 && !PLACEHOLDER_REGEX.test(single.textContent.trim())) return true;
      if (single && single.getAttribute('data-astrework-display')) return true;
      const req = container.querySelector('input[class*="requiredInput"]');
      if (req && req.value && req.value.trim().length > 0 && !PLACEHOLDER_REGEX.test(req.value.trim())) return true;
      if (inputEl.value && inputEl.value.trim().length > 0 && !PLACEHOLDER_REGEX.test(inputEl.value.trim())) return true;
      return false;
    };

    // Helper: simulate typing to trigger search/filter in React-Select
    const typeSearchString = (searchStr) => {
      if (!inputEl || inputEl.tagName !== 'INPUT' || inputEl.readOnly) return;
      try {
        inputEl.focus();
        if (inputEl.select) inputEl.select();
        let typed = false;
        try {
          typed = doc.execCommand && doc.execCommand('insertText', false, searchStr);
        } catch (e) {}
        if (!typed) {
          const proto = win.HTMLInputElement ? win.HTMLInputElement.prototype : Object.getPrototypeOf(inputEl);
          const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
          if (setter) {
            setter.call(inputEl, searchStr);
          } else {
            inputEl.value = searchStr;
          }
          if (inputEl._valueTracker) inputEl._valueTracker.setValue('');
          inputEl.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: searchStr }));
          inputEl.dispatchEvent(new Event('input', { bubbles: true }));
          inputEl.dispatchEvent(new Event('change', { bubbles: true }));
        }
      } catch (e) {}
    };

    // Helper: open the dropdown menu cleanly without toggle collisions
    const openMenu = async () => {
      let opts = getVisibleOptions();
      if (opts.length > 0) return opts;

      // Click the select control directly with full mouse sequence
      try {
        control.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: win }));
        control.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: win }));
        control.click();
      } catch (e) {}

      // Wait up to 500ms for options to mount
      const start = Date.now();
      while (Date.now() - start < 500) {
        opts = getVisibleOptions();
        if (opts.length > 0) return opts;
        await new Promise(r => setTimeout(r, 50));
      }

      // If still not open, try direct focus on input and ArrowDown
      try {
        if (doc.activeElement !== inputEl) inputEl.focus();
        inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, bubbles: true }));
      } catch (e) {}

      const start2 = Date.now();
      while (Date.now() - start2 < 500) {
        opts = getVisibleOptions();
        if (opts.length > 0) return opts;
        await new Promise(r => setTimeout(r, 50));
      }

      return opts;
    };

    // Handle Multi-Select (e.g. LANGUAGES)
    const targets = Array.isArray(targetVal) ? targetVal : (fieldType === 'LANGUAGES' ? String(targetVal).split(',').map(s => s.trim()) : [targetVal]);
    let anySuccess = false;

    for (const singleVal of targets) {
      if (!singleVal) continue;

      // 1. Open the dropdown
      let options = await openMenu();

      let matchedOption = null;

      // 2. Specialized School handling (Amity University / Unlisted institutions)
      if (fieldType === 'SCHOOL' || singleVal.toLowerCase().includes('amity') || singleVal.toLowerCase().includes('university')) {
        let schoolOpt = options.find(o => (o.textContent || '').trim().toLowerCase().includes('amity'));
        if (!schoolOpt) {
          typeSearchString('Other');
          const startOther = Date.now();
          while (Date.now() - startOther < 3500) {
            const curOpts = getVisibleOptions();
            const menuEl = container.querySelector('.select__menu, .select__menu-list');
            const isLoading = menuEl && menuEl.querySelector('.select__menu-notice--loading');
            if (!isLoading) {
              schoolOpt = curOpts.find(o => (o.textContent || o.text || '').trim().toLowerCase() === 'other') ||
                curOpts.find(o => (o.textContent || o.text || '').trim().toLowerCase().startsWith('other')) ||
                curOpts.find(o => OTHER_FALLBACK_REGEX.test((o.textContent || o.text || '').trim()));
              if (schoolOpt) break;
            }
            await new Promise(r => setTimeout(r, 100));
          }
        }
        if (schoolOpt) {
          matchedOption = schoolOpt;
        }
      }

      // 3. Attempt semantic matching on currently visible options if not already matched
      if (!matchedOption) {
        matchedOption = resolveSemanticOptionMatch(options, singleVal, fieldType);
      }

      // 4. If no match and input is searchable, TYPE the target string to filter!
      const searchStr = String(singleVal).trim();
      if (!matchedOption && inputEl.tagName === 'INPUT' && !inputEl.readOnly) {
        typeSearchString(searchStr);
        const searchStart = Date.now();
        while (Date.now() - searchStart < 600) {
          options = getVisibleOptions();
          matchedOption = resolveSemanticOptionMatch(options, singleVal, fieldType);
          if (matchedOption) break;
          await new Promise(r => setTimeout(r, 60));
        }
      }

      // Degree fallback: if BCA not in list, select "Bachelor's Degree" or "Bachelor's" or "Other"
      if (!matchedOption && (fieldType === 'DEGREE' || fieldType === 'EDUCATION')) {
        matchedOption = options.find(o => {
          const t = (o.textContent || o.text || '').toLowerCase();
          return t.includes("bachelor's") || t.includes('bachelor') || t.includes('undergraduate') || t.includes('other');
        });
      }

      // Discipline fallback: if not in list, select Computer Science or Other
      if (!matchedOption && fieldType === 'DISCIPLINE') {
        matchedOption = options.find(o => {
          const t = (o.textContent || o.text || '').toLowerCase();
          return t.includes('computer science') || t.includes('information technology') || t.includes('software') || t.includes('computing') || t.includes('other');
        });
        if (!matchedOption && inputEl.tagName === 'INPUT' && !inputEl.readOnly) {
          typeSearchString('Computer Science');
          await new Promise(r => setTimeout(r, 300));
          options = getVisibleOptions();
          matchedOption = options.find(o => {
            const t = (o.textContent || o.text || '').toLowerCase();
            return t.includes('computer science') || t.includes('other');
          });
        }
      }

      // Graduation Year fallback: if 2028 not in list, select closest future year
      if (!matchedOption && (fieldType === 'GRADUATION_YEAR' || singleVal === '2028' || singleVal === '2026')) {
        matchedOption = options.find(o => {
          const t = (o.textContent || o.text || '').toLowerCase();
          return t.includes('2028') || t.includes('2027') || t.includes('already graduated');
        });
      }

      // Consent / Privacy fallback
      if (!matchedOption && (fieldType === 'PRIVACY_CONSENT' || singleVal.toLowerCase().includes('agree') || singleVal.toLowerCase() === 'yes')) {
        matchedOption = options.find(o => {
          const t = (o.textContent || o.text || '').toLowerCase();
          return t.includes('i accept') || t.includes('i agree') || t.includes('agree') || t === 'yes' || t.includes('acknowledge');
        });
      }

      // Product fallback: Riot Games / Tech products
      if (!matchedOption && (fieldType === 'SCREENING_SELECT' || singleVal.toLowerCase().includes('league'))) {
        matchedOption = options.find(o => {
          const t = (o.textContent || o.text || '').toLowerCase();
          return t.includes('league of legends') || t.includes('valorant') || t.includes('technology');
        });
      }

      // 5. Click the matched option with full Pointer + Mouse sequence
      if (matchedOption) {
        const optWin = matchedOption.ownerDocument?.defaultView || win;
        try {
          matchedOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: optWin }));
          matchedOption.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: optWin }));
          matchedOption.click();
        } catch (e) {}

        await new Promise(r => setTimeout(r, 180));
        anySuccess = true;

        // Visual perfection for custom / unlisted schools (e.g. Amity University)
        if (fieldType === 'SCHOOL' && (singleVal.toLowerCase().includes('amity') || singleVal.toLowerCase().includes('university'))) {
          try {
            const singleEl = container.querySelector('.select__single-value, [class*="singleValue"]');
            if (singleEl) {
              singleEl.textContent = 'Amity University';
              singleEl.setAttribute('data-astrework-display', 'Amity University');
            }
          } catch (e) {}
        }
      }
    }

    cleanupLingeringPopovers();
    return anySuccess || isContainerPopulated();
  }

  async function fillRadixOrHeadless(triggerEl, targetVal, fieldType = '') {
    if (!triggerEl) return false;
    try {
      if (document.activeElement !== triggerEl) triggerEl.focus();
    } catch (e) {}

    triggerEl.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, view: window }));
    triggerEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
    triggerEl.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, view: window }));
    triggerEl.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
    triggerEl.click();

    let options = [];
    const startTime = Date.now();
    while (Date.now() - startTime < 700) {
      // Check for search input in popover or container
      const searchInput = document.querySelector('.select2-input, [role="listbox"] input, [data-radix-popper-content-wrapper] input, input[type="search"], input[aria-autocomplete="list"]') ||
                          (triggerEl.parentElement && triggerEl.parentElement.querySelector('input:not([type="hidden"])'));
      if (searchInput && searchInput !== triggerEl && !searchInput.disabled) {
        try {
          searchInput.focus();
          const proto = window.HTMLInputElement.prototype;
          const setter = Object.getOwnPropertyDescriptor(proto, 'value');
          if (setter && setter.set) { setter.set.call(searchInput, targetVal); } else { searchInput.value = targetVal; }
          searchInput.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: String(targetVal) }));
          searchInput.dispatchEvent(new Event('change', { bubbles: true }));
          await new Promise(r => setTimeout(r, 120));
        } catch (e) {}
      }

      const popovers = Array.from(document.querySelectorAll(
        '[data-radix-popper-content-wrapper], [data-radix-select-viewport], [role="listbox"], [data-headlessui-state="open"], .select__menu, .select2-drop, .select2-results, [class*="menu"], [class*="dropdown-menu"], [class*="popover"], div[id*="listbox"], ul[id*="listbox"]'
      ));
      for (const p of popovers) {
        const opts = Array.from(p.querySelectorAll('[role="option"], [data-radix-collection-item], [data-headlessui-state], li, div[id*="option"], div[class*="option"], .select2-results li'));
        if (opts.length > 0) {
          options = opts.filter(o => o.offsetHeight > 0 || o.getBoundingClientRect().height > 0 || o.offsetParent !== null);
          if (options.length > 0) break;
        }
      }
      if (options.length > 0) break;
      await new Promise(r => setTimeout(r, 50));
    }

    if (options.length === 0) {
      return await fillWaiAriaKeyboard(triggerEl, targetVal, fieldType);
    }

    const matchedOption = resolveSemanticOptionMatch(options, targetVal, fieldType);
    if (matchedOption) {
      matchedOption.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, view: window }));
      matchedOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
      matchedOption.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, view: window }));
      matchedOption.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
      matchedOption.click();
      await new Promise(r => setTimeout(r, 80));
      cleanupLingeringPopovers();
      return true;
    }

    // Fallback: If School/Degree/Discipline doesn't match exact target, pick 'Other' / 'Not Listed'
    if (fieldType === 'SCHOOL' || fieldType === 'DEGREE' || fieldType === 'DISCIPLINE') {
      const otherOpt = options.find(o => OTHER_FALLBACK_REGEX.test((o.textContent || o.text || '').trim()));
      if (otherOpt) {
        otherOpt.click();
        await new Promise(r => setTimeout(r, 80));
        cleanupLingeringPopovers();
        return true;
      }
    }

    return await fillWaiAriaKeyboard(triggerEl, targetVal, fieldType);
  }

  async function fillWorkdaySelect(triggerEl, targetVal, fieldType = '') {
    if (!triggerEl) return false;
    const container = triggerEl.closest('[data-automation-id="select-box"], [data-automation-id="formLabel"], div[id*="wd-"]') || triggerEl.parentElement;
    const searchInput = (container && container.querySelector('input[data-automation-id*="searchBox"], input:not([type="hidden"])')) || triggerEl;

    try {
      if (document.activeElement !== searchInput) searchInput.focus();
      const proto = window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value');
      if (setter && setter.set) { setter.set.call(searchInput, targetVal); } else { searchInput.value = targetVal; }
      searchInput.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: String(targetVal) }));
      searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
    } catch (e) {}

    let options = [];
    const startTime = Date.now();
    while (Date.now() - startTime < 600) {
      const popups = Array.from(document.querySelectorAll('ul[role="listbox"], div[data-automation-id="promptOption"], [data-automation-id="menu"]'));
      for (const p of popups) {
        const opts = Array.from(p.querySelectorAll('li, div[data-automation-id="promptOption"], [role="option"]'));
        if (opts.length > 0) {
          options = opts;
          break;
        }
      }
      if (options.length > 0) break;
      await new Promise(r => setTimeout(r, 50));
    }

    if (options.length > 0) {
      const matched = resolveSemanticOptionMatch(options, targetVal, fieldType);
      if (matched) {
        matched.click();
        await new Promise(r => setTimeout(r, 80));
        cleanupLingeringPopovers();
        return true;
      }
    }

    return await fillWaiAriaKeyboard(triggerEl, targetVal, fieldType);
  }

  async function fillWaiAriaKeyboard(triggerEl, targetVal, fieldType = '') {
    if (!triggerEl) return false;
    try {
      if (document.activeElement !== triggerEl) triggerEl.focus();
      triggerEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, bubbles: true }));
      triggerEl.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', keyCode: 32, bubbles: true }));
      await new Promise(r => setTimeout(r, 120));

      if (targetVal) {
        const chars = String(targetVal).slice(0, 5);
        for (const char of chars) {
          triggerEl.dispatchEvent(new KeyboardEvent('keypress', { key: char, bubbles: true }));
        }
        await new Promise(r => setTimeout(r, 100));
      }

      triggerEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
      await new Promise(r => setTimeout(r, 60));
      cleanupLingeringPopovers();
      return await verifyFieldWritten({ element: triggerEl, type: fieldType }, targetVal);
    } catch (e) {
      return false;
    }
  }

  async function fillUniversalCombobox(triggerEl, targetVal, fieldType = '') {
    if (!triggerEl || !targetVal) return false;

    // Check for City / Location autocomplete combobox first
    if (fieldType === 'CITY' || fieldType === 'LOCATION' || (triggerEl.id && triggerEl.id.includes('location'))) {
      return await fillGeoAutocomplete(triggerEl, targetVal);
    }

    const type = detectComboboxType(triggerEl);
    switch (type) {
      case 'NATIVE':
        return await fillNativeSelect(triggerEl, targetVal, fieldType);
      case 'RADIX':
      case 'HEADLESS_UI':
      case 'WAI_ARIA':
        return await fillRadixOrHeadless(triggerEl, targetVal, fieldType);
      case 'WORKDAY':
        return await fillWorkdaySelect(triggerEl, targetVal, fieldType);
      case 'REACT_SELECT':
        return await fillReactSelectV2(triggerEl, targetVal, fieldType);
      default:
        return await fillRadixOrHeadless(triggerEl, targetVal, fieldType);
    }
  }

  /* -- SYNTHETIC RESUME BINARY INJECTION (PILLAR B) -- */
  function getResumeBinaryFromBackground() {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type: 'GET_RESUME_BINARY' }, (res) => {
          if (chrome.runtime.lastError) {
            resolve({ success: false, error: chrome.runtime.lastError.message });
            return;
          }
          resolve(res || { success: false, error: 'Empty response from background streamer' });
        });
      } catch (e) {
        resolve({ success: false, error: e.message });
      }
    });
  }

  function base64ToBlob(base64, mimeType = 'application/pdf') {
    const cleanBase64 = base64.replace(/^data:[^;]+;base64,/, '').trim();
    const binary = atob(cleanBase64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mimeType });
  }

  async function injectResumeFile(targetEl) {
    if (!targetEl) return { success: false, error: 'No target element provided' };

    const data = await getResumeBinaryFromBackground();
    if (!data || !data.success || !data.base64) {
      return { success: false, error: (data && data.error) || 'Failed to stream resume binary from background' };
    }

    try {
      const filename = data.filename || 'Candidate_Resume.pdf';
      const mimeType = data.mimeType || 'application/pdf';
      const blob = base64ToBlob(data.base64, mimeType);
      const file = new File([blob], filename, {
        type: mimeType,
        lastModified: Date.now()
      });

      const dt = new DataTransfer();
      dt.items.add(file);

      // Locate actual input[type="file"]
      let fileInput = null;
      if (targetEl.tagName === 'INPUT' && targetEl.type === 'file') {
        fileInput = targetEl;
      } else {
        fileInput = targetEl.querySelector('input[type="file"]') ||
          (targetEl.closest('form, [class*="application"], body') && targetEl.closest('form, [class*="application"], body').querySelector('input[type="file"]'));
      }

      if (fileInput) {
        try {
          fileInput.files = dt.files;
        } catch (filesErr) {}
        fileInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        fileInput.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      }

      // Dispatch Drag & Drop events on dropzone wrapper if present
      const dropzone = targetEl.tagName === 'INPUT'
        ? (targetEl.closest('[class*="dropzone"], [data-automation-id*="upload"], [class*="resume-upload"], .file-upload, [id*="dropzone"]') || targetEl.parentElement)
        : targetEl;

      if (dropzone && dropzone !== fileInput) {
        try {
          dropzone.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer: dt }));
          dropzone.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
          dropzone.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
        } catch (dragErr) {
          try {
            const dropEvt = new CustomEvent('drop', { bubbles: true, cancelable: true });
            dropEvt.dataTransfer = dt;
            dropzone.dispatchEvent(dropEvt);
          } catch (e) {}
        }
      }

      return { success: true, filename: filename, size: data.size };
    } catch (err) {
      return { success: false, error: err.message || 'Synthetic injection failed' };
    }
  }

  /* -- REACT / VUE NATIVE INPUT DISPATCHER -- */
  function setNativeValue(el, value, isFinal = true, fieldType = '') {
    if (!el) return;
    if (isComboboxOrSelect(el)) {
      fillUniversalCombobox(el, value, fieldType).catch(() => {});
      return;
    }

    const doc = el.ownerDocument || document;
    const win = (el.ownerDocument && el.ownerDocument.defaultView) ? el.ownerDocument.defaultView : window;

    if (el.tagName === 'INPUT' && el.type === 'radio') {
      const radios = el.name
        ? doc.querySelectorAll('input[type="radio"][name="' + CSS.escape(el.name) + '"]')
        : [el];
      let target = null;
      const valLower = String(value).toLowerCase();
      for (let i = 0; i < radios.length; i++) {
        const rVal = String(radios[i].value).toLowerCase();
        const labelText = getLabelText(radios[i]).toLowerCase();
        if (rVal === valLower || labelText.includes(valLower) ||
           (valLower === 'yes' && (rVal === 'true' || rVal === '1')) ||
           (valLower === 'no' && (rVal === 'false' || rVal === '0'))) {
          target = radios[i]; break;
        }
      }
      if (target) {
        target.checked = true;
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return;
    }

    if (el.tagName === 'INPUT' && el.type === 'checkbox') {
      const valLower = String(value).toLowerCase();
      const shouldCheck = valLower === 'yes' || valLower === 'true' || valLower === '1' || valLower === 'checked';
      if (el.checked !== shouldCheck) {
        try { el.click(); } catch(e) {}
      }
      let setter = null;
      try {
        const proto = (win.HTMLInputElement && win.HTMLInputElement.prototype) || Object.getPrototypeOf(el);
        setter = Object.getOwnPropertyDescriptor(proto, 'checked');
      } catch (e) {}
      if (setter && setter.set) {
        try { setter.set.call(el, shouldCheck); } catch (e) { el.checked = shouldCheck; }
      } else {
        el.checked = shouldCheck;
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }

    try {
      if (doc.activeElement !== el) {
        el.focus();
      }
    } catch (e) {}

    let proto = null;
    try {
      if (el.tagName === 'TEXTAREA') {
        proto = (win.HTMLTextAreaElement && win.HTMLTextAreaElement.prototype) || Object.getPrototypeOf(el);
      } else {
        proto = (win.HTMLInputElement && win.HTMLInputElement.prototype) || Object.getPrototypeOf(el);
      }
    } catch (e) {
      proto = Object.getPrototypeOf(el);
    }

    let setter = null;
    try {
      setter = Object.getOwnPropertyDescriptor(proto, 'value');
    } catch (e) {}

    if (setter && setter.set) {
      try {
        setter.set.call(el, value);
      } catch (e) {
        el.value = value;
      }
    } else {
      el.value = value;
    }

    if (el._valueTracker) {
      try { el._valueTracker.setValue(''); } catch(e) {}
    }
    try {
      el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: String(value) }));
    } catch (e) {
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (isFinal) {
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
      try {
        if (win.$ && win.$(el).trigger) {
          win.$(el).trigger('change');
        }
      } catch (e) {}
    }
  }

  /* -- TYPE LABELS -- */
  const TYPE_LABELS = {
    RESUME: 'Resume / CV',
    FIRST_NAME: 'First Name', LAST_NAME: 'Last Name', FULL_NAME: 'Full Name',
    EMAIL: 'Email Address', PHONE_TYPE: 'Phone Type', PHONE: 'Phone Number',
    LOCATION: 'Location', CITY: 'City', STATE: 'State / Province', COUNTRY: 'Country',
    LINKEDIN: 'LinkedIn URL', GITHUB: 'GitHub URL', PORTFOLIO: 'Portfolio URL',
    TITLE: 'Job Title', COVER_LETTER: 'Cover Letter', SUMMARY: 'Summary',
    WORK_AUTH: 'Work Authorization', VISA: 'Visa Sponsorship', SALARY: 'Salary', SCREENING: 'Screening Q',
    NOTICE_PERIOD: 'Notice Period', RELOCATE: 'Relocate', EDUCATION: 'Highest Education',
    GENDER: 'Gender', PRONOUNS: 'Pronouns',
    ADDRESS_TYPE: 'Address Type', ADDRESS: 'Street Address', APT: 'Apartment/Suite', ZIP: 'ZIP Code',
    EXP_STATE: 'Work State', EXP_CITY: 'Work City', EXP_COUNTRY: 'Work Country',
    START_DAY: 'Start Day', END_DAY: 'End Day', REASON_FOR_LEAVING: 'Reason for Leaving',
    TEXT_CONSENT: 'Text / SMS Consent',
    HEAR_ABOUT: 'Referral Source', HEAR_ABOUT_DETAIL: 'Source Detail',
    AGE_18: 'Legal Age (18+)', PREVIOUS_EMPLOYED: 'Prior Employment', PRIVACY_CONSENT: 'Privacy Agreement',
    AI_CONSENT: 'AI Processing Consent', AI_USAGE: 'AI Tools Usage', GOVT_OFFICIAL: 'Government Official',
    GOVT_RELATIVE: 'Government Relative', CONFLICT_INTEREST: 'Conflict of Interest',
    REFERRED_BY_LEADER: 'Senior Referral', HISPANIC_LATINO: 'Hispanic / Latino',
    VETERAN: 'Veteran Status', DISABILITY: 'Disability Status', RACE_ETHNICITY: 'Race / Ethnicity',
    COMPANY: 'Company Name', EMPLOYMENT_TITLE: 'Job Title', START_MONTH: 'Start Month', START_YEAR: 'Start Year',
    END_MONTH: 'End Month', END_YEAR: 'End Year', CURRENT_ROLE: 'Current Role',
    SCHOOL: 'School / University', DEGREE: 'Degree', DISCIPLINE: 'Discipline / Major',
    GRADUATION_YEAR: 'Graduation Year', LANGUAGES: 'Languages',
    SCREENING_SELECT: 'Screening Question',
    WORK_DESCRIPTION: 'Work Description', PASSWORD: 'Password', CONFIRM_PASSWORD: 'Confirm Password', LOGIN_ID: 'Login ID / Username',
    PREFERRED_NAME: 'Preferred Name'
  };

  /* -- RESOLVE SCREENING SELECT (DETERMINISTIC ASYMMETRIC SAFETY FIREWALL) -- */
  function resolveScreeningSelect(element) {
    const q = getLabelText(element).toLowerCase();

    // 0. SPECIALIZED CASE QUESTIONS (Non-Yes/No Options)
    if (q.includes('last month') || (q.includes('tencent') && (q.includes('month') || q.includes('when')))) {
      return 'n/a';
    }
    if (q.includes('language') && !q.includes('programming')) {
      return 'English';
    }
    if (q.includes('gender') || q.includes('sex')) {
      return (userProfile && userProfile.gender) || 'Male';
    }
    if (q.includes('bs, ms, or phd') || q.includes('degree program') || q.includes('pursuing a bs')) {
      return 'BS';
    }
    if (q.includes('remaining in your degree') || q.includes('at least one term') || q.includes('semester remaining')) {
      return 'Yes';
    }

    // 1. KNOCKOUT & DISQUALIFY QUESTIONS -> ABSOLUTELY "NO"
    if (
      q.includes('previously worked') ||
      q.includes('worked for') ||
      q.includes('worked at') ||
      q.includes('prior employee') ||
      q.includes('former employee') ||
      q.includes('previously been employed') ||
      q.includes('previously employed') ||
      q.includes('contractor or full-time') ||
      q.includes('contractor') ||
      q.includes('rioter') ||
      q.includes('tencent') ||
      q.includes('affiliate') ||
      q.includes('subsidiary') ||
      q.includes('previously applied') ||
      q.includes('applied to') ||
      q.includes('applied before') ||
      q.includes('sponsor') ||
      q.includes('sponsorship') ||
      q.includes('require visa') ||
      q.includes('felony') ||
      q.includes('criminal') ||
      q.includes('misdemeanor') ||
      q.includes('convicted') ||
      q.includes('disciplinary') ||
      q.includes('discharged') ||
      q.includes('terminated for cause') ||
      q.includes('fired') ||
      q.includes('relative') ||
      q.includes('family member') ||
      q.includes('conflict of interest') ||
      q.includes('conflict') ||
      q.includes('non-compete') ||
      q.includes('restrictive covenant') ||
      q.includes('government official') ||
      q.includes('public office') ||
      q.includes('civil service') ||
      q.includes('suspended') ||
      q.includes('debarred')
    ) {
      return 'No';
    }

    // 2. COMPLIANCE, CONSENT, POLICIES & WORK AUTH -> ABSOLUTELY "YES"
    if (
      q.includes('authorized to work') ||
      q.includes('legally authorized') ||
      q.includes('18 years') ||
      q.includes('at least 18') ||
      q.includes('consent') ||
      q.includes('acknowledge') ||
      q.includes('agree') ||
      q.includes('privacy notice') ||
      q.includes('privacy policy') ||
      q.includes('candidate privacy') ||
      q.includes('e-verify') ||
      q.includes('truthful') ||
      q.includes('certify') ||
      q.includes('terms and conditions') ||
      q.includes('terms') ||
      q.includes('background check') ||
      q.includes('drug screen') ||
      q.includes('reference check') ||
      q.includes('reliable internet') ||
      q.includes('comfortable with remote') ||
      q.includes('relocate') ||
      q.includes('40 hour') ||
      q.includes('remote internship')
    ) {
      return 'Yes';
    }

    // 3. PRODUCT / GAME / TEAM PREFERENCE -> League of Legends / Technology
    if (q.includes('product') || q.includes('interested in working on') || q.includes('project') || q.includes('team')) {
      return 'League of Legends';
    }

    // Safety-first default against risk knockout: return 'No'
    return 'No';
  }

  /* -- RESOLVE PREVIEW -- */
  function resolvePreview(field, profile, session) {
    const loc = parseLocation(profile.location);
    switch (field.type) {
      case 'RESUME':       return session ? (session.jobTitle ? 'Tailored PDF (' + session.jobTitle + ')' : 'Master Resume.pdf') : 'Master Resume.pdf';
      case 'FIRST_NAME':   return profile.firstName || null;
      case 'LAST_NAME':    return profile.lastName || null;
      case 'FULL_NAME':    return profile.fullName || null;
      case 'PREFERRED_NAME': return profile.firstName || null;
      case 'EMAIL':        return profile.email || null;
      case 'PHONE_TYPE':   return profile.phoneType || 'Mobile';
      case 'PHONE':        return profile.phone || null;
      case 'LOCATION':     return profile.location || null;
      case 'CITY':         return profile.city || loc.city || null;
      case 'STATE':        return profile.state || loc.state || null;
      case 'COUNTRY':      return profile.country || loc.country || null;
      case 'ADDRESS_TYPE': return profile.addressType || 'Home';
      case 'ADDRESS':      return profile.streetAddress || profile.city || loc.city || null;
      case 'APT':          return profile.apartment || null;
      case 'ZIP': {
        const rawZip = String(profile.zipCode || '800024').trim();
        const el = field.element;
        if (el && el.maxLength === 5) return rawZip.slice(0, 5);
        return rawZip;
      }
      case 'EXP_STATE':    return profile.state || loc.state || 'Bihar';
      case 'EXP_CITY':     return profile.city || loc.city || 'Patna';
      case 'EXP_COUNTRY':  return profile.country || loc.country || 'India';
      case 'START_DAY':    return '1';
      case 'END_DAY':      return '1';
      case 'REASON_FOR_LEAVING': return 'Seeking career growth and developer opportunities';
      case 'TEXT_CONSENT': return 'Yes';
      case 'WORK_DESCRIPTION': return profile.workDescription || (profile.virtualExps && profile.virtualExps[0] ? profile.virtualExps[0].outcome : profile.professionalSummary);
      case 'PASSWORD':
      case 'CONFIRM_PASSWORD': return '••••••••••••';
      case 'LOGIN_ID': return profile.email || 'roushan@gmail.com';
      case 'HEAR_ABOUT':   return profile.referralSource || 'LinkedIn';
      case 'HEAR_ABOUT_DETAIL': return 'Job Posting';
      case 'LINKEDIN':     return profile.linkedinUrl || null;
      case 'GITHUB':       return profile.githubUrl || null;
      case 'PORTFOLIO':    return profile.portfolioUrl || null;
      case 'TITLE': {
        let t = session ? session.jobTitle : (profile.title || null);
        if (t) t = t.replace(/\bEngineer\b/gi, 'Developer');
        return t;
      }
      case 'SUMMARY':      return session ? (session.tailoredSummary || null) : (profile.professionalSummary || null);
      case 'SALARY':       return session ? (session.salaryRange || null) : (profile.salaryRange || null);
      case 'NOTICE_PERIOD':return profile.noticePeriod || 'Immediate';
      case 'RELOCATE':     return profile.willingnessToRelocate ? 'Yes' : 'No';
      case 'EDUCATION':    return profile.highestEducation || 'Bachelor of Computer Applications (BCA)';
      case 'GENDER':       return profile.gender || 'Male';
      case 'PRONOUNS':     return profile.pronouns || 'He/Him';
      case 'WORK_AUTH':    return profile.workAuthorized ? 'Yes' : 'No';
      case 'VISA':         return profile.requiresVisa ? 'Yes' : 'No';
      case 'AGE_18':       return profile.is18OrOlder || 'Yes';
      case 'PREVIOUS_EMPLOYED': return profile.previouslyEmployed || 'No';
      case 'PRIVACY_CONSENT': return profile.privacyConsent || 'Yes';
      case 'AI_CONSENT':   return profile.aiConsent || 'Yes';
      case 'AI_USAGE':     return profile.aiUsage ? 'Daily AI Copilot' : 'Daily AI Copilot';
      case 'GOVT_OFFICIAL': return profile.governmentOfficial || 'No';
      case 'GOVT_RELATIVE': return profile.relativeGovernmentOfficial || 'No';
      case 'CONFLICT_INTEREST': return profile.conflictOfInterest || 'No';
      case 'REFERRED_BY_LEADER': return profile.referredByLeader || 'No';
      case 'HISPANIC_LATINO': return profile.hispanicLatino || 'No';
      case 'VETERAN':      return profile.veteranStatus || 'I am not a protected veteran';
      case 'DISABILITY':   return profile.disabilityStatus || "No, I don't have a disability";
      case 'RACE_ETHNICITY': return profile.race || 'Asian';
      case 'COMPANY':      return profile.company || 'AstreWork';
      case 'EMPLOYMENT_TITLE': {
        let t = profile.employmentTitle || profile.title || 'Full-Stack Developer';
        t = t.replace(/\bEngineer\b/gi, 'Developer');
        return t;
      }
      case 'START_MONTH':  return profile.startMonth || 'July';
      case 'START_YEAR':   return profile.startYear || '2025';
      case 'END_MONTH':    return profile.endMonth || 'July';
      case 'END_YEAR': {
        const y = profile.endYear;
        if (!y || y.toLowerCase() === 'present' || y.toLowerCase() === 'current') {
          return '2028';
        }
        return y;
      }
      case 'CURRENT_ROLE': return profile.currentRole !== false ? 'Yes' : 'No';
      case 'SCHOOL':       return profile.school || 'Amity University';
      case 'DEGREE':       return profile.degree || profile.highestEducation || 'Bachelor of Computer Applications (BCA)';
      case 'DISCIPLINE':   return profile.discipline || 'Computer Science / Applications';
      case 'GRADUATION_YEAR': return profile.graduationYear || '2028';
      case 'LANGUAGES':    return profile.languages || 'English, Hindi';
      case 'SCREENING_SELECT': return resolveScreeningSelect(field.element);
      case 'COVER_LETTER': return null;
      case 'SCREENING': {
        const labelText = getLabelText(field.element).toLowerCase();
        if (
          labelText.includes('relative') ||
          labelText.includes('family member') ||
          labelText.includes('conflict of interest') ||
          labelText.includes('non-compete') ||
          labelText.includes('criminal') ||
          /type\s*["']?na["']?/i.test(labelText) ||
          /if\s*["']?yes["']?,?\s*please/i.test(labelText)
        ) {
          return 'N/A';
        }
        return null;
      }
      default: return null;
    }
  }

  /* -- RESOLVE VALUE (async, calls AI for COVER_LETTER/SCREENING) -- */
  async function resolveValue(field, profile, session) {
    const loc = parseLocation(profile.location);
    switch (field.type) {
      case 'RESUME':      return 'SYNTHETIC_RESUME_BINARY';
      case 'FIRST_NAME':  return profile.firstName;
      case 'LAST_NAME':   return profile.lastName;
      case 'FULL_NAME':   return profile.fullName;
      case 'PREFERRED_NAME': return profile.firstName || 'Candidate';
      case 'EMAIL':       return profile.email;
      case 'PHONE_TYPE':  return profile.phoneType || 'Mobile';
      case 'PHONE': {
        const rawPhone = profile.phone || '';
        if (!rawPhone) return '';
        const phoneDigits = rawPhone.replace(/\D/g, '');
        if (field.element && field.element.maxLength === 10) return phoneDigits.slice(-10);
        if (field.element && (field.element.type === 'number' || field.element.inputMode === 'numeric')) return phoneDigits;
        return rawPhone;
      }
      case 'LOCATION':    return profile.location;
      case 'CITY':        return profile.city || loc.city || '';
      case 'STATE':       return profile.state || loc.state || '';
      case 'COUNTRY':     return profile.country || loc.country || '';
      case 'ADDRESS_TYPE': return profile.addressType || 'Home';
      case 'ADDRESS':     return profile.streetAddress || profile.city || loc.city || '';
      case 'APT':         return profile.apartment || '';
      case 'ZIP': {
        const rawZip = String(profile.zipCode || '800024').trim();
        const el = field.element;
        if (el) {
          if (el.maxLength === 5) return rawZip.slice(0, 5);
          const pattern = el.getAttribute('pattern') || '';
          if (pattern.includes('{5}') || pattern === '\\d{5}') return rawZip.slice(0, 5);
          const placeholder = (el.placeholder || '').trim();
          if (/^\d{5}$/.test(placeholder) || placeholder.toLowerCase() === '12345') return rawZip.slice(0, 5);
        }
        return rawZip;
      }
      case 'EXP_STATE':    return profile.state || loc.state || 'Bihar';
      case 'EXP_CITY':     return profile.city || loc.city || 'Patna';
      case 'EXP_COUNTRY':  return profile.country || loc.country || 'India';
      case 'START_DAY':    return '1';
      case 'END_DAY':      return '1';
      case 'REASON_FOR_LEAVING': return 'Seeking career growth and developer opportunities';
      case 'TEXT_CONSENT': return 'Yes';
      case 'WORK_DESCRIPTION': {
        if (profile.workDescription) return profile.workDescription;
        if (profile.virtualExps && profile.virtualExps.length > 0) {
          const exp = profile.virtualExps[0];
          return `${exp.actionTaken || ''}. ${exp.outcome || ''}`.trim() || profile.professionalSummary;
        }
        return profile.professionalSummary || 'Engineered high-performance cloud applications, API microservices, and distributed scraping pipelines.';
      }
      case 'LOGIN_ID': {
        try {
          const credRes = await apFetch('/credentials?siteUrl=' + encodeURIComponent(window.location.hostname));
          if (credRes.ok) {
            const cData = await credRes.json();
            if (cData && cData.credential && cData.credential.loginId) {
              return cData.credential.loginId;
            }
          }
        } catch (e) {}
        return profile.email || 'roushan@gmail.com';
      }
      case 'PASSWORD':
      case 'CONFIRM_PASSWORD': {
        if (window.__ap_staged_password) {
          return window.__ap_staged_password;
        }
        try {
          const credRes = await apFetch('/credentials?siteUrl=' + encodeURIComponent(window.location.hostname));
          if (credRes.ok) {
            const cData = await credRes.json();
            if (cData && cData.credential && cData.credential.password) {
              window.__ap_staged_password = cData.credential.password;
              return cData.credential.password;
            }
          }
        } catch (e) {}

        try {
          const genRes = await apFetch('/credentials?generate=true');
          if (genRes.ok) {
            const gData = await genRes.json();
            if (gData && gData.password) {
              window.__ap_staged_password = gData.password;
              window.__ap_needs_save = true;
              return gData.password;
            }
          }
        } catch (e) {}

        const fallbackPwd = 'Ast' + Math.random().toString(36).slice(2, 8).toUpperCase() + '@2026!';
        window.__ap_staged_password = fallbackPwd;
        window.__ap_needs_save = true;
        return fallbackPwd;
      }
      case 'HEAR_ABOUT':  return profile.referralSource || 'LinkedIn';
      case 'HEAR_ABOUT_DETAIL': return 'Job Posting';
      case 'LINKEDIN':    return profile.linkedinUrl;
      case 'GITHUB':      return profile.githubUrl;
      case 'PORTFOLIO':   return profile.portfolioUrl;
      case 'TITLE': {
        let t = session ? session.jobTitle : profile.title;
        if (t) t = t.replace(/\bEngineer\b/gi, 'Developer');
        return t;
      }
      case 'SUMMARY':     return session ? session.tailoredSummary : profile.professionalSummary;
      case 'WORK_AUTH':   return profile.workAuthorized ? 'Yes' : 'No';
      case 'SALARY': {
        const rawSal = session ? session.salaryRange : (profile.salaryRange || null);
        if (!rawSal) return null;
        if (field.element && (field.element.type === 'number' || field.element.inputMode === 'numeric')) {
          const nums = String(rawSal).replace(/[^0-9-]/g, '').split('-').map(Number).filter(Boolean);
          if (nums.length >= 2) return String(Math.round((nums[0] + nums[1]) / 2));
          if (nums.length === 1) return String(nums[0]);
        }
        return rawSal;
      }
      case 'NOTICE_PERIOD': return profile.noticePeriod || 'Immediate';
      case 'RELOCATE':    return profile.willingnessToRelocate ? 'Yes' : 'No';
      case 'EDUCATION':   return profile.highestEducation || 'Bachelor of Computer Applications (BCA)';
      case 'GENDER':      return profile.gender || 'Male';
      case 'PRONOUNS':    return profile.pronouns || 'He/Him';
      case 'VISA':        return profile.requiresVisa ? 'Yes' : 'No';
      case 'AGE_18':       return profile.is18OrOlder || 'Yes';
      case 'PREVIOUS_EMPLOYED': return profile.previouslyEmployed || 'No';
      case 'PRIVACY_CONSENT': return profile.privacyConsent || 'Confirmed';
      case 'AI_CONSENT':   return profile.aiConsent || 'Yes';
      case 'AI_USAGE':     return profile.aiUsage ? 'regularly use AI tools' : 'regularly use AI tools';
      case 'GOVT_OFFICIAL': return profile.governmentOfficial || 'No';
      case 'GOVT_RELATIVE': return profile.relativeGovernmentOfficial || 'No';
      case 'CONFLICT_INTEREST': return profile.conflictOfInterest || 'No';
      case 'REFERRED_BY_LEADER': return profile.referredByLeader || 'No';
      case 'HISPANIC_LATINO': return profile.hispanicLatino || 'No';
      case 'VETERAN':      return profile.veteranStatus || 'I am not a protected veteran';
      case 'DISABILITY':   return profile.disabilityStatus || "No, I don't have a disability";
      case 'RACE_ETHNICITY': return profile.race || 'Asian';
      case 'COMPANY':      return profile.company || 'AstreWork';
      case 'EMPLOYMENT_TITLE': {
        let t = profile.employmentTitle || profile.title || 'Full-Stack Developer';
        t = t.replace(/\bEngineer\b/gi, 'Developer');
        return t;
      }
      case 'START_MONTH':  return profile.startMonth || 'July';
      case 'START_YEAR':   return profile.startYear || '2025';
      case 'END_MONTH':    return profile.endMonth || 'July';
      case 'END_YEAR': {
        const y = profile.endYear;
        if (!y || y.toLowerCase() === 'present' || y.toLowerCase() === 'current') {
          return '2028';
        }
        return y;
      }
      case 'CURRENT_ROLE': return profile.currentRole !== false ? 'Yes' : 'No';
      case 'SCHOOL':       return profile.school || 'Amity University';
      case 'DEGREE':       return profile.degree || profile.highestEducation || 'Bachelor of Computer Applications (BCA)';
      case 'DISCIPLINE':   return profile.discipline || 'Computer Science / Applications';
      case 'GRADUATION_YEAR': return profile.graduationYear || '2028';
      case 'LANGUAGES':    return profile.languages || 'English, Hindi';
      case 'SCREENING_SELECT': return resolveScreeningSelect(field.element);
      case 'COVER_LETTER':
      case 'SCREENING': {
        const labelText = getLabelText(field.element);
        const question = labelText.slice(0, 300) || (field.type === 'COVER_LETTER' ? 'Write a cover letter' : 'Tell us about yourself');
        const qLower = question.toLowerCase();

        // Immediate procedural question interceptor (relatives, compliance, "Type NA")
        if (
          qLower.includes('relative') ||
          qLower.includes('family member') ||
          qLower.includes('family') ||
          qLower.includes('friends') ||
          qLower.includes('friend') ||
          qLower.includes('significant other') ||
          qLower.includes('conflict of interest') ||
          qLower.includes('non-compete') ||
          qLower.includes('criminal') ||
          /type\s*["']?na["']?/i.test(qLower) ||
          /if\s*["']?yes["']?,?\s*please/i.test(qLower)
        ) {
          return 'N/A';
        }

        const company = session && session.company ? session.company : document.title.replace(/ \|.*/, '').trim().slice(0, 60);
        const jobTitle = session && session.jobTitle ? session.jobTitle : '';

        // Domain screening motivation tailored for Riot Games
        if (
          qLower.includes('riot games') ||
          (company.toLowerCase().includes('riot') && (qLower.includes('why are you interested') || qLower.includes('software engineering intern'))) ||
          qLower.includes('interested in working at riot games')
        ) {
          return "I am deeply inspired by Riot Games' player-first engineering culture and dedication to high-performance systems in titles like League of Legends and VALORANT. As a systems developer passionate about distributed architectures, high-concurrency cloud systems, and real-time multiplayer performance, I want to contribute to building robust, low-latency backend infrastructure and game services that empower millions of players globally.";
        }

        // 1. Check Candidate Screening Q&A Vault first (sub-5ms, zero LLM latency)
        try {
          const vaultRes = await apFetch('/vault/match', {
            method: 'POST',
            body: JSON.stringify({ question, company, jobTitle }),
          });
          if (vaultRes.ok) {
            const vaultData = await vaultRes.json();
            if (vaultData && vaultData.matched && vaultData.answer) {
              field.source = 'vault';
              field.confidence = vaultData.confidence;
              field.vaultId = vaultData.vaultId;
              return vaultData.answer;
            }
          }
        } catch (e) {
          /* proceed to oracle/answer */
        }

        try {
          // Attempt high-reasoning Antigravity AI Oracle next
          let res = await apFetch('/oracle', {
            method: 'POST',
            body: JSON.stringify({
              question,
              company,
              jobTitle,
              jobDescription: session ? session.jdText : undefined,
            }),
          });
          // Fallback to standard answer endpoint if oracle is unavailable
          if (!res.ok) {
            res = await apFetch('/answer', {
              method: 'POST',
              body: JSON.stringify({
                question, company, jobTitle,
                context: session ? 'JOB DESCRIPTION:\n' + (session.jdText || '') + '\n\nTAILORED PROFILE:\n' + (session.tailoredSummary || '') : profile._context,
              }),
            });
          }
          if (res.ok) {
            const data = await res.json();
            if (data.answer) return data.answer;
          }
        } catch (e) {}

        // Autonomous Offline Fallback for Screening Questions
        return (profile.professionalSummary && profile.professionalSummary.length > 20)
          ? profile.professionalSummary
          : "I am an enthusiastic Full-Stack Developer with deep experience building scalable cloud applications, resilient API microservices, and high-performance data systems. I bring a strong work ethic, technical curiosity, and collaborative mindset to ship reliable software.";
      }
      default: return null;
    }
  }

  /* -- HUD ORCHESTRATOR (delegates to AstrePilotHUD Shadow DOM module) -- */
  async function toggleAstrePilotHUD() {
    // Only top-level window mounts and controls the HUD UI
    if (window !== window.top) return;

    // Guard: wait for hud-ui.js to initialize (loads before content.js per manifest order)
    if (typeof window.AstrePilotHUD === 'undefined') {
      await new Promise(r => setTimeout(r, 200));
      if (typeof window.AstrePilotHUD === 'undefined') {
        console.warn('[AstrePilot] hud-ui.js failed to load.');
        return;
      }
    }
    // A mount is in flight: ignore extra toggles (prevents duplicate HUDs)
    if (mountPromise) return mountPromise;

    // If HUD is already open -> toggle collapse
    if (activeHud) {
      if (activeHud.isCollapsed) { activeHud.expand(); } else { activeHud.collapse(); }
      return;
    }

    mountPromise = mountHud().finally(() => { mountPromise = null; });
    return mountPromise;
  }

  async function mountHud() {
    const config = await getStoredConfig();
    const activeCtx = config.activeContext || 'roushan';
    let isOffline = !config.token;

    // Mount HUD immediately in connecting state so user gets visual feedback
    activeHud = AstrePilotHUD.mount({
      onAutofill: runAutofill,
      onNextStep: runContinueNextStep,
      onUndo: runUndo,
      onExtract: runExtract,
      onExtractJD: runExtractJD,
      onDownloadResume: runDownloadResume,
      onSyncHarvester: runSyncHarvester,
      onRescan: rescanFields,
      onSwitchContext: async (ctx) => {
        try {
          if (!isOffline && config.token) {
            const profileRes = await apFetch(`/profile?slug=${encodeURIComponent(ctx)}`);
            if (profileRes.ok) {
              const pData = await profileRes.json();
              if (pData.success && pData.profile) {
                userProfile = pData.profile;
              }
            }
          } else {
            userProfile = STANDALONE_PROFILES[ctx] || STANDALONE_PROFILES.roushan;
          }
          if (activeHud && userProfile) {
            activeHud.setIdentity({
              fullName: userProfile.fullName || ((userProfile.firstName || '') + ' ' + (userProfile.lastName || '')).trim() || 'Candidate',
              title: userProfile.title || 'Full-Stack Developer',
              primedCompany: activeSession ? activeSession.company : null
            });
            rescanFields();
          }
        } catch (e) {
          console.warn('[AstrePilot] Context switch error:', e);
        }
      },
      onSwitchOrigin: async (origin) => {
        try {
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
            await chrome.storage.sync.set({ astrepilot_origin: origin });
          }
          const sRes = await apFetch('/session');
          if (sRes.ok) {
            const sData = await sRes.json();
            activeSession = sData.session;
          }
          const pRes = await apFetch('/profile');
          if (pRes.ok) {
            const pData = await pRes.json();
            if (pData.success && pData.profile) {
              userProfile = pData.profile;
            }
          }
          rescanFields();
        } catch (e) {
          console.warn('[AstrePilot] Origin switch error:', e);
        }
      },
      onLoginAdvance: () => {
        const loginBtn = findNextStepButton(document) || document.querySelector('input[type="submit"], button[type="submit"], button');
        if (activeHud) {
          activeHud.setState('transitioning', { step: 'Signing in & loading application form...' });
          if (loginBtn) {
            try {
              loginBtn.focus();
              loginBtn.click();
            } catch (e) {
              try { loginBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); } catch (err) {}
            }
          }
          watchForStepTransition(() => {
            rescanFields();
          });
        }
      },
      onReapply: () => {
        if (activeHud) activeHud.duplicateAlert = null;
        rescanFields();
      },
      onForceLockTakeover: async () => {
        await acquireFillLock(true);
        if (activeHud) activeHud.clearRemoteLock();
        runAutofill();
      },
      onSaveToVault: async (fieldId, btnEl) => {
        const f = detectedFields && detectedFields.find(x => x.id === fieldId);
        if (!f || !f.element) return;
        const question = (getLabelText(f.element) || '').slice(0, 300) || 'Custom Screening Question';
        const answerText = f.element.value || f.preview || '';
        if (!answerText.trim() || answerText.length < 5) return;

        if (btnEl) {
          btnEl.textContent = 'Saving…';
          btnEl.disabled = true;
        }

        try {
          const res = await apFetch('/vault', {
            method: 'POST',
            body: JSON.stringify({
              questionPattern: question,
              answerText: answerText,
              companyContext: activeSession && activeSession.company ? activeSession.company : document.title.replace(/ \|.*/, '').trim(),
              roleContext: activeSession && activeSession.jobTitle ? activeSession.jobTitle : '',
              isFavorite: true,
            }),
          });
          if (res.ok) {
            if (btnEl) {
              btnEl.textContent = '✓ Saved!';
              btnEl.style.color = '#059669';
              btnEl.style.borderColor = 'rgba(5, 150, 105, 0.3)';
              btnEl.style.background = 'rgba(5, 150, 105, 0.1)';
            }
            f.source = 'vault';
            if (activeHud) activeHud.updateField(f);
            if (syncChannel) {
              try {
                syncChannel.postMessage({
                  type: 'VAULT_ENTRY_SAVED',
                  timestamp: Date.now(),
                  payload: { questionPattern: question }
                });
              } catch (e) {}
            }
          } else {
            if (btnEl) {
              btnEl.textContent = 'Save Failed';
              btnEl.disabled = false;
            }
          }
        } catch (err) {
          if (btnEl) {
            btnEl.textContent = 'Save Failed';
            btnEl.disabled = false;
          }
        }
      },
      onConfirmSubmit: async (meta) => {
        try {
          await apFetch('/confirm', {
            method: 'POST',
            body: JSON.stringify({
              fillId: meta && meta.fillId,
              applicationId: meta && meta.applicationId,
              siteUrl: window.location.href,
            }),
          });
          if (activeHud) {
            activeHud.setState('done', { ...meta, isConfirmed: true });
            setTimeout(() => {
              if (activeHud && !activeHud.isCollapsed) activeHud.collapse();
            }, 3500);
          }
          if (syncChannel) {
            try {
              syncChannel.postMessage({
                type: 'APPLICATION_CONFIRMED',
                timestamp: Date.now(),
                payload: {
                  fillId: meta && meta.fillId,
                  applicationId: meta && meta.applicationId,
                  siteUrl: window.location.href,
                  company: (activeSession && activeSession.company) || ''
                }
              });
            } catch (e) {}
          }
        } catch (e) {
          console.error('[AstrePilot] Confirm failed', e);
        }
      },
      onClose: () => {
        if (detectedFields) {
          detectedFields.forEach(f => f.element.classList.remove('ap-field-active', 'ap-field-done'));
        }
        activeHud = null;
      }
    });
    activeHud.setState('connecting');

    if (!config.token) {
      isOffline = true;
      userProfile = STANDALONE_PROFILES[activeCtx] || STANDALONE_PROFILES.roushan;
    } else {
      try {
        const profileRes = await apFetch('/profile');
        if (!profileRes.ok) throw new Error('profile-failed');
        userProfile = await profileRes.json();

        const sessionRes = await apFetch('/session');
        if (sessionRes.ok) {
          const sData = await sessionRes.json();
          activeSession = sData.session;
        }
      } catch (err) {
        // Fallback to standalone offline profile if cloud un-paired or server down
        isOffline = true;
        userProfile = STANDALONE_PROFILES[activeCtx] || STANDALONE_PROFILES.roushan;
      }
    }
    if (!activeHud) return; // user closed the HUD while loading

    activeHud.setIdentity({
      fullName: userProfile.fullName || ((userProfile.firstName || '') + ' ' + (userProfile.lastName || '')).trim() || 'You',
      title: userProfile.title || 'Full-Stack Developer',
      primedCompany: activeSession ? activeSession.company : null
    });

    if (!isOffline) {
      // Pillar E: Duplicate Application Pre-Flight Status Check (Cloud Only)
      try {
        const checkRes = await apFetch('/check-status', {
          method: 'POST',
          body: JSON.stringify({
            siteUrl: window.location.href,
            company: (activeSession && activeSession.company) || document.title.replace(/ \|.*/, '').trim().slice(0, 80),
            jobTitle: (activeSession && activeSession.jobTitle) || ''
          })
        });
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (checkData && checkData.exists && checkData.application) {
            if (activeHud) activeHud.setDuplicateAlert(checkData.application);
          }
        }
      } catch (checkErr) {
        /* silent */
      }
    }

    activeHud.setState('scanning');

    // Check for catalog jobs (Wellfound / Jobright)
    const catalogData = extractCatalogJobs();
    if (catalogData && activeHud.setHarvester) {
      activeHud.setHarvester({
        source: catalogData.source,
        count: catalogData.jobs.length,
        jobs: catalogData.jobs,
        synced: false
      });
    }

    applyDetectedFields(scanFields(), catalogData);
  }

  function applyDetectedFields(fields, catalogData) {
    if (!activeHud) return;
    detectedFields = fields || [];

    const CORE_APPLICATION_TYPES = new Set([
      'FIRST_NAME', 'LAST_NAME', 'FULL_NAME', 'EMAIL', 'PHONE', 'RESUME',
      'WORK_AUTH', 'VISA', 'SCREENING', 'SCREENING_SELECT', 'WORK_DESCRIPTION',
      'COMPANY', 'SCHOOL', 'PASSWORD', 'CONFIRM_PASSWORD', 'LOGIN_ID',
      'PREFERRED_NAME', 'EMPLOYMENT_TITLE', 'EXP_STATE'
    ]);
    const hasCoreAppField = detectedFields.some(f => CORE_APPLICATION_TYPES.has(f.type));

    // If there are no core application fields and only 1-2 generic inputs (like location/zip from search widget),
    // this is a Job Description page, NOT an active application form.
    if (!hasCoreAppField && detectedFields.length <= 2) {
      detectedFields = [];
    }

    if (detectedFields.length === 0) {
      const cat = catalogData || extractCatalogJobs();
      if (cat && cat.jobs.length > 0) {
        activeHud.setState('catalog');
      } else {
        activeHud.setState('no-fields', { isJobOverview: true });
      }
      return;
    }

    const hudFields = detectedFields.map(f => {
      const isAI = f.type === 'COVER_LETTER' || f.type === 'SCREENING';
      const isSession = (f.type === 'TITLE' || f.type === 'SUMMARY' || f.type === 'SALARY') && !!activeSession;
      const preview = resolvePreview(f, userProfile, activeSession);
      return {
        id: f.id,
        type: f.type.toLowerCase().replace(/_/g, ''),
        label: TYPE_LABELS[f.type] || f.type,
        preview: preview || (isAI ? 'AI-generated on fill' : '-'),
        source: preview ? (isAI ? 'profile' : (isSession ? 'session' : 'profile')) : (isAI ? 'ai' : (isSession ? 'session' : 'profile')),
        status: ''
      };
    });

    activeHud.setFields(hudFields);
    activeHud.setProgress(0, detectedFields.length);
    activeHud.setState('ready');

    // Classify step and display step badge
    const curSession = getNavSession() || createDefaultNavSession(window.location.href, activeSession ? activeSession.company : '', activeSession ? activeSession.jobTitle : '');
    const stepIndicators = Array.from(document.querySelectorAll('[data-automation-id*="step"], ol.steps, ul.progress, [aria-current="step"], .progress-bar, h1, h2, legend'))
      .map(e => e.innerText || e.textContent || '').join(' ');
    const stepInfo = classifyCurrentStep(window.location.href, stepIndicators, detectedFields.map(f => f.type));
    curSession.stepCategory = stepInfo.category;
    curSession.stepName = stepInfo.label;
    saveNavSession(curSession);

    if (activeHud.setStepBadge) {
      activeHud.setStepBadge({
        stepIndex: curSession.currentStepIndex,
        stepName: curSession.stepName
      });
    }

    // Attach live input listeners to textareas to reflect edits in HUD
    detectedFields.forEach(f => {
      if ((f.type === 'SCREENING' || f.type === 'COVER_LETTER') && f.element) {
        if (f.element.value && (!f.preview || f.preview === '-')) {
          f.preview = f.element.value;
        }
        f.element.addEventListener('input', () => {
          f.preview = f.element.value;
          if (activeHud) {
            activeHud.updateField({
              id: f.id,
              type: f.type.toLowerCase().replace(/_/g, ''),
              label: TYPE_LABELS[f.type] || f.type,
              preview: f.element.value,
              source: f.source || 'profile',
            });
          }
        });
      }
    });
  }

  function rescanFields() {
    if (!activeHud || isFilling) return;
    const fields = scanFields();
    applyDetectedFields(fields);
  }

  async function runAutofill() {
    if (!activeHud) {
      await toggleAstrePilotHUD();
    }
    const hud = activeHud;
    if (!hud || isFilling) return;

    if (!userProfile) {
      const config = await getStoredConfig();
      userProfile = STANDALONE_PROFILES[config.activeContext || 'roushan'] || STANDALONE_PROFILES.roushan;
    }

    if (!detectedFields || !detectedFields.length) {
      const fields = scanFields();
      applyDetectedFields(fields);
    }
    if (!detectedFields || !detectedFields.length) return;

    // Pillar E: Concurrency Lock Check
    const lockRes = await acquireFillLock(false);
    if (!lockRes.success && lockRes.lock) {
      hud.setRemoteLock(lockRes.lock);
      return;
    }

    isFilling = true;
    startFillHeartbeat();
    try {
      if (syncChannel) {
        try {
          syncChannel.postMessage({
            type: 'FILL_LOCK_ACQUIRED',
            timestamp: Date.now(),
            payload: { url: window.location.href, company: activeSession ? activeSession.company : '' }
          });
        } catch (e) {}
      }
      await fillAllFields(hud);
    } finally {
      isFilling = false;
      releaseFillLock();
    }
  }

  async function runExtractJD() {
    const hud = activeHud;
    if (!hud) return;
    
    hud.setState('extracting', { step: 'Reading page content...' });
    try {
      const data = extractPageContent();
      const safeText = data.pageText.slice(0, 30000);
      
      hud.setState('extracting', { step: 'Analyzing job requirements...' });
      const res = await apFetch('/extract', {
        method: 'POST',
        body: JSON.stringify({ pageText: safeText, pageUrl: data.pageUrl, pageTitle: data.pageTitle, recruiter: data.recruiter })
      });
      
      if (res.ok) {
        const extracted = await res.json();
        if (extracted.success) {
           if (extracted.astraShield && hud.setAstraShield) {
             hud.setAstraShield(extracted.astraShield);
           }
           if (extracted.recruiter && hud.setRecruiter) {
             hud.setRecruiter(extracted.recruiter);
           }
           hud.setState('extracting', { step: 'Finalizing Extraction...' });
           setTimeout(async () => {
             if (activeHud === hud) {
               try {
                 const sessionRes = await apFetch('/session');
                 if (sessionRes.ok) {
                   const sData = await sessionRes.json();
                   activeSession = sData.session;
                   if (userProfile) {
                     activeHud.setIdentity({
                       fullName: userProfile.fullName || ((userProfile.firstName || '') + ' ' + (userProfile.lastName || '')).trim() || 'You',
                       title: userProfile.title || 'Candidate',
                       primedCompany: activeSession ? activeSession.company : null
                     });
                   }
                 }
               } catch (e) {}

               // Re-scan fields dynamically on the page with newly primed session
               const fields = scanFields();
               applyDetectedFields(fields);
               activeHud.expand();
             }
           }, 800);
           return;
        } else {
           hud.setState('error', { msg: extracted.error || 'Failed to extract data.' });
           return;
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        hud.setState('error', { msg: errData.error || ('Server error: ' + res.status) });
        return;
      }
    } catch (e) {
      console.error('[AstrePilot] Extract JD failed:', e);
      hud.setState('error', { msg: e.message || 'Network error occurred.' });
    }
  }

  async function runDownloadResume() {
    const hud = activeHud;
    const resumeFields = (detectedFields || []).filter(f => f.type === 'RESUME');
    let targetEl = resumeFields.length > 0 ? resumeFields[0].element : null;
    if (!targetEl) {
      targetEl = document.querySelector('input[type="file"], [class*="dropzone"], [data-automation-id*="upload"]');
    }

    if (targetEl) {
      if (hud) hud.setState('filling');
      const res = await injectResumeFile(targetEl);
      if (res && res.success) {
        if (hud) {
          hud.markRow(resumeFields[0] ? resumeFields[0].id : 'manual_resume', 'done', res.filename || 'Uploaded');
          hud.setState('ready');
        }
        return;
      }
    }

    // Fallback: download PDF directly to candidate's local Downloads folder
    chrome.runtime.sendMessage({ type: 'DOWNLOAD_RESUME' });
  }

  async function runSyncHarvester() {
    const hud = activeHud;
    if (!hud) return;
    const data = extractCatalogJobs();
    const jobs = (data && data.jobs && data.jobs.length) ? data.jobs : (hud.harvester && hud.harvester.jobs);
    const source = (data && data.source) || (hud.harvester && hud.harvester.source) || 'WELLFOUND';
    if (!jobs || !jobs.length) {
      hud.setState('error', { msg: 'No roles found to sync.' });
      return;
    }

    hud.setState('extracting', { step: `Syncing ${jobs.length} ${source} roles...` });
    try {
      const res = await apFetch('/api/jobs/import', {
        method: 'POST',
        body: JSON.stringify({ source: source, jobs: jobs })
      });
      const result = await res.json().catch(() => null);
      if (result && result.success) {
        if (hud.setHarvester) {
          hud.setHarvester({
            source: source,
            count: jobs.length,
            jobs: jobs,
            synced: true,
            inserted: result.inserted || 0,
            updated: result.updated || 0,
          });
        }
        hud.setState('catalog');
      } else {
        hud.setState('error', { msg: (result && result.error) || 'Failed to sync roles.' });
      }
    } catch (e) {
      hud.setState('error', { msg: e.message || 'Sync failed.' });
    }
  }

  async function runExtract() {
    const hud = activeHud;
    if (!hud) return;
    
    hud.setState('extracting', { step: 'Reading page content...' });
    try {
      const data = extractPageContent();
      const safeText = data.pageText.slice(0, 30000);
      
      hud.setState('extracting', { step: 'Analyzing job requirements...' });
      const res = await apFetch('/extract', {
        method: 'POST',
        body: JSON.stringify({ pageText: safeText, pageUrl: data.pageUrl, pageTitle: data.pageTitle, recruiter: data.recruiter })
      });
      
      if (res.ok) {
        const extracted = await res.json();
        if (extracted.success) {
           if (extracted.astraShield && hud.setAstraShield) {
             hud.setAstraShield(extracted.astraShield);
           }
           if (extracted.recruiter && hud.setRecruiter) {
             hud.setRecruiter(extracted.recruiter);
           }

           try {
             const sessionRes = await apFetch('/session');
             if (sessionRes.ok) {
               const sData = await sessionRes.json();
               activeSession = sData.session;
               if (userProfile && activeHud) {
                 activeHud.setIdentity({
                   fullName: userProfile.fullName || ((userProfile.firstName || '') + ' ' + (userProfile.lastName || '')).trim() || 'You',
                   title: userProfile.title || 'Candidate',
                   primedCompany: activeSession ? activeSession.company : null
                 });
               }
             }
           } catch (e) {}

           hud.setState('extracting', { step: 'Locating Apply button...' });
           setTimeout(() => {
             const success = findAndClickApplyButton();
             if (activeHud === hud) {
               if (success) {
                 try { sessionStorage.setItem('ap_auto_open', 'true'); } catch (e) {}
                 hud.setState('transitioning', { step: 'Navigating to application form...' });
               } else {
                 // Already on application form or no apply button found; scan fields
                 const fields = scanFields();
                 applyDetectedFields(fields);
                 activeHud.expand();
               }
             }
           }, 1000);
           return;
        } else {
           hud.setState('error', { msg: extracted.error || 'Failed to extract data.' });
           return;
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        hud.setState('error', { msg: errData.error || ('Server error: ' + res.status) });
        return;
      }
    } catch (e) {
      console.error('[AstrePilot] Extraction failed:', e);
      hud.setState('error', { msg: e.message || 'Network error occurred.' });
    }
  }

  /* -- PROOF-OF-WRITE AUDITOR -- */
  async function verifyFieldWritten(field, expectedVal) {
    if (!field || !field.element) return false;
    const el = field.element;
    const expStr = String(expectedVal).trim().toLowerCase();

    // Settle tick for React/Vue synthetic event commitments
    await new Promise(r => setTimeout(r, 60));

    // 1. Native Select
    if (el.tagName === 'SELECT') {
      if (el.selectedIndex < 0) return false;
      const opt = el.options[el.selectedIndex];
      if (!opt) return false;
      const optText = (opt.textContent || opt.text || '').trim().toLowerCase();
      const optVal = (opt.value || '').trim().toLowerCase();
      return !PLACEHOLDER_REGEX.test(optText) && (optVal !== '' && optVal !== '0');
    }

    // 2. Custom ARIA Combobox / React-Select
    if (isComboboxOrSelect(el)) {
      const container = (el.closest && el.closest('.select-shell, .select__container, [class*="react-select"], .select, .form-group')) || el.parentElement;
      if (container) {
        const single = container.querySelector('.select__single-value, [class*="singleValue"], .select__multi-value__label, [class*="multiValue"]');
        if (single && single.textContent.trim().length > 0 && !PLACEHOLDER_REGEX.test(single.textContent.trim())) return true;
        const req = container.querySelector('input[class*="requiredInput"]');
        if (req && req.value && req.value.trim().length > 0 && !PLACEHOLDER_REGEX.test(req.value.trim())) return true;
      }
      const text = (el.innerText || el.textContent || '').trim().toLowerCase();
      const ariaVal = (el.getAttribute('aria-valuenow') || el.getAttribute('aria-label') || '').toLowerCase();
      if (text && !PLACEHOLDER_REGEX.test(text) && text.length > 0) return true;
      if (ariaVal && ariaVal.length > 0 && !PLACEHOLDER_REGEX.test(ariaVal)) return true;
      if (el.value && el.value.trim().length > 0 && !PLACEHOLDER_REGEX.test(el.value.trim())) return true;
      return false;
    }

    // 3. Radio / Checkbox
    if (el.tagName === 'INPUT' && (el.type === 'radio' || el.type === 'checkbox')) {
      if (el.type === 'radio') {
        const ownerDoc = el.ownerDocument || document;
        const radios = el.name
          ? ownerDoc.querySelectorAll('input[type="radio"][name="' + CSS.escape(el.name) + '"]')
          : [el];
        for (let r of radios) {
          if (r.checked) return true;
        }
        return false;
      }
      return el.checked === (expStr === 'yes' || expStr === 'true' || expStr === '1');
    }

    // 4. Text, Password, Textarea
    const currentVal = (el.value || '').trim();
    if (currentVal.length === 0) return false;

    if (field.type === 'PASSWORD' || field.type === 'CONFIRM_PASSWORD' || el.type === 'password') {
      return currentVal.length >= 6;
    }

    const curLower = currentVal.toLowerCase();
    if (curLower === expStr) return true;
    if (expStr.startsWith(curLower) || curLower.startsWith(expStr.slice(0, 5))) return true;

    const expDigits = expStr.replace(/\D/g, '');
    const curDigits = curLower.replace(/\D/g, '');
    if (expDigits.length > 0 && (curDigits.includes(expDigits) || expDigits.includes(curDigits))) {
      return true;
    }

    return currentVal.length > 0;
  }

  async function fillAllFields(hud) {
    hud.setState('filling');
    let filled = 0;
    let hadAI = false;

    for (let i = 0; i < detectedFields.length; i++) {
      if (activeHud !== hud) return; // HUD was closed/replaced mid-run
      const f = detectedFields[i];
      hud.markRow(f.id, 'active');

      if (f.type === 'COVER_LETTER' || f.type === 'SCREENING') hadAI = true;

      // Allow dependent dropdowns (e.g. State depending on Country) time to populate options
      if (f.type === 'STATE') {
        let waited = 0;
        while (waited < 1200) {
          const isReady = f.element.tagName === 'SELECT'
            ? f.element.options.length > 1 && !f.element.disabled
            : !f.element.disabled && f.element.getAttribute('aria-disabled') !== 'true';
          if (isReady) break;
          await new Promise(r => setTimeout(r, 100));
          waited += 100;
        }
      }

      const val = await resolveValue(f, userProfile, activeSession);
      const skipped = !val || String(val).trim() === '';

      if (!skipped) {
        let writeSuccess = false;
        if (f.type === 'RESUME') {
          AstrePilotHUD.highlight(f.element);
          const uploadRes = await injectResumeFile(f.element);
          if (uploadRes && uploadRes.success) {
            filled++;
            hud.markRow(f.id, 'done', uploadRes.filename || 'Uploaded');
          } else {
            chrome.runtime.sendMessage({ type: 'DOWNLOAD_RESUME' });
            hud.markRow(f.id, 'skipped', 'Downloaded to disk');
          }
        } else if (isComboboxOrSelect(f.element)) {
          AstrePilotHUD.highlight(f.element);
          const cbSuccess = await fillUniversalCombobox(f.element, val, f.type);
          writeSuccess = cbSuccess || await verifyFieldWritten(f, val);
          if (writeSuccess) {
            filled++;
            hud.markRow(f.id, 'done', String(val).slice(0, 30));
          } else {
            hud.markRow(f.id, 'retry', '⚠ Retry Verification');
          }
        } else if (f.type === 'ZIP' || (f.element.tagName === 'INPUT' && (f.element.type === 'radio' || f.element.type === 'checkbox'))) {
          setNativeValue(f.element, val, true);
          writeSuccess = await verifyFieldWritten(f, val);
          if (!writeSuccess) {
            setNativeValue(f.element, val, true);
            writeSuccess = await verifyFieldWritten(f, val);
          }
          if (writeSuccess) {
            filled++;
            hud.markRow(f.id, 'done', String(val).slice(0, 30));
          } else {
            hud.markRow(f.id, 'retry', '⚠ Retry Verification');
          }
        } else {
          AstrePilotHUD.highlight(f.element);
          await AstrePilotHUD.fillAnimated(f.element, String(val), (el, v, isFinal) => setNativeValue(el, v, isFinal));
          writeSuccess = await verifyFieldWritten(f, val);
          if (!writeSuccess) {
            setNativeValue(f.element, val, true);
            writeSuccess = await verifyFieldWritten(f, val);
          }
          if (writeSuccess) {
            filled++;
            const displayVal = (f.type === 'PASSWORD' || f.type === 'CONFIRM_PASSWORD') ? '••••••••' : String(val).slice(0, 30);
            hud.markRow(f.id, 'done', displayVal);
          } else {
            hud.markRow(f.id, 'retry', '⚠ Retry Verification');
          }
        }
      } else {
        hud.markRow(f.id, 'skipped', '-');
      }
      hud.setProgress(filled, detectedFields.length);
      await new Promise(r => setTimeout(r, 80));
    }

    // Auto-secure staged credentials into Vault upon successful fill
    if (window.__ap_needs_save && window.__ap_staged_password) {
      try {
        const loginId = (userProfile && userProfile.email) || 'roushan@gmail.com';
        await apFetch('/credentials', {
          method: 'POST',
          body: JSON.stringify({
            siteUrl: window.location.hostname,
            loginId: loginId,
            password: window.__ap_staged_password,
            notes: 'Generated & secured by AstrePilot during application fill'
          })
        });
        window.__ap_needs_save = false;
        console.log('[AstrePilot] Generated credentials secured in Vault for ' + window.location.hostname);
      } catch (e) {
        console.warn('[AstrePilot] Failed to save staged credentials:', e);
      }
    }

    // Gatekeeper / Authentication Step Isolation:
    // If only email, login, or password fields exist, this is an authentication gateway, not a completed application.
    const isGate = isGatekeeperStep(detectedFields, window.location.href);
    if (isGate) {
      console.log('[AstrePilot] Gatekeeper/Login step filled. Withholding application logging and "done" state.');
      
      const loginBtn = findNextStepButton(document) || document.querySelector('input[type="submit"], button[type="submit"], button');
      const btnText = loginBtn ? (loginBtn.innerText || loginBtn.value || 'Log In').trim() : 'Log In';

      if (hud.settings && hud.settings.autoAdvance && loginBtn) {
        hud.setState('transitioning', { step: 'Logging in & loading application form...' });
        try {
          loginBtn.focus();
          loginBtn.click();
        } catch (e) {
          try { loginBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); } catch (err) {}
        }
        watchForStepTransition(() => {
          rescanFields();
        });
      } else {
        hud.setState('gatekeeper-ready', {
          buttonText: btnText
        });
      }
      return;
    }

    let logRes = null;
    let curSession = getNavSession() || createDefaultNavSession(window.location.href, (activeSession && activeSession.company) || '', (activeSession && activeSession.jobTitle) || '');
    
    // Check if there is an intermediate next step button
    const nextBtn = findNextStepButton(document);
    const hasNext = Boolean(nextBtn);

    // Record step completion in navigational memory
    const historyRecord = {
      stepIndex: curSession.currentStepIndex,
      stepCategory: curSession.stepCategory,
      stepName: curSession.stepName,
      fieldsTotal: detectedFields.length,
      fieldsFilled: filled,
      completedAt: Date.now()
    };

    const existingIdx = curSession.stepHistory.findIndex(s => s.stepIndex === curSession.currentStepIndex);
    if (existingIdx >= 0) {
      curSession.stepHistory[existingIdx] = historyRecord;
    } else {
      curSession.stepHistory.push(historyRecord);
    }

    curSession.cumulativeFieldsTotal = curSession.stepHistory.reduce((sum, h) => sum + h.fieldsTotal, 0);
    curSession.cumulativeFieldsFilled = curSession.stepHistory.reduce((sum, h) => sum + h.fieldsFilled, 0);
    curSession.isFinalStep = !hasNext;
    if (hasNext) {
      curSession.currentStepIndex += 1;
    }
    saveNavSession(curSession);

    try {
      const titleMatch = document.title.match(/(.+?)\s*[|\-]\s*(.+)/);
      const res = await apFetch('/log', {
        method: 'POST',
        body: JSON.stringify({
          siteUrl: window.location.href,
          company: (activeSession && activeSession.company) || (titleMatch ? titleMatch[2].trim() : ''),
          jobTitle: (activeSession && activeSession.jobTitle) || (titleMatch ? titleMatch[1].trim() : ''),
          fieldsTotal: curSession.cumulativeFieldsTotal || detectedFields.length,
          fieldsFilled: curSession.cumulativeFieldsFilled || filled,
          hasAiAnswers: hadAI,
        })
      });
      if (res && res.ok) {
        logRes = await res.json();
        curSession.activeFillId = logRes.fillId || logRes.id || null;
        curSession.activeApplicationId = logRes.applicationId || null;
        saveNavSession(curSession);
        if (syncChannel) {
          try {
            syncChannel.postMessage({
              type: 'APPLICATION_DRAFT_LOGGED',
              timestamp: Date.now(),
              payload: {
                fillId: curSession.activeFillId,
                applicationId: curSession.activeApplicationId,
                siteUrl: window.location.href,
                company: (activeSession && activeSession.company) || '',
                jobTitle: (activeSession && activeSession.jobTitle) || ''
              }
            });
          } catch (e) {}
        }
      }
    } catch (e) { /* silent */ }

    if (activeHud !== hud) return;

    if (hasNext) {
      hud.setState('step-complete', {
        stepIndex: curSession.currentStepIndex - 1,
        stepName: historyRecord.stepName,
        stepFieldsFilled: filled,
        cumulativeFilled: curSession.cumulativeFieldsFilled,
        cumulativeTotal: curSession.cumulativeFieldsTotal,
        hasNext: true
      });
    } else {
      hud.setState('done', {
        fillId: logRes ? (logRes.fillId || logRes.id) : curSession.activeFillId,
        applicationId: logRes ? logRes.applicationId : curSession.activeApplicationId,
        fieldsFilled: curSession.cumulativeFieldsFilled || filled,
        fieldsTotal: curSession.cumulativeFieldsTotal || detectedFields.length,
        isConfirmed: false,
      });
    }
  }

  function runUndo() {
    if (!detectedFields) return;
    detectedFields.forEach(f => {
      if (f.originalValue !== undefined) {
        setNativeValue(f.element, f.originalValue);
        f.element.classList.remove('ap-field-active', 'ap-field-done');
      }
    });
    if (activeHud) {
      const hudFields = detectedFields.map(f => {
        const isAI = f.type === 'COVER_LETTER' || f.type === 'SCREENING';
        const preview = resolvePreview(f, userProfile, activeSession);
        return {
          id: f.id,
          type: f.type.toLowerCase().replace(/_/g, ''),
          label: TYPE_LABELS[f.type] || f.type,
          preview: preview || (isAI ? 'AI-generated on fill' : '-'),
          source: isAI ? 'ai' : 'profile',
          status: ''
        };
      });
      activeHud.setFields(hudFields);
      activeHud.setProgress(0, detectedFields.length);
      activeHud.setState('ready');
      activeHud.expand();
    }
  }

  /* -- CONTINUOUS SPA NAVIGATION & DYNAMIC DOM TRANSITION WATCHER -- */
  let lastTrackedUrl = window.location.href;
  let domCheckTimer = null;

  function initSpaNavigationWatcher() {
    // 1. Monkey-patch pushState & replaceState to detect SPA client-side navigations
    if (!history.__ap_patched) {
      const origPush = history.pushState;
      history.pushState = function() {
        const res = origPush.apply(this, arguments);
        handleNavigationChange('pushState');
        return res;
      };
      const origReplace = history.replaceState;
      history.replaceState = function() {
        const res = origReplace.apply(this, arguments);
        handleNavigationChange('replaceState');
        return res;
      };
      history.__ap_patched = true;
    }

    window.addEventListener('popstate', () => handleNavigationChange('popstate'));
    window.addEventListener('hashchange', () => handleNavigationChange('hashchange'));

    // 2. Heartbeat URL check for query/path/hash changes
    setInterval(() => {
      if (window.location.href !== lastTrackedUrl) {
        handleNavigationChange('url_poll');
      }
    }, 600);

    // 3. Continuous MutationObserver to detect dynamic form mounting (e.g. login -> candidate profile)
    const observer = new MutationObserver(() => {
      if (isFilling) return;
      if (domCheckTimer) clearTimeout(domCheckTimer);
      domCheckTimer = setTimeout(() => {
        checkIfNewFormMounted();
      }, 500);
    });

    try {
      observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
      });
    } catch (e) {}
  }

  function handleNavigationChange(source) {
    if (window.location.href === lastTrackedUrl && source === 'url_poll') return;
    console.log(`[AstrePilot] SPA navigation detected (${source}): ${lastTrackedUrl} -> ${window.location.href}`);
    lastTrackedUrl = window.location.href;

    if (!activeHud || isFilling) return;

    if (activeHud.duplicateAlert) {
      activeHud.duplicateAlert = null;
    }

    setTimeout(() => {
      rescanFields();
    }, 400);
  }

  function checkIfNewFormMounted() {
    if (!activeHud || isFilling) return;
    
    // Only auto-wake if currently in done, gatekeeper-ready, step-complete, transitioning, or no-fields
    const wakeableStates = ['done', 'gatekeeper-ready', 'step-complete', 'transitioning', 'no-fields'];
    if (!wakeableStates.includes(activeHud.state)) return;

    // Guard: If currently in 'done', do NOT auto-reset to 'ready' if all previous fields are still attached in DOM and URL hasn't changed!
    if (activeHud.state === 'done') {
      if (window.location.href === lastTrackedUrl && detectedFields && detectedFields.length > 0) {
        const stillAttached = detectedFields.every(f => {
          const doc = (f.element && f.element.ownerDocument) || document;
          return doc.contains(f.element);
        });
        if (stillAttached) return;
      }
    }

    const currentFields = scanFields();
    if (!currentFields || currentFields.length === 0) return;

    // Check if new core application fields are now present using DOM element reference comparison
    const prevElements = new Set((detectedFields || []).map(f => f.element));
    const newFields = currentFields.filter(f => !prevElements.has(f.element));

    // If we were on gatekeeper (1-2 fields) and now 3+ fields exist, or if at least 2 brand new fields appeared
    if ((detectedFields.length <= 2 && currentFields.length >= 3) || newFields.length >= 2) {
      console.log(`[AstrePilot] Real form detected with ${currentFields.length} fields! Transitioning from ${activeHud.state} to ready.`);
      if (activeHud.duplicateAlert) {
        activeHud.duplicateAlert = null;
      }
      applyDetectedFields(currentFields);
    }
  }

  // Initialize continuous SPA navigation and dynamic DOM observer
  initSpaNavigationWatcher();

  // Auto-launch if we just clicked an apply button or next/continue step and navigated
  if (sessionStorage.getItem('ap_auto_open') === 'true') {
    sessionStorage.removeItem('ap_auto_open');
    setTimeout(async () => {
      await toggleAstrePilotHUD();
      // If dynamic ATS loaded fields with a slight delay, trigger a re-scan
      setTimeout(() => {
        if (activeHud && detectedFields.length === 0 && !isFilling) {
          rescanFields();
        }
      }, 1000);
    }, 1000);
  }
})();
