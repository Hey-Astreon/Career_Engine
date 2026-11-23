/**
 * Stride StudyPilot Glassmorphic Mini-HUD
 * --------------------------------------
 * Closed Shadow DOM UI component providing non-intrusive status,
 * 1-click solve controls, lecture navigation, and live reasoning progress.
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
      this.state = 'idle'; // idle | scanning | solving | submitting | complete | error
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
      this.render();
    }

    addSolvedLog(logEntry) {
      this.data.logs.push(logEntry);
      this.render();
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
        <div class="sp-hud-header">
          <div class="sp-brand">
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
