/**
 * hud-ui.js
 * AstrePilot Premium UI
 * Handles the Shadow DOM presentation layer. Does not contain any field scanning or network logic.
 */

window.AstrePilotHUD = (function () {
  const ICONS = {
    logo: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`,
    logoLg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`,
    settings: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
    minimize: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>`,
    close: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    sparkle: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/></svg>`,
    fillAction: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
    check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    emptyGhost: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line></svg>`,
    user: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
    mail: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>`,
    phone: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>`,
    link: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`,
    briefcase: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`,
    text: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="17" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="8" y2="14"></line><line x1="17" y1="18" x2="3" y2="18"></line></svg>`,
    circle: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>`,
    scan: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h3"></path><path d="M4 17v3h3"></path><path d="M20 17v3h-3"></path><path d="M20 7V4h-3"></path><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>`,
    download: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
    warn: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
    shield: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`,
    key: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"></circle><path d="m21 2-9.6 9.6"></path><path d="m15.5 7.5 3 3L22 7l-3-3"></path></svg>`
  };

  const TYPE_LABELS = {
    'firstname': 'First Name', 'lastname': 'Last Name', 'fullname': 'Full Name',
    'email': 'Email', 'phonetype': 'Phone Type', 'phone': 'Phone',
    'linkedin': 'LinkedIn', 'github': 'GitHub', 'portfolio': 'Portfolio',
    'resume': 'Resume/CV', 'coverletter': 'Cover Letter', 'summary': 'Summary',
    'location': 'Location', 'city': 'City', 'state': 'State / Province', 'country': 'Country',
    'address': 'Street Address', 'apt': 'Apartment/Suite', 'zip': 'ZIP Code',
    'hearabout': 'Referral Source', 'hearaboutdetail': 'Source Detail',
    'visa': 'Visa/Sponsorship', 'salary': 'Expected Salary', 'noticeperiod': 'Notice Period',
    'relocate': 'Relocate', 'education': 'Highest Education',
    'veteran': 'Veteran Status', 'disability': 'Disability Status',
    'race': 'Race/Ethnicity', 'gender': 'Gender', 'pronouns': 'Pronouns', 'unknown': 'Custom Field',
    'age18': 'Legal Age (18+)', 'previousemployed': 'Prior Employment', 'privacyconsent': 'Privacy Agreement',
    'aiconsent': 'AI Processing Consent', 'aiusage': 'AI Tools Usage', 'govtofficial': 'Government Official',
    'govtrelative': 'Government Relative', 'conflictinterest': 'Conflict of Interest',
    'referredbyleader': 'Senior Referral', 'hispaniclatino': 'Hispanic / Latino',
    'raceethnicity': 'Race / Ethnicity', 'company': 'Company Name', 'employmenttitle': 'Job Title',
    'startmonth': 'Start Month', 'startyear': 'Start Year', 'endmonth': 'End Month',
    'endyear': 'End Year', 'currentrole': 'Current Role', 'school': 'School / University',
    'degree': 'Degree', 'discipline': 'Discipline / Major', 'screeningselect': 'Screening Question',
    'workdescription': 'Work Description', 'password': 'Password', 'confirmpassword': 'Confirm Password', 'loginid': 'Login ID / Username'
  };
  // Everything interpolated into innerHTML that originates outside this file
  // (profile, session, AI answers, page labels) MUST pass through this.
  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function safeSendMessage(message, cb) {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage(message, (res) => {
          if (chrome.runtime.lastError) { if (cb) cb(null); return; }
          if (cb) cb(res);
        });
        return;
      }
    } catch (e) { /* extension context invalidated */ }
    if (cb) cb(null);
  }

  function getIconForType(type) {
    if (['firstname', 'lastname', 'fullname', 'race', 'raceethnicity', 'gender', 'pronouns', 'veteran', 'disability'].includes(type)) return ICONS.user;
    if (type === 'email') return ICONS.mail;
    if (['phone', 'phonetype'].includes(type)) return ICONS.phone;
    if (['location', 'city', 'state', 'country', 'address', 'apt', 'zip', 'company', 'employmenttitle', 'school', 'degree', 'discipline'].includes(type)) return ICONS.briefcase;
    if (['linkedin', 'github', 'portfolio'].includes(type)) return ICONS.link;
    if (['password', 'confirmpassword', 'loginid'].includes(type)) return ICONS.key;
    if (['resume', 'coverletter', 'summary', 'screening', 'screeningselect', 'aiusage', 'workdescription'].includes(type)) return ICONS.text;
    if (['visa', 'salary', 'noticeperiod', 'relocate', 'education', 'hearabout', 'hearaboutdetail', 'age18', 'previousemployed', 'privacyconsent', 'aiconsent', 'govtofficial', 'govtrelative', 'conflictinterest', 'referredbyleader', 'hispaniclatino', 'startmonth', 'startyear', 'endmonth', 'endyear', 'currentrole'].includes(type)) return ICONS.briefcase;
    return ICONS.text;
  }

  class HUD {
    constructor(options = {}) {
      this.options = options;
      this.fields = [];
      this.state = 'connecting';
      this.isCollapsed = false;
      this.isDragging = false;
      this.dragOffset = { x: 0, y: 0 };
      this.astraShield = null;
      this.recruiter = null;
      this.harvester = null;
      this.stepBadge = null;
      this.duplicateAlert = null;
      this.remoteLock = null;

      // Restore position if possible
      try {
        const savedPos = sessionStorage.getItem('ap-hud-pos');
        if (savedPos) {
          this.position = JSON.parse(savedPos);
        } else {
          this.position = { top: 20, right: 20 };
        }
      } catch (e) {
        this.position = { top: 20, right: 20 };
      }

      this._buildDOM(options.css || '');
      this._attachEvents();
    }

    _buildDOM(cssString) {
      this.host = document.createElement('div');
      this.host.id = 'astrepilot-root';
      this.host.style.all = 'initial';
      this.host.style.position = 'fixed';
      this.host.style.zIndex = '2147483647';
      
      this.shadow = this.host.attachShadow({ mode: 'closed' });
      
      const style = document.createElement('style');
      if (cssString) {
        style.textContent = cssString;
      } else {
        safeSendMessage({ action: 'GET_SHADOW_CSS' }, (res) => {
          if (res && res.css) {
            style.textContent = res.css;
          } else if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
            fetch(chrome.runtime.getURL('hud.shadow.css')).then(r => r.text()).then(t => style.textContent = t).catch(e => console.error(e));
          }
        });
      }
      this.shadow.appendChild(style);

      this.container = document.createElement('div');
      this.container.id = 'astrepilot-container';
      this.container.className = 'astrepilot-ui';
      this._applyPosition();
      
      // Card
      this.card = document.createElement('div');
      this.card.className = 'hud-card';
      
      this.header = document.createElement('div');
      this.header.className = 'hud-header';
      this.header.innerHTML = `
        <div class="hud-title">
          <div class="logo-icon">${ICONS.logo}</div>
          AstrePilot
        </div>
        <div class="hud-actions">
          <button type="button" class="icon-btn action-extract-jd" title="Extract JD to AstreWork" aria-label="Extract JD">${ICONS.scan}</button>
          <button type="button" class="icon-btn action-download-resume" title="Download Resume" aria-label="Download Resume">${ICONS.download}</button>
          <button type="button" class="icon-btn action-settings" title="Settings" aria-label="Settings">${ICONS.settings}</button>
          <button type="button" class="icon-btn action-collapse" title="Collapse (Esc)" aria-label="Collapse">${ICONS.minimize}</button>
          <button type="button" class="icon-btn action-close" title="Close" aria-label="Close">${ICONS.close}</button>
        </div>
      `;

      this.body = document.createElement('div');
      this.body.className = 'hud-body';
      
      this.card.appendChild(this.header);
      this.card.appendChild(this.body);

      // Pill
      this.pill = document.createElement('div');
      this.pill.className = 'hud-pill';
      this.pill.innerHTML = `
        <div class="pill-logo">${ICONS.logoLg}</div>
        <span>AstrePilot</span>
        <div class="pill-status">
          <div class="pulse"></div>
        </div>
      `;

      this.container.appendChild(this.card);
      this.container.appendChild(this.pill);
      this.shadow.appendChild(this.container);
      document.documentElement.appendChild(this.host);

      this._renderBody();
    }

    _applyPosition() {
      this.container.style.top = this.position.top + 'px';
      this.container.style.right = this.position.right + 'px';
    }

    _savePosition() {
      try {
        sessionStorage.setItem('ap-hud-pos', JSON.stringify(this.position));
      } catch (e) {}
    }

    _attachEvents() {
      // Buttons
      this.shadow.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) {
          const pill = e.target.closest('.hud-pill');
          if (pill) {
             // Only expand if we weren't just dragging
             if (!this.wasDragging) {
               this.expand();
             }
          }
          return;
        }
        
        e.preventDefault();
        e.stopPropagation();

        if (btn.classList.contains('action-close')) this.destroy();
        else if (btn.classList.contains('action-collapse')) this.collapse();
        else if (btn.classList.contains('action-settings')) {
          safeSendMessage({ type: "OPEN_OPTIONS" });
        }
        else if (btn.classList.contains('action-extract-jd')) {
          if (this.options.onExtractJD) this.options.onExtractJD();
        }
        else if (btn.classList.contains('action-download-resume')) {
          if (this.options.onDownloadResume) this.options.onDownloadResume();
        }
        else if (btn.classList.contains('action-fill')) {
          if (this.options.onAutofill) this.options.onAutofill();
        }
        else if (btn.classList.contains('action-next-step')) {
          if (this.options.onNextStep) this.options.onNextStep();
        }
        else if (btn.classList.contains('action-undo')) {
          if (this.options.onUndo) this.options.onUndo();
        }
        else if (btn.classList.contains('action-extract')) {
          if (this.options.onExtract) this.options.onExtract();
        }
        else if (btn.classList.contains('btn-copy-outreach')) {
          const noteText = btn.getAttribute('data-note') || '';
          if (noteText) {
            navigator.clipboard.writeText(noteText).then(() => {
              const original = btn.innerText;
              btn.innerText = '✓ Copied!';
              btn.style.background = 'var(--ap-success, #10b981)';
              setTimeout(() => {
                btn.innerText = original;
                btn.style.background = 'var(--ap-accent, #0071e3)';
              }, 2000);
            }).catch(() => {});
          }
        }
        else if (btn.classList.contains('action-sync-harvester')) {
          if (this.options.onSyncHarvester) this.options.onSyncHarvester();
        }
        else if (btn.classList.contains('action-confirm-submit')) {
          if (this.options.onConfirmSubmit) this.options.onConfirmSubmit(this.meta);
        }
        else if (btn.classList.contains('action-save-vault')) {
          const fieldId = btn.getAttribute('data-field-id');
          if (this.options.onSaveToVault) this.options.onSaveToVault(fieldId, btn);
        }
        else if (btn.classList.contains('action-dismiss-duplicate')) {
          this.duplicateAlert = null;
          this._renderBody();
        }
        else if (btn.classList.contains('action-reapply-anyway')) {
          this.duplicateAlert = null;
          this._renderBody();
          if (this.options.onReapply) this.options.onReapply();
        }
        else if (btn.classList.contains('action-force-lock-takeover')) {
          if (this.options.onForceLockTakeover) this.options.onForceLockTakeover();
        }
      });

      // Escape to collapse
      this._keydownHandler = (e) => {
        if (e.key === 'Escape' && !this.isCollapsed) {
          this.collapse();
        }
      };
      document.addEventListener('keydown', this._keydownHandler);

      // Dragging logic - attached to both header and pill
      const startDrag = (e) => {
        // Prevent drag on buttons inside header
        if (e.target.closest('button')) return;
        
        this.isDragging = true;
        this.wasDragging = false; // Reset dragging flag for click detection
        
        const rect = this.container.getBoundingClientRect();
        const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
        
        this.dragOffset.x = clientX - rect.right; // distance from right edge
        this.dragOffset.y = clientY - rect.top;
        
        document.addEventListener('mousemove', drag);
        document.addEventListener('touchmove', drag, { passive: false });
        document.addEventListener('mouseup', endDrag);
        document.addEventListener('touchend', endDrag);
      };

      const drag = (e) => {
        if (!this.isDragging) return;
        this.wasDragging = true; // User actually moved it
        e.preventDefault(); // prevent scrolling while dragging on touch
        
        const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
        
        let newTop = clientY - this.dragOffset.y;
        let newRight = clientX - this.dragOffset.x;
        
        // Clamp to viewport
        const maxTop = window.innerHeight - this.container.offsetHeight;
        const maxRight = window.innerWidth - this.container.offsetWidth;
        
        newTop = Math.max(0, Math.min(newTop, maxTop));
        newRight = window.innerWidth - newRight; // Convert back to right-aligned
        newRight = Math.max(0, Math.min(newRight, maxRight));
        
        this.position.top = newTop;
        this.position.right = newRight;
        this._applyPosition();
      };

      const endDrag = () => {
        if (!this.isDragging) return;
        this.isDragging = false;
        this._savePosition();
        
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('touchmove', drag);
        document.removeEventListener('mouseup', endDrag);
        document.removeEventListener('touchend', endDrag);
        
        // Clear wasDragging shortly after so click events can process
        setTimeout(() => { this.wasDragging = false; }, 100);
      };

      this._detachDrag = () => {
        this.isDragging = false;
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('touchmove', drag);
        document.removeEventListener('mouseup', endDrag);
        document.removeEventListener('touchend', endDrag);
      };

      this.header.addEventListener('mousedown', startDrag);
      this.header.addEventListener('touchstart', startDrag, { passive: true });
      this.pill.addEventListener('mousedown', startDrag);
      this.pill.addEventListener('touchstart', startDrag, { passive: true });
    }

    setState(state, meta = {}) {
      this.state = state;
      this.meta = meta;
      this._renderBody();
    }

    setAstraShield(data) {
      this.astraShield = data;
      this._renderBody();
    }

    setRecruiter(data) {
      this.recruiter = data;
      this._renderBody();
    }

    setHarvester(data) {
      this.harvester = data;
      this._renderBody();
    }

    setDuplicateAlert(data) {
      this.duplicateAlert = data;
      this._renderBody();
    }

    setRemoteLock(data) {
      this.remoteLock = data;
      this._renderBody();
    }

    clearRemoteLock() {
      this.remoteLock = null;
      this._renderBody();
    }

    setIdentity(profile) {
      this.profile = profile;
      this._renderBody();
    }

    setFields(fields) {
      this.fields = fields;
      this._renderBody();
    }

    markRow(id, status, displayValue) {
      const field = this.fields.find(f => f.id === id);
      if (field) {
        field.status = status; // 'active', 'done', 'skipped'
        if (displayValue !== undefined) field.preview = displayValue;
        this._renderFieldRow(field);
        this._updateSummary();
      }
    }

    updateField(field) {
      const existing = this.fields.find(f => f.id === field.id);
      if (existing) {
        Object.assign(existing, field);
        this._renderFieldRow(existing);
        this._updateSummary();
      }
    }

    setProgress(filled, total) {
      const fillEl = this.shadow.querySelector('.progress-fill');
      if (fillEl) {
        const pct = total > 0 ? (filled / total) * 100 : 0;
        fillEl.style.width = `${pct}%`;
      }
      const statusEl = this.shadow.querySelector('.pill-status');
      if (statusEl) {
         statusEl.innerHTML = `<span>${filled}/${total} ✓</span>`;
      }
    }

    setStepBadge(badge) {
      this.stepBadge = badge;
      const titleEl = this.shadow.querySelector('.hud-title');
      if (titleEl) {
        let badgeEl = titleEl.querySelector('.step-pill-badge');
        if (badge && badge.stepIndex != null) {
          if (!badgeEl) {
            badgeEl = document.createElement('span');
            badgeEl.className = 'step-pill-badge';
            badgeEl.style.cssText = 'font-size: 10px; font-weight: 700; color: var(--ap-ai, #0071e3); background: rgba(0, 113, 227, 0.12); padding: 2px 6px; border-radius: 9999px; margin-left: 6px; border: 1px solid rgba(0,113,227,0.2);';
            titleEl.appendChild(badgeEl);
          }
          badgeEl.textContent = `Step ${badge.stepIndex + 1}`;
          badgeEl.title = badge.stepName || '';
        } else if (badgeEl) {
          badgeEl.remove();
        }
      }
    }

    collapse() {
      this.isCollapsed = true;
      this.container.classList.add('mode-collapsed');
    }

    expand() {
      this.isCollapsed = false;
      this.container.classList.remove('mode-collapsed');
    }

    destroy() {
      if (this._detachDrag) this._detachDrag();
      document.removeEventListener('keydown', this._keydownHandler);
      if (this.host && this.host.parentNode) {
        this.host.parentNode.removeChild(this.host);
      }
      if (this.options.onClose) this.options.onClose();
    }

    _updateSummary() {
      const doneCount = this.fields.filter(f => f.status === 'done').length;
      this.setProgress(doneCount, this.fields.length);
    }

    _renderBody() {
      if (['not-connected', 'no-profile', 'extracting', 'error', 'transitioning'].includes(this.state)) {
        let msg = '', sub = '', btn = '';
        let iconHtml = ICONS.emptyGhost;
        let isError = false;

        if (this.state === 'not-connected') {
           msg = 'Not connected';
           sub = 'Please log in to AstreWork to continue.';
           btn = 'Open Settings';
        } else if (this.state === 'no-profile') {
           msg = 'Profile not found';
           sub = 'Set up your AstreWork profile first.';
           btn = 'Open AstreWork';
        } else if (this.state === 'extracting') {
           msg = 'Extracting Details...';
           sub = (this.meta && this.meta.step) ? this.meta.step : 'Scanning the document using AI...';
           btn = 'Extracting...';
           iconHtml = '<div class="pulse"></div>';
        } else if (this.state === 'transitioning') {
           msg = 'Loading Next Step...';
           sub = (this.meta && this.meta.step) ? this.meta.step : 'Watching for the next ATS form stage...';
           btn = 'Dismiss';
           iconHtml = '<div class="pulse"></div>';
        } else if (this.state === 'error') {
           msg = 'Action Failed';
           sub = (this.meta && this.meta.msg) ? this.meta.msg : 'Something went wrong.';
           btn = 'Dismiss';
           isError = true;
           iconHtml = ICONS.close;
        }

        const btnClass = (this.state === 'error' ? 'btn-secondary action-close' :
                         (this.state === 'extracting' || this.state === 'transitioning' ? 'btn-secondary action-close' : 'btn-primary action-settings'));

        this.body.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon ${isError ? 'error-icon' : ''}">${iconHtml}</div>
            <div style="font-weight: 600">${msg}</div>
            <div class="empty-text">${sub}</div>
            <button type="button" class="${btnClass}" ${this.state === 'extracting' ? 'disabled' : ''}>${btn}</button>
          </div>
        `;
        return;
      }

      let html = '';
      
      // Identity Card
      if (this.profile) {
        const initials = esc((this.profile.fullName || 'U').substring(0, 2).toUpperCase());
        const role = this.profile.title || 'Candidate';
        const primedHtml = this.profile.primedCompany ? 
          `<div class="primed-chip">${ICONS.sparkle} Primed for ${esc(this.profile.primedCompany)}</div>` : '';
          
        html += `
          <div class="identity-card">
            <div class="avatar">${initials}</div>
            <div class="identity-info">
              <div class="identity-name">${esc(this.profile.fullName)}</div>
              <div class="identity-role">${esc(role)}</div>
              ${primedHtml}
            </div>
          </div>
        `;
      }

      // Duplicate Application Pre-Flight Alert (Pillar E)
      if (this.duplicateAlert) {
        const daysAgoText = this.duplicateAlert.daysAgo === 0 ? 'Today' : `${this.duplicateAlert.daysAgo}d ago`;
        html += `
          <div class="duplicate-alert-card" style="margin-top: 10px; padding: 10px; background: rgba(245, 158, 11, 0.09); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 8px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #b45309; background: rgba(245,158,11,0.18); padding: 2px 6px; border-radius: 4px;">⚠️ Already Applied</span>
                <span style="font-weight: 700; font-size: 11px; color: var(--ap-ink, #0f172a);">${daysAgoText}</span>
              </div>
              <a href="https://astrework.app/applications" target="_blank" rel="noopener noreferrer" style="font-size: 11px; font-weight: 600; color: var(--ap-ai, #0071e3); text-decoration: none;">View Pipeline ↗</a>
            </div>
            <div style="font-size: 11px; color: var(--ap-ink-2, #475569); margin-top: 4px; line-height: 1.3;">
              Status: <b>${esc(this.duplicateAlert.status)}</b> · Submitted via ${esc(this.duplicateAlert.source || 'AstrePilot')}. Re-submitting may flag your profile as duplicate in employer ATS.
            </div>
            <div style="margin-top: 8px; display: flex; gap: 6px;">
              <button type="button" class="action-dismiss-duplicate" style="flex: 1; padding: 4px 8px; font-size: 10px; font-weight: 600; border-radius: 4px; border: 1px solid rgba(0,0,0,0.1); background: transparent; color: var(--ap-ink-2, #475569); cursor: pointer;">
                Dismiss Warning
              </button>
              <button type="button" class="action-reapply-anyway" style="flex: 1; padding: 4px 8px; font-size: 10px; font-weight: 600; border-radius: 4px; border: 1px solid rgba(245,158,11,0.4); background: rgba(245,158,11,0.15); color: #b45309; cursor: pointer;">
                Proceed Anyway
              </button>
            </div>
          </div>
        `;
      }

      // Active Fill Remote Lock Alert (Pillar E)
      if (this.remoteLock) {
        html += `
          <div class="remote-lock-card" style="margin-top: 10px; padding: 10px; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
              <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #dc2626; background: rgba(239,68,68,0.12); padding: 2px 6px; border-radius: 4px;">🔒 Lock Active (Tab #${esc(this.remoteLock.tabId)})</span>
              <span style="font-size: 10px; color: var(--ap-ink-3, #94a3b8);">Active Fill Running</span>
            </div>
            <div style="font-size: 11px; color: var(--ap-ink-2, #475569); margin-top: 4px; line-height: 1.3;">
              Another browser tab is actively filling this form to prevent race conditions.
            </div>
            <div style="margin-top: 8px;">
              <button type="button" class="action-force-lock-takeover" style="width: 100%; padding: 4px 8px; font-size: 10px; font-weight: 600; border-radius: 4px; border: 1px solid rgba(239,68,68,0.3); background: rgba(239,68,68,0.1); color: #dc2626; cursor: pointer;">
                Force Takeover Lock in This Tab
              </button>
            </div>
          </div>
        `;
      }

      // AstraShield Indicator
      if (this.astraShield) {
        const isSafe = this.astraShield.isLegit && this.astraShield.score >= 80;
        const isWarn = this.astraShield.score >= 40 && this.astraShield.score < 80;
        const shieldColor = isSafe ? 'var(--ap-success, #34d399)' : (isWarn ? 'var(--ap-warning, #fbbf24)' : 'var(--ap-error, #f87171)');
        const shieldIcon = isSafe ? ICONS.shield : (isWarn ? ICONS.warn : ICONS.close);
        const shieldLabel = isSafe ? 'Verified Legit' : (isWarn ? 'Caution' : 'Potential Scam');
        
        html += `
          <div style="margin-top: 12px; padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid ${shieldColor}; border-radius: 8px; display: flex; align-items: flex-start; gap: 8px;">
            <div style="color: ${shieldColor}; margin-top: 2px;">${shieldIcon}</div>
            <div>
              <div style="font-weight: 600; font-size: 13px; color: ${shieldColor};">AstraShield: ${shieldLabel} (${this.astraShield.score}/100)</div>
              <div style="font-size: 11px; color: var(--ap-text-muted, #9ca3af); margin-top: 4px; line-height: 1.3;">${esc(this.astraShield.reason)}</div>
            </div>
          </div>
        `;
      }

      // Recruiter Radar Indicator
      if (this.recruiter && (this.recruiter.name || this.recruiter.profileUrl)) {
        const recruiterName = this.recruiter.name || 'Hiring Lead';
        const recruiterTitle = this.recruiter.title || 'Technical Recruiter';
        const profileLink = this.recruiter.profileUrl;
        const note = this.recruiter.connectionNote || '';
        
        html += `
          <div class="recruiter-radar-card" style="margin-top: 10px; padding: 10px; background: rgba(0, 113, 227, 0.08); border: 1px solid rgba(0, 113, 227, 0.3); border-radius: 8px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ap-ai, #2563eb); background: rgba(37,99,235,0.12); padding: 2px 6px; border-radius: 4px;">🎯 Recruiter Radar</span>
                <span style="font-weight: 600; font-size: 12px; color: var(--ap-ink, #0f172a);">${esc(recruiterName)}</span>
              </div>
              ${profileLink ? `
                <a href="${esc(profileLink)}" target="_blank" rel="noopener noreferrer" style="font-size: 11px; font-weight: 600; color: var(--ap-ai, #2563eb); text-decoration: none; display: flex; align-items: center; gap: 3px;" title="Open Recruiter Profile">
                  Profile ↗
                </a>
              ` : ''}
            </div>
            <div style="font-size: 11px; color: var(--ap-ink-2, #475569); margin-top: 3px; line-height: 1.3;">${esc(recruiterTitle)}</div>
            ${note ? `
              <div style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between; gap: 6px; background: rgba(0,0,0,0.04); padding: 6px 8px; border-radius: 6px; border: 1px solid rgba(0,0,0,0.05);">
                <span style="font-size: 10px; color: var(--ap-ink-3, #94a3b8); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 170px;">Note: "${esc(note.slice(0, 30))}..."</span>
                <button type="button" class="btn-copy-outreach" data-note="${esc(note)}" style="padding: 3px 8px; font-size: 10px; font-weight: 600; border-radius: 4px; border: 1px solid rgba(0,0,0,0.1); background: var(--ap-ai, #2563eb); color: white; cursor: pointer; white-space: nowrap;">
                  Copy Note
                </button>
              </div>
            ` : ''}
          </div>
        `;
      }

      // Live Harvester Indicator (Wellfound / Jobright)
      const harvestCount = this.harvester ? (this.harvester.count || (this.harvester.jobs ? this.harvester.jobs.length : 0)) : 0;
      if (this.harvester && harvestCount > 0) {
        html += `
          <div class="harvester-card" style="margin-top: 10px; padding: 10px; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ap-success, #059669); background: rgba(5,150,105,0.12); padding: 2px 6px; border-radius: 4px;">✨ Harvester</span>
                <span style="font-weight: 600; font-size: 12px; color: var(--ap-ink, #0f172a);">${esc(this.harvester.source)}</span>
              </div>
              <span style="font-size: 11px; font-weight: 700; color: var(--ap-success, #059669);">${harvestCount} Roles Detected</span>
            </div>
            ${this.harvester.synced ? `
              <div style="margin-top: 8px; font-size: 11px; color: var(--ap-success, #059669); font-weight: 600;">
                ✓ Ingested ${this.harvester.inserted} new roles (${this.harvester.updated} updated) to Feed!
              </div>
            ` : `
              <div style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between; gap: 6px;">
                <span style="font-size: 10px; color: var(--ap-ink-2, #475569);">Sync directly into AstreWork Feed</span>
                <button type="button" class="action-sync-harvester" style="padding: 3px 8px; font-size: 10px; font-weight: 600; border-radius: 4px; border: 1px solid rgba(0,0,0,0.1); background: var(--ap-success, #059669); color: white; cursor: pointer; white-space: nowrap;">
                  Sync to Feed ⚡
                </button>
              </div>
            `}
          </div>
        `;
      }

      // Summary
      if (this.fields.length > 0) {
        const aiCount = this.fields.filter(f => f.source === 'ai').length;
        const instantCount = this.fields.length - aiCount;
        html += `
          <div>
            <div class="summary-line">
              <div class="status-indicator">
                ${this.state === 'filling' ? `<div class="pulse"></div> Filling...` :
                  this.state === 'done' ? `<span style="color:var(--ap-success)">✓ Done</span>` :
                  `<div class="pulse"></div> Ready to fill`}
              </div>
              <div>${this.fields.length} fields (${instantCount} instant · ${aiCount} AI)</div>
            </div>
            <div class="progress-track" style="margin-top:8px">
              <div class="progress-fill"></div>
            </div>
          </div>
        `;

        // Field List
        html += `<div class="field-list">`;
        html += this.fields.map(f => this._generateFieldRowHTML(f)).join('');
        html += `</div>`;
      } else if (this.state === 'no-fields') {
        const isPrimed = this.profile && this.profile.primedCompany;
        const msg = isPrimed ? 'Job Intelligence Primed' : 'Job Posting Detected';
        const sub = isPrimed ? 
          `Brain primed for ${esc(this.profile.primedCompany)}. Click below to navigate to the application form.` : 
          'AstrePilot can read this page and prime the brain.';
        html += `
          <div class="empty-state" style="margin-top: 10px;">
            <div class="empty-icon">${ICONS.emptyGhost}</div>
            <div style="font-weight: 600">${msg}</div>
            <div class="empty-text">${sub}</div>
            <button type="button" class="btn-primary action-extract">Apply This Role →</button>
          </div>
        `;
      }

      // Footer
      if (this.state === 'ready' || this.state === 'scanning' || this.state === 'done' || this.state === 'catalog' || this.state === 'step-complete') {
        html += `<div class="hud-footer">`;
        if (this.state === 'step-complete') {
          const meta = this.meta || {};
          const stepName = meta.stepName || 'Step';
          const stepNum = meta.stepIndex != null ? meta.stepIndex + 1 : 1;
          const filled = meta.stepFieldsFilled || 0;
          const cumFilled = meta.cumulativeFilled || filled;
          const cumTotal = meta.cumulativeTotal || filled;

          html += `
            <div style="background: rgba(0, 113, 227, 0.08); border: 1px solid rgba(0, 113, 227, 0.25); border-radius: 8px; padding: 10px; margin-bottom: 8px;">
              <div style="color: var(--ap-ai, #0071e3); font-weight: 700; font-size: 12px; display: flex; align-items: center; justify-content: space-between;">
                <span>✓ Step ${stepNum} Complete</span>
                <span style="font-size: 10px; background: rgba(0,113,227,0.15); padding: 2px 6px; border-radius: 4px;">${esc(stepName)}</span>
              </div>
              <div style="color: var(--ap-ink-2, #475569); font-size: 11px; margin-top: 4px;">
                ${filled} fields populated on this step · ${cumFilled} of ${cumTotal} cumulative.
              </div>
            </div>
            <button type="button" class="btn-primary action-next-step" style="background: var(--ap-ai, #0071e3); border-color: var(--ap-ai, #0071e3); color: white; margin-bottom: 6px; font-weight: 600;">
              Continue to Next Step →
            </button>
            <div style="display: flex; gap: 6px;">
              <button type="button" class="btn-secondary action-close" style="flex: 1;">Close</button>
              <button type="button" class="btn-secondary action-undo" style="flex: 1;">Undo Step</button>
            </div>
          `;
        } else if (this.state === 'done') {
          const isConfirmed = this.meta && this.meta.isConfirmed;
          if (isConfirmed) {
            html += `
              <div style="background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 10px; text-align: center; margin-bottom: 8px;">
                <div style="color: var(--ap-success, #10b981); font-weight: 700; font-size: 13px;">✓ Confirmed in AstreWork!</div>
                <div style="color: var(--ap-ink-2, #475569); font-size: 11px; margin-top: 2px;">Tracked with timestamp in your Application Table.</div>
              </div>
              <button class="btn-primary action-close">Close HUD</button>
            `;
          } else {
            html += `
              <div style="background: rgba(0, 113, 227, 0.08); border: 1px solid rgba(0, 113, 227, 0.2); border-radius: 8px; padding: 8px 10px; margin-bottom: 8px;">
                <div style="color: var(--ap-ai, #0071e3); font-weight: 700; font-size: 12px; display: flex; align-items: center; justify-content: space-between;">
                  <span>Form Filled (Draft Tracked)</span>
                  <a href="https://astrework.app/applications" target="_blank" rel="noopener noreferrer" style="color: var(--ap-ai, #0071e3); font-size: 11px; text-decoration: none; font-weight: 600;">View Tracker ↗</a>
                </div>
                <div style="color: var(--ap-ink-2, #475569); font-size: 10px; margin-top: 3px;">Review form fields on this page, then click below once submitted.</div>
              </div>
              <button class="btn-primary action-confirm-submit" style="background: var(--ap-success, #059669); border-color: var(--ap-success, #059669); color: white; margin-bottom: 6px;">
                🎉 Mark as Submitted
              </button>
              <div style="display: flex; gap: 6px;">
                <button class="btn-secondary action-close" style="flex: 1;">Close</button>
                <button class="btn-secondary action-undo" style="flex: 1;">Undo Fill</button>
              </div>
            `;
          }
        } else if (this.state === 'catalog') {
          const count = this.harvester ? (this.harvester.count || (this.harvester.jobs ? this.harvester.jobs.length : 0)) : 0;
          if (this.harvester && this.harvester.synced) {
            html += `<button class="btn-primary action-close">Done</button>`;
          } else {
            html += `
              <button class="btn-primary action-sync-harvester" style="background: var(--ap-success, #059669); border-color: var(--ap-success, #059669); color: white;">
                ${ICONS.sparkle} Sync ${count} Roles to AstreWork
              </button>
              <div class="footnote">Direct feed ingestion · Remote roles</div>
            `;
          }
        } else {
          const btnText = this.state === 'scanning' ? 'Scanning...' : `Autofill ${this.fields.length} fields`;
          html += `
            <button class="btn-primary action-fill" ${this.state==='scanning'?'disabled':''}>
              ${ICONS.fillAction} ${btnText}
            </button>
            <div class="footnote">Review before you submit · Alt⇧A</div>
          `;
        }
        html += `</div>`;
      }

      this.body.innerHTML = html;
      this._updateSummary();
    }

    _generateFieldRowHTML(f) {
      const icon = getIconForType(f.type);
      const isAI = f.source === 'ai';
      const isVault = f.source === 'vault';
      const label = esc(TYPE_LABELS[f.type] || f.label || 'Field');
      const val = esc(f.preview || '...');
      const classList = ['field-row'];
      if (isAI) classList.push('is-ai');
      if (isVault) classList.push('is-vault');
      if (f.status === 'active') classList.push('active');
      if (f.status === 'done') classList.push('done');
      if (f.status === 'retry') classList.push('is-retry');
      if (f.status === 'manual') classList.push('is-manual');
      if (f.status === 'skipped') classList.push('is-skipped');

      let statusIcon = ICONS.circle;
      if (f.status === 'done') statusIcon = ICONS.check;
      else if (f.status === 'retry') statusIcon = '<span style="color:#d97706;font-size:12px;font-weight:700" title="Proof-of-Write verification failed — check field">⚠</span>';
      else if (f.status === 'manual') statusIcon = '<span style="color:#d97706;font-size:12px;font-weight:700" title="Manual Entry or Saved in Vault">🔑</span>';
      else if (f.status === 'skipped') statusIcon = '<span style="color:#94a3b8;font-size:12px;font-weight:700">-</span>';
      else if (isVault) statusIcon = '🛡️';
      else if (isAI) statusIcon = ICONS.sparkle;

      const sourceBadge = isVault
        ? `<span class="vault-chip" style="display:inline-flex;margin:0 0 0 6px;background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd;font-size:10px;padding:1px 6px;border-radius:10px;font-weight:700">Vault ${f.confidence ? f.confidence + '%' : ''}</span>`
        : isAI
        ? `<span class="primed-chip" style="display:inline-flex;margin:0 0 0 6px">AI</span>`
        : '';

      const canSaveVault = (f.type === 'screening' || f.type === 'coverletter') && val && val !== '...';
      const saveVaultBtn = canSaveVault
        ? `<button type="button" class="action-save-vault" data-field-id="${f.id}" title="Save answer to your permanent Vault" style="background:rgba(0,113,227,0.08);border:1px solid rgba(0,113,227,0.2);cursor:pointer;font-size:10px;font-weight:600;color:var(--ap-ai, #0071e3);padding:2px 6px;border-radius:4px;margin-left:auto;display:inline-flex;align-items:center;gap:3px">💾 Save to Vault</button>`
        : '';

      return `
        <div class="${classList.join(' ')}" id="ap-row-${f.id}">
          <div class="field-icon">${icon}</div>
          <div class="field-content">
            <div class="field-header" style="display:flex;align-items:center;width:100%">
              <div class="field-label">${label} ${sourceBadge}</div>
              ${saveVaultBtn}
            </div>
            <div class="field-value">${val}</div>
          </div>
          <div class="field-status">${statusIcon}</div>
        </div>
      `;
    }

    _renderFieldRow(field) {
      const el = this.shadow.getElementById(`ap-row-${field.id}`);
      if (el) {
        el.outerHTML = this._generateFieldRowHTML(field);
      }
    }
  }

  return {
    mount: function(options) {
      return new HUD(options);
    },
    
    // Smooth typing animation for filling fields
    fillAnimated: function(inputEl, value, setNativeValue, onTick) {
      return new Promise((resolve) => {
        if (!value) return resolve();
        
        let i = 0;
        // Fast fill for short strings, chunked for long AI strings
        const chunkSize = value.length > 50 ? 5 : 1;
        const delay = value.length > 50 ? 5 : 15;
        
        const type = () => {
          if (i < value.length) {
            const nextChunk = value.substring(0, i + chunkSize);
            setNativeValue(inputEl, nextChunk, false);
            if (onTick) onTick();
            i += chunkSize;
            setTimeout(type, delay);
          } else {
            setNativeValue(inputEl, value, true);
            resolve();
          }
        };
        type();
      });
    },

    // Apply the host-page highlight ring
    highlight: function(inputEl) {
      inputEl.classList.remove('ap-field-done');
      inputEl.classList.add('ap-field-active');
      setTimeout(() => {
        inputEl.classList.remove('ap-field-active');
        inputEl.classList.add('ap-field-done');
        // Fade out done ring after a delay
        setTimeout(() => {
          inputEl.classList.remove('ap-field-done');
        }, 1200);
      }, 500);
    }
  };
})();
