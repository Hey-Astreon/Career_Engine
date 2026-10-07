/**
 * AstrePilot Content Script (Manifest V3)
 * ---------------------------------------
 * Injected on web pages to scan form fields, render the glassmorphic HUD,
 * and execute AI-powered autofill animations.
 */

(function () {
  'use strict';

  // Prevent multiple injections
  if (window.__ASTREPILOT_INJECTED__) return;
  window.__ASTREPILOT_INJECTED__ = true;

  let activeHud = null;
  let detectedFields = [];
  let userProfile = null;
  let activeSession = null;

  /* ── MESSAGE LISTENER ─────────────────────────────────────────────── */
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'TOGGLE_HUD') {
      toggleAstrePilotHUD();
      sendResponse({ status: 'toggled' });
    } else if (request.action === 'SCAN_FIELDS') {
      const fields = scanFields();
      sendResponse({ count: fields.length, fields: fields.map(f => ({ type: f.type, id: f.id })) });
    } else if (request.action === 'AUTOFILL') {
      if (!activeHud) toggleAstrePilotHUD();
      setTimeout(() => {
        const btn = document.getElementById('ap-autofill');
        if (btn) btn.click();
      }, 500);
      sendResponse({ status: 'autofilling' });
    }
    return true;
  });

  /* ── IN-PAGE KEYBOARD SHORTCUT LISTENER ────────────────────────────── */
  // Listens for Alt+Shift+A or Alt+A in-page to toggle HUD instantly
  window.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 'a' || e.key === 'A')) {
      const tag = document.activeElement ? document.activeElement.tagName : '';
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || Boolean(document.activeElement?.isContentEditable);
      if (e.shiftKey || !isInput) {
        e.preventDefault();
        toggleAstrePilotHUD();
      }
    }
  });

  /* ── HELPERS ──────────────────────────────────────────────────────── */
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
    if (!opts.method || opts.method === 'POST' || opts.method === 'PUT') {
      headers['Content-Type'] = 'application/json';
    }
    const cleanOrigin = config.origin.replace(/\/$/, '');
    return fetch(cleanOrigin + '/api/autopilot' + path, { ...opts, headers });
  }

  /* ── FIELD CLASSIFIER ─────────────────────────────────────────────── */
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

  function classifyField(input) {
    const attrSignal = [
      (input.getAttribute('name') || '').toLowerCase(),
      (input.getAttribute('id') || '').toLowerCase(),
    ].join(' ');

    const ariaLabel = (input.getAttribute('aria-label') || '').toLowerCase();
    let labelEl = input.labels && input.labels[0];
    let labelText = '';
    if (labelEl) {
      for (let n = 0; n < labelEl.childNodes.length; n++) {
        if (labelEl.childNodes[n].nodeType === 3) labelText += labelEl.childNodes[n].textContent;
      }
      if (!labelText) labelText = labelEl.textContent;
    }
    labelText = labelText.toLowerCase();
    const placeholder = (input.placeholder || '').toLowerCase();
    const labelSignal = [ariaLabel, labelText, placeholder].join(' ');

    const parentEl = input.parentElement;
    const contextSignal = parentEl ? ((parentEl.getAttribute('class') || '') + ' ' + (parentEl.id || '')).toLowerCase() : '';

    let best = { type: null, score: 0 };
    FIELD_PATTERNS.forEach(p => {
      let score = 0;
      p.kw.forEach(k => {
        if (attrSignal.includes(k)) score += 10;
        if (labelSignal.includes(k)) score += 3;
        if (contextSignal.includes(k)) score += 1;
      });
      if (score > best.score) best = { type: p.type, score };
    });

    if (!best.type && input.tagName === 'TEXTAREA') return 'SCREENING';
    if (best.score < 3) return null;
    return best.type;
  }

  function scanFields() {
    const inputs = document.querySelectorAll(
      'input[type=text], input[type=email], input[type=tel], input[type=url],\
       input[type=number], input[type=radio], input:not([type]), textarea, select'
    );
    const results = [];
    const seenTypes = {};

    inputs.forEach(inp => {
      const rect = inp.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      const computed = window.getComputedStyle(inp);
      if (computed.display === 'none' || computed.visibility === 'hidden') return;

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

  /* ── REACT / VUE NATIVE INPUT DISPATCHER ───────────────────────────── */
  function setNativeValue(el, value) {
    if (el.tagName === 'INPUT' && el.type === 'radio') {
      const radios = document.querySelectorAll(`input[type="radio"][name="${el.name}"]`);
      let target = null;
      const valLower = String(value).toLowerCase();
      for (let i = 0; i < radios.length; i++) {
        const rVal = String(radios[i].value).toLowerCase();
        const labelText = getLabelText(radios[i]).toLowerCase();
        if (rVal === valLower || labelText.includes(valLower) ||
           (valLower === 'yes' && (rVal === 'true' || rVal === '1')) ||
           (valLower === 'no' && (rVal === 'false' || rVal === '0'))) {
          target = radios[i];
          break;
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
          targetOpt = opt;
          break;
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
    if (setter && setter.set) {
      setter.set.call(el, value);
    } else {
      el.value = value;
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /* ── MATRIX DECODING ANIMATION ───────────────────────────────────── */
  const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@._-+#$';
  function decodeFill(inputEl, targetValue, onUpdate) {
    if (inputEl.tagName === 'SELECT' || (inputEl.tagName === 'INPUT' && inputEl.type === 'radio')) {
      return new Promise(resolve => {
        setNativeValue(inputEl, targetValue);
        if (onUpdate) onUpdate(targetValue);
        resolve();
      });
    }

    return new Promise(resolve => {
      let iteration = 0;
      const length = String(targetValue).length;
      const strValue = String(targetValue);
      const interval = setInterval(() => {
        const display = strValue.split('').map((char, i) => {
          if (char === ' ' || char === '\n') return char;
          if (i < Math.floor(iteration)) return char;
          return CHARSET[Math.floor(Math.random() * CHARSET.length)];
        }).join('');
        setNativeValue(inputEl, display);
        if (onUpdate) onUpdate(display);
        iteration += length > 100 ? 1.5 : 0.6;
        if (iteration >= length) {
          setNativeValue(inputEl, targetValue);
          if (onUpdate) onUpdate(targetValue);
          clearInterval(interval);
          resolve();
        }
      }, 28);
    });
  }

  /* ── TYPE ICONS & LABELS ─────────────────────────────────────────── */
  const TYPE_ICONS = {
    FIRST_NAME: '👤', LAST_NAME: '👤', FULL_NAME: '👤', EMAIL: '✉', PHONE: '📞',
    LOCATION: '📍', LINKEDIN: '🔗', GITHUB: '🐙', PORTFOLIO: '🌐', TITLE: '💼',
    COVER_LETTER: '📝', SUMMARY: '📄', WORK_AUTH: '✅', VISA: '🛂', SALARY: '💰', SCREENING: '❓',
  };
  const TYPE_LABELS = {
    FIRST_NAME: 'First Name', LAST_NAME: 'Last Name', FULL_NAME: 'Full Name',
    EMAIL: 'Email Address', PHONE: 'Phone Number', LOCATION: 'Location',
    LINKEDIN: 'LinkedIn URL', GITHUB: 'GitHub URL', PORTFOLIO: 'Portfolio URL',
    TITLE: 'Job Title', COVER_LETTER: 'Cover Letter', SUMMARY: 'Summary',
    WORK_AUTH: 'Work Authorization', VISA: 'Visa Sponsorship', SALARY: 'Salary', SCREENING: 'Screening Q',
  };

  /* ── RESOLVE VALUES ──────────────────────────────────────────────── */
  function resolvePreview(field, profile, session) {
    switch (field.type) {
      case 'FIRST_NAME':  return profile.firstName  || null;
      case 'LAST_NAME':   return profile.lastName   || null;
      case 'FULL_NAME':   return profile.fullName   || null;
      case 'EMAIL':       return profile.email      || null;
      case 'PHONE':       return profile.phone      || null;
      case 'LOCATION':    return profile.location   || null;
      case 'LINKEDIN':    return profile.linkedinUrl || null;
      case 'GITHUB':      return profile.githubUrl  || null;
      case 'PORTFOLIO':   return profile.portfolioUrl || null;
      case 'TITLE':       return session ? session.jobTitle : (profile.title || null);
      case 'SUMMARY':     return session ? (session.tailoredSummary || null) : (profile.professionalSummary || null);
      case 'SALARY':      return session ? (session.salaryRange || null) : (profile.salaryRange || null);
      case 'WORK_AUTH':   return profile.workAuthorized ? 'Yes' : 'No';
      case 'VISA':        return profile.requiresVisa ? 'Yes' : 'No';
      case 'COVER_LETTER': return null;
      case 'SCREENING':   return null;
      default: return null;
    }
  }

  async function resolveValue(field, profile, session) {
    switch (field.type) {
      case 'FIRST_NAME':    return profile.firstName;
      case 'LAST_NAME':     return profile.lastName;
      case 'FULL_NAME':     return profile.fullName;
      case 'EMAIL':         return profile.email;
      case 'PHONE':         return profile.phone;
      case 'LOCATION':      return profile.location;
      case 'LINKEDIN':      return profile.linkedinUrl;
      case 'GITHUB':        return profile.githubUrl;
      case 'PORTFOLIO':     return profile.portfolioUrl;
      case 'TITLE':         return session ? session.jobTitle : profile.title;
      case 'SUMMARY':       return session ? session.tailoredSummary : profile.professionalSummary;
      case 'WORK_AUTH':     return profile.workAuthorized ? 'Yes' : 'No';
      case 'VISA':          return profile.requiresVisa ? 'Yes' : 'No';
      case 'SALARY':        return session ? session.salaryRange : (profile.salaryRange || null);
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
              question,
              company,
              jobTitle,
              context: session ? `JOB DESCRIPTION:\n${session.jdText}\n\nTAILORED PROFILE:\n${session.tailoredSummary}` : profile._context,
            }),
          });
          if (!res.ok) return null;
          const data = await res.json();
          return data.answer || null;
        } catch (e) {
          return null;
        }
      }
      default: return null;
    }
  }

  /* ── HUD BUILDER ──────────────────────────────────────────────────── */
  async function toggleAstrePilotHUD() {
    if (activeHud) {
      closeHUD();
      return;
    }

    const config = await getStoredConfig();
    if (!config.token) {
      alert('AstrePilot: No connection token found. Click the AstrePilot extension icon in your browser toolbar to connect to AstreWork.');
      return;
    }

    const hud = el('div', { id: 'ap-hud' });
    const header = el('div', { id: 'ap-header' }, [
      el('div', { id: 'ap-logo' }, ['AW']),
      el('div', { id: 'ap-title' }, ['AstrePilot']),
      el('span', { id: 'ap-tag' }, ['EXTENSION']),
      el('button', { id: 'ap-close', title: 'Close' }, ['×']),
    ]);
    const statusSection = el('div', { id: 'ap-status' }, [
      el('div', { id: 'ap-status-row' }, [
        el('div', { id: 'ap-dot' }),
        el('div', { id: 'ap-status-text' }, ['Initialising…']),
      ]),
      el('div', { id: 'ap-bar-track' }, [el('div', { id: 'ap-bar-fill' })]),
    ]);
    const list = el('div', { id: 'ap-list' });
    const footer = el('div', { id: 'ap-footer' }, [
      el('div', { id: 'ap-count', className: 'ap-count-idle' }, ['Ready']),
      el('button', { id: 'ap-action-btn' }, ['Close']),
    ]);

    hud.appendChild(header);
    hud.appendChild(statusSection);
    hud.appendChild(list);
    hud.appendChild(footer);
    document.body.appendChild(hud);
    activeHud = hud;

    // Draggable
    let dx = 0, dy = 0, startX = 0, startY = 0;
    header.addEventListener('mousedown', (e) => {
      e.preventDefault();
      header.classList.add('ap-dragging');
      startX = e.clientX - dx;
      startY = e.clientY - dy;
      function move(e) {
        dx = e.clientX - startX;
        dy = e.clientY - startY;
        hud.style.transform = `translate(${dx}px, ${dy}px)`;
      }
      function up() {
        header.classList.remove('ap-dragging');
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
      }
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    });

    document.getElementById('ap-close').addEventListener('click', closeHUD);

    // Fetch Profile & Session
    setStatus('Connecting to AstreWork…', 'loading');
    try {
      const profileRes = await apFetch('/profile');
      if (!profileRes.ok) throw new Error('Failed to load profile');
      userProfile = await profileRes.json();

      const sessionRes = await apFetch('/session');
      if (sessionRes.ok) {
        const sData = await sessionRes.json();
        activeSession = sData.session;
      }
    } catch (err) {
      setStatus('Could not connect. Check token.', 'error');
      return;
    }

    if (activeSession) {
      const tag = document.getElementById('ap-tag');
      tag.textContent = 'PRIMED: ' + (activeSession.company || 'JOB').toUpperCase();
      tag.style.background = 'rgba(34,197,94,0.12)';
      tag.style.color = '#4ade80';
      tag.style.borderColor = 'rgba(34,197,94,0.2)';
    }

    // Scan
    setStatus('Scanning page…', 'loading');
    detectedFields = scanFields();

    if (detectedFields.length === 0) {
      setStatus('No fillable fields found.', 'error');
      return;
    }

    const rowEls = {};
    const previews = detectedFields.map(f => {
      const isAI = f.type === 'COVER_LETTER' || f.type === 'SCREENING';
      const isSession = (f.type === 'TITLE' || f.type === 'SUMMARY' || f.type === 'SALARY') && !!activeSession;
      return {
        field: f,
        value: resolvePreview(f, userProfile, activeSession),
        source: isAI ? 'ai' : (isSession ? 'session' : 'profile')
      };
    });

    const aiCount = previews.filter(p => p.source === 'ai').length;
    const dataCount = previews.filter(p => p.value).length;

    list.innerHTML = '';
    previews.forEach(p => {
      const f = p.field;
      const row = el('div', { className: 'ap-row', id: 'ap-row-' + f.id });
      const icon = el('div', { className: 'ap-icon' }, [TYPE_ICONS[f.type] || '·']);
      const label = el('div', { className: 'ap-row-label ap-label-active' }, [TYPE_LABELS[f.type] || f.type]);
      const badge = el('div', {
        className: 'ap-badge ' + (p.source === 'ai' ? 'ap-badge-ai' : (p.source === 'session' ? 'ap-badge-session' : 'ap-badge-profile'))
      }, [p.source === 'ai' ? 'AI' : (p.source === 'session' ? 'Session' : 'Profile')]);
      const valueEl = el('div', {
        className: p.source === 'ai' ? 'ap-row-value ap-value-ai' : 'ap-row-value'
      }, [p.source === 'ai' ? '✦ AI answer' : (p.value ? p.value.slice(0, 18) : '—')]);
      const statusEl = el('div', { className: 'ap-pending' }, ['○']);

      row.appendChild(icon);
      row.appendChild(label);
      row.appendChild(badge);
      row.appendChild(valueEl);
      row.appendChild(statusEl);
      list.appendChild(row);

      rowEls[f.id] = { row, label, value: valueEl, status: statusEl };
    });

    setStatus(`Ready — ${detectedFields.length} fields detected`, 'done');
    const countEl = document.getElementById('ap-count');
    countEl.textContent = `${dataCount} instant${aiCount > 0 ? `, ${aiCount} AI` : ''}`;

    const autofillBtn = el('button', { id: 'ap-autofill' }, ['⚡ Autofill']);
    footer.insertBefore(autofillBtn, document.getElementById('ap-action-btn'));

    // Autofill Action
    let fillStarted = false;
    autofillBtn.addEventListener('click', async () => {
      if (fillStarted) return;
      fillStarted = true;

      autofillBtn.disabled = true;
      autofillBtn.textContent = 'Filling…';
      setStatus(`Filling ${detectedFields.length} fields…`, 'loading');

      let filled = 0;
      let hadAI = false;

      for (let i = 0; i < detectedFields.length; i++) {
        const f = detectedFields[i];
        const r = rowEls[f.id];
        if (r) {
          r.row.className = 'ap-row ap-row-active';
          r.status.className = 'ap-spin';
          r.status.textContent = '';
        }

        if (f.type === 'COVER_LETTER' || f.type === 'SCREENING') hadAI = true;

        const val = await resolveValue(f, userProfile, activeSession);
        const skipped = !val || String(val).trim() === '';

        if (!skipped) {
          await decodeFill(f.element, val, (curr) => {
            if (r) r.value.textContent = curr.slice(0, 18);
          });
          f.element.classList.add('ap-filled-field');
          filled++;
        }

        if (r) {
          r.row.className = 'ap-row';
          r.status.className = skipped ? 'ap-skip' : 'ap-check';
          r.status.textContent = skipped ? '—' : '✓';
          r.value.textContent = skipped ? '' : String(val).slice(0, 18);
        }

        const pct = Math.round(((i + 1) / detectedFields.length) * 100);
        document.getElementById('ap-bar-fill').style.width = pct + '%';
        countEl.textContent = `${filled} / ${detectedFields.length} fields filled`;

        await new Promise(res => setTimeout(res, 100));
      }

      // Log Autofill Event
      try {
        const titleMatch = document.title.match(/(.+?)\s*[|\-–—]\s*(.+)/);
        await apFetch('/log', {
          method: 'POST',
          body: JSON.stringify({
            siteUrl: window.location.href,
            company: activeSession?.company || (titleMatch ? titleMatch[2].trim() : ''),
            jobTitle: activeSession?.jobTitle || (titleMatch ? titleMatch[1].trim() : ''),
            fieldsTotal: detectedFields.length,
            fieldsFilled: filled,
            hasAiAnswers: hadAI,
          })
        });
      } catch (e) { /* silent */ }

      const timeSaved = Math.round(filled * 1.5);
      setStatus(`✦ ${filled} / ${detectedFields.length} filled • Saved ~${timeSaved}m`, 'done');
      document.getElementById('ap-bar-fill').classList.add('ap-bar-done');
      autofillBtn.style.display = 'none';

      const actionBtn = document.getElementById('ap-action-btn');
      actionBtn.textContent = '↺ Undo';
      actionBtn.style.color = '#ef4444';
      actionBtn.style.borderColor = 'rgba(239, 68, 68, 0.35)';
    });

    document.getElementById('ap-action-btn').addEventListener('click', function () {
      if (this.textContent === '↺ Undo') {
        detectedFields.forEach(f => {
          if (f.originalValue !== undefined) {
            if (f.element.tagName === 'INPUT' && (f.element.type === 'radio' || f.element.type === 'checkbox')) {
              f.element.checked = f.originalValue;
            } else {
              f.element.value = f.originalValue;
            }
            f.element.dispatchEvent(new Event('input', { bubbles: true }));
            f.element.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
      }
      closeHUD();
    });
  }

  function setStatus(text, state) {
    const el = document.getElementById('ap-status-text');
    if (el) el.textContent = text;
    const dot = document.getElementById('ap-dot');
    if (!dot) return;
    if (state === 'done') {
      dot.className = 'ap-dot ap-done';
    } else if (state === 'error') {
      dot.className = 'ap-dot ap-error';
    } else {
      dot.className = 'ap-dot';
    }
  }

  function closeHUD() {
    if (detectedFields && detectedFields.length) {
      detectedFields.forEach(f => f.element.classList.remove('ap-filled-field'));
    }
    if (activeHud) {
      activeHud.remove();
      activeHud = null;
    }
  }
})();
