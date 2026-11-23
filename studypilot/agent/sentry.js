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
    if (directMatch) {
      const txt = (directMatch.innerText || directMatch.textContent || directMatch.value || '').trim().toLowerCase();
      if (!txt.includes('previous') && !txt.includes('back')) {
        return directMatch;
      }
    }

    // 2. Text-content search across all buttons, inputs, and links
    const candidates = Array.from(doc.querySelectorAll('button, input[type="submit"], input[type="button"], a.endtestlink, a.btn'));
    for (const el of candidates) {
      const txt = (el.innerText || el.textContent || el.value || '').trim().toLowerCase();
      if (txt.includes('previous') || txt.includes('back')) {
        continue;
      }
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
    // Strategy 1: Target the canonical form that posts to processattempt.php
    // In Moodle summary.php, "Return to attempt" points to attempt.php, whereas "Submit all and finish" points to processattempt.php!
    const processForm = doc.querySelector('form[action*="processattempt.php"]');
    if (processForm) {
      const submitBtn = processForm.querySelector('button[type="submit"], input[type="submit"], button, input');
      if (submitBtn) return submitBtn;
    }

    // Strategy 2: Explicit selectors matching "Submit all and finish"
    const explicitCandidates = Array.from(
      doc.querySelectorAll('.btn-finishattempt, input[value*="Submit all and finish" i], button[value*="Submit all and finish" i]')
    );
    for (const el of explicitCandidates) {
      const txt = (el.innerText || el.textContent || el.value || '').trim().toLowerCase();
      if (!txt.includes('return') && !txt.includes('back') && !txt.includes('cancel')) {
        return el;
      }
    }

    // Strategy 3: Text search across all buttons & inputs, STRICTLY filtering out any return/back/cancel buttons
    const candidates = Array.from(doc.querySelectorAll('button, input[type="submit"], input[type="button"], a.btn'));
    for (const el of candidates) {
      const txt = (el.innerText || el.textContent || el.value || '').trim().toLowerCase();
      if (txt.includes('return') || txt.includes('back') || txt.includes('cancel')) {
        continue; // REJECT: this avoids the "Return to attempt" trap
      }
      if (txt.includes('submit all and finish') || txt.includes('submit all') || txt.includes('finish and submit')) {
        return el;
      }
    }

    // Strategy 4: Fallback inside .singlebutton or .submitbtns, ensuring it is NOT return/back
    const fallbackBtns = Array.from(
      doc.querySelectorAll('.singlebutton button, .singlebutton input[type="submit"], .submitbtns button, .submitbtns input')
    );
    for (const btn of fallbackBtns) {
      const txt = (btn.innerText || btn.textContent || btn.value || '').trim().toLowerCase();
      if (txt.includes('return') || txt.includes('back') || txt.includes('cancel')) {
        continue;
      }
      if (btn.classList && (btn.classList.contains('btn-primary') || btn.classList.contains('btn-finishattempt'))) {
        return btn;
      }
      if (txt.includes('submit') || txt.includes('finish')) {
        return btn;
      }
    }

    return null;
  }

  async function confirmSubmitAllModal(doc = document) {
    // 1. If summary submit button is on page, click it to trigger modal dialog
    const summaryBtn = findSummarySubmitButton(doc);
    if (summaryBtn) {
      await sleep(600);
      summaryBtn.click();
    }

    // 2. Poll for Moodle confirmation dialog up to 5 seconds (200ms ticks)
    const startTime = Date.now();
    const maxWaitMs = 5000;

    while (Date.now() - startTime < maxWaitMs) {
      await sleep(200);

      // Check modal containers: Boost modal, YUI dialogue, or generic dialog
      const modal = doc.querySelector(
        '.moodle-dialogue-confirm, .modal.show, div[role="dialog"], .moodle-dialogue, .modal-dialog'
      );

      // Search within modal container if present, otherwise across doc
      const searchRoot = modal || doc;
      const modalBtns = Array.from(
        searchRoot.querySelectorAll(
          'button.btn-primary, input.btn-primary, button[data-action="save"], button[data-action="confirm"], .confirmation-buttons input, button[type="submit"], input[type="submit"], button'
        )
      );

      for (const btn of modalBtns) {
        const txt = (btn.innerText || btn.textContent || btn.value || '').trim().toLowerCase();
        // Strictly ignore cancel / close / dismiss / secondary buttons
        if (txt.includes('cancel') || txt.includes('close') || txt.includes('dismiss') || txt.includes('return')) {
          continue;
        }

        const isSaveAction = btn.getAttribute('data-action') === 'save' || btn.getAttribute('data-action') === 'confirm';
        const isPrimary = btn.classList && btn.classList.contains('btn-primary');
        const hasSubmitText = txt.includes('submit all') || txt.includes('submit') || txt.includes('finish');

        if (isSaveAction || (isPrimary && hasSubmitText) || hasSubmitText) {
          await sleep(400);
          btn.click();
          return true;
        }
      }
    }

    return false;
  }

  async function clickFinishReview(doc = document) {
    // 1. Specific Moodle review finish link
    const finishLink = doc.querySelector('a.mod_quiz-finish-review, .finishreview a, .mod_quiz-next-nav');
    if (finishLink) {
      const txt = (finishLink.innerText || finishLink.textContent || '').trim().toLowerCase();
      if (!txt.includes('return') && !txt.includes('back')) {
        await sleep(1000);
        finishLink.click();
        return true;
      }
    }

    // 2. Text search for Finish review
    const links = Array.from(doc.querySelectorAll('a, button, input[type="button"], input[type="submit"]'));
    for (const el of links) {
      const txt = (el.innerText || el.textContent || el.value || '').trim().toLowerCase();
      if (txt.includes('finish review')) {
        await sleep(1000);
        el.click();
        return true;
      }
    }

    // 3. Fallback: Course link
    for (const el of links) {
      const txt = (el.innerText || el.textContent || el.value || '').trim().toLowerCase();
      if (txt.includes('back to course') || txt.includes('return to course')) {
        await sleep(1000);
        el.click();
        return true;
      }
    }

    return false;
  }

  async function clickAttemptQuiz(doc = document) {
    // Direct attempt quiz button on mod/quiz/view.php
    const directBtn = doc.querySelector(
      'input[value*="Attempt quiz" i], button[value*="Attempt quiz" i], input[value*="Continue the last attempt" i], button[value*="Continue the last attempt" i], input[value*="Re-attempt quiz" i], button[value*="Re-attempt quiz" i], form[action*="attempt.php"] button, form[action*="attempt.php"] input[type="submit"], .quizattempt a, .quizstartbutton input'
    );
    if (directBtn) {
      await sleep(600);
      directBtn.click();
      return true;
    }

    const candidates = Array.from(doc.querySelectorAll('button, input[type="submit"], a.btn'));
    for (const el of candidates) {
      const txt = (el.innerText || el.textContent || el.value || '').trim().toLowerCase();
      if (txt.includes('attempt quiz') || txt.includes('re-attempt quiz') || txt.includes('continue the last attempt')) {
        await sleep(600);
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
    clickAttemptQuiz,
    completeLectureVideo,
    sleep
  };
});
