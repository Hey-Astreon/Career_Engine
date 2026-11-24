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

  const SHADOW_CSS = `
:host {
  all: initial;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --sp-canvas: #ffffff;
  --sp-surface: #f8fafc;
  --sp-ink: #0f172a;
  --sp-ink-muted: #64748b;
  --sp-border: rgba(226, 232, 240, 0.8);
  --sp-blue: #2563eb;
  --sp-blue-hover: #1d4ed8;
  --sp-green: #10b981;
  --sp-amber: #f59e0b;
  --sp-red: #ef4444;
  --sp-shadow: 0 12px 32px -4px rgba(15, 23, 42, 0.16), 0 4px 12px -2px rgba(15, 23, 42, 0.08);
}

.sp-hud-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 360px;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--sp-border);
  border-radius: 16px;
  box-shadow: var(--sp-shadow);
  padding: 16px;
  box-sizing: border-box;
  pointer-events: auto;
  transition: box-shadow 0.2s ease, opacity 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 2147483647;
}

.sp-hud-container.is-dragging {
  cursor: grabbing !important;
  opacity: 0.92;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.22);
  user-select: none;
  transition: none !important;
}

.sp-hud-container.minimized {
  width: auto;
  padding: 8px 14px;
  cursor: pointer;
  border-radius: 30px;
}

.sp-hud-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: grab;
  user-select: none;
  padding-bottom: 2px;
}

.sp-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 13px;
  color: var(--sp-ink);
  letter-spacing: -0.01em;
}

.sp-drag-icon {
  color: var(--sp-ink-muted);
  font-size: 14px;
  opacity: 0.7;
  margin-right: 2px;
}

.sp-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  background: rgba(37, 99, 235, 0.08);
  color: var(--sp-blue);
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
}

.sp-badge.lecture {
  background: rgba(16, 185, 129, 0.1);
  color: var(--sp-green);
}

.sp-badge.review {
  background: rgba(245, 158, 11, 0.1);
  color: var(--sp-amber);
}

.sp-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--sp-green);
}

.sp-status-dot.busy {
  background: var(--sp-amber);
  animation: sp-pulse 1s infinite alternate;
}

@keyframes sp-pulse {
  from { opacity: 0.4; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1.1); }
}

.sp-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sp-btn-icon {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: var(--sp-ink-muted);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sp-btn-icon:hover {
  background: rgba(0, 0, 0, 0.05);
  color: var(--sp-ink);
}

.sp-course-info {
  background: var(--sp-surface);
  border: 1px solid var(--sp-border);
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sp-course-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--sp-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sp-course-subtitle {
  font-size: 11px;
  color: var(--sp-ink-muted);
}

.sp-next-preview {
  font-size: 11px;
  color: var(--sp-blue);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-top: 4px;
  border-top: 1px dashed var(--sp-border);
}

.sp-action-btn {
  width: 100%;
  padding: 10px 14px;
  background: var(--sp-blue);
  color: #ffffff;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: background 0.15s ease, transform 0.05s active;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
}

.sp-action-btn:hover {
  background: var(--sp-blue-hover);
}

.sp-action-btn:disabled {
  background: #94a3b8;
  cursor: not-allowed;
  box-shadow: none;
}

.sp-action-btn-secondary {
  width: 100%;
  padding: 8px 12px;
  background: var(--sp-surface);
  color: var(--sp-ink);
  border: 1px solid var(--sp-border);
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.15s ease;
}

.sp-action-btn-secondary:hover {
  background: #ffffff;
  border-color: var(--sp-blue);
  color: var(--sp-blue);
}

.sp-error-banner {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 11px;
  line-height: 1.3;
  display: flex;
  align-items: center;
  gap: 6px;
}

.sp-progress-bar-bg {
  width: 100%;
  height: 4px;
  background: rgba(226, 232, 240, 0.8);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 4px;
}

.sp-progress-bar-fill {
  height: 100%;
  background: var(--sp-green);
  width: 0%;
  transition: width 0.3s ease;
}

.sp-log-container {
  max-height: 140px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-right: 2px;
}

.sp-log-item {
  font-size: 11px;
  background: var(--sp-surface);
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sp-log-header {
  display: flex;
  justify-content: space-between;
  font-weight: 600;
  color: var(--sp-ink);
}

.sp-log-reason {
  color: var(--sp-ink-muted);
  font-size: 10.5px;
  line-height: 1.3;
}
`;

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

    mount() {
      // 1. Remove any previous instance cleanly to guarantee no duplicate ShadowRoot DOMException
      const existing = document.getElementById('studypilot-root');
      if (existing) {
        existing.remove();
      }

      this.host = document.createElement('div');
      this.host.id = 'studypilot-root';
      this.host.style.all = 'initial';
      this.host.style.position = 'fixed';
      this.host.style.zIndex = '2147483647';
      document.body.appendChild(this.host);

      this.shadow = this.host.attachShadow({ mode: 'closed' });

      // 2. Synchronous Instant Inlined CSS (Zero network dependency)
      const style = document.createElement('style');
      style.textContent = SHADOW_CSS;
      this.shadow.appendChild(style);

      this.container = document.createElement('div');
      this.container.className = 'sp-hud-container';
      this.shadow.appendChild(this.container);

      // 3. Restore previously dragged position if present
      this.restorePosition();

      this.render();
    }

    show() {
      if (!this.container) return;
      this.container.style.display = 'flex';
    }

    hide() {
      if (!this.container) return;
      this.container.style.display = 'none';
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
      this.data.hasMarkDoneBtn = Boolean(scanData.hasMarkDoneBtn);
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
      } else if (this.pageMode === 'quiz-view') {
        badgeText = 'Quiz Portal';
        badgeClass = 'sp-badge';
        subtitleText = 'Click to Launch Quiz Attempt';
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
          ${this.data.hasMarkDoneBtn ? `
            <button class="sp-action-btn" id="sp-mark-done-btn">
              <span>⚡ Mark Done & Next</span>
            </button>
          ` : ''}
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

        ${this.pageMode === 'quiz-view' && !isBusy ? `
          <button class="sp-action-btn" id="sp-attempt-btn">
            <span>⚡ Attempt Quiz</span>
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
        closeBtn.onclick = () => this.hide();
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

      const markDoneBtn = this.shadow.getElementById('sp-mark-done-btn');
      if (markDoneBtn) {
        markDoneBtn.onclick = () => {
          if (typeof window.__STUDYPILOT_MARK_DONE__ === 'function') {
            window.__STUDYPILOT_MARK_DONE__();
          }
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

      const attemptBtn = this.shadow.getElementById('sp-attempt-btn');
      if (attemptBtn) {
        attemptBtn.onclick = () => {
          if (typeof window.__STUDYPILOT_ATTEMPT_QUIZ__ === 'function') {
            window.__STUDYPILOT_ATTEMPT_QUIZ__();
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
