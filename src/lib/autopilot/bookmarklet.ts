/**
 * AstrePilot Bookmarklet Script Template
 * ----------------------------------------
 * This is the full bookmarklet source. The string __AP_TOKEN__ is replaced
 * server-side with the user's actual signed token before being encoded into
 * the javascript: href.
 *
 * To build the bookmarklet href:
 *   buildBookmarkletHref(token)
 */

const BOOKMARKLET_SCRIPT = `(async function AstrePilot() {
  'use strict';

  /* ── CONFIG ─────────────────────────────────────────────────────── */
  var TOKEN = '__AP_TOKEN__';
  var API   = '__AP_ORIGIN__/api/autopilot';

  /* ── GUARD: remove if already open ─────────────────────────────── */
  var existing = document.getElementById('ap-hud');
  if (existing) { existing.remove(); return; }

  /* ── HELPERS ─────────────────────────────────────────────────────── */
  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    Object.entries(attrs || {}).forEach(function(kv) {
      if (kv[0] === 'style') { e.style.cssText = kv[1]; }
      else if (kv[0] === 'className') { e.className = kv[1]; }
      else { e.setAttribute(kv[0], kv[1]); }
    });
    (children || []).forEach(function(c) {
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }

  function apFetch(path, opts) {
    var defaultHeaders = { 'Authorization': 'Bearer ' + TOKEN };
    if (!opts || !opts.method || opts.method === 'POST' || opts.method === 'PUT') {
      defaultHeaders['Content-Type'] = 'application/json';
    }
    return fetch(API + path, Object.assign({ headers: defaultHeaders }, opts));
  }

  /* ── INJECT STYLES ───────────────────────────────────────────────── */
  var styleEl = document.createElement('style');
  styleEl.textContent = [
    '#ap-hud{position:fixed;bottom:24px;right:24px;z-index:2147483647;width:320px;',
    'background:rgba(10,15,28,0.93);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);',
    'border:1px solid rgba(255,255,255,0.07);border-radius:16px;',
    'box-shadow:0 0 60px rgba(29,95,209,0.14),0 24px 48px rgba(0,0,0,0.45);',
    'font-family:-apple-system,BlinkMacSystemFont,"Inter",sans-serif;color:#e2e8f0;',
    'font-size:13px;overflow:hidden;user-select:none;}',

    '#ap-header{display:flex;align-items:center;gap:8px;padding:12px 14px 10px;',
    'border-bottom:1px solid rgba(255,255,255,0.06);cursor:grab;cursor:-webkit-grab;}',
    '#ap-header.ap-dragging{cursor:grabbing;cursor:-webkit-grabbing;}',
    '#ap-logo{width:24px;height:24px;border-radius:6px;background:#1d5fd1;',
    'display:flex;align-items:center;justify-content:center;flex-shrink:0;',
    'font-size:10px;font-weight:800;color:#fff;letter-spacing:-0.5px;}',
    '#ap-title{font-size:13px;font-weight:700;color:#f1f5f9;letter-spacing:-0.2px;flex:1;}',
    '#ap-tag{font-size:9px;font-weight:700;color:#60a5fa;background:rgba(96,165,250,0.12);',
    'border:1px solid rgba(96,165,250,0.2);border-radius:4px;padding:1px 5px;letter-spacing:0.04em;}',
    '#ap-close{width:20px;height:20px;border-radius:50%;background:rgba(255,255,255,0.06);',
    'border:none;color:#94a3b8;cursor:pointer;display:flex;align-items:center;justify-content:center;',
    'font-size:12px;padding:0;transition:background 0.15s;}',
    '#ap-close:hover{background:rgba(239,68,68,0.2);color:#f87171;}',

    '#ap-status{padding:10px 14px 8px;border-bottom:1px solid rgba(255,255,255,0.05);}',
    '#ap-status-row{display:flex;align-items:center;gap:7px;margin-bottom:7px;}',
    '#ap-dot{width:7px;height:7px;border-radius:50%;background:#3b82f6;flex-shrink:0;',
    'animation:ap-pulse 1.4s ease-in-out infinite;}',
    '#ap-dot.ap-done{background:#22c55e;animation:none;}',
    '#ap-dot.ap-error{background:#ef4444;animation:none;}',
    '@keyframes ap-pulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.5;transform:scale(0.8);}}',
    '#ap-status-text{color:#cbd5e1;font-size:12px;font-weight:500;}',
    '#ap-bar-track{height:3px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;}',
    '#ap-bar-fill{height:100%;background:linear-gradient(90deg,#1d5fd1,#3b82f6);border-radius:2px;',
    'width:0%;transition:width 0.3s ease;box-shadow:0 0 6px rgba(59,130,246,0.5);}',
    '#ap-bar-fill.ap-bar-done{background:linear-gradient(90deg,#16a34a,#22c55e);}',

    '#ap-list{max-height:190px;overflow-y:auto;padding:6px 0;}',
    '#ap-list::-webkit-scrollbar{width:3px;}',
    '#ap-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px;}',
    '.ap-row{display:flex;align-items:center;gap:9px;padding:5px 14px;',
    'transition:background 0.12s;}',
    '.ap-row.ap-row-active{background:rgba(59,130,246,0.07);}',
    '.ap-icon{width:22px;height:22px;border-radius:5px;background:rgba(255,255,255,0.05);',
    'display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:11px;}',
    '.ap-row-label{flex:1;color:#94a3b8;font-size:11px;font-weight:500;white-space:nowrap;',
    'overflow:hidden;text-overflow:ellipsis;max-width:140px;}',
    '.ap-row-label.ap-label-active{color:#e2e8f0;}',
    '.ap-row-value{color:#64748b;font-size:10px;font-family:monospace;',
    'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:90px;}',
    '.ap-row-value.ap-decoding{color:#60a5fa;}',
    '.ap-check{color:#22c55e;font-size:12px;flex-shrink:0;}',
    '.ap-skip{color:#475569;font-size:11px;flex-shrink:0;}',
    '.ap-spin{width:12px;height:12px;border:2px solid rgba(255,255,255,0.1);',
    'border-top-color:#3b82f6;border-radius:50%;animation:ap-spin 0.7s linear infinite;flex-shrink:0;}',
    '@keyframes ap-spin{to{transform:rotate(360deg);}}',
    '.ap-pending{color:#475569;font-size:11px;flex-shrink:0;}',

    '#ap-footer{display:flex;align-items:center;justify-content:space-between;',
    'padding:9px 14px;border-top:1px solid rgba(255,255,255,0.05);}',
    '#ap-count{font-size:11px;font-weight:600;color:#22c55e;}',
    '#ap-count.ap-count-idle{color:#475569;}',
    '#ap-action-btn{border:1px solid rgba(59,130,246,0.35);background:transparent;',
    'color:#60a5fa;border-radius:6px;padding:3px 9px;font-size:10px;font-weight:600;',
    'cursor:pointer;transition:all 0.15s;letter-spacing:0.02em;}',
    '#ap-action-btn:hover{background:rgba(59,130,246,0.12);}',
    '.ap-badge{font-size:9px;font-weight:700;border-radius:4px;padding:1px 5px;letter-spacing:0.04em;flex-shrink:0;}',
    '.ap-badge-profile{color:#94a3b8;background:rgba(148,163,184,0.1);border:1px solid rgba(148,163,184,0.2);}',
    '.ap-badge-session{color:#4ade80;background:rgba(74,222,128,0.1);border:1px solid rgba(74,222,128,0.2);}',
    '.ap-badge-ai{color:#c084fc;background:rgba(192,132,252,0.1);border:1px solid rgba(192,132,252,0.2);}',
    '.ap-value-ai{color:#c084fc !important;font-style:italic;}',
    '#ap-autofill{background:linear-gradient(135deg,#1d5fd1,#3b82f6);border:none;',
    'color:#fff;border-radius:8px;padding:5px 13px;font-size:11px;font-weight:700;',
    'cursor:pointer;letter-spacing:0.03em;transition:all 0.2s;',
    'box-shadow:0 0 0 0 rgba(59,130,246,0.5);animation:ap-glow 1.8s ease-in-out infinite;}',
    '#ap-autofill:hover{transform:translateY(-1px);box-shadow:0 4px 14px rgba(59,130,246,0.45);}',
    '#ap-autofill:disabled{animation:none;box-shadow:none;}',
    '@keyframes ap-glow{0%,100%{box-shadow:0 0 0 0 rgba(59,130,246,0.5);}50%{box-shadow:0 0 0 6px rgba(59,130,246,0);}}',
    '.ap-filled-field{box-shadow:0 0 0 2px rgba(59,130,246,0.8), 0 0 8px rgba(59,130,246,0.4) !important; transition:box-shadow 0.3s ease;}',
  ].join('');
  document.head.appendChild(styleEl);

  /* ── CREATE HUD ──────────────────────────────────────────────────── */
  var hud = el('div', { id: 'ap-hud' });
  var header = el('div', { id: 'ap-header' }, [
    el('div', { id: 'ap-logo' }, ['AW']),
    el('div', { id: 'ap-title' }, ['AstrePilot']),
    el('span', { id: 'ap-tag' }, ['BETA']),
    el('button', { id: 'ap-close', title: 'Close' }, ['×']),
  ]);
  var statusSection = el('div', { id: 'ap-status' }, [
    el('div', { id: 'ap-status-row' }, [
      el('div', { id: 'ap-dot' }),
      el('div', { id: 'ap-status-text' }, ['Initialising…']),
    ]),
    el('div', { id: 'ap-bar-track' }, [el('div', { id: 'ap-bar-fill' })]),
  ]);
  var list = el('div', { id: 'ap-list' });
  var footer = el('div', { id: 'ap-footer' }, [
    el('div', { id: 'ap-count', className: 'ap-count-idle' }, ['Ready']),
    el('button', { id: 'ap-action-btn' }, ['Close']),
  ]);
  hud.appendChild(header);
  hud.appendChild(statusSection);
  hud.appendChild(list);
  hud.appendChild(footer);
  document.body.appendChild(hud);

  function closeHUD() {
    if (typeof fields !== 'undefined' && fields.length) {
      fields.forEach(function(f) { f.element.classList.remove('ap-filled-field'); });
    }
    hud.remove(); styleEl.remove();
  }
  document.getElementById('ap-close').addEventListener('click', closeHUD);

  /* ── DRAGGABLE ───────────────────────────────────────────────────── */
  (function makeDraggable() {
    var dx = 0, dy = 0, startX = 0, startY = 0;
    header.addEventListener('mousedown', function(e) {
      e.preventDefault();
      header.classList.add('ap-dragging');
      startX = e.clientX - dx;
      startY = e.clientY - dy;
      function move(e) {
        dx = e.clientX - startX;
        dy = e.clientY - startY;
        hud.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      }
      function up() {
        header.classList.remove('ap-dragging');
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
      }
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    });
  })();

  /* ── STATUS HELPERS ─────────────────────────────────────────────── */
  function setStatus(text, state) {
    document.getElementById('ap-status-text').textContent = text;
    var dot = document.getElementById('ap-dot');
    if (state === 'done') {
      dot.style.background = '#22c55e';
      dot.style.animation = 'none';
    } else if (state === 'error') {
      dot.style.background = '#ef4444';
      dot.style.animation = 'none';
    } else {
      dot.style.background = '#3b82f6';
      dot.style.animation = 'ap-pulse 1.4s ease-in-out infinite';
    }
  }
  function setProgress(filled, total) {
    var pct = total > 0 ? Math.round((filled / total) * 100) : 0;
    document.getElementById('ap-bar-fill').style.width = pct + '%';
    if (filled >= total && total > 0) {
      document.getElementById('ap-bar-fill').classList.add('ap-bar-done');
    }
  }
  function setCount(filled, total) {
    var el = document.getElementById('ap-count');
    if (total > 0) {
      el.textContent = filled + ' / ' + total + ' fields filled';
      el.className = filled >= total ? 'ap-count' : 'ap-count-idle';
    }
  }

  /* ── FIELD SCANNER ──────────────────────────────────────────────── */
  var FIELD_PATTERNS = [
    { type: 'FIRST_NAME',       kw: ['first_name','firstname','fname','given_name','first-name','first name','givenname','preferred first name'] },
    { type: 'LAST_NAME',        kw: ['last_name','lastname','lname','family_name','surname','last-name','last name','familyname'] },
    { type: 'FULL_NAME',        kw: ['full_name','fullname','legal_name','full-name','full-legal','full legal','full name','candidate name','applicant name','name'] },
    { type: 'PREFERRED_NAME',   kw: ['preferred_name','preferred name','nickname','chosen name','prefer to be called'] },
    { type: 'EMAIL',            kw: ['email','e-mail','email_address','emailaddress'] },
    { type: 'PHONE',            kw: ['phone','telephone','mobile','cell','contact_number','phone_number','phonenumber'] },
    { type: 'LOCATION',         kw: ['location','current_location','city_state','city_country','current location','candidate-location'] },
    { type: 'COUNTRY',          kw: ['country','country of residence','current country','residence country','country*'] },
    { type: 'UNIVERSITY',       kw: ['university','school','college','institution','alma_mater','alma mater','education institution','school--'] },
    { type: 'DEGREE',           kw: ['degree','degree_type','education_level','highest_degree','credential','degree--'] },
    { type: 'MAJOR',            kw: ['major','discipline','field of study','area of study','specialization'] },
    { type: 'GRADUATION_YEAR',  kw: ['graduation','grad_year','graduation_year','end date year','completion year','expected graduation','graduation date','end-year'] },
    { type: 'START_DATE',       kw: ['start_date','start date','available_date','earliest start','notice_period','notice period','when can you start','availability'] },
    { type: 'LINKEDIN',         kw: ['linkedin','linkedin_url','linkedin_profile'] },
    { type: 'GITHUB',           kw: ['github','github_url','github_profile'] },
    { type: 'PORTFOLIO',        kw: ['portfolio','portfolio_url','personal_website','personal_site','other website','website / github'] },
    { type: 'CURRENT_COMPANY',  kw: ['current company','current_company','current employer','present employer','org'] },
    { type: 'TITLE',            kw: ['headline','current_title','job_title','current_role','current_position'] },
    { type: 'COVER_LETTER',     kw: ['cover_letter','coverletter','cover letter','motivation_letter','brief summary','cover note'] },
    { type: 'SUMMARY',          kw: ['summary','about_yourself','professional_summary','about you'] },
    { type: 'WORK_AUTH',        kw: ['work_auth','work_authorization','authorized to work','legally authorized'] },
    { type: 'VISA',             kw: ['visa','sponsorship','require sponsorship'] },
    { type: 'SALARY',           kw: ['salary','expected_salary','desired_salary','salary_expectation','compensation'] },
    { type: 'PRONOUNS',         kw: ['pronoun','pronouns','he/him','she/her','they/them','xe/xem','ze/hir','ey/em'] },
    { type: 'CONSENT',          kw: ['agree','consent','acknowledge','confirm','terms','privacy','certify','declaration','acknowledgement','policy','gdpr'] },
    { type: 'GENDER',           kw: ['gender','eeo[gender]'] },
    { type: 'RACE_ETHNICITY',   kw: ['race','ethnic','hispanic','latino','eeo[race]','hispanic_ethnicity'] },
    { type: 'VETERAN',          kw: ['veteran','military','veteran_status','eeo[veteran]'] },
    { type: 'DISABILITY',       kw: ['disability','handicap','disability_status','eeo[disability]'] },
    { type: 'REFERRAL',         kw: ['how did you hear','hear about','referral','source','how did you first hear','largest influence'] },
  ];

  function getLabelText(input) {
    var ownerDoc = input.ownerDocument || document;
    var ariaLabel = (input.getAttribute('aria-label') || '').toLowerCase();
    var ariaLabelledBy = input.getAttribute('aria-labelledby');
    var labelledByText = '';
    if (ariaLabelledBy) {
      ariaLabelledBy.split(/\\s+/).forEach(function(id) {
        var elById = ownerDoc.getElementById(id);
        if (elById && elById.textContent) labelledByText += ' ' + elById.textContent;
      });
    }

    var labelEl = input.labels && input.labels[0];
    var labelText = '';
    if (labelEl) {
      for (var n = 0; n < labelEl.childNodes.length; n++) {
        if (labelEl.childNodes[n].nodeType === 3) labelText += labelEl.childNodes[n].textContent;
      }
      if (!labelText) labelText = labelEl.textContent;
    }

    if (!labelText && input.id) {
      try {
        var explicit = ownerDoc.querySelector('label[for="' + input.id.replace(/"/g, '\\"') + '"]');
        if (explicit && explicit.textContent) labelText = explicit.textContent;
      } catch(e) {}
    }

    /* Lever, Ashby, and custom ATS wrapper label inspection */
    var containerText = '';
    var cur = input.parentElement;
    for (var depth = 0; depth < 4 && cur; depth++) {
      var lbl = cur.querySelector('.application-label, [class*="label" i], label, legend, [data-qa*="label"]');
      if (lbl && lbl !== input && lbl.textContent) {
        containerText += ' ' + lbl.textContent;
        break;
      }
      if (cur.previousElementSibling && /label|question|title/i.test(cur.previousElementSibling.className || '')) {
        containerText += ' ' + cur.previousElementSibling.textContent;
        break;
      }
      cur = cur.parentElement;
    }

    var placeholder = (input.placeholder || '').toLowerCase();
    return [ariaLabel, labelledByText.toLowerCase(), labelText.toLowerCase(), containerText.toLowerCase(), placeholder]
      .join(' ')
      .replace(/[*✱]/g, ' ')
      .replace(/\\s+/g, ' ')
      .trim();
  }

  function classifyField(input) {
    /* HIGH weight: name + id attributes — most reliable, field-specific */
    var attrSignal = [
      (input.getAttribute('name') || '').toLowerCase(),
      (input.getAttribute('id') || '').toLowerCase(),
    ].join(' ');

    /* MEDIUM weight: label, aria-label, placeholder */
    var labelSignal = getLabelText(input);

    /* LOW weight: immediate parent text only (avoids row-level bleed) */
    var parentEl = input.parentElement;
    var contextSignal = parentEl ? (parentEl.getAttribute('class') || '' + parentEl.id || '').toLowerCase() : '';

    var best = { type: null, score: 0 };
    FIELD_PATTERNS.forEach(function(p) {
      var score = 0;
      p.kw.forEach(function(k) {
        if (k === 'name') {
          /* Only match generic 'name' if neither first nor last is present */
          var hasFirstOrLast = attrSignal.includes('first') || attrSignal.includes('last') || labelSignal.includes('first') || labelSignal.includes('last');
          if (!hasFirstOrLast && (attrSignal === 'name' || attrSignal.includes('systemfield_name') || labelSignal === 'name' || labelSignal.includes('full name'))) {
            score += 10;
          }
        } else {
          if (attrSignal.includes(k))    score += 10; /* name/id exact match — very strong */
          if (labelSignal.includes(k))   score += 3;  /* label/placeholder — medium */
          if (contextSignal.includes(k)) score += 1;  /* class/id context — tiebreaker only */
        }
      });
      if (score > best.score) { best = { type: p.type, score: score }; }
    });

    /* Unmatched textareas = screening question */
    if (!best.type && input.tagName === 'TEXTAREA') return 'SCREENING';
    /* Minimum threshold: must score >= 3 (at least a label match — not just noise) */
    if (best.score < 3) return null;
    return best.type;
  }

  function ensureFrameStyles(doc) {
    if (!doc || !doc.head) return;
    try {
      if (doc.getElementById('ap-frame-styles')) return;
      var s = doc.createElement('style');
      s.id = 'ap-frame-styles';
      s.textContent = '.ap-filled-field{box-shadow:0 0 0 2px rgba(59,130,246,0.8), 0 0 8px rgba(59,130,246,0.4) !important; transition:box-shadow 0.3s ease;}';
      doc.head.appendChild(s);
    } catch(e) {}
  }

  function collectInputsFromRoot(rootDoc) {
    var SELECTOR = 'input[type=text], input[type=email], input[type=tel], input[type=url], ' +
      'input[type=number], input[type=radio], input[type=checkbox], input:not([type]), textarea, select';
    var allInputs = [];
    var visited = new Set();

    function walk(doc) {
      if (!doc || visited.has(doc)) return;
      visited.add(doc);
      ensureFrameStyles(doc);

      try {
        var found = doc.querySelectorAll(SELECTOR);
        for (var i = 0; i < found.length; i++) {
          allInputs.push(found[i]);
        }
      } catch(e) {}

      /* Shadow DOM traversal */
      try {
        var els = doc.querySelectorAll('*');
        for (var j = 0; j < els.length; j++) {
          if (els[j].shadowRoot) {
            walk(els[j].shadowRoot);
          }
        }
      } catch(e) {}

      /* Iframe traversal */
      try {
        var iframes = doc.querySelectorAll('iframe');
        for (var k = 0; k < iframes.length; k++) {
          try {
            var childDoc = iframes[k].contentDocument || (iframes[k].contentWindow && iframes[k].contentWindow.document);
            if (childDoc) {
              walk(childDoc);
            }
          } catch(e) {
            /* cross-origin iframe security boundary */
          }
        }
      } catch(e) {}
    }

    walk(rootDoc);
    return allInputs;
  }

  function scanFields() {
    var inputs = collectInputsFromRoot(document);
    var results = [];
    var seenTypes = {};
    inputs.forEach(function(inp) {
      var rect = inp.getBoundingClientRect();
      /* Check visibility (allow checkbox inputs whose parent is visible) */
      if (rect.width === 0 && rect.height === 0 && inp.type !== 'checkbox') {
        var p = inp.parentElement;
        if (!p || p.getBoundingClientRect().width === 0) return;
      }
      var win = inp.ownerDocument && inp.ownerDocument.defaultView ? inp.ownerDocument.defaultView : window;
      var computed = win.getComputedStyle(inp);
      if (computed.display === 'none' && inp.type !== 'checkbox') return;
      if (computed.visibility === 'hidden') return;

      var type = classifyField(inp);
      if (!type) return;

      /* Deduplicate standard single fields, but allow multi-value types (checkboxes, screenings) */
      var allowMultiple = (type === 'SCREENING' || type === 'CONSENT' || type === 'PRONOUNS' || type === 'REFERRAL');
      if (!allowMultiple) {
        if (seenTypes[type]) return;
        seenTypes[type] = true;
      }

      var origVal = (inp.tagName === 'INPUT' && (inp.type === 'radio' || inp.type === 'checkbox')) ? inp.checked : inp.value;
      results.push({ element: inp, type: type, id: 'f' + Math.random().toString(36).slice(2,7), originalValue: origVal });
    });
    return results;
  }

  /* ── NATIVE VALUE SETTER (works with React / Vue controlled inputs) */
  function setNativeValue(el, value) {
    /* Checkbox handling */
    if (el.tagName === 'INPUT' && el.type === 'checkbox') {
      el.checked = Boolean(value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('click', { bubbles: true }));
      return;
    }

    /* Radio handling - scoped to ownerDocument */
    if (el.tagName === 'INPUT' && el.type === 'radio') {
      var ownerDoc = el.ownerDocument || document;
      var radios = ownerDoc.querySelectorAll('input[type="radio"][name="' + el.name + '"]');
      var target = null;
      var valLower = String(value).toLowerCase();
      for (var i = 0; i < radios.length; i++) {
        var rVal = String(radios[i].value).toLowerCase();
        var labelText = getLabelText(radios[i]).toLowerCase();
        if (rVal === valLower || labelText.includes(valLower) || (valLower === 'yes' && (rVal==='true' || rVal==='1')) || (valLower === 'no' && (rVal==='false' || rVal==='0'))) {
          target = radios[i];
          break;
        }
      }
      if (target) {
        target.checked = true;
        target.dispatchEvent(new Event('input',  { bubbles: true }));
        target.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return;
    }
    
    /* Select handling */
    if (el.tagName === 'SELECT') {
      var valLower = String(value).toLowerCase();
      var targetOpt = null;
      for (var i = 0; i < el.options.length; i++) {
        var opt = el.options[i];
        var oVal = opt.value.toLowerCase();
        var oText = opt.text.toLowerCase();
        if (oVal === valLower || oText.includes(valLower) || (valLower === 'yes' && (oVal==='true' || oVal==='1')) || (valLower === 'no' && (oVal==='false' || oVal==='0'))) {
          targetOpt = opt;
          break;
        }
      }
      if (targetOpt) {
        el.value = targetOpt.value;
        el.dispatchEvent(new Event('input',  { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return;
    }

    /* Standard inputs / textareas */
    var win = el.ownerDocument && el.ownerDocument.defaultView ? el.ownerDocument.defaultView : window;
    var proto = el.tagName === 'TEXTAREA'
      ? win.HTMLTextAreaElement.prototype
      : win.HTMLInputElement.prototype;
    var setter = Object.getOwnPropertyDescriptor(proto, 'value');
    if (setter && setter.set) { setter.set.call(el, value); }
    else { el.value = value; }
    el.dispatchEvent(new Event('input',  { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));

    /* React-select dropdown option auto-selection */
    if (el.getAttribute('role') === 'combobox' || (el.id && el.id.indexOf('react-select') !== -1)) {
      setTimeout(function() {
        var ownerDoc = el.ownerDocument || document;
        var opt = ownerDoc.querySelector('[class*="-option"], [role="option"]');
        if (opt) { opt.click(); }
      }, 50);
    }
  }

  /* ── DECODE FILL ANIMATION ───────────────────────────────────────── */
  var CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@._-+#$';
  function decodeFill(inputEl, targetValue, onUpdate) {
    if (inputEl.tagName === 'SELECT' || (inputEl.tagName === 'INPUT' && (inputEl.type === 'radio' || inputEl.type === 'checkbox'))) {
      return new Promise(function(resolve) {
        setNativeValue(inputEl, targetValue);
        if (onUpdate) onUpdate(targetValue === true ? '✓ Checked' : targetValue === false ? '— Unchecked' : String(targetValue));
        resolve();
      });
    }

    return new Promise(function(resolve) {
      var iteration = 0;
      var length = String(targetValue).length;
      var strValue = String(targetValue);
      var interval = setInterval(function() {
        var display = strValue.split('').map(function(char, i) {
          if (char === ' ' || char === '\\n') return char;
          if (i < Math.floor(iteration)) return char;
          return CHARSET[Math.floor(Math.random() * CHARSET.length)];
        }).join('');
        setNativeValue(inputEl, display);
        if (onUpdate) onUpdate(display);
        /* Fast speed: 0.8s total for typical field */
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

  /* ── RENDER FIELD LIST ───────────────────────────────────────────── */
  var TYPE_ICONS = {
    FIRST_NAME:'👤', LAST_NAME:'👤', FULL_NAME:'👤', PREFERRED_NAME:'🏷', EMAIL:'✉', PHONE:'📞',
    LOCATION:'📍', COUNTRY:'🌍', UNIVERSITY:'🎓', DEGREE:'📜', MAJOR:'🔬', GRADUATION_YEAR:'📅',
    START_DATE:'⏱', LINKEDIN:'🔗', GITHUB:'🐙', PORTFOLIO:'🌐', CURRENT_COMPANY:'🏢', TITLE:'💼',
    COVER_LETTER:'📝', SUMMARY:'📄', WORK_AUTH:'✅', VISA:'🛂', SALARY:'💰', PRONOUNS:'⚧',
    CONSENT:'☑', GENDER:'⚧', RACE_ETHNICITY:'👥', VETERAN:'🎖', DISABILITY:'♿', REFERRAL:'📣', SCREENING:'❓',
  };
  var TYPE_LABELS = {
    FIRST_NAME:'First Name', LAST_NAME:'Last Name', FULL_NAME:'Full Name', PREFERRED_NAME:'Preferred Name',
    EMAIL:'Email Address', PHONE:'Phone Number', LOCATION:'Location', COUNTRY:'Country',
    UNIVERSITY:'University', DEGREE:'Degree', MAJOR:'Major / Field', GRADUATION_YEAR:'Graduation Year',
    START_DATE:'Start Date', LINKEDIN:'LinkedIn URL', GITHUB:'GitHub URL', PORTFOLIO:'Portfolio URL',
    CURRENT_COMPANY:'Company', TITLE:'Job Title', COVER_LETTER:'Cover Letter', SUMMARY:'Summary',
    WORK_AUTH:'Work Auth', VISA:'Visa Sponsorship', SALARY:'Salary', PRONOUNS:'Pronouns',
    CONSENT:'Agreement', GENDER:'Gender', RACE_ETHNICITY:'Race/Ethnicity', VETERAN:'Veteran Status',
    DISABILITY:'Disability Status', REFERRAL:'Referral Source', SCREENING:'Screening Q',
  };
  var rowEls = {};

  function renderFieldList(fields) {
    list.innerHTML = '';
    fields.forEach(function(f) {
      var row = el('div', { className: 'ap-row', id: 'ap-row-' + f.id });
      var icon = el('div', { className: 'ap-icon' }, [TYPE_ICONS[f.type] || '·']);
      var label = el('div', { className: 'ap-row-label' }, [TYPE_LABELS[f.type] || f.type]);
      var value = el('div', { className: 'ap-row-value' }, ['…']);
      var status = el('div', { className: 'ap-pending' }, ['○']);
      row.appendChild(icon);
      row.appendChild(label);
      row.appendChild(value);
      row.appendChild(status);
      list.appendChild(row);
      rowEls[f.id] = { row, label, value, status };
    });
  }

  function markActive(f) {
    var r = rowEls[f.id];
    if (!r) return;
    r.row.className = 'ap-row ap-row-active';
    r.label.className = 'ap-row-label ap-label-active';
    r.value.className = 'ap-row-value ap-decoding';
    r.status.className = 'ap-spin';
    r.status.textContent = '';
  }
  function markDone(f, skipped) {
    var r = rowEls[f.id];
    if (!r) return;
    r.row.className = 'ap-row';
    r.label.className = 'ap-row-label';
    r.value.className = 'ap-row-value';
    r.status.className = skipped ? 'ap-skip' : 'ap-check';
    r.status.textContent = skipped ? '—' : '✓';
  }
  function updateRowValue(f, text) {
    var r = rowEls[f.id];
    if (!r) return;
    r.value.textContent = text ? String(text).slice(0, 18) : '';
  }

  /* ── VALUE RESOLUTION HELPERS ────────────────────────────────────── */
  function getEducationField(prof, key) {
    if (!prof) return null;
    if (prof[key]) return prof[key];
    var edu = '';
    if (prof._context && prof._context.education && prof._context.education.length) {
      edu = prof._context.education.join(' ');
    } else if (prof.highestEducation) {
      edu = prof.highestEducation;
    }
    if (key === 'university') {
      var m = edu.match(/(?:at|from|,)\\s*([A-Z][A-Za-z\\s]+(?:University|College|Institute|Polytechnic))/i) ||
              edu.match(/([A-Z][A-Za-z\\s]+(?:University|College|Institute|Polytechnic))/i);
      return m ? m[1].trim() : (prof.university || 'Stanford University');
    }
    if (key === 'degree') {
      var mDeg = edu.match(/\\b(B\\.?S\\.?|M\\.?S\\.?|Bachelor(?:'s)?|Master(?:'s)?|B\\.?Tech|Ph\\.?D)\\b/i);
      return mDeg ? mDeg[1].trim() : (prof.highestEducation || "Bachelor's Degree");
    }
    if (key === 'major') {
      var mMaj = edu.match(/(?:in|of)\\s+([A-Za-z\\s]+?)(?:,|[\\(]|$)/i);
      return mMaj ? mMaj[1].trim() : 'Computer Science';
    }
    if (key === 'gradYear') {
      var mYr = edu.match(/\\b(202[4-9]|203[0-5])\\b/);
      return mYr ? mYr[1] : '2026';
    }
    return null;
  }

  function getCountry(prof) {
    if (!prof) return 'United States';
    if (prof.country) return prof.country;
    if (prof.targetCountries && prof.targetCountries.length) return prof.targetCountries[0];
    var loc = (prof.location || '').toLowerCase();
    if (loc.includes('india')) return 'India';
    if (loc.includes('uk') || loc.includes('united kingdom')) return 'United Kingdom';
    if (loc.includes('canada')) return 'Canada';
    if (loc.includes('germany')) return 'Germany';
    return 'United States';
  }

  function resolvePronoun(field, prof) {
    var userPronoun = ((prof && prof.pronouns) || 'he/him').toLowerCase();
    if (field.element.type === 'checkbox') {
      var lbl = getLabelText(field.element).toLowerCase();
      if (userPronoun.includes('he') && (lbl.includes('he/him') || lbl.includes('he/his') || lbl === 'he')) return true;
      if (userPronoun.includes('she') && (lbl.includes('she/her') || lbl === 'she')) return true;
      if (userPronoun.includes('they') && (lbl.includes('they/them') || lbl === 'they')) return true;
      return false;
    }
    return (prof && prof.pronouns) || 'He/him/his';
  }

  /* ── RESOLVE VALUE FOR FIELD ─────────────────────────────────────── */
  async function resolveValue(field, profile, session) {
    switch(field.type) {
      case 'FIRST_NAME':       return profile.firstName;
      case 'LAST_NAME':        return profile.lastName;
      case 'FULL_NAME':        return profile.fullName;
      case 'PREFERRED_NAME':   return profile.firstName || profile.fullName;
      case 'EMAIL':            return profile.email;
      case 'PHONE':            return profile.phone;
      case 'LOCATION':         return profile.location;
      case 'COUNTRY':          return getCountry(profile);
      case 'UNIVERSITY':       return getEducationField(profile, 'university');
      case 'DEGREE':           return getEducationField(profile, 'degree');
      case 'MAJOR':            return getEducationField(profile, 'major');
      case 'GRADUATION_YEAR':  return getEducationField(profile, 'gradYear');
      case 'START_DATE':       return profile.noticePeriod || 'Immediately';
      case 'LINKEDIN':         return profile.linkedinUrl;
      case 'GITHUB':           return profile.githubUrl;
      case 'PORTFOLIO':        return profile.portfolioUrl;
      case 'CURRENT_COMPANY':  return profile.currentCompany || 'Acme Cloud';
      case 'TITLE':            return session ? session.jobTitle : profile.title;
      case 'SUMMARY':          return session ? session.tailoredSummary : profile.professionalSummary;
      case 'WORK_AUTH':        return profile.workAuthorized ? 'Yes' : 'No';
      case 'VISA':             return profile.requiresVisa ? 'Yes' : 'No';
      case 'SALARY':           return session ? session.salaryRange : (profile.salaryRange || null);
      case 'CONSENT':          return true;
      case 'PRONOUNS':         return resolvePronoun(field, profile);
      case 'GENDER':           return profile.gender || 'Decline to self-identify';
      case 'RACE_ETHNICITY':   return profile.race || 'Decline to self-identify';
      case 'VETERAN':          return profile.veteran || 'I am not a veteran';
      case 'DISABILITY':       return profile.disability || 'I do not have a disability';
      case 'REFERRAL': {
        if (field.element.type === 'checkbox') {
          var lblRef = getLabelText(field.element).toLowerCase();
          return lblRef.includes('linkedin') || lblRef.includes('social media');
        }
        return 'LinkedIn';
      }
      case 'COVER_LETTER':
      case 'SCREENING': {
        var labelText = getLabelText(field.element);
        var question = labelText.slice(0, 300) || (field.type === 'COVER_LETTER' ? 'Write a cover letter' : 'Tell us about yourself');
        var company = session && session.company ? session.company : document.title.replace(/ \\|.*/, '').trim().slice(0, 60);
        var jobTitle = session && session.jobTitle ? session.jobTitle : '';
        try {
          var res = await apFetch('/answer', {
            method: 'POST',
            body: JSON.stringify({
              question: question,
              company: company,
              jobTitle: jobTitle,
              context: session ? 'JOB DESCRIPTION:\\n' + session.jdText + '\\n\\nTAILORED PROFILE:\\n' + session.tailoredSummary : profile._context,
            }),
          });
          if (!res.ok) return null;
          var data = await res.json();
          return data.answer || null;
        } catch(e) {
          return null;
        }
      }
      default: return null;
    }
  }

  /* ── SOURCE BADGE HELPER ─────────────────────────────────────────── */
  function getSource(fieldType, session) {
    if (fieldType === 'COVER_LETTER' || fieldType === 'SCREENING') return 'ai';
    if (fieldType === 'TITLE' || fieldType === 'SUMMARY' || fieldType === 'SALARY') {
      return session ? 'session' : 'profile';
    }
    return 'profile';
  }

  /* ── PREVIEW VALUE (sync — no AI calls) ──────────────────────────── */
  function resolvePreview(field, profile, session) {
    switch(field.type) {
      case 'FIRST_NAME':       return profile.firstName  || null;
      case 'LAST_NAME':        return profile.lastName   || null;
      case 'FULL_NAME':        return profile.fullName   || null;
      case 'PREFERRED_NAME':   return profile.firstName  || profile.fullName;
      case 'EMAIL':            return profile.email      || null;
      case 'PHONE':            return profile.phone      || null;
      case 'LOCATION':         return profile.location   || null;
      case 'COUNTRY':          return getCountry(profile);
      case 'UNIVERSITY':       return getEducationField(profile, 'university');
      case 'DEGREE':           return getEducationField(profile, 'degree');
      case 'MAJOR':            return getEducationField(profile, 'major');
      case 'GRADUATION_YEAR':  return getEducationField(profile, 'gradYear');
      case 'START_DATE':       return profile.noticePeriod || 'Immediately';
      case 'LINKEDIN':         return profile.linkedinUrl || null;
      case 'GITHUB':           return profile.githubUrl  || null;
      case 'PORTFOLIO':        return profile.portfolioUrl || null;
      case 'CURRENT_COMPANY':  return profile.currentCompany || 'Acme Cloud';
      case 'TITLE':            return session ? session.jobTitle : (profile.title || null);
      case 'SUMMARY':          return session ? (session.tailoredSummary || null) : (profile.professionalSummary || null);
      case 'SALARY':           return session ? (session.salaryRange || null) : (profile.salaryRange || null);
      case 'WORK_AUTH':        return profile.workAuthorized ? 'Yes' : 'No';
      case 'VISA':             return profile.requiresVisa ? 'Yes' : 'No';
      case 'CONSENT':          return '✓ Agree';
      case 'PRONOUNS':         return resolvePronoun(field, profile) ? '✓ Checked' : '— Unchecked';
      case 'GENDER':           return profile.gender || 'Decline to self-identify';
      case 'RACE_ETHNICITY':   return profile.race || 'Decline to self-identify';
      case 'VETERAN':          return profile.veteran || 'I am not a veteran';
      case 'DISABILITY':       return profile.disability || 'I do not have a disability';
      case 'REFERRAL':         return 'LinkedIn';
      case 'COVER_LETTER':     return null;
      case 'SCREENING':        return null;
      default: return null;
    }
  }

  /* ── RENDER PREVIEW LIST ─────────────────────────────────────────── */
  function renderPreviewList(previews) {
    list.innerHTML = '';
    rowEls = {};
    previews.forEach(function(p) {
      var f = p.field;
      var src = p.source; /* 'profile' | 'session' | 'ai' */
      var row = el('div', { className: 'ap-row', id: 'ap-row-' + f.id });
      var icon = el('div', { className: 'ap-icon' }, [TYPE_ICONS[f.type] || '·']);
      var label = el('div', { className: 'ap-row-label ap-label-active' }, [TYPE_LABELS[f.type] || f.type]);
      var badge;
      if (src === 'ai') {
        badge = el('div', { className: 'ap-badge ap-badge-ai' }, ['AI']);
      } else if (src === 'session') {
        badge = el('div', { className: 'ap-badge ap-badge-session' }, ['Session']);
      } else {
        badge = el('div', { className: 'ap-badge ap-badge-profile' }, ['Profile']);
      }
      var valueEl = el('div', { className: src === 'ai' ? 'ap-row-value ap-value-ai' : 'ap-row-value' },
        [src === 'ai' ? '✦ AI answer' : (p.value ? String(p.value).slice(0, 18) : '—')]);
      var statusEl = el('div', { className: 'ap-pending' }, ['○']);
      row.appendChild(icon);
      row.appendChild(label);
      row.appendChild(badge);
      row.appendChild(valueEl);
      row.appendChild(statusEl);
      list.appendChild(row);
      rowEls[f.id] = { row, label, value: valueEl, status: statusEl };
    });
  }

  /* ── MAIN EXECUTION ──────────────────────────────────────────────── */
  setStatus('Connecting to AstreWork…', 'loading');

  var profile;
  var session = null;
  try {
    var profileRes = await apFetch('/profile');
    if (profileRes.status === 404) throw new Error('profile404');
    if (!profileRes.ok) throw new Error('auth');
    profile = await profileRes.json();

    var sessionRes = await apFetch('/session');
    if (sessionRes.ok) {
      var sessData = await sessionRes.json();
      session = sessData.session;
    }
  } catch(e) {
    var errMsg = '⚠ Could not connect. Check your token.';
    if (e && e.message === 'profile404') { errMsg = '⚠ No profile found. Complete onboarding first.'; }
    setStatus(errMsg, 'error');
    var dot0 = document.getElementById('ap-dot');
    dot0.style.background = '#ef4444';
    dot0.style.animation = 'none';
    return;
  }

  /* Update tag with session info */
  if (session) {
    var tag = document.getElementById('ap-tag');
    tag.textContent = 'PRIMED: ' + (session.company || 'JOB').toUpperCase();
    tag.style.background = 'rgba(34,197,94,0.12)';
    tag.style.color = '#4ade80';
    tag.style.borderColor = 'rgba(34,197,94,0.2)';
  }

  /* ── PHASE 1: SCAN + PREVIEW ─────────────────────────────────────── */
  setStatus('Scanning page…', 'loading');
  var fields = scanFields();

  if (fields.length === 0) {
    setStatus('No fillable fields found on this page.', 'error');
    var dot1 = document.getElementById('ap-dot');
    dot1.style.background = '#ef4444';
    dot1.style.animation = 'none';
    return;
  }

  /* Resolve all non-AI values synchronously for instant preview */
  var previews = fields.map(function(f) {
    return { field: f, value: resolvePreview(f, profile, session), source: getSource(f.type, session) };
  });

  var aiCount = previews.filter(function(p) { return p.source === 'ai'; }).length;
  var dataCount = previews.filter(function(p) { return p.value; }).length;

  renderPreviewList(previews);

  setStatus('Ready — ' + fields.length + ' fields detected', 'done');
  var dot2 = document.getElementById('ap-dot');
  dot2.style.background = '#22c55e';
  dot2.style.animation = 'none';

  /* Update footer to show AUTOFILL button */
  var countEl = document.getElementById('ap-count');
  countEl.textContent = dataCount + ' instant' + (aiCount > 0 ? ', ' + aiCount + ' AI' : '');
  countEl.className = 'ap-count-idle';

  /* Inject Autofill button */
  var autofillBtn = el('button', { id: 'ap-autofill' }, ['⚡ Autofill']);
  document.getElementById('ap-footer').insertBefore(autofillBtn, document.getElementById('ap-action-btn'));

  /* ── PHASE 2: FILL (triggered on click) ─────────────────────────── */
  var fillStarted = false;
  autofillBtn.addEventListener('click', async function() {
    if (fillStarted) return;
    fillStarted = true;

    autofillBtn.disabled = true;
    autofillBtn.textContent = 'Filling…';
    autofillBtn.style.opacity = '0.6';
    autofillBtn.style.cursor = 'default';

    /* Reset pulse dot */
    var dotFill = document.getElementById('ap-dot');
    dotFill.style.background = '#3b82f6';
    dotFill.style.animation = '';
    dotFill.className = '';

    setStatus('Filling ' + fields.length + ' fields…', 'loading');
    setProgress(0, fields.length);

    var filled = 0;
    var hadAI = false;

    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      markActive(f);

      var isAI = (f.type === 'COVER_LETTER' || f.type === 'SCREENING');
      if (isAI) { hadAI = true; }

      var value = await resolveValue(f, profile, session);
      var skipped = (value === null || value === undefined || (typeof value === 'string' && value.trim() === ''));

      if (!skipped) {
        var capturedF = f; /* capture current iteration value to avoid var-loop closure bug */
        await decodeFill(capturedF.element, value, function(v) { updateRowValue(capturedF, v); });
        if (value !== false) {
          capturedF.element.classList.add('ap-filled-field');
          filled++;
        }
      }

      var displayVal = (typeof value === 'boolean') ? (value ? '✓ Yes' : '— No') : (skipped ? '' : value);
      updateRowValue(f, displayVal);
      markDone(f, skipped || value === false);
      setProgress(filled, fields.length);
      setCount(filled, fields.length);

      await new Promise(function(r) { setTimeout(r, 60); });
    }

    /* ── LOG ─────────────────────────────────────────────────────── */
    var siteInfo = { siteUrl: window.location.href, company: '', jobTitle: '' };
    var titleMatch = document.title.match(/(.+?)\s*[|\-–—]\s*(.+)/);
    if (titleMatch) {
      siteInfo.jobTitle = titleMatch[1].trim().slice(0, 150);
      siteInfo.company  = titleMatch[2].trim().slice(0, 100);
    }
    try {
      await apFetch('/log', {
        method: 'POST',
        body: JSON.stringify({
          siteUrl: siteInfo.siteUrl,
          company: session ? session.company : siteInfo.company,
          jobTitle: session ? session.jobTitle : siteInfo.jobTitle,
          fieldsTotal: fields.length,
          fieldsFilled: filled,
          hasAiAnswers: hadAI,
        }),
      });
    } catch(e) { /* silent */ }

    /* ── DONE ────────────────────────────────────────────────────── */
    var timeSaved = Math.round((filled * 1.5));
    var timeStr = timeSaved > 0 ? (' • Saved ~' + timeSaved + 'm') : '';
    setStatus('✦ ' + filled + ' / ' + fields.length + ' filled' + timeStr, 'done');
    var dotDone = document.getElementById('ap-dot');
    dotDone.style.background = '#22c55e';
    dotDone.style.animation = 'none';
    setProgress(fields.length, fields.length);
    autofillBtn.style.display = 'none';

    var actionBtn = document.getElementById('ap-action-btn');
    actionBtn.textContent = '↺ Undo';
    actionBtn.style.color = '#ef4444';
    actionBtn.style.borderColor = 'rgba(239,68,68,0.35)';
  });

  document.getElementById('ap-action-btn').addEventListener('click', function() {
    if (this.textContent === '↺ Undo') {
      fields.forEach(function(f) {
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

})();`;


/**
 * Build the complete bookmarklet javascript: href for a given token.
 * The token is substituted into the script and the whole thing is URI-encoded.
 */
export function buildBookmarkletHref(token: string, origin: string = "https://astrework.app"): string {
  const cleanOrigin = origin.replace(/\/$/, "");
  const minified = BOOKMARKLET_SCRIPT
    .replace("__AP_TOKEN__", token)
    .replace("__AP_ORIGIN__", cleanOrigin)
    .replace(/\/\*[\s\S]*?\*\//g, "") /* strip block comments only */
    .replace(/\n\s*/g, " ")            /* collapse newlines */
    .replace(/\s{2,}/g, " ")           /* collapse spaces */
    .trim();

  return `javascript:${encodeURIComponent(minified)}`;
}
