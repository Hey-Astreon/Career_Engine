/**
 * Agent 4: The Sentry (Physical Actuator, Submission & Pacing Guard)
 * -----------------------------------------------------------------
 * Safe DOM execution, humanized Gaussian delay generator,
 * checked-state verification, multi-stage submission lifecycle,
 * and lecture video completion.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.StudyPilotSentry = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function calculatePacingDelay(speedMode = 'humanized') {
    if (speedMode === 'instant') {
      return 100;
    }
    if (speedMode === 'ninja') {
      // 600ms - 1100ms
      return Math.round(600 + Math.random() * 500);
    }
    // Default Humanized: 1800ms - 3200ms (Gaussian jitter)
    const base = 2200;
    const jitter = (Math.random() - 0.5) * 1200;
    return Math.round(base + jitter);
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function actuateSelection(question, verifiedAnswer, speedMode = 'humanized') {
    const targetKey = verifiedAnswer.selectedKey.toLowerCase();
    const matchedOption = question.options.find(o => o.key.toLowerCase() === targetKey);

    if (!matchedOption || !matchedOption.inputElement) {
      console.warn(`[Sentry] Option '${targetKey}' not found in DOM for question ${question.id}`);
      return false;
    }

    const input = matchedOption.inputElement;
    const label = matchedOption.labelElement;

    // 1. Humanized Reading Pause
    const delay = calculatePacingDelay(speedMode);
    await sleep(delay);

    // 2. Scroll into view smoothly
    try {
      if (typeof input.scrollIntoView === 'function') {
        input.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } catch (e) {}

    // 3. 5-Step Synthetic Actuation Protocol
    try {
      if (typeof input.focus === 'function') {
        input.focus();
      }

      if (label && label !== input) {
        if (typeof MouseEvent !== 'undefined') {
          try {
            label.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
            label.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
          } catch (e) {}
        }
        if (typeof label.click === 'function') {
          label.click();
        }
      }

      input.checked = true;
      if (typeof Event !== 'undefined') {
        try {
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (e) {}
      }

      if (typeof input.blur === 'function') {
        input.blur();
      }

      // 4. Verification Check
      if (!input.checked && typeof input.click === 'function') {
        input.click(); // retry direct click if theme blocked synthetic change
      }

      return input.checked;
    } catch (err) {
      console.error(`[Sentry] Failed to actuate option '${targetKey}':`, err);
      return false;
    }
  }

  function findFinishAttemptButton(doc = document) {
    // 1. Direct standard Moodle / Boost selectors
    const directMatch = doc.querySelector(
      '#mod_quiz-next-nav, input[name="next"], button[name="next"], button.mod_quiz-next-nav, input[value*="Finish attempt" i], button[value*="Finish attempt" i], .submitbtns input, .submitbtns button'
    );
    if (directMatch) return directMatch;

    // 2. Text-content search across all buttons, inputs, and links
    const candidates = Array.from(doc.querySelectorAll('button, input[type="submit"], input[type="button"], a.endtestlink, a.btn'));
    for (const el of candidates) {
      const txt = (el.innerText || el.textContent || el.value || '').trim().toLowerCase();
      if (txt.includes('finish attempt') || txt.includes('next page') || txt.includes('next >') || txt.includes('next')) {
        return el;
      }
    }
    return null;
  }

  async function clickNextOrFinish(doc = document) {
    const submitBtn = findFinishAttemptButton(doc);

    if (submitBtn) {
      await sleep(1000);
      submitBtn.click();
      return true;
    }

    return false;
  }

  function findSummarySubmitButton(doc = document) {
    // 1. Standard summary.php submit buttons
    const direct = doc.querySelector(
      '.btn-finishattempt, input[value*="Submit all and finish" i], button[value*="Submit all and finish" i], .singlebutton input[type="submit"], .singlebutton button'
    );
    if (direct) return direct;

    const candidates = Array.from(doc.querySelectorAll('button, input[type="submit"], input[type="button"], a.btn'));
    for (const el of candidates) {
      const txt = (el.innerText || el.textContent || el.value || '').trim().toLowerCase();
      if (txt.includes('submit all and finish') || txt.includes('submit all')) {
        return el;
      }
    }
    return null;
  }

  async function confirmSubmitAllModal(doc = document) {
    // 1. Check for summary page 'Submit all and finish' button first
    const summaryBtn = findSummarySubmitButton(doc);
    if (summaryBtn) {
      await sleep(1000);
      summaryBtn.click();
      await sleep(1200);
    }

    // 2. Detect Moodle confirmation modal
    const modalBtn = doc.querySelector(
      '.moodle-dialogue-confirm input[value*="Submit all"], .modal-dialog button.btn-primary, button[data-action="save"], .modal-footer button.btn-primary'
    );

    if (modalBtn) {
      await sleep(1000);
      modalBtn.click();
      return true;
    }

    // Modal text fallback
    const modalButtons = Array.from(doc.querySelectorAll('.modal button, .moodle-dialogue input, div[role="dialog"] button'));
    for (const btn of modalButtons) {
      const txt = (btn.innerText || btn.textContent || btn.value || '').trim().toLowerCase();
      if (txt.includes('submit all and finish') || txt.includes('submit')) {
        await sleep(800);
        btn.click();
        return true;
      }
    }

    return false;
  }

  async function clickFinishReview(doc = document) {
    const finishLink = doc.querySelector('a.mod_quiz-finish-review, .finishreview a, a[href*="view.php?id="]');
    if (finishLink) {
      await sleep(1000);
      finishLink.click();
      return true;
    }

    const links = Array.from(doc.querySelectorAll('a, button'));
    for (const el of links) {
      const txt = (el.innerText || el.textContent || '').trim().toLowerCase();
      if (txt.includes('finish review') || txt.includes('back to course')) {
        await sleep(1000);
        el.click();
        return true;
      }
    }
    return false;
  }

  async function completeLectureVideo(doc = document) {
    const video = doc.querySelector('video');
    if (video) {
      try {
        video.currentTime = Math.max(0, (video.duration || 100) - 1);
        video.muted = true;
        const playPromise = video.play();
        if (playPromise && playPromise.then) {
          await playPromise;
        }
        await sleep(1000);
        return true;
      } catch (err) {
        console.warn('[Sentry] Could not fast-forward video:', err);
      }
    }
    return false;
  }

  return {
    calculatePacingDelay,
    actuateSelection,
    findFinishAttemptButton,
    clickNextOrFinish,
    findSummarySubmitButton,
    confirmSubmitAllModal,
    clickFinishReview,
    completeLectureVideo,
    sleep
  };
});
