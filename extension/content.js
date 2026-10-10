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
    }
    return false;
  };
  chrome.runtime.onMessage.addListener(messageListener);
  window.__ASTREPILOT_CLEANUP__ = () => {
    chrome.runtime.onMessage.removeListener(messageListener);
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

  const oldCleanup = window.__ASTREPILOT_CLEANUP__;
  window.__ASTREPILOT_CLEANUP__ = () => {
    if (oldCleanup) try { oldCleanup(); } catch(e) {}
    window.removeEventListener('keydown', keydownListener);
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
        resolve({
          token: res.astrepilot_token || null,
          origin: res.astrepilot_origin || 'https://astrework.vercel.app'
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
    const url = cleanOrigin + '/api/autopilot' + path;

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

  function extractPageContent() {
    const clone = document.body.cloneNode(true);
    const removeSelectors = ['nav', 'footer', 'header', 'script', 'style', 'noscript', 'iframe', 'svg', 'img'];
    removeSelectors.forEach(s => {
      const els = clone.querySelectorAll(s);
      for (let i = 0; i < els.length; i++) els[i].remove();
    });
    
    // textContent is safer on disconnected nodes than innerText
    let text = clone.textContent || '';
    text = text.replace(/\s+/g, ' ').trim();
    
    return {
      pageText: text,
      pageUrl: window.location.href,
      pageTitle: document.title
    };
  }

  function findAndClickApplyButton() {
    const keywords = /^(apply|apply now|apply for this job|apply online|easy apply)$/i;
    const elements = document.querySelectorAll('a, button, [role="button"]');
    for (let i = 0; i < elements.length; i++) {
      if (keywords.test(elements[i].innerText.trim())) {
        try { chrome.runtime.sendMessage({ type: 'NOTIFY_CLICK_APPLY' }); } catch(e) {}
        sessionStorage.setItem('ap_auto_open', 'true');
        elements[i].click();
        return true;
      }
    }
    return false;
  }

  /* -- FIELD CLASSIFIER -- */
  const FIELD_PATTERNS = [
    { type: 'FIRST_NAME',   kw: ['first_name', 'firstname', 'fname', 'given_name', 'first-name', 'first name', 'givenname'] },
    { type: 'LAST_NAME',    kw: ['last_name', 'lastname', 'lname', 'family_name', 'surname', 'last-name', 'last name', 'familyname'] },
    { type: 'FULL_NAME',    kw: ['full_name', 'fullname', 'legal_name', 'full-name', 'full-legal', 'full legal'] },
    { type: 'EMAIL',        kw: ['email', 'e-mail', 'email_address', 'emailaddress'] },
    { type: 'PHONE',        kw: ['phone', 'telephone', 'mobile', 'cell', 'contact_number', 'phone_number', 'phonenumber'] },
    { type: 'LOCATION',     kw: ['location', 'current_location', 'city_state', 'city_country', 'current location', 'city'] },
    { type: 'LINKEDIN',     kw: ['linkedin', 'linkedin_url', 'linkedin_profile'] },
    { type: 'GITHUB',       kw: ['github', 'github_url', 'github_profile'] },
    { type: 'PORTFOLIO',    kw: ['portfolio', 'portfolio_url', 'personal_website', 'personal_site'] },
    { type: 'TITLE',        kw: ['headline', 'current_title', 'job_title', 'current_role', 'current_position'] },
    { type: 'COVER_LETTER', kw: ['cover_letter', 'coverletter', 'cover letter', 'motivation_letter', 'brief summary', 'cover note'] },
    { type: 'SUMMARY',      kw: ['summary', 'about_yourself', 'professional_summary', 'about you'] },
    { type: 'WORK_AUTH',    kw: ['work_auth', 'work_authorization', 'authorized to work', 'legally authorized'] },
    { type: 'VISA',         kw: ['visa', 'sponsorship', 'require sponsorship'] },
    { type: 'SALARY',       kw: ['salary', 'expected_salary', 'desired_salary', 'salary_expectation', 'compensation'] },
    { type: 'NOTICE_PERIOD',kw: ['notice_period', 'notice period', 'availability', 'start date', 'how soon'] },
    { type: 'RELOCATE',     kw: ['relocate', 'willing to relocate', 'relocation'] },
    { type: 'EDUCATION',    kw: ['highest_education', 'highest education', 'degree', 'education level'] },
    { type: 'GENDER',       kw: ['gender', 'sex', 'identify as'] },
    { type: 'PRONOUNS',     kw: ['pronouns', 'preferred pronouns'] },
    { type: 'ADDRESS',      kw: ['street_address', 'street address', 'address line 1'] },
    { type: 'APT',          kw: ['apartment', 'suite', 'apt', 'address line 2'] },
    { type: 'ZIP',          kw: ['zip', 'zip_code', 'zip code', 'postal code', 'postal_code'] },
  ];

  function getLabelText(input) {
    const ariaLabel = (input.getAttribute('aria-label') || '').toLowerCase();
    const labelEl = input.labels && input.labels[0];
    let labelText = '';
    if (labelEl) {
      for (let n = 0; n < labelEl.childNodes.length; n++) {
        if (labelEl.childNodes[n].nodeType === 3) labelText += labelEl.childNodes[n].textContent;
      }
      if (!labelText) labelText = labelEl.textContent;
    }
    const placeholder = (input.placeholder || '').toLowerCase();
    return [ariaLabel, labelText.toLowerCase(), placeholder].join(' ').replace(/\s+/g, ' ');
  }

  // Short keywords that appear inside unrelated words ("excellent", "electricity", "advisable")
  // must match on word boundaries; longer, specific keywords keep substring matching.
  const BOUNDARY_KW = new Set(['cell', 'city', 'visa']);
  function kwMatch(signal, kw) {
    if (!BOUNDARY_KW.has(kw)) return signal.includes(kw);
    return new RegExp('(^|[^a-z])' + kw + '($|[^a-z])').test(signal);
  }

  function classifyField(input) {
    const attrSignal = [
      (input.getAttribute('name') || '').toLowerCase(),
      (input.getAttribute('id') || '').toLowerCase(),
    ].join(' ');

    const labelSignal = getLabelText(input);

    const parentEl = input.parentElement;
    const contextSignal = parentEl ? ((parentEl.getAttribute('class') || '') + ' ' + (parentEl.id || '')).toLowerCase() : '';

    let best = { type: null, score: 0 };
    FIELD_PATTERNS.forEach(p => {
      let score = 0;
      p.kw.forEach(k => {
        if (kwMatch(attrSignal, k)) score += 10;
        if (kwMatch(labelSignal, k)) score += 3;
        if (kwMatch(contextSignal, k)) score += 1;
      });
      if (score > best.score) best = { type: p.type, score };
    });

    if (!best.type && input.tagName === 'TEXTAREA') return 'SCREENING';
    if (best.score < 3) return null;
    return best.type;
  }

  function scanFields() {
    const inputs = document.querySelectorAll(
      'input[type="text"], input[type="email"], input[type="tel"], input[type="url"], input[type="number"], input[type="radio"], input[type="checkbox"], input:not([type]), textarea, select'
    );
    const results = [];
    const seenTypes = {};

    inputs.forEach(inp => {
      const rect = inp.getBoundingClientRect();
      const isCheckOrRadio = inp.tagName === 'INPUT' && (inp.type === 'radio' || inp.type === 'checkbox');
      if (rect.width === 0 && rect.height === 0 && !isCheckOrRadio) return;
      const computed = window.getComputedStyle(inp);
      if ((computed.display === 'none' || computed.visibility === 'hidden') && !isCheckOrRadio) return;

      const type = classifyField(inp);
      if (!type) return;

      if (type !== 'SCREENING') {
        if (seenTypes[type]) return;
        seenTypes[type] = true;
      }

      const origVal = (inp.tagName === 'INPUT' && (inp.type === 'radio' || inp.type === 'checkbox'))
        ? inp.checked
        : inp.value;

      results.push({
        element: inp,
        type,
        id: 'f' + Math.random().toString(36).slice(2, 7),
        originalValue: origVal
      });
    });
    return results;
  }


  /* -- REACT / VUE NATIVE INPUT DISPATCHER -- */
  function setNativeValue(el, value) {
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

    if (el.tagName === 'SELECT') {
      const valLower = String(value).toLowerCase();
      let targetOpt = null;
      for (let i = 0; i < el.options.length; i++) {
        const opt = el.options[i];
        const oVal = opt.value.toLowerCase();
        const oText = opt.text.toLowerCase();
        if (oVal === valLower || oText.includes(valLower) ||
           (valLower === 'yes' && (oVal === 'true' || oVal === '1')) ||
           (valLower === 'no' && (oVal === 'false' || oVal === '0'))) {
          targetOpt = opt; break;
        }
      }
      if (targetOpt) {
        el.value = targetOpt.value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return;
    }

    const proto = el.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value');
    if (setter && setter.set) { setter.set.call(el, value); } else { el.value = value; }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /* -- TYPE LABELS -- */
  const TYPE_LABELS = {
    FIRST_NAME: 'First Name', LAST_NAME: 'Last Name', FULL_NAME: 'Full Name',
    EMAIL: 'Email Address', PHONE: 'Phone Number', LOCATION: 'Location',
    LINKEDIN: 'LinkedIn URL', GITHUB: 'GitHub URL', PORTFOLIO: 'Portfolio URL',
    TITLE: 'Job Title', COVER_LETTER: 'Cover Letter', SUMMARY: 'Summary',
    WORK_AUTH: 'Work Authorization', VISA: 'Visa Sponsorship', SALARY: 'Salary', SCREENING: 'Screening Q',
    NOTICE_PERIOD: 'Notice Period', RELOCATE: 'Relocate', EDUCATION: 'Highest Education',
    GENDER: 'Gender', PRONOUNS: 'Pronouns', ADDRESS: 'Street Address', APT: 'Apartment/Suite', ZIP: 'ZIP Code',
  };

  /* -- RESOLVE PREVIEW -- */
  function resolvePreview(field, profile, session) {
    switch (field.type) {
      case 'FIRST_NAME':   return profile.firstName || null;
      case 'LAST_NAME':    return profile.lastName || null;
      case 'FULL_NAME':    return profile.fullName || null;
      case 'EMAIL':        return profile.email || null;
      case 'PHONE':        return profile.phone || null;
      case 'LOCATION':     return profile.location || null;
      case 'LINKEDIN':     return profile.linkedinUrl || null;
      case 'GITHUB':       return profile.githubUrl || null;
      case 'PORTFOLIO':    return profile.portfolioUrl || null;
      case 'TITLE':        return session ? session.jobTitle : (profile.title || null);
      case 'SUMMARY':      return session ? (session.tailoredSummary || null) : (profile.professionalSummary || null);
      case 'SALARY':       return session ? (session.salaryRange || null) : (profile.salaryRange || null);
      case 'NOTICE_PERIOD':return profile.noticePeriod || null;
      case 'RELOCATE':     return profile.willingnessToRelocate ? 'Yes' : 'No';
      case 'EDUCATION':    return profile.highestEducation || null;
      case 'GENDER':       return profile.gender || null;
      case 'PRONOUNS':     return profile.pronouns || null;
      case 'ADDRESS':      return profile.streetAddress || null;
      case 'APT':          return profile.apartment || null;
      case 'ZIP':          return profile.zipCode || null;
      case 'WORK_AUTH':    return profile.workAuthorized ? 'Yes' : 'No';
      case 'VISA':         return profile.requiresVisa ? 'Yes' : 'No';
      case 'COVER_LETTER': return null;
      case 'SCREENING':    return null;
      default: return null;
    }
  }

  /* -- RESOLVE VALUE (async, calls AI for COVER_LETTER/SCREENING) -- */
  async function resolveValue(field, profile, session) {
    switch (field.type) {
      case 'FIRST_NAME':  return profile.firstName;
      case 'LAST_NAME':   return profile.lastName;
      case 'FULL_NAME':   return profile.fullName;
      case 'EMAIL':       return profile.email;
      case 'PHONE':       return profile.phone;
      case 'LOCATION':    return profile.location;
      case 'LINKEDIN':    return profile.linkedinUrl;
      case 'GITHUB':      return profile.githubUrl;
      case 'PORTFOLIO':   return profile.portfolioUrl;
      case 'TITLE':       return session ? session.jobTitle : profile.title;
      case 'SUMMARY':     return session ? session.tailoredSummary : profile.professionalSummary;
      case 'WORK_AUTH':   return profile.workAuthorized ? 'Yes' : 'No';
      case 'VISA':        return profile.requiresVisa ? 'Yes' : 'No';
      case 'SALARY':      return session ? session.salaryRange : (profile.salaryRange || null);
      case 'NOTICE_PERIOD':return profile.noticePeriod;
      case 'RELOCATE':    return profile.willingnessToRelocate ? 'Yes' : 'No';
      case 'EDUCATION':   return profile.highestEducation;
      case 'GENDER':      return profile.gender;
      case 'PRONOUNS':    return profile.pronouns;
      case 'ADDRESS':     return profile.streetAddress;
      case 'APT':         return profile.apartment;
      case 'ZIP':         return profile.zipCode;
      case 'COVER_LETTER':
      case 'SCREENING': {
        const labelText = getLabelText(field.element);
        const question = labelText.slice(0, 300) || (field.type === 'COVER_LETTER' ? 'Write a cover letter' : 'Tell us about yourself');
        const company = session && session.company ? session.company : document.title.replace(/ \|.*/, '').trim().slice(0, 60);
        const jobTitle = session && session.jobTitle ? session.jobTitle : '';
        try {
          const res = await apFetch('/answer', {
            method: 'POST',
            body: JSON.stringify({
              question, company, jobTitle,
              context: session ? 'JOB DESCRIPTION:\n' + (session.jdText || '') + '\n\nTAILORED PROFILE:\n' + (session.tailoredSummary || '') : profile._context,
            }),
          });
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
      onUndo: runUndo,
      onExtract: runExtract,
      onExtractJD: runExtractJD,
      onDownloadResume: runDownloadResume,
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

    activeHud.setState('scanning');
    detectedFields = scanFields();

    if (detectedFields.length === 0) {
      activeHud.setState('no-fields');
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
        preview: isAI ? 'AI-generated on fill' : (preview || '-'),
        source: isAI ? 'ai' : (isSession ? 'session' : 'profile'),
        status: ''
      };
    });

    activeHud.setFields(hudFields);
    activeHud.setProgress(0, detectedFields.length);
    activeHud.setState('ready');
  }

  async function runAutofill() {
    const hud = activeHud;
    if (!hud || isFilling || !detectedFields || !detectedFields.length) return;
    isFilling = true;
    try {
      await fillAllFields(hud);
    } finally {
      isFilling = false;
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
        body: JSON.stringify({ pageText: safeText, pageUrl: data.pageUrl })
      });
      
      if (res.ok) {
        const extracted = await res.json();
        if (extracted.success) {
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
                       preview: isAI ? 'AI-generated on fill' : (preview || '-'),
                       source: isAI ? 'ai' : (isSession ? 'session' : 'profile'),
                       status: ''
                     };
                   });
                   activeHud.setFields(hudFields);
                 }
               } catch (e) {}

               hud.setState('done');
               setTimeout(() => { if (activeHud === hud && !hud.isCollapsed) hud.collapse(); }, 2500);
             }
           }, 1000);
           return;
        } else {
           hud.setState('error', { msg: extracted.error || 'Failed to extract data.' });
           return;
        }
      } else {
        hud.setState('error', { msg: 'Server error: ' + res.status });
        return;
      }
    } catch (e) {
      console.error('[AstrePilot] Extract JD failed:', e);
      hud.setState('error', { msg: e.message || 'Network error occurred.' });
    }
  }

  function runDownloadResume() {
    chrome.runtime.sendMessage({ type: 'DOWNLOAD_RESUME' });
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
        body: JSON.stringify({ pageText: safeText, pageUrl: data.pageUrl })
      });
      
      if (res.ok) {
        const extracted = await res.json();
        if (extracted.success) {
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
        hud.setState('error', { msg: 'Server error: ' + res.status });
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

      const val = await resolveValue(f, userProfile, activeSession);
      const skipped = !val || String(val).trim() === '';

      if (!skipped) {
        if (f.element.tagName === 'SELECT' || (f.element.tagName === 'INPUT' && f.element.type === 'radio')) {
          setNativeValue(f.element, val);
        } else {
          AstrePilotHUD.highlight(f.element);
          await AstrePilotHUD.fillAnimated(f.element, String(val), (el, v) => setNativeValue(el, v));
        }
        filled++;
      }

      hud.markRow(f.id, skipped ? 'skipped' : 'done', skipped ? '-' : String(val).slice(0, 30));
      hud.setProgress(filled, detectedFields.length);
      await new Promise(r => setTimeout(r, 80));
    }

    try {
      const titleMatch = document.title.match(/(.+?)\s*[|\-]\s*(.+)/);
      await apFetch('/log', {
        method: 'POST',
        body: JSON.stringify({
          siteUrl: window.location.href,
          company: (activeSession && activeSession.company) || (titleMatch ? titleMatch[2].trim() : ''),
          jobTitle: (activeSession && activeSession.jobTitle) || (titleMatch ? titleMatch[1].trim() : ''),
          fieldsTotal: detectedFields.length,
          fieldsFilled: filled,
          hasAiAnswers: hadAI,
        })
      });
    } catch (e) { /* silent */ }

    if (activeHud !== hud) return;
    hud.setState('done');
    // Auto-collapse to pill after 4 seconds
    setTimeout(() => { if (activeHud === hud && !hud.isCollapsed) hud.collapse(); }, 4000);
  }

  function runUndo() {
    if (!detectedFields) return;
    detectedFields.forEach(f => {
      if (f.originalValue !== undefined) {
        if (f.element.tagName === 'INPUT' && (f.element.type === 'radio' || f.element.type === 'checkbox')) {
          f.element.checked = f.originalValue;
        } else {
          f.element.value = f.originalValue;
        }
        f.element.dispatchEvent(new Event('input', { bubbles: true }));
        f.element.dispatchEvent(new Event('change', { bubbles: true }));
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
          preview: isAI ? 'AI-generated on fill' : (preview || '-'),
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

  // Auto-launch if we just clicked an apply button and stayed on the same domain
  if (sessionStorage.getItem('ap_auto_open') === 'true') {
    sessionStorage.removeItem('ap_auto_open');
    setTimeout(() => {
      toggleAstrePilotHUD();
    }, 1000);
  }
})();
