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

      // Step 3a: Direct click on radio input (triggers Moodle's native answer-saved listener)
      if (typeof input.click === 'function') {
        try {
          input.click();
        } catch (e) {}
      }

      // Step 3b: Also click label for UI styling & custom theme animations
      if (label && label !== input) {
        if (typeof MouseEvent !== 'undefined') {
          try {
            label.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
            label.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
          } catch (e) {}
        }
        if (typeof label.click === 'function') {
          try {
            label.click();
          } catch (e) {}
        }
      }

      // Step 3c: Hard guarantee checked state
      input.checked = true;

      // Step 3d: Dispatch synthetic input & change events for AJAX persistence
      if (typeof Event !== 'undefined') {
        try {
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (e) {}
      }

      if (typeof input.blur === 'function') {
        input.blur();
      }

      // Step 3e: Final verification check
      if (!input.checked && typeof input.click === 'function') {
        try { input.click(); } catch (e) {}
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
    if (processForm && typeof processForm.querySelector === 'function') {
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

  function findModalSubmitButton(doc = document, summaryBtn = null) {
    // 1. Search inside any modal container first
    const modalContainers = Array.from(
      doc.querySelectorAll(
        '.modal, .modal-dialog, .modal-content, [role="dialog"], [aria-modal="true"], .moodle-dialogue, .moodle-dialogue-confirm, .moodle-has-zindex'
      )
    );

    for (const container of modalContainers) {
      const modalBtns = Array.from(
        container.querySelectorAll(
          'button, input[type="button"], input[type="submit"], a.btn'
        )
      );

      for (const btn of modalBtns) {
        if (summaryBtn && btn === summaryBtn) continue; // NEVER match the page's summary button

        const txt = (btn.innerText || btn.textContent || btn.value || '').trim().toLowerCase();
        if (txt.includes('cancel') || txt.includes('close') || txt.includes('dismiss') || txt === '✕' || txt === 'x') {
          continue;
        }

        const isSaveAction = btn.getAttribute('data-action') === 'save' || btn.getAttribute('data-action') === 'confirm';
        const isPrimary = btn.classList && btn.classList.contains('btn-primary');
        const hasSubmitText = txt.includes('submit all') || txt.includes('submit') || txt.includes('finish');

        if (isSaveAction || (isPrimary && hasSubmitText) || hasSubmitText) {
          return btn;
        }
      }
    }

    // 2. Direct search by data-action or modal button classes
    const directCandidates = Array.from(
      doc.querySelectorAll(
        'button[data-action="save"], button[data-action="confirm"], .modal-footer button.btn-primary, .modal-dialog button.btn-primary, .confirmation-buttons input.btn-primary'
      )
    );
    for (const btn of directCandidates) {
      if (summaryBtn && btn === summaryBtn) continue;
      const txt = (btn.innerText || btn.textContent || btn.value || '').trim().toLowerCase();
      if (!txt.includes('cancel') && !txt.includes('close') && !txt.includes('dismiss')) {
        return btn;
      }
    }

    // 3. Fallback: Search all buttons in document that have text "submit all and finish" but are NOT inside the page form
    const allButtons = Array.from(doc.querySelectorAll('button, input[type="button"], input[type="submit"]'));
    for (const btn of allButtons) {
      if (summaryBtn && btn === summaryBtn) continue;
      if (btn.closest && (btn.closest('form[action*="attempt.php"]') || btn.closest('.submitbtns') || btn.closest('.singlebutton'))) {
        continue; // Skip buttons belonging to the background page layout
      }
      const txt = (btn.innerText || btn.textContent || btn.value || '').trim().toLowerCase();
      if (txt.includes('cancel') || txt.includes('close')) continue;
      if (txt.includes('submit all and finish') || txt.includes('submit all')) {
        return btn;
      }
    }

    return null;
  }

  async function confirmSubmitAllModal(doc = document) {
    // Check if the modal dialog is ALREADY open on screen right now
    let modalBtn = findModalSubmitButton(doc, null);

    // If modal is NOT already open, find and click the summary page's "Submit all and finish" button
    const summaryBtn = findSummarySubmitButton(doc);
    if (!modalBtn && summaryBtn) {
      await sleep(500);
      try {
        summaryBtn.focus();
        summaryBtn.click();
      } catch (e) {
        summaryBtn.click();
      }
    }

    // Poll for the confirmation modal button up to 5 seconds (200ms ticks)
    const startTime = Date.now();
    const maxWaitMs = 5000;

    while (Date.now() - startTime < maxWaitMs) {
      modalBtn = findModalSubmitButton(doc, summaryBtn);

      if (modalBtn) {
        await sleep(350);

        // 1. Synthetic actuation on the modal button (Strict Single-Submission Guard)
        let submitted = false;
        try {
          if (typeof modalBtn.focus === 'function') modalBtn.focus();
          if (typeof MouseEvent !== 'undefined') {
            modalBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
            modalBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
          }
          modalBtn.click();
          submitted = true;
        } catch (e) {
          try { modalBtn.click(); submitted = true; } catch (err) {}
        }

        // 2. Direct Form Submission ONLY as fallback if modal click threw or failed
        // Strictly prevents double-submission into processattempt.php
        if (!submitted) {
          const processForm = doc.querySelector('form[action*="processattempt.php"]');
          if (processForm) {
            try {
              if (typeof processForm.requestSubmit === 'function') {
                processForm.requestSubmit();
              } else if (typeof processForm.submit === 'function') {
                processForm.submit();
              }
            } catch (e) {
              try { processForm.submit(); } catch (err) {}
            }
          }
        }

        return true;
      }

      await sleep(200);
    }

    // 3. Ultimate Loophole / Fallback: If modal never appeared but processForm exists, submit directly!
    const processForm = doc.querySelector('form[action*="processattempt.php"]');
    if (processForm) {
      try {
        if (typeof processForm.requestSubmit === 'function') {
          processForm.requestSubmit();
        } else {
          processForm.submit();
        }
        return true;
      } catch (e) {}
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

  function findModalStartAttemptButton(doc = document) {
    // 1. Search inside any modal dialogue container (Moodle Timed Quiz Dialog)
    const modalContainers = Array.from(
      doc.querySelectorAll('.modal, .modal-dialog, .modal-content, [role="dialog"], [aria-modal="true"], .moodle-dialogue, .moodle-dialogue-confirm')
    );

    for (const container of modalContainers) {
      if (!container || typeof container.querySelectorAll !== 'function') continue;
      const modalBtns = Array.from(
        container.querySelectorAll('button, input[type="submit"], input[type="button"], a.btn')
      );

      for (const btn of modalBtns) {
        const txt = (btn.innerText || btn.textContent || btn.value || '').trim().toLowerCase();
        if (txt.includes('cancel') || txt.includes('close') || txt.includes('dismiss')) {
          continue;
        }
        if (txt.includes('start attempt') || txt.includes('start') || btn.getAttribute('data-action') === 'save') {
          return btn;
        }
      }
    }

    // 2. Direct search across document for "Start attempt" buttons inside modals or forms
    const candidates = Array.from(
      doc.querySelectorAll('button.btn-primary, input.btn-primary, input[value*="Start attempt" i], button[value*="Start attempt" i], input[value="Start attempt"]')
    );
    for (const btn of candidates) {
      const txt = (btn.innerText || btn.textContent || btn.value || '').trim().toLowerCase();
      if (!txt.includes('cancel') && (txt.includes('start attempt') || txt.includes('start'))) {
        return btn;
      }
    }

    return null;
  }

  function findAttemptOrReattemptButton(doc = document) {
    // 0. Priority: If a "Start attempt" modal is ALREADY OPEN on screen, prioritize it!
    const modalStartBtn = findModalStartAttemptButton(doc);
    if (modalStartBtn) return modalStartBtn;

    const directBtn = doc.querySelector(
      'input[value*="Re-attempt" i], input[value*="Attempt quiz" i], input[value*="Continue the last attempt" i], input[value*="Start attempt" i], form[action*="startattempt.php"] button, form[action*="startattempt.php"] input[type="submit"], form[action*="attempt.php"] button, form[action*="attempt.php"] input[type="submit"], .quizattempt a, .quizstartbutton input'
    );
    if (directBtn) {
      const txt = (directBtn.innerText || directBtn.textContent || directBtn.value || '').trim().toLowerCase();
      if (!txt.includes('cancel') && !txt.includes('close') && !txt.includes('review')) {
        return directBtn;
      }
    }

    const candidates = Array.from(doc.querySelectorAll('button, input[type="submit"], input[type="button"], a.btn, a[href*="attempt.php"]'));
    for (const el of candidates) {
      const txt = (el.innerText || el.textContent || el.value || '').trim().toLowerCase();
      if (txt.includes('cancel') || txt.includes('close') || txt.includes('review')) continue;
      if (txt.includes('start attempt') || txt.includes('re-attempt') || txt.includes('attempt quiz') || txt.includes('continue the last attempt')) {
        return el;
      }
    }
    return null;
  }

  async function clickAttemptQuiz(doc = document) {
    // 1. If "Start attempt" timed modal is already open right now, confirm it immediately!
    let modalBtn = findModalStartAttemptButton(doc);
    if (modalBtn) {
      await sleep(350);
      try {
        if (typeof modalBtn.focus === 'function') modalBtn.focus();
        if (typeof MouseEvent !== 'undefined') {
          modalBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
          modalBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
        }
        modalBtn.click();
      } catch (e) {
        try { modalBtn.click(); } catch (err) {}
      }
      return true;
    }

    // 2. Otherwise find and click the page attempt/re-attempt button
    const directBtn = findAttemptOrReattemptButton(doc);
    if (directBtn) {
      await sleep(600);
      try {
        if (typeof directBtn.focus === 'function') directBtn.focus();
        if (typeof MouseEvent !== 'undefined') {
          directBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
          directBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
        }
        directBtn.click();

        // 2b. Form Submission Fallback:
        // In Moodle, 'Re-attempt quiz' is a submit button inside a form pointing to startattempt.php.
        // If programmatic .click() is ignored by the browser, invoke requestSubmit() or submit() directly!
        const form = directBtn.form || (typeof directBtn.closest === 'function' ? directBtn.closest('form') : null);
        if (form) {
          if (typeof form.requestSubmit === 'function') {
            try { form.requestSubmit(directBtn); } catch (e) { form.submit(); }
          } else if (typeof form.submit === 'function') {
            form.submit();
          }
        } else if (directBtn.tagName === 'A' && directBtn.href && typeof window !== 'undefined') {
          window.location.href = directBtn.href;
        }
      } catch (e) {
        try { directBtn.click(); } catch (err) {}
      }

      // 3. Timed Quiz Modal Watcher:
      // In Moodle timed assessments (e.g. 1st Module Assessment with 1 hour limit),
      // clicking "Attempt quiz" / "Re-attempt quiz" pops up a "Start attempt" modal!
      // Poll up to 3.5 seconds (150ms ticks) for the modal to appear and auto-confirm it!
      const startTime = Date.now();
      const maxWaitMs = 3500;

      while (Date.now() - startTime < maxWaitMs) {
        await sleep(100);
        modalBtn = findModalStartAttemptButton(doc);
        if (modalBtn && modalBtn !== directBtn) {
          await sleep(250);
          try {
            if (typeof modalBtn.focus === 'function') modalBtn.focus();
            if (typeof MouseEvent !== 'undefined') {
              modalBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
              modalBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
            }
            modalBtn.click();
          } catch (e) {
            try { modalBtn.click(); } catch (err) {}
          }
          return true;
        }
      }

      return true;
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

  function findMarkAsDoneButton(doc = document) {
    // 1. Direct standard Moodle toggle-manual-completion button
    const directBtn = doc.querySelector('button[data-action="toggle-manual-completion"], [data-action="toggle-manual-completion"]');
    if (directBtn) {
      const txt = (directBtn.innerText || directBtn.textContent || directBtn.value || '').trim().toLowerCase();
      // Only return if it is NOT yet marked as done (does not say "done" or "✓ done")
      if (txt.includes('mark as done') || (directBtn.getAttribute('data-toggled') !== 'true' && !txt.includes('done'))) {
        return directBtn;
      }
    }

    // 2. Text-content search across candidate buttons
    const candidates = Array.from(doc.querySelectorAll('button, input[type="button"], a.btn'));
    for (const el of candidates) {
      const txt = (el.innerText || el.textContent || el.value || '').trim().toLowerCase();
      if (txt === 'mark as done') {
        return el;
      }
    }

    return null;
  }

  async function clickMarkAsDone(doc = document) {
    const markDoneBtn = findMarkAsDoneButton(doc);
    if (markDoneBtn) {
      await sleep(600);
      markDoneBtn.click();
      await sleep(800);
      return true;
    }
    return false;
  }

  return {
    calculatePacingDelay,
    actuateSelection,
    findFinishAttemptButton,
    clickNextOrFinish,
    findSummarySubmitButton,
    findModalSubmitButton,
    confirmSubmitAllModal,
    clickFinishReview,
    findAttemptOrReattemptButton,
    findModalStartAttemptButton,
    clickAttemptQuiz,
    completeLectureVideo,
    findMarkAsDoneButton,
    clickMarkAsDone,
    sleep
  };
});
