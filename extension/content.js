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
  const BOUNDARY_KW = new Set(['cell', 'city', 'visa', 'apt']);
  function kwMatch(signal, kw) {
    if (!BOUNDARY_KW.has(kw)) return signal.includes(kw);
    return new RegExp('(^|[^a-z])' + kw + '($|[^a-z])').test(signal);
  }

  function classifyField(input) {
    const attrSignal = [
      (input.getAttribute('name') || '').toLowerCase(),
      (input.getAttribute('id') || '').toLowerCase(),
      (input.getAttribute('placeholder') || '').toLowerCase(),
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

    const isSelect = input.tagName === 'SELECT';

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
      if (labelSignal.includes('zip') || labelSignal.includes('postal') || attrSignal.includes('zip') || attrSignal.includes('postal') || labelSignal.includes('pin code') || labelSignal.includes('pincode')) {
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

    if (!best.type && input.tagName === 'TEXTAREA') return 'SCREENING';
    if (best.score < 3) return null;
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

    targetDocs.forEach(targetDoc => {
      const inputs = targetDoc.querySelectorAll(
        'input[type="text"], input[type="email"], input[type="tel"], input[type="url"], input[type="number"], input[type="radio"], input[type="checkbox"], input:not([type]), textarea, select'
      );

      inputs.forEach(inp => {
        const rect = inp.getBoundingClientRect();
        const isCheckOrRadio = inp.tagName === 'INPUT' && (inp.type === 'radio' || inp.type === 'checkbox');
        if (rect.width === 0 && rect.height === 0 && !isCheckOrRadio) return;
        const computed = (targetDoc.defaultView || window).getComputedStyle(inp);
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
    });

    // Ensure COUNTRY is processed before STATE so dependent options load
    results.sort((a, b) => {
      if (a.type === 'COUNTRY' && b.type === 'STATE') return -1;
      if (a.type === 'STATE' && b.type === 'COUNTRY') return 1;
      return 0;
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

    if (el.tagName === 'INPUT' && el.type === 'checkbox') {
      const valLower = String(value).toLowerCase();
      const shouldCheck = valLower === 'yes' || valLower === 'true' || valLower === '1' || valLower === 'checked';
      el.checked = shouldCheck;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }

    if (el.tagName === 'SELECT') {
      const valLower = String(value).toLowerCase().trim();
      let targetOpt = null;

      // 1. Exact match (value or text)
      for (let i = 0; i < el.options.length; i++) {
        const opt = el.options[i];
        if (!opt.value && opt.text.includes('—') || opt.disabled) continue;
        const oVal = opt.value.toLowerCase().trim();
        const oText = opt.text.toLowerCase().trim();
        if (oVal === valLower || oText === valLower) {
          targetOpt = opt; break;
        }
      }

      // 2. Contains match
      if (!targetOpt) {
        for (let i = 0; i < el.options.length; i++) {
          const opt = el.options[i];
          if (!opt.value || opt.disabled || opt.text.startsWith('—') || opt.text.startsWith('Select')) continue;
          const oVal = opt.value.toLowerCase().trim();
          const oText = opt.text.toLowerCase().trim();
          if (oVal.includes(valLower) || oText.includes(valLower) ||
             (valLower === 'yes' && (oVal === 'true' || oVal === '1')) ||
             (valLower === 'no' && (oVal === 'false' || oVal === '0'))) {
            targetOpt = opt; break;
          }
        }
      }

      // 3. Synonym dictionary matching
      if (!targetOpt) {
        const synonyms = {
          'mobile': ['cell', 'cellular', 'personal', 'primary'],
          'india': ['in', 'ind'],
          'united states': ['usa', 'us', 'u.s.'],
          'linkedin': ['job board', 'online', 'internet', 'social media', 'website', 'other'],
          'male': ['man', 'm'],
          'female': ['woman', 'f'],
          'he/him': ['he / him', 'male', 'he'],
          'she/her': ['she / her', 'female', 'she'],
        };
        const synList = synonyms[valLower] || [];
        for (const syn of synList) {
          for (let i = 0; i < el.options.length; i++) {
            const opt = el.options[i];
            if (!opt.value || opt.disabled || opt.text.startsWith('—') || opt.text.startsWith('Select')) continue;
            const oVal = opt.value.toLowerCase().trim();
            const oText = opt.text.toLowerCase().trim();
            if (oVal === syn || oText === syn || oVal.includes(syn) || oText.includes(syn)) {
              targetOpt = opt; break;
            }
          }
          if (targetOpt) break;
        }
      }

      // 4. Fallback for required dropdown: choose first non-placeholder option
      if (!targetOpt && el.options.length > 1) {
        for (let i = 0; i < el.options.length; i++) {
          const opt = el.options[i];
          if (opt.value && !opt.disabled && !opt.text.includes('—') && !opt.text.toLowerCase().includes('select')) {
            targetOpt = opt; break;
          }
        }
      }

      if (targetOpt) {
        el.value = targetOpt.value;
        targetOpt.selected = true;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      }
      return;
    }

    const proto = el.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value');
    if (setter && setter.set) { setter.set.call(el, value); } else { el.value = value; }
    if (el._valueTracker) {
      try { el._valueTracker.setValue(''); } catch(e) {}
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  /* -- TYPE LABELS -- */
  const TYPE_LABELS = {
    FIRST_NAME: 'First Name', LAST_NAME: 'Last Name', FULL_NAME: 'Full Name',
    EMAIL: 'Email Address', PHONE_TYPE: 'Phone Type', PHONE: 'Phone Number',
    LOCATION: 'Location', CITY: 'City', STATE: 'State / Province', COUNTRY: 'Country',
    LINKEDIN: 'LinkedIn URL', GITHUB: 'GitHub URL', PORTFOLIO: 'Portfolio URL',
    TITLE: 'Job Title', COVER_LETTER: 'Cover Letter', SUMMARY: 'Summary',
    WORK_AUTH: 'Work Authorization', VISA: 'Visa Sponsorship', SALARY: 'Salary', SCREENING: 'Screening Q',
    NOTICE_PERIOD: 'Notice Period', RELOCATE: 'Relocate', EDUCATION: 'Highest Education',
    GENDER: 'Gender', PRONOUNS: 'Pronouns', ADDRESS: 'Street Address', APT: 'Apartment/Suite', ZIP: 'ZIP Code',
    HEAR_ABOUT: 'Referral Source', HEAR_ABOUT_DETAIL: 'Source Detail',
  };

  /* -- RESOLVE PREVIEW -- */
  function resolvePreview(field, profile, session) {
    const loc = parseLocation(profile.location);
    switch (field.type) {
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
      case 'ZIP':          return profile.zipCode || '800020';
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
      case 'COVER_LETTER': return null;
      case 'SCREENING':    return null;
      default: return null;
    }
  }

  /* -- RESOLVE VALUE (async, calls AI for COVER_LETTER/SCREENING) -- */
  async function resolveValue(field, profile, session) {
    const loc = parseLocation(profile.location);
    switch (field.type) {
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
      case 'ZIP':         return profile.zipCode || '800020';
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
      case 'COVER_LETTER':
      case 'SCREENING': {
        const labelText = getLabelText(field.element);
        const question = labelText.slice(0, 300) || (field.type === 'COVER_LETTER' ? 'Write a cover letter' : 'Tell us about yourself');
        const company = session && session.company ? session.company : document.title.replace(/ \|.*/, '').trim().slice(0, 60);
        const jobTitle = session && session.jobTitle ? session.jobTitle : '';
        try {
          // Attempt high-reasoning Antigravity AI Oracle first
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
      onUndo: runUndo,
      onExtract: runExtract,
      onExtractJD: runExtractJD,
      onDownloadResume: runDownloadResume,
      onSyncHarvester: runSyncHarvester,
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

    if (detectedFields.length === 0) {
      if (catalogData && catalogData.jobs.length > 0) {
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
                       preview: isAI ? 'AI-generated on fill' : (preview || '-'),
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

  function runDownloadResume() {
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
      if (f.type === 'STATE' && f.element.tagName === 'SELECT') {
        await new Promise(r => setTimeout(r, 250));
      }

      const val = await resolveValue(f, userProfile, activeSession);
      const skipped = !val || String(val).trim() === '';

      if (!skipped) {
        if (f.element.tagName === 'SELECT' || (f.element.tagName === 'INPUT' && (f.element.type === 'radio' || f.element.type === 'checkbox'))) {
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
