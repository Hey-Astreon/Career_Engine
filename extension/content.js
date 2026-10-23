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

  /* -- MESSAGE LISTENER -- */
  // All responses are synchronous, so the channel is not kept open.
  const messageListener = (request, sender, sendResponse) => {
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
    CONTACT_INFO: 'Contact Information',
    EXPERIENCE: 'Work Experience',
    EDUCATION: 'Education & Academics',
    EEO_COMPLIANCE: 'Voluntary Self-ID / EEO',
    SCREENING: 'Screening & Questions',
    REVIEW_SUBMIT: 'Review & Submit',
    GENERIC_STEP: 'Application Step'
  };

  const NEXT_STEP_REGEX = /^(next|continue|save\s*&\s*continue|save\s*and\s*continue|next\s*step|proceed|review(?:\s*application)?|go\s*to\s*next\s*step|continue\s*to\s*next\s*step|step\s*\d+\s*->)$/i;
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
    if (SUBMIT_APPLICATION_REGEX.test(txt)) return false;
    if (NEXT_STEP_REGEX.test(txt)) return true;
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
      'button:not([disabled])',
      'input[type="submit"]:not([disabled])',
      'a[role="button"]:not([disabled])'
    ].join(', ');
    const elements = targetDoc.querySelectorAll(selectors);
    for (let i = 0; i < elements.length; i++) {
      if (isNextStepButton(elements[i])) {
        return elements[i];
      }
    }
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
  document.addEventListener('click', clickNavListener, true);

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
    { type: 'APT',          kw: ['apartment', 'suite', 'apt', 'address line 2', 'address_line_2', 'address2', 'address 2', 'line 2', 'line2', 'address_2'] },
    { type: 'ADDRESS',      kw: ['street_address', 'street address', 'address line 1', 'address_line_1', 'address 1', 'address_1', 'address1', 'street', 'address'] },
    { type: 'CITY',         kw: ['city', 'town', 'municipality'] },
    { type: 'STATE',        kw: ['state', 'province', 'state_province', 'state/province', 'region', 'state or province'] },
    { type: 'COUNTRY',      kw: ['country', 'nation', 'country_region', 'country/region'] },
    { type: 'ZIP',          kw: ['zip', 'zip_code', 'zip code', 'postal code', 'postal_code', 'postal', 'postcode', 'pin code', 'pincode'] },
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
    { type: 'START_MONTH',  kw: ['start_date_month', 'start date month', 'start month', 'start_month'] },
    { type: 'START_YEAR',   kw: ['start_date_year', 'start date year', 'start year', 'start_year'] },
    { type: 'END_MONTH',    kw: ['end_date_month', 'end date month', 'end month', 'end_month'] },
    { type: 'END_YEAR',     kw: ['end_date_year', 'end date year', 'end year', 'end_year'] },
    { type: 'CURRENT_ROLE', kw: ['current_role', 'current role', 'currently work here', 'i currently work here'] },
    // Education granular patterns
    { type: 'SCHOOL',       kw: ['school_name', 'school name', 'university', 'college', 'institution', 'school'] },
    { type: 'DEGREE',       kw: ['degree_type', 'degree level', 'degree'] },
    { type: 'DISCIPLINE',   kw: ['discipline', 'major', 'field of study', 'specialization', 'branch'] },
    // Compliance & Voluntary self-identification
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
    if (!labelText && input.getAttribute('aria-labelledby')) {
      const labelledByEl = document.getElementById(input.getAttribute('aria-labelledby'));
      if (labelledByEl) labelText = labelledByEl.textContent || '';
    }
    // Check explicit label[for="id"]
    if (!labelText && input.id && input.ownerDocument) {
      try {
        const forLabel = input.ownerDocument.querySelector(`label[for="${CSS.escape(input.id)}"]`);
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
    if (cls.includes('select__control') || cls.includes('select__input') || cls.includes('select-shell') || cls.includes('react-select') || id.includes('react-select') || (el.closest && el.closest('.select__control, [class*="react-select"]'))) {
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

    // 1. SELECT-SPECIFIC FAST HEURISTICS
    if (isSelect) {
      if (labelSignal.includes('type') && (contextSignal.includes('phone') || attrSignal.includes('phone'))) return 'PHONE_TYPE';
      if (attrSignal.includes('phone_type') || attrSignal.includes('phonetype')) return 'PHONE_TYPE';
      if (labelSignal.includes('country') || attrSignal.includes('country')) return 'COUNTRY';
      if (labelSignal.includes('state') || labelSignal.includes('province') || attrSignal.includes('state') || attrSignal.includes('province')) return 'STATE';
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

      if (input.type === 'tel') return 'PHONE';
      if ((labelSignal.includes('number') || attrSignal.includes('number')) && (contextSignal.includes('phone') || attrSignal.includes('phone'))) {
        return 'PHONE';
      }
      if (labelSignal.includes('address 2') || labelSignal.includes('address line 2') || attrSignal.includes('address2') || attrSignal.includes('address_2') || attrSignal.includes('line2') || attrSignal.includes('line_2') || labelSignal.includes('apartment') || labelSignal.includes('suite') || labelSignal.includes('apt')) {
        return 'APT';
      }
      if ((labelSignal.includes('address') || attrSignal.includes('address') || labelSignal.includes('street') || attrSignal.includes('street')) && !labelSignal.includes('email') && !attrSignal.includes('email') && !labelSignal.includes('web') && !attrSignal.includes('url')) {
        return 'ADDRESS';
      }
      if (labelSignal.includes('zip') || labelSignal.includes('postal') || attrSignal.includes('zip') || attrSignal.includes('postal') || labelSignal.includes('pin code') || labelSignal.includes('pincode') || attrSignal.includes('postalcode') || attrSignal.includes('postal_code') || attrSignal.includes('postal-code')) {
        return 'ZIP';
      }
      if (labelSignal.includes('city') || attrSignal.includes('city') || labelSignal.includes('town')) {
        return 'CITY';
      }
      if (labelSignal.includes('state') || labelSignal.includes('province') || attrSignal.includes('state') || attrSignal.includes('province')) {
        return 'STATE';
      }
      if (labelSignal.includes('country') || attrSignal.includes('country')) {
        return 'COUNTRY';
      }
    }

    // 3. SECTION-AWARE FAST HEURISTICS: Employment
    const isEmploymentSection = contextSignal.includes('employment') || contextSignal.includes('experience') || attrSignal.includes('employment') || attrSignal.includes('job_history');
    if (isEmploymentSection) {
      if (labelSignal.includes('company') || attrSignal.includes('company')) return 'COMPANY';
      if ((labelSignal.includes('title') || attrSignal.includes('title')) && !labelSignal.includes('degree')) return 'EMPLOYMENT_TITLE';
      if ((labelSignal.includes('month') || attrSignal.includes('month')) && (labelSignal.includes('start') || attrSignal.includes('start') || labelSignal.includes('from') || attrSignal.includes('from'))) return 'START_MONTH';
      if ((labelSignal.includes('year') || attrSignal.includes('year')) && (labelSignal.includes('start') || attrSignal.includes('start') || labelSignal.includes('from') || attrSignal.includes('from'))) return 'START_YEAR';
      if ((labelSignal.includes('month') || attrSignal.includes('month')) && (labelSignal.includes('end') || attrSignal.includes('end') || labelSignal.includes('to') || attrSignal.includes('to'))) return 'END_MONTH';
      if ((labelSignal.includes('year') || attrSignal.includes('year')) && (labelSignal.includes('end') || attrSignal.includes('end') || labelSignal.includes('to') || attrSignal.includes('to'))) return 'END_YEAR';
      if (input.type === 'checkbox' && (labelSignal.includes('current') || attrSignal.includes('current'))) return 'CURRENT_ROLE';
    }

    // 4. SECTION-AWARE FAST HEURISTICS: Education
    const isEducationSection = contextSignal.includes('education') || contextSignal.includes('school') || attrSignal.includes('education') || attrSignal.includes('school');
    if (isEducationSection) {
      if (labelSignal.includes('school') || labelSignal.includes('university') || labelSignal.includes('college') || labelSignal.includes('institution') || attrSignal.includes('school')) return 'SCHOOL';
      if (labelSignal.includes('degree') || attrSignal.includes('degree')) return 'DEGREE';
      if (labelSignal.includes('discipline') || labelSignal.includes('major') || labelSignal.includes('field of study') || attrSignal.includes('discipline') || attrSignal.includes('major')) return 'DISCIPLINE';
    }

    // 5. SPECIFIC QUESTIONS & COMPLIANCE HEURISTICS
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
        if (labelSignal.includes('?') || input.getAttribute('aria-required') === 'true' || attrSignal.includes('question') || Boolean(input.closest && input.closest('.field, .question, [class*="question"], [class*="field"]'))) {
          return 'SCREENING_SELECT';
        }
      }
      if (input.type === 'text' && (labelSignal.includes('?') || input.getAttribute('aria-required') === 'true')) return 'SCREENING';
      return null;
    }
    return best.type;
  }

  function scanFields() {
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

    const results = [];
    const seenTypes = {};
    const SINGLETON_TYPES = new Set([
      'RESUME',
      'FIRST_NAME', 'LAST_NAME', 'FULL_NAME', 'EMAIL', 'PHONE', 'PHONE_TYPE',
      'ADDRESS', 'APT', 'CITY', 'STATE', 'COUNTRY', 'ZIP',
      'LINKEDIN', 'GITHUB', 'PORTFOLIO', 'SUMMARY', 'NOTICE_PERIOD',
      'GENDER', 'PRONOUNS', 'RELOCATE', 'WORK_AUTH', 'VISA',
      'AGE_18', 'PREVIOUS_EMPLOYED', 'PRIVACY_CONSENT', 'AI_CONSENT', 'AI_USAGE',
      'GOVT_OFFICIAL', 'GOVT_RELATIVE', 'CONFLICT_INTEREST', 'REFERRED_BY_LEADER',
      'HISPANIC_LATINO', 'VETERAN', 'DISABILITY', 'RACE_ETHNICITY',
      'COMPANY', 'EMPLOYMENT_TITLE', 'START_MONTH', 'START_YEAR', 'END_MONTH', 'END_YEAR', 'CURRENT_ROLE',
      'SCHOOL', 'DEGREE', 'DISCIPLINE'
    ]);

    const COMBOBOX_QUERY = [
      'input[type="text"]', 'input[type="email"]', 'input[type="tel"]', 'input[type="url"]',
      'input[type="number"]', 'input[type="radio"]', 'input[type="checkbox"]', 'input[type="search"]',
      'input[type="file"]',
      'input:not([type])', 'textarea', 'select',
      'button[role="combobox"]', 'div[role="combobox"]', '[aria-haspopup="listbox"]',
      '[data-automation-id="select-box"]', '.select-shell', '[class*="select__control"]',
      '[data-automation-id*="upload"]', '[class*="dropzone"]', '[class*="resume-upload"]'
    ].join(', ');

    targetDocs.forEach(targetDoc => {
      const inputs = targetDoc.querySelectorAll(COMBOBOX_QUERY);
      const seenElements = new Set();

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

        const type = classifyField(canonicalEl);
        if (!type) return;

        if (SINGLETON_TYPES.has(type)) {
          if (seenTypes[type]) return;
          seenTypes[type] = true;
        }

        const origVal = (canonicalEl.tagName === 'INPUT' && (canonicalEl.type === 'radio' || canonicalEl.type === 'checkbox'))
          ? canonicalEl.checked
          : (canonicalEl.value !== undefined ? canonicalEl.value : (canonicalEl.innerText || canonicalEl.textContent || ''));

        results.push({
          element: canonicalEl,
          type,
          id: 'f' + Math.random().toString(36).slice(2, 7),
          originalValue: origVal
        });
      });
    });

    // Ensure COUNTRY is processed before STATE so dependent options load
    results.sort((a, b) => {
      if (a.type === 'COUNTRY' && b.type === 'STATE') return -1;
      if (a.type === 'STATE' && b.type === 'COUNTRY') return 1;
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
    'india': ['in', 'ind', 'republic of india'],
    'united states': ['usa', 'us', 'u.s.', 'united states of america'],
    'linkedin': ['job board', 'online job board', 'social network', 'social media', 'internet', 'company website', 'other'],
    'yes': ['confirmed', 'confirm', 'agree', 'i agree', 'i confirm', 'true', '1', 'yes, i am', 'yes, i do', 'yes, i have', 'authorized', 'authorized to work', 'legally authorized', 'us citizen or permanent resident', 'authorized without restriction'],
    'no': ['false', '0', 'i disagree', 'no, i am not', 'no, i do not', 'no, i have not', "no, i don't", 'not required', 'no sponsorship required', 'will not require', 'decline'],
    'immediate': ['immediately', 'now', '0 weeks', '1 week', '2 weeks', 'available immediately', 'immediate', '< 2 weeks', 'less than 2 weeks'],
    'bachelor of computer applications (bca)': ['bachelor of computer applications', 'bachelor', 'bachelors', "bachelor's", "bachelor's degree", 'undergraduate', 'bca', 'computer applications', 'b.c.a', 'b.c.a.'],
    'i am not a protected veteran': ['not a protected veteran', 'not a veteran', 'i am not a veteran', 'no', 'i identify as one or more of the classifications of protected veteran: no'],
    'no, i don\'t have a disability': ['no, i do not have a disability', "no, i don't have", 'i do not have a disability', 'no disability', 'no', 'i do not have a physical or mental impairment'],
    'asian': ['asian (not hispanic or latino)', 'asian / pacific islander', 'south asian', 'asian - non hispanic', 'asian (all)'],
    'amity university': ['amity university noida', 'amity university, noida', 'amity university uttar pradesh', 'amity'],
    'computer science / applications': ['computer science', 'computer applications', 'information technology', 'software engineering', 'computing']
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
    if (targetLower === 'asian' || targetLower === 'indian' || targetLower === 'india' || fieldType === 'RACE_ETHNICITY') {
      const asianMatch = pool.find(o => {
        const t = (o.textContent || o.text || '').trim().toLowerCase();
        return (t === 'asian' || t.startsWith('asian')) && !t.includes('american indian') && !t.includes('alaska native');
      });
      if (asianMatch) return asianMatch;
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

    // Stage 6: First non-placeholder fallback for mandatory fields
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
      return true;
    }
    return false;
  }

  async function fillReactSelectV2(inputEl, targetVal, fieldType = '') {
    if (!inputEl || !targetVal) return false;
    const container = (inputEl.closest && inputEl.closest('.select-shell, .select__control, .select__container, [class*="react-select"], [class*="Select-control"]')) || inputEl.parentElement;
    if (!container) return false;

    const indicatorBtn = container.querySelector('.select__indicators button, [aria-label*="Toggle flyout"], .select__indicator, [class*="indicatorContainer"], [class*="dropdown-indicator"]') ||
                         container.querySelector('.select__control') ||
                         container;

    indicatorBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: 10, clientY: 10, view: window }));
    indicatorBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: 10, clientY: 10, view: window }));
    indicatorBtn.click();

    if (inputEl.tagName === 'INPUT' && !inputEl.readOnly) {
      try {
        if (document.activeElement !== inputEl) inputEl.focus();
        const proto = window.HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value');
        if (setter && setter.set) { setter.set.call(inputEl, targetVal); } else { inputEl.value = targetVal; }
        inputEl.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: String(targetVal) }));
      } catch (e) {}
    }

    let activeMenu = null;
    let options = [];
    const startTime = Date.now();
    while (Date.now() - startTime < 650) {
      const menus = Array.from(document.querySelectorAll('.select__menu, [id*="menu-"], div[class*="menu"], [role="listbox"]'));
      for (let i = menus.length - 1; i >= 0; i--) {
        if (menus[i].offsetParent !== null || menus[i].getBoundingClientRect().height > 0) {
          activeMenu = menus[i];
          break;
        }
      }
      if (!activeMenu && menus.length > 0) activeMenu = menus[menus.length - 1];

      if (activeMenu) {
        options = Array.from(activeMenu.querySelectorAll('.select__option, [role="option"], div[id*="option"]'));
        if (options.length > 0) break;
      }
      await new Promise(r => setTimeout(r, 60));
    }

    if (options.length === 0) {
      options = Array.from(document.querySelectorAll('.select__option, [role="option"], div[id*="option"]'))
        .filter(opt => (opt.getBoundingClientRect().height > 0) || opt.offsetParent !== null);
    }

    if (options.length === 0) return false;

    const matchedOption = resolveSemanticOptionMatch(options, targetVal, fieldType);
    if (matchedOption) {
      matchedOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
      matchedOption.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
      matchedOption.click();
      await new Promise(r => setTimeout(r, 80));
      cleanupLingeringPopovers();
      return true;
    }
    return false;
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
    while (Date.now() - startTime < 600) {
      const popovers = Array.from(document.querySelectorAll(
        '[data-radix-popper-content-wrapper], [data-radix-select-viewport], [role="listbox"], [data-headlessui-state="open"]'
      ));
      for (const p of popovers) {
        const opts = Array.from(p.querySelectorAll('[role="option"], [data-radix-collection-item], [data-headlessui-state], div[id*="option"]'));
        if (opts.length > 0) {
          options = opts;
          break;
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
      return true;
    } catch (e) {
      return false;
    }
  }

  async function fillUniversalCombobox(triggerEl, targetVal, fieldType = '') {
    if (!triggerEl || !targetVal) return false;
    const type = detectComboboxType(triggerEl);
    switch (type) {
      case 'NATIVE':
        return await fillNativeSelect(triggerEl, targetVal, fieldType);
      case 'RADIX':
      case 'HEADLESS_UI':
        return await fillRadixOrHeadless(triggerEl, targetVal, fieldType);
      case 'WORKDAY':
        return await fillWorkdaySelect(triggerEl, targetVal, fieldType);
      case 'REACT_SELECT':
        return await fillReactSelectV2(triggerEl, targetVal, fieldType);
      default:
        return await fillWaiAriaKeyboard(triggerEl, targetVal, fieldType);
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
  function setNativeValue(el, value, isFinal = true) {
    if (isComboboxOrSelect(el)) {
      fillUniversalCombobox(el, value).catch(() => {});
      return;
    }

    if (el.tagName === 'INPUT' && el.type === 'radio') {
      const radios = el.name
        ? document.querySelectorAll('input[type="radio"][name="' + CSS.escape(el.name) + '"]')
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
        el.click();
      }
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'checked');
      if (setter && setter.set) { setter.set.call(el, shouldCheck); } else { el.checked = shouldCheck; }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }

    try {
      if (document.activeElement !== el) {
        el.focus();
      }
    } catch (e) {}

    const proto = el.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value');
    if (setter && setter.set) { setter.set.call(el, value); } else { el.value = value; }
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
    GENDER: 'Gender', PRONOUNS: 'Pronouns', ADDRESS: 'Street Address', APT: 'Apartment/Suite', ZIP: 'ZIP Code',
    HEAR_ABOUT: 'Referral Source', HEAR_ABOUT_DETAIL: 'Source Detail',
    AGE_18: 'Legal Age (18+)', PREVIOUS_EMPLOYED: 'Prior Employment', PRIVACY_CONSENT: 'Privacy Agreement',
    AI_CONSENT: 'AI Processing Consent', AI_USAGE: 'AI Tools Usage', GOVT_OFFICIAL: 'Government Official',
    GOVT_RELATIVE: 'Government Relative', CONFLICT_INTEREST: 'Conflict of Interest',
    REFERRED_BY_LEADER: 'Senior Referral', HISPANIC_LATINO: 'Hispanic / Latino',
    VETERAN: 'Veteran Status', DISABILITY: 'Disability Status', RACE_ETHNICITY: 'Race / Ethnicity',
    COMPANY: 'Company Name', EMPLOYMENT_TITLE: 'Job Title', START_MONTH: 'Start Month', START_YEAR: 'Start Year',
    END_MONTH: 'End Month', END_YEAR: 'End Year', CURRENT_ROLE: 'Current Role',
    SCHOOL: 'School / University', DEGREE: 'Degree', DISCIPLINE: 'Discipline / Major',
    SCREENING_SELECT: 'Screening Question'
  };

  /* -- RESOLVE PREVIEW -- */
  function resolvePreview(field, profile, session) {
    const loc = parseLocation(profile.location);
    switch (field.type) {
      case 'RESUME':       return session ? (session.jobTitle ? 'Tailored PDF (' + session.jobTitle + ')' : 'Master Resume.pdf') : 'Master Resume.pdf';
      case 'FIRST_NAME':   return profile.firstName || null;
      case 'LAST_NAME':    return profile.lastName || null;
      case 'FULL_NAME':    return profile.fullName || null;
      case 'EMAIL':        return profile.email || null;
      case 'PHONE_TYPE':   return profile.phoneType || 'Mobile';
      case 'PHONE':        return profile.phone || null;
      case 'LOCATION':     return profile.location || null;
      case 'CITY':         return profile.city || loc.city || null;
      case 'STATE':        return profile.state || loc.state || null;
      case 'COUNTRY':      return profile.country || loc.country || null;
      case 'ADDRESS':      return profile.streetAddress || profile.city || loc.city || null;
      case 'APT':          return profile.apartment || null;
      case 'ZIP': {
        const rawZip = String(profile.zipCode || '800020').trim();
        const el = field.element;
        if (el && el.maxLength === 5) return rawZip.slice(0, 5);
        return rawZip;
      }
      case 'HEAR_ABOUT':   return profile.referralSource || 'LinkedIn';
      case 'HEAR_ABOUT_DETAIL': return 'Job Posting';
      case 'LINKEDIN':     return profile.linkedinUrl || null;
      case 'GITHUB':       return profile.githubUrl || null;
      case 'PORTFOLIO':    return profile.portfolioUrl || null;
      case 'TITLE':        return session ? session.jobTitle : (profile.title || null);
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
      case 'EMPLOYMENT_TITLE': return profile.employmentTitle || profile.title || 'Full-Stack Developer';
      case 'START_MONTH':  return profile.startMonth || 'January';
      case 'START_YEAR':   return profile.startYear || '2024';
      case 'END_MONTH':    return profile.endMonth || 'Present';
      case 'END_YEAR':     return profile.endYear || '2026';
      case 'CURRENT_ROLE': return profile.currentRole !== false ? 'Yes' : 'No';
      case 'SCHOOL':       return profile.school || 'Amity University';
      case 'DEGREE':       return profile.degree || profile.highestEducation || 'Bachelor of Computer Applications (BCA)';
      case 'DISCIPLINE':   return profile.discipline || 'Computer Science / Applications';
      case 'SCREENING_SELECT': {
        const labelText = getLabelText(field.element).toLowerCase();
        if (labelText.includes('sponsor') || labelText.includes('felony') || labelText.includes('criminal') || labelText.includes('relative') || labelText.includes('conflict')) return 'No';
        return 'Yes';
      }
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
      case 'ADDRESS':     return profile.streetAddress || profile.city || loc.city || '';
      case 'APT':         return profile.apartment || '';
      case 'ZIP': {
        const rawZip = String(profile.zipCode || '800020').trim();
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
      case 'HEAR_ABOUT':  return profile.referralSource || 'LinkedIn';
      case 'HEAR_ABOUT_DETAIL': return 'Job Posting';
      case 'LINKEDIN':    return profile.linkedinUrl;
      case 'GITHUB':      return profile.githubUrl;
      case 'PORTFOLIO':   return profile.portfolioUrl;
      case 'TITLE':       return session ? session.jobTitle : profile.title;
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
      case 'EMPLOYMENT_TITLE': return profile.employmentTitle || profile.title || 'Full-Stack Developer';
      case 'START_MONTH':  return profile.startMonth || 'January';
      case 'START_YEAR':   return profile.startYear || '2024';
      case 'END_MONTH':    return profile.endMonth || 'Present';
      case 'END_YEAR':     return profile.endYear || '2026';
      case 'CURRENT_ROLE': return profile.currentRole !== false ? 'Yes' : 'No';
      case 'SCHOOL':       return profile.school || 'Amity University';
      case 'DEGREE':       return profile.degree || profile.highestEducation || 'Bachelor of Computer Applications (BCA)';
      case 'DISCIPLINE':   return profile.discipline || 'Computer Science / Applications';
      case 'SCREENING_SELECT': {
        const labelText = getLabelText(field.element).toLowerCase();
        if (labelText.includes('sponsor') || labelText.includes('felony') || labelText.includes('criminal') || labelText.includes('relative') || labelText.includes('conflict')) return 'No';
        return 'Yes';
      }
      case 'COVER_LETTER':
      case 'SCREENING': {
        const labelText = getLabelText(field.element);
        const question = labelText.slice(0, 300) || (field.type === 'COVER_LETTER' ? 'Write a cover letter' : 'Tell us about yourself');
        const qLower = question.toLowerCase();

        // Immediate procedural question interceptor (relatives, compliance, "Type NA")
        if (
          qLower.includes('relative') ||
          qLower.includes('family member') ||
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
          if (!res.ok) return null;
          const data = await res.json();
          return data.answer || null;
        } catch (e) { return null; }
      }
      default: return null;
    }
  }

  /* -- HUD ORCHESTRATOR (delegates to AstrePilotHUD Shadow DOM module) -- */
  async function toggleAstrePilotHUD() {
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
    if (!config.token) {
      activeHud = AstrePilotHUD.mount({ onClose: () => { activeHud = null; } });
      activeHud.setState('not-connected');
      return;
    }

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
      onReapply: () => {
        if (activeHud) activeHud.duplicateAlert = null;
        runAutofill();
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
      if (activeHud) activeHud.setState('not-connected');
      return;
    }
    if (!activeHud) return; // user closed the HUD while loading

    activeHud.setIdentity({
      fullName: userProfile.fullName || ((userProfile.firstName || '') + ' ' + (userProfile.lastName || '')).trim() || 'You',
      title: userProfile.title || 'Candidate',
      primedCompany: activeSession ? activeSession.company : null
    });

    // Pillar E: Duplicate Application Pre-Flight Status Check
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

    if (detectedFields.length === 0) {
      const cat = catalogData || extractCatalogJobs();
      if (cat && cat.jobs.length > 0) {
        activeHud.setState('catalog');
      } else {
        activeHud.setState('no-fields');
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
    const hud = activeHud;
    if (!hud || isFilling || !detectedFields || !detectedFields.length) return;

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
                   activeHud.setIdentity({
                     fullName: userProfile.fullName || ((userProfile.firstName || '') + ' ' + (userProfile.lastName || '')).trim() || 'You',
                     title: userProfile.title || 'Candidate',
                     primedCompany: activeSession ? activeSession.company : null
                   });
                   const hudFields = detectedFields.map(f => {
                     const isAI = f.type === 'COVER_LETTER' || f.type === 'SCREENING';
                     const isSession = (f.type === 'TITLE' || f.type === 'SUMMARY' || f.type === 'SALARY') && !!activeSession;
                     const preview = resolvePreview(f, userProfile, activeSession);
                     return {
                       id: f.id,
                       type: f.type.toLowerCase().replace(/_/g, ''),
                       label: TYPE_LABELS[f.type] || f.type,
                       preview: preview || (isAI ? 'AI-generated on fill' : '-'),
                       source: isAI ? 'ai' : (isSession ? 'session' : 'profile'),
                       status: ''
                     };
                   });
                   activeHud.setFields(hudFields);
                 }
               } catch (e) {}

               hud.setState('done');
               let collapseDelay = 2500;
               if (extracted.astraShield) {
                 collapseDelay = extracted.astraShield.score < 80 ? 12000 : 5000;
               }
               setTimeout(() => { if (activeHud === hud && !hud.isCollapsed) hud.collapse(); }, collapseDelay);
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
        hud.setState('done');
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
           hud.setState('extracting', { step: 'Locating Apply button...' });
           setTimeout(() => {
             const success = findAndClickApplyButton();
             if (activeHud === hud) {
               hud.setState('done');
               if (!success && !hud.isCollapsed) hud.collapse();
             }
           }, 1500);
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
        if (f.type === 'RESUME') {
          AstrePilotHUD.highlight(f.element);
          const uploadRes = await injectResumeFile(f.element);
          if (uploadRes && uploadRes.success) {
            filled++;
            hud.markRow(f.id, 'done', uploadRes.filename || 'Uploaded');
          } else {
            // Trigger download to disk as reliable zero-drop fallback
            chrome.runtime.sendMessage({ type: 'DOWNLOAD_RESUME' });
            hud.markRow(f.id, 'skipped', 'Downloaded to disk');
          }
        } else if (isComboboxOrSelect(f.element)) {
          AstrePilotHUD.highlight(f.element);
          await fillUniversalCombobox(f.element, val, f.type);
          filled++;
          hud.markRow(f.id, 'done', String(val).slice(0, 30));
        } else if (f.type === 'ZIP' || (f.element.tagName === 'INPUT' && (f.element.type === 'radio' || f.element.type === 'checkbox'))) {
          setNativeValue(f.element, val, true);
          filled++;
          hud.markRow(f.id, 'done', String(val).slice(0, 30));
        } else {
          AstrePilotHUD.highlight(f.element);
          await AstrePilotHUD.fillAnimated(f.element, String(val), (el, v, isFinal) => setNativeValue(el, v, isFinal));
          filled++;
          hud.markRow(f.id, 'done', String(val).slice(0, 30));
        }
      } else {
        hud.markRow(f.id, 'skipped', '-');
      }
      hud.setProgress(filled, detectedFields.length);
      await new Promise(r => setTimeout(r, 80));
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
