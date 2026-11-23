/**
 * Stride StudyPilot Glassmorphic Mini-HUD
 * --------------------------------------
 * Closed Shadow DOM UI component providing non-intrusive status,
 * free viewport dragging, 1-click solve controls, and live reasoning progress.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.StudyPilotHUD = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class StudyPilotHUD {
    constructor() {
      this.host = null;
      this.shadow = null;
      this.container = null;
      this.isMinimized = false;
      this.isDragging = false;
      this.state = 'idle'; // idle | scanning | solving | submitting | complete | error
      this.errorMessage = '';
      this.pageMode = 'quiz-attempt'; // quiz-attempt | quiz-summary | quiz-review | lecture-page | course-home
      this.data = {
        courseTitle: 'Amity Online AMIGO',
        questionsCount: 0,
        isQuiz: false,
        solvedCount: 0,
        statusText: 'Ready',
        nextActivityTitle: '',
        nextActivityHref: '',
        hasVideo: false,
        logs: []
      };

      this._onDragMove = this._onDragMove.bind(this);
      this._onDragEnd = this._onDragEnd.bind(this);
    }

    async mount() {
      if (document.getElementById('studypilot-root')) {
        this.host = document.getElementById('studypilot-root');
      } else {
        this.host = document.createElement('div');
        this.host.id = 'studypilot-root';
        document.body.appendChild(this.host);
      }

      this.shadow = this.host.attachShadow({ mode: 'closed' });

      // Load Shadow CSS via Background Relayer
      const css = await new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ action: 'GET_SHADOW_CSS' }, (res) => {
            resolve(res && res.css ? res.css : '');
          });
        } else {
          resolve('');
        }
      });

      const style = document.createElement('style');
      style.textContent = css;
      this.shadow.appendChild(style);

      this.container = document.createElement('div');
      this.container.className = 'sp-hud-container';
      this.shadow.appendChild(this.container);

      // Restore previously dragged position if present
      this.restorePosition();

      this.render();
    }

    toggle() {
      if (!this.container) return;
      this.container.style.display = this.container.style.display === 'none' ? 'flex' : 'none';
    }

    updateScanResult(scanData) {
      this.data.courseTitle = scanData.courseTitle || this.data.courseTitle;
      this.data.questionsCount = scanData.questionsCount || 0;
      this.data.isQuiz = scanData.isQuiz || false;
      this.pageMode = scanData.pageMode || this.pageMode;
      this.data.nextActivityTitle = scanData.nextActivityTitle || '';
      this.data.nextActivityHref = scanData.nextActivityHref || '';
      this.data.hasVideo = Boolean(scanData.hasVideo);
      this.render();
    }

    setState(newState, payload = {}) {
      this.state = newState;
      if (payload.statusText) this.data.statusText = payload.statusText;
      if (typeof payload.current !== 'undefined') this.data.solvedCount = payload.current;
      if (payload.error) this.errorMessage = payload.error;
      this.render();
    }

    addSolvedLog(logEntry) {
      this.data.logs.push(logEntry);
      this.render();
    }

    // Draggable Implementation
    initDrag(headerEl) {
      if (!headerEl || !this.container) return;

      headerEl.onmousedown = (e) => {
        // Ignore clicks on control buttons
        if (e.target.closest('.sp-controls') || e.target.closest('button')) return;

        this.isDragging = true;
        this.container.classList.add('is-dragging');

        const rect = this.container.getBoundingClientRect();
        this.dragOffsetX = e.clientX - rect.left;
        this.dragOffsetY = e.clientY - rect.top;

        document.addEventListener('mousemove', this._onDragMove);
        document.addEventListener('mouseup', this._onDragEnd);
        e.preventDefault();
      };
    }

    _onDragMove(e) {
      if (!this.isDragging || !this.container) return;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const rect = this.container.getBoundingClientRect();

      let newLeft = e.clientX - this.dragOffsetX;
      let newTop = e.clientY - this.dragOffsetY;

      // Viewport bounds safety
      newLeft = Math.max(10, Math.min(newLeft, viewportWidth - rect.width - 10));
      newTop = Math.max(10, Math.min(newTop, viewportHeight - rect.height - 10));

      this.container.style.left = `${newLeft}px`;
      this.container.style.top = `${newTop}px`;
      this.container.style.right = 'auto';
      this.container.style.bottom = 'auto';
    }

    _onDragEnd() {
      if (!this.isDragging) return;
      this.isDragging = false;
      if (this.container) {
        this.container.classList.remove('is-dragging');
        try {
          sessionStorage.setItem('sp_hud_left', this.container.style.left);
          sessionStorage.setItem('sp_hud_top', this.container.style.top);
        } catch (e) {}
      }

      document.removeEventListener('mousemove', this._onDragMove);
      document.removeEventListener('mouseup', this._onDragEnd);
    }

    restorePosition() {
      if (!this.container) return;
      try {
        const savedLeft = sessionStorage.getItem('sp_hud_left');
        const savedTop = sessionStorage.getItem('sp_hud_top');
        if (savedLeft && savedTop) {
          this.container.style.left = savedLeft;
          this.container.style.top = savedTop;
          this.container.style.right = 'auto';
          this.container.style.bottom = 'auto';
        }
      } catch (e) {}
    }

    render() {
      if (!this.container) return;

      const isBusy = this.state === 'solving' || this.state === 'submitting';
      const pct = this.data.questionsCount > 0 ? Math.round((this.data.solvedCount / this.data.questionsCount) * 100) : 0;

      let badgeText = '4-Agent Swarm';
      let badgeClass = 'sp-badge';
      let subtitleText = '';

      if (this.pageMode === 'lecture-page') {
        badgeText = 'Lecture Mode';
        badgeClass = 'sp-badge lecture';
        subtitleText = this.data.hasVideo ? 'E-Tutorial Video Detected' : 'Course Reading Material';
      } else if (this.pageMode === 'quiz-summary') {
        badgeText = 'Quiz Summary';
        badgeClass = 'sp-badge review';
        subtitleText = 'Ready for Final Submission';
      } else if (this.pageMode === 'quiz-review') {
        badgeText = 'Quiz Complete';
        badgeClass = 'sp-badge review';
        subtitleText = '100% Score Verified';
      } else {
        subtitleText = this.data.questionsCount > 0 ? `${this.data.questionsCount} Questions Detected` : 'No Active Quiz on Page';
      }

      this.container.innerHTML = `
        <div class="sp-hud-header" id="sp-hud-header" title="Drag to move StudyPilot anywhere on screen">
          <div class="sp-brand">
            <span class="sp-drag-icon">⠿</span>
            <span class="sp-status-dot ${isBusy ? 'busy' : ''}"></span>
            <span>StudyPilot</span>
            <span class="${badgeClass}">${badgeText}</span>
          </div>
          <div class="sp-controls">
            <button class="sp-btn-icon" id="sp-close-btn" title="Close HUD">✕</button>
          </div>
        </div>

        <div class="sp-course-info">
          <div class="sp-course-title" title="${this.escapeHtml(this.data.courseTitle)}">${this.escapeHtml(this.data.courseTitle)}</div>
          <div class="sp-course-subtitle">${subtitleText}</div>
          ${this.data.nextActivityTitle ? `
            <div class="sp-next-preview" title="Next: ${this.escapeHtml(this.data.nextActivityTitle)}">
              Next: ${this.escapeHtml(this.data.nextActivityTitle)}
            </div>
          ` : ''}
        </div>

        ${this.state === 'error' ? `
          <div class="sp-error-banner">
            <span>⚠️ ${this.escapeHtml(this.errorMessage || 'Error occurred while solving.')}</span>
          </div>
        ` : ''}

        ${isBusy ? `
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--sp-ink-muted);">
              <span>${this.escapeHtml(this.data.statusText)}</span>
              <span>${pct}%</span>
            </div>
            <div class="sp-progress-bar-bg">
              <div class="sp-progress-bar-fill" style="width: ${pct}%;"></div>
            </div>
          </div>
        ` : ''}

        ${this.pageMode === 'quiz-attempt' && this.data.questionsCount > 0 && !isBusy ? `
          <button class="sp-action-btn" id="sp-solve-btn">
            <span>⚡ Auto-Solve (${this.data.questionsCount} Qs)</span>
          </button>
        ` : ''}

        ${this.pageMode === 'lecture-page' && !isBusy ? `
          ${this.data.hasVideo ? `
            <button class="sp-action-btn" id="sp-complete-video-btn">
              <span>⚡ Complete Video & Next</span>
            </button>
          ` : ''}
          ${this.data.nextActivityTitle ? `
            <button class="sp-action-btn-secondary" id="sp-next-btn">
              <span>▶ Advance to Next Topic</span>
            </button>
          ` : ''}
        ` : ''}

        ${this.pageMode === 'quiz-summary' && !isBusy ? `
          <button class="sp-action-btn" id="sp-submit-summary-btn">
            <span>⚡ Submit All & Finish</span>
          </button>
        ` : ''}

        ${this.pageMode === 'quiz-review' && !isBusy ? `
          <button class="sp-action-btn" id="sp-next-btn">
            <span>▶ Proceed to Next Topic</span>
          </button>
        ` : ''}

        ${this.data.logs.length > 0 ? `
          <div class="sp-log-container">
            ${this.data.logs.map(log => `
              <div class="sp-log-item">
                <div class="sp-log-header">
                  <span>Q${log.questionNumber} Answer: (${log.selectedKey})</span>
                  <span style="font-size: 10px; color: var(--sp-green);">${log.engine || 'Consensus'}</span>
                </div>
                <div class="sp-log-reason">${this.escapeHtml(log.reasoning)}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      `;

      // Wire Event Listeners
      const headerEl = this.shadow.getElementById('sp-hud-header');
      if (headerEl) {
        this.initDrag(headerEl);
      }

      const closeBtn = this.shadow.getElementById('sp-close-btn');
      if (closeBtn) {
        closeBtn.onclick = () => this.toggle();
      }

      const solveBtn = this.shadow.getElementById('sp-solve-btn');
      if (solveBtn) {
        solveBtn.onclick = () => {
          chrome.storage.sync.get(['sp_speed_mode', 'sp_auto_submit', 'sp_auto_advance', 'sp_groq_key', 'sp_gemini_key'], (res) => {
            const config = {
              speedMode: (res && res.sp_speed_mode) || 'humanized',
              autoSubmit: res && res.sp_auto_submit === true,
              autoAdvance: res && res.sp_auto_advance === true,
              groqApiKey: res && res.sp_groq_key,
              geminiApiKey: res && res.sp_gemini_key
            };
            if (typeof window.__STUDYPILOT_AUTO_SOLVE__ === 'function') {
              window.__STUDYPILOT_AUTO_SOLVE__(config);
            }
          });
        };
      }

      const videoBtn = this.shadow.getElementById('sp-complete-video-btn');
      if (videoBtn) {
        videoBtn.onclick = () => {
          if (typeof window.__STUDYPILOT_COMPLETE_VIDEO__ === 'function') {
            window.__STUDYPILOT_COMPLETE_VIDEO__();
          }
        };
      }

      const nextBtn = this.shadow.getElementById('sp-next-btn');
      if (nextBtn) {
        nextBtn.onclick = () => {
          if (typeof window.__STUDYPILOT_NAVIGATE_NEXT__ === 'function') {
            window.__STUDYPILOT_NAVIGATE_NEXT__();
          }
        };
      }

      const summaryBtn = this.shadow.getElementById('sp-submit-summary-btn');
      if (summaryBtn) {
        summaryBtn.onclick = () => {
          if (typeof window.__STUDYPILOT_SUBMIT_SUMMARY__ === 'function') {
            window.__STUDYPILOT_SUBMIT_SUMMARY__();
          }
        };
      }
    }

    escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
  }

  return StudyPilotHUD;
});
