/**
 * Stride StudyPilot Content Script (Manifest V3)
 * -----------------------------------------------
 * Orchestrates the 5-Agent Swarm (Scribe, Scholar, Auditor, Sentry, Navigator)
 * and bridges the page DOM to the Closed Shadow DOM HUD.
 */

(function () {
  'use strict';

  if (window.__STUDYPILOT_INJECTED__) return;
  window.__STUDYPILOT_INJECTED__ = true;

  let activeHud = null;
  let isSolving = false;
  let currentQuestions = [];
  let courseContext = '';
  let currentPageMode = 'unknown';
  let curriculumPlan = { items: [], currentItem: null, nextItem: null };

  // 1. Initialize or Toggle HUD
  function toggleStudyPilotHUD(forceOpen = false) {
    if (!activeHud) {
      if (typeof window.StudyPilotHUD !== 'undefined') {
        activeHud = new window.StudyPilotHUD();
        activeHud.mount();
        scanCurrentPage();
      }
      return;
    }

    if (forceOpen) {
      activeHud.show();
    } else {
      activeHud.toggle();
    }
  }

  // 2. Scan Page with Agents 1 (Scribe) & 5 (Navigator)
  function scanCurrentPage() {
    const Scribe = window.StudyPilotScribe;
    const Navigator = window.StudyPilotNavigator;

    if (!Scribe) return;

    currentPageMode = Scribe.detectPageMode(document, window.location.href);
    courseContext = Scribe.extractCourseContext(document);

    if (currentPageMode === 'quiz-attempt') {
      const parsed = Scribe.parseMoodleQuestions(document);
      currentQuestions = parsed.questions;
    } else {
      currentQuestions = [];
    }

    if (Navigator) {
      curriculumPlan = Navigator.getCurriculumPlan(document);
    }

    const hasVideo = Boolean(document.querySelector('video, iframe[src*="video"], iframe[src*="youtube"]'));

    if (activeHud) {
      activeHud.updateScanResult({
        courseTitle: courseContext,
        questionsCount: currentQuestions.length,
        isQuiz: currentQuestions.length > 0,
        pageMode: currentPageMode,
        nextActivityTitle: curriculumPlan.nextItem ? curriculumPlan.nextItem.title : '',
        nextActivityHref: curriculumPlan.nextItem ? curriculumPlan.nextItem.href : '',
        hasVideo
      });
    }

    // Auto-advance checks if configured
    checkAutonomousLifecycle();
  }

  // 3. Check Autonomous Lifecycle on Page Load
  function checkAutonomousLifecycle() {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) return;

    chrome.storage.sync.get(['sp_auto_submit', 'sp_auto_advance'], async (res) => {
      const autoSubmit = res && res.sp_auto_submit === true;
      const autoAdvance = res && res.sp_auto_advance === true;

      const Sentry = window.StudyPilotSentry;
      const Navigator = window.StudyPilotNavigator;
      if (!Sentry) return;

      // Stage A: On Summary Page, Auto-Submit
      if (currentPageMode === 'quiz-summary' && autoSubmit) {
        if (activeHud) {
          activeHud.setState('submitting', { statusText: 'Auto-Submitting Quiz Summary...' });
        }
        await Sentry.sleep(1200);
        await Sentry.confirmSubmitAllModal(document);
      }

      // Stage B: On Review Page, Auto-Advance to Next
      if (currentPageMode === 'quiz-review' && autoAdvance) {
        if (activeHud) {
          activeHud.setState('complete', { statusText: 'Quiz Completed! Advancing to next topic...' });
        }
        await Sentry.sleep(1800);
        await Sentry.clickFinishReview(document);
        if (Navigator) {
          await Sentry.sleep(1000);
          Navigator.navigateToNextActivity(document);
        }
      }
    });
  }

  // 4. Autonomous Swarm Execution for Quizzes
  async function executeSwarmAutoSolve(config = {}) {
    if (isSolving || currentQuestions.length === 0) return;
    isSolving = true;

    if (activeHud) {
      activeHud.setState('solving', {
        total: currentQuestions.length,
        current: 0,
        statusText: 'Starting 4-Agent Swarm...'
      });
    }

    const Scholar = window.StudyPilotScholar;
    const Auditor = window.StudyPilotAuditor;
    const Sentry = window.StudyPilotSentry;
    const speedMode = config.speedMode || 'humanized';

    try {
      for (let i = 0; i < currentQuestions.length; i++) {
        const q = currentQuestions[i];

        if (activeHud) {
          activeHud.setState('solving', {
            total: currentQuestions.length,
            current: i + 1,
            questionNumber: q.questionNumber,
            statusText: `Agent 2 (Scholar) solving Question ${q.questionNumber}...`
          });
        }

        // Step 1: Scholar solves via background network stack
        const scholarAns = await Scholar.solveQuestion(q, courseContext, config);

        // Step 2: Auditor cross-examines & consensus
        if (activeHud) {
          activeHud.setState('solving', {
            total: currentQuestions.length,
            current: i + 1,
            questionNumber: q.questionNumber,
            statusText: `Agent 3 (Auditor) red-teaming Question ${q.questionNumber}...`
          });
        }
        const consensus = Auditor.auditAnswer(q, scholarAns);

        // Step 3: Sentry actuates with pacing
        if (activeHud) {
          activeHud.setState('solving', {
            total: currentQuestions.length,
            current: i + 1,
            questionNumber: q.questionNumber,
            statusText: `Agent 4 (Sentry) selecting (${consensus.selectedKey.toUpperCase()})...`
          });
        }
        await Sentry.actuateSelection(q, consensus, speedMode);

        if (activeHud) {
          activeHud.addSolvedLog({
            questionNumber: q.questionNumber,
            selectedKey: consensus.selectedKey.toUpperCase(),
            reasoning: consensus.reasoning,
            engine: consensus.engine
          });
        }
      }

      // Step 4: Auto-Submit if enabled
      if (config.autoSubmit) {
        if (activeHud) {
          activeHud.setState('submitting', {
            statusText: 'Agent 4 (Sentry) finishing attempt...'
          });
        }
        const submitted = await Sentry.clickNextOrFinish(document);
        if (submitted) {
          setTimeout(async () => {
            await Sentry.confirmSubmitAllModal(document);
          }, 1500);
        }
      }

      if (activeHud) {
        activeHud.setState('complete', {
          total: currentQuestions.length,
          statusText: `Completed ${currentQuestions.length}/${currentQuestions.length} questions!`
        });
      }
    } catch (err) {
      console.error('[StudyPilot] Swarm execution error:', err);
      if (activeHud) {
        activeHud.setState('error', { error: err.message || 'Error occurred while solving' });
      }
    } finally {
      isSolving = false;
    }
  }

  // 5. Lecture & Navigation Helpers
  async function completeVideoAndNext() {
    const Sentry = window.StudyPilotSentry;
    const Navigator = window.StudyPilotNavigator;

    if (activeHud) {
      activeHud.setState('solving', { statusText: 'Completing lecture video...' });
    }

    if (Sentry) {
      await Sentry.completeLectureVideo(document);
    }

    if (activeHud) {
      activeHud.setState('complete', { statusText: 'Video complete! Advancing...' });
    }

    if (Navigator) {
      setTimeout(() => {
        Navigator.navigateToNextActivity(document);
      }, 800);
    }
  }

  function navigateNext() {
    const Navigator = window.StudyPilotNavigator;
    if (Navigator) {
      Navigator.navigateToNextActivity(document);
    }
  }

  async function submitSummary() {
    const Sentry = window.StudyPilotSentry;
    if (Sentry) {
      if (activeHud) {
        activeHud.setState('submitting', { statusText: 'Submitting all and finishing...' });
      }
      await Sentry.confirmSubmitAllModal(document);
    }
  }

  // 6. Message Listener from Background & Popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'TOGGLE_HUD') {
      toggleStudyPilotHUD(request.forceOpen === true);
      sendResponse({ status: 'ok' });
      return false;
    }

    if (request.action === 'SHOW_HUD') {
      toggleStudyPilotHUD(true);
      sendResponse({ status: 'shown' });
      return false;
    }

    if (request.action === 'TRIGGER_AUTO_SOLVE') {
      executeSwarmAutoSolve(request.config || {});
      sendResponse({ status: 'started' });
      return false;
    }

    if (request.action === 'SCAN_QUESTIONS') {
      scanCurrentPage();
      sendResponse({
        courseTitle: courseContext,
        questionsCount: currentQuestions.length,
        pageMode: currentPageMode,
        nextActivityTitle: curriculumPlan.nextItem ? curriculumPlan.nextItem.title : ''
      });
      return false;
    }
  });

  // Auto-scan and auto-mount HUD on page load
  setTimeout(() => {
    toggleStudyPilotHUD(true);
  }, 250);

  // Global test bridge
  window.__STUDYPILOT_TOGGLE_HUD__ = toggleStudyPilotHUD;
  window.__STUDYPILOT_AUTO_SOLVE__ = executeSwarmAutoSolve;
  window.__STUDYPILOT_SCAN__ = scanCurrentPage;
  window.__STUDYPILOT_COMPLETE_VIDEO__ = completeVideoAndNext;
  window.__STUDYPILOT_NAVIGATE_NEXT__ = navigateNext;
  window.__STUDYPILOT_SUBMIT_SUMMARY__ = submitSummary;
})();
