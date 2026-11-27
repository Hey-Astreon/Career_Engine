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

  // Persistent Attempt Memory & Stagnation Tracking Vault (localStorage with sessionStorage fallback)
  function getQuizId(url = window.location.href) {
    try {
      const u = new URL(url);
      return u.searchParams.get('id') || u.searchParams.get('cmid') || 'default_quiz';
    } catch (e) {
      return 'default_quiz';
    }
  }

  function loadQuizMemory(quizId) {
    try {
      let raw = null;
      try { raw = localStorage.getItem(`sp_v2_quiz_memory_${quizId}`); } catch (e) {}
      if (!raw) {
        try { raw = sessionStorage.getItem(`sp_v2_quiz_memory_${quizId}`); } catch (e) {}
      }
      return raw ? JSON.parse(raw) : { quizId, attempts: [] };
    } catch (e) {
      return { quizId, attempts: [] };
    }
  }

  function saveQuizSelections(quizId, selections) {
    try {
      const mem = loadQuizMemory(quizId);
      mem.pendingSelections = selections;
      const str = JSON.stringify(mem);
      try { localStorage.setItem(`sp_v2_quiz_memory_${quizId}`, str); } catch (e) {}
      try { sessionStorage.setItem(`sp_v2_quiz_memory_${quizId}`, str); } catch (e) {}
    } catch (e) {}
  }

  function recordQuizOutcome(quizId, gradeInfo, isHighStakes = false, lastAttempt = null) {
    try {
      const mem = loadQuizMemory(quizId);
      // Use the actual latest attempt score from Moodle's attempts table (not the "Highest grade" banner!)
      // so Mastermind CSP receives accurate per-attempt deltas even when an attempt scores lower than best.
      const actualAttemptGrade = (lastAttempt && typeof lastAttempt.score === 'number')
        ? lastAttempt
        : gradeInfo;
      if (mem.pendingSelections && actualAttemptGrade && (actualAttemptGrade.hasGrade || typeof actualAttemptGrade.score === 'number')) {
        mem.attempts.push({
          attemptIndex: mem.attempts.length + 1,
          selections: mem.pendingSelections,
          score: actualAttemptGrade.score,
          total: actualAttemptGrade.total,
          percentage: actualAttemptGrade.percentage,
          gradeText: actualAttemptGrade.gradeText || (gradeInfo ? gradeInfo.gradeText : '')
        });
        delete mem.pendingSelections;
        const str = JSON.stringify(mem);
        try { localStorage.setItem(`sp_v2_quiz_memory_${quizId}`, str); } catch (e) {}
        try { sessionStorage.setItem(`sp_v2_quiz_memory_${quizId}`, str); } catch (e) {}
      }
      if (gradeInfo && gradeInfo.hasGrade) {
        // Mastermind 10/10 Knowledge Vault Synchronization: persist cracked 100% solutions
        if (gradeInfo.isPerfect && window.StudyPilotMastermind && typeof window.StudyPilotMastermind.storePerfectSolution === 'function') {
          const perfectSels = (mem.attempts.length > 0)
            ? mem.attempts[mem.attempts.length - 1].selections
            : null;
          if (perfectSels) {
            window.StudyPilotMastermind.storePerfectSolution(quizId, perfectSels);
          }
        }

        try {
          const existingRaw = localStorage.getItem(`sp_v2_quiz_outcome_${quizId}`);
          const existing = existingRaw ? JSON.parse(existingRaw) : {};
          localStorage.setItem(`sp_v2_quiz_outcome_${quizId}`, JSON.stringify({
            ...existing,
            score: gradeInfo.score,
            total: gradeInfo.total,
            percentage: gradeInfo.percentage,
            isPerfect: Boolean(gradeInfo.isPerfect),
            isHighStakes: Boolean(isHighStakes),
            timestamp: Date.now()
          }));
        } catch (e) {}
      }
    } catch (e) {}
  }

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
    const Sentry = window.StudyPilotSentry;
    const hasMarkDoneBtn = Boolean(Sentry && typeof Sentry.findMarkAsDoneButton === 'function' && Sentry.findMarkAsDoneButton(document));
    const isViewDone = Boolean(Scribe && typeof Scribe.hasPassiveViewCompletion === 'function' && Scribe.hasPassiveViewCompletion(document));
    const gradeInfo = (Scribe && typeof Scribe.extractQuizGrade === 'function') 
      ? Scribe.extractQuizGrade(document) 
      : { hasGrade: false, score: 0, total: 0, percentage: 0, isPerfect: false, gradeText: '' };
    const attemptsHistory = (Scribe && typeof Scribe.extractQuizAttemptsHistory === 'function')
      ? Scribe.extractQuizAttemptsHistory(document)
      : { isStagnant: false, consecutiveStagnantCount: 0, attempts: [] };
    const hasAttemptBtn = Boolean(Sentry && typeof Sentry.findAttemptOrReattemptButton === 'function' && Sentry.findAttemptOrReattemptButton(document));
    const hasModalStartBtn = Boolean(Sentry && typeof Sentry.findModalStartAttemptButton === 'function' && Sentry.findModalStartAttemptButton(document));
    const Inspector = window.StudyPilotInspector;
    const stakes = (Inspector && typeof Inspector.getAssessmentStakes === 'function')
      ? Inspector.getAssessmentStakes(document)
      : { isHighStakes: false, attemptsAllowed: Infinity, attemptsUsed: 0, attemptsRemaining: Infinity, canSafelyAttempt: true };

    let nextTitle = curriculumPlan.nextItem ? curriculumPlan.nextItem.title : '';
    let nextHref = curriculumPlan.nextItem ? curriculumPlan.nextItem.href : '';

    // If on a static page (e.g. Glossary, Syllabus) where nextItem is not in the curriculum,
    // display the next incomplete activity in the academic syllabus!
    if (!nextTitle && Navigator) {
      const nextIncomplete = Navigator.findNextIncompleteActivity(document);
      if (nextIncomplete) {
        nextTitle = nextIncomplete.title;
        nextHref = nextIncomplete.href;
      }
    }

    if (activeHud) {
      activeHud.updateScanResult({
        courseTitle: courseContext,
        questionsCount: currentQuestions.length,
        isQuiz: currentQuestions.length > 0,
        pageMode: currentPageMode,
        nextActivityTitle: nextTitle,
        nextActivityHref: nextHref,
        hasVideo,
        hasMarkDoneBtn,
        isViewDone,
        gradeInfo,
        hasAttemptBtn,
        hasModalStartBtn,
        stakes,
        isStagnant: attemptsHistory.isStagnant || attemptsHistory.consecutiveStagnantCount >= 1 || Boolean(attemptsHistory.scoreRegressed) || (attemptsHistory.consecutiveZeroCount || 0) >= 1 || attemptsHistory.attempts.length >= 6,
        attemptsCount: attemptsHistory.attempts.length
      });
    }

    // Auto-advance checks if configured
    checkAutonomousLifecycle();
  }

  // 3. Check Autonomous Lifecycle on Page Load
  function checkAutonomousLifecycle() {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) return;

    chrome.storage.sync.get(['sp_auto_submit', 'sp_auto_advance'], async (res) => {
      try {
        const autoSubmit = (res && typeof res.sp_auto_submit !== 'undefined') ? res.sp_auto_submit === true : true;
        const autoAdvance = (res && typeof res.sp_auto_advance !== 'undefined') ? res.sp_auto_advance === true : true;

        const Scribe = window.StudyPilotScribe;
        const Sentry = window.StudyPilotSentry;
        const Navigator = window.StudyPilotNavigator;
        const Inspector = window.StudyPilotInspector;
        if (!Sentry || !Scribe) return;

        // Stage A: On Summary Page, Auto-Submit
        if (currentPageMode === 'quiz-summary' && autoSubmit) {
          if (activeHud) {
            activeHud.setState('submitting', { statusText: 'Auto-Submitting Quiz Summary...' });
          }
          await Sentry.sleep(800);
          const success = await Sentry.confirmSubmitAllModal(document);
          if (!success && activeHud) {
            activeHud.setState('idle', { statusText: 'Ready for Final Submission' });
          }
        }

        // Stage B: On Review Page, Auto-Advance to Next
        if (currentPageMode === 'quiz-review' && autoAdvance) {
          if (activeHud) {
            activeHud.setState('complete', { statusText: 'Quiz Completed! Advancing to next topic...' });
          }
          await Sentry.sleep(1500);
          await Sentry.clickFinishReview(document);
          if (Navigator) {
            await Sentry.sleep(800);
            Navigator.navigateToNextActivity(document);
          }
        }

        // Stage C: On Quiz View Page (/mod/quiz/view.php)
        if (currentPageMode === 'quiz-view' && autoAdvance) {
          const gradeInfo = (Scribe && typeof Scribe.extractQuizGrade === 'function')
            ? Scribe.extractQuizGrade(document)
            : { hasGrade: false, score: 0, total: 0, percentage: 0, isPerfect: false, gradeText: '' };
          const attemptsHistory = (Scribe && typeof Scribe.extractQuizAttemptsHistory === 'function')
            ? Scribe.extractQuizAttemptsHistory(document)
            : { isStagnant: false, consecutiveStagnantCount: 0, attempts: [] };
          const attemptBtn = Sentry && typeof Sentry.findAttemptOrReattemptButton === 'function'
            ? Sentry.findAttemptOrReattemptButton(document)
            : null;
          const stakes = (Inspector && typeof Inspector.getAssessmentStakes === 'function')
            ? Inspector.getAssessmentStakes(document)
            : { isHighStakes: false, attemptsAllowed: Infinity, attemptsUsed: 0, attemptsRemaining: Infinity, canSafelyAttempt: true };

          const currentQuizId = getQuizId(window.location.href);
          recordQuizOutcome(currentQuizId, gradeInfo, stakes.isHighStakes, attemptsHistory.lastAttempt);

          // Subcase C0: High-Stakes Exhaustion Guard (All finite attempts used)
          if (stakes.isHighStakes && stakes.attemptsRemaining <= 0) {
            if (activeHud) {
              activeHud.setState('complete', { 
                statusText: `🛡️ Assessment Complete (${gradeInfo.gradeText || 'Final Grade Locked'})! All ${stakes.attemptsAllowed} attempts finished. Advancing...` 
              });
            }
            await Sentry.sleep(2200);
            if (Navigator) {
              Navigator.navigateToNextActivity(document);
            }
            return;
          }

          // Subcase C0.1: HIGH-STAKES PASSING SCORE SHIELD (The 90% / Passing Grade Protection)
          // INVIOLABLE LAW: If an exam has finite attempts (<= 3, e.g. Module Assessment or Graded Assessment),
          // and the score is already PASSING (score >= 50% or >= gradeToPass, such as 27/30),
          // AUTONOMOUS RE-ATTEMPTS ARE 100% PROHIBITED!
          // We must protect the student's passing score and remaining attempts at all costs!
          const isHighStakesPassing = stakes.isHighStakes && gradeInfo.hasGrade && (
            (gradeInfo.total > 0 && (gradeInfo.score / gradeInfo.total) >= 0.5) ||
            (stakes.gradeToPass && gradeInfo.score >= stakes.gradeToPass)
          );

          if (isHighStakesPassing) {
            if (activeHud) {
              activeHud.setState('idle', { 
                statusText: `🛡️ Highest Grade Banked (${gradeInfo.gradeText})! Auto-retry paused so you can advance or aim for 100%.`
              });
            }
            return; // STRICTLY STOP: Never auto-click attemptBtn on a passed high-stakes assessment!
          }

          // Subcase C0.5: STAGNATION / REGRESSION / CONSECUTIVE-ZERO CIRCUIT BREAKER
          // For HIGH-STAKES: halt if any stagnation detected (scores not improving).
          // For PRACTICE: halt on ANY of these safety conditions —
          //   (1) Stagnation: requires >= 2 consecutive stagnant transitions (3 equal attempts in a row),
          //       so Mastermind gets a chance to test alternative options on Attempt 2/3.
          //   (2) Consecutive Zeros: on unlimited practice quizzes, allow up to 3 attempts to prune options;
          //       halt only if 3 or more consecutive attempts score 0% (>= 3).
          //   (3) Score Regression: On Attempt 2 of a practice quiz, dropping from a partial score to 0%
          //       is an intentional Mastermind single-variable delta hypothesis test!
          //       Under Mastermind Rule B, this drop mathematically isolates the 100% vector for Attempt 3.
          //       Do NOT pause on Attempt 2! Only pause on regression if attempts >= 3 and score still regressed.
          //   (4) Cap: Exceeded 6 practice attempts without perfection.
          const isPractice = !stakes.isHighStakes;
          const isStagnantScore = attemptsHistory.consecutiveStagnantCount >= 2;
          const hasConsecutiveZeros = isPractice
            ? (attemptsHistory.consecutiveZeroCount || 0) >= 3
            : (attemptsHistory.consecutiveZeroCount || 0) >= 1;
          const isMastermindDeltaTest = attemptsHistory.attempts.length === 2 && 
                                        attemptsHistory.bestScore > 0 && 
                                        isPractice;
          const hasScoreRegressed = !isMastermindDeltaTest && 
                                    !!attemptsHistory.scoreRegressed && 
                                    attemptsHistory.attempts.length >= 3;
          const isExceededPracticeAttempts = attemptsHistory.attempts.length >= 6;

          // Combined safety gate for practice quizzes
          const shouldPausePractice = !stakes.isHighStakes && (
            isStagnantScore ||
            hasScoreRegressed ||
            hasConsecutiveZeros ||
            isExceededPracticeAttempts
          );

          if (gradeInfo.hasGrade && !gradeInfo.isPerfect && (stakes.isHighStakes ? (attemptsHistory.consecutiveStagnantCount >= 1) : shouldPausePractice)) {
            const latestScoreDisplay = attemptsHistory.lastAttempt ? attemptsHistory.lastAttempt.score : gradeInfo.score;
            const reason = stakes.isHighStakes
              ? `Stagnant Score`
              : hasScoreRegressed
                ? `Score Regressed (${attemptsHistory.bestScore}→${latestScoreDisplay})`
                : hasConsecutiveZeros
                  ? `${attemptsHistory.consecutiveZeroCount} consecutive 0% attempt(s)`
                  : isStagnantScore
                    ? `Stagnant Score (3 attempts unchanged)`
                    : `${attemptsHistory.attempts.length} attempts reached`;
            if (activeHud) {
              activeHud.setState('idle', { 
                statusText: `⚠️ Auto-Solve Paused: ${reason} (${gradeInfo.gradeText}). Manual review required — answers need correction.`
              });
            }
            // HALT automatic retry loop! Answers need manual review before retrying.
            return;
          }

          // Subcase C0.6: HIGH-STAKES ZERO AUTONOMOUS RE-ATTEMPT LOCKOUT
          // INVIOLABLE LAW: On finite-attempt exams (<= 3 attempts), the AI is STRICTLY FORBIDDEN from ever
          // auto-clicking 'Re-attempt quiz' on its own, regardless of score. The student MUST have 100% manual control!
          if (stakes.isHighStakes && gradeInfo.hasGrade && !gradeInfo.isPerfect) {
            if (activeHud) {
              activeHud.setState('idle', { 
                statusText: `🛡️ Assessment Score: ${gradeInfo.gradeText}. Auto-retry strictly disabled to protect finite attempts. You are in full control.`
              });
            }
            return; // STRICTLY STOP: Never auto-click attemptBtn on high-stakes assessments!
          }

          // Subcase C1: Imperfect Practice Quiz (Autonomous Mastermind Delta Solving on UNLIMITED practice attempts only)
          if (!stakes.isHighStakes && gradeInfo.hasGrade && !gradeInfo.isPerfect && attemptBtn && stakes.canSafelyAttempt) {
            const statusMsg = isMastermindDeltaTest
              ? `🧠 Mastermind AI: Delta isolated on Attempt 2 (${attemptsHistory.bestScore}→${gradeInfo.score}). Launching Attempt 3 to lock 10/10!`
              : `🧠 Mastermind AI: Score is ${gradeInfo.gradeText}. Auto-Permuting Attempt ${attemptsHistory.attempts.length + 1} for 10/10...`;
            if (activeHud) {
              activeHud.setState('submitting', { 
                statusText: statusMsg
              });
            }
            await Sentry.sleep(1200);
            await Sentry.clickAttemptQuiz(document);
            return;
          }

          // Subcase C2: Perfect Quiz (100% full marks) -> Auto-Advance forward!
          if (gradeInfo.hasGrade && gradeInfo.isPerfect) {
            if (activeHud) {
              activeHud.setState('complete', { statusText: `Perfect Score (${gradeInfo.gradeText})! Advancing...` });
            }
            await Sentry.sleep(1200);
            if (Navigator) {
              Navigator.navigateToNextActivity(document);
            }
            return;
          }

          // Subcase C3: Fresh Unattempted Quiz -> Auto-Launch Attempt!
          if (!gradeInfo.hasGrade && attemptBtn && stakes.canSafelyAttempt) {
            if (activeHud) {
              activeHud.setState('submitting', { 
                statusText: stakes.isHighStakes ? '🛡️ High-Stakes Assessment: Launching Attempt 1 of 3...' : 'Launching Quiz Attempt...' 
              });
            }
            await Sentry.sleep(1200);
            await Sentry.clickAttemptQuiz(document);
            return;
          }
        }

        // Stage D: On Manual Completion Page (Live Class / Study Material), Auto-Mark Done & Advance
        if (Sentry && typeof Sentry.findMarkAsDoneButton === 'function' && autoAdvance && currentPageMode !== 'quiz-attempt' && currentPageMode !== 'quiz-summary') {
          const markDoneBtn = Sentry.findMarkAsDoneButton(document);
          if (markDoneBtn) {
            if (activeHud) {
              activeHud.setState('solving', { statusText: 'Marking topic as done...' });
            }
            await Sentry.clickMarkAsDone(document);
            if (activeHud) {
              activeHud.setState('complete', { statusText: 'Topic Done! Advancing to next activity...' });
            }
            await Sentry.sleep(1200);
            if (Navigator) {
              Navigator.navigateToNextActivity(document);
            }
            return;
          }
        }

        // Stage E: On Lecture Page (/mod/page/view.php), Live Class (/mod/googlemeet/), or Resource Page (/mod/resource/)
        if ((currentPageMode === 'lecture-page' || currentPageMode === 'live-class' || currentPageMode === 'resource-page') && autoAdvance) {
          if (activeHud) {
            activeHud.setState('complete', { 
              statusText: currentPageMode === 'live-class' 
                ? 'Live Class Attendance Recorded! Advancing to next activity...' 
                : 'Auto-Completed on Visit! Advancing to next activity...' 
            });
          }
          await Sentry.sleep(1500);
          if (Navigator) {
            Navigator.navigateToNextActivity(document);
          }
          return;
        }

        // Stage F: On Quiz Attempt Page (/mod/quiz/attempt.php) -> Auto-Solve Questions!
        if (currentPageMode === 'quiz-attempt' && autoAdvance && currentQuestions.length > 0 && !isSolving) {
          if (activeHud) {
            activeHud.setState('solving', { statusText: `Auto-Solving ${currentQuestions.length} Questions...` });
          }
          await Sentry.sleep(800);
          executeSwarmAutoSolve({
            speedMode: (res && res.sp_speed_mode) || 'humanized',
            autoSubmit: autoSubmit,
            autoAdvance: autoAdvance,
            groqApiKey: res && res.sp_groq_key,
            geminiApiKey: res && res.sp_gemini_key
          });
          return;
        }

        // Stage G: Self-Healing Auto-Recovery on Process Attempt Error or Glitch Page
        if (currentPageMode === 'quiz-process-error' || (window.location.href.includes('processattempt.php') && document.title.toLowerCase().includes('error'))) {
          if (activeHud) {
            activeHud.setState('complete', { statusText: 'Quiz submitted! Auto-recovering to review...' });
          }
          await Sentry.sleep(1200);
          try {
            const urlParams = new URLSearchParams(window.location.search);
            const cmid = urlParams.get('cmid') || urlParams.get('id');
            if (cmid) {
              window.location.href = `https://amigo.amityonline.com/mod/quiz/view.php?id=${cmid}`;
              return;
            }
          } catch (e) {}

          if (Navigator) {
            Navigator.navigateToNextActivity(document);
          }
          return;
        }
      } catch (lifecycleErr) {
        console.error('[StudyPilot] Autonomous lifecycle error:', lifecycleErr);
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
    const Inspector = window.StudyPilotInspector;
    const Mastermind = window.StudyPilotMastermind;
    const speedMode = config.speedMode || 'humanized';

    const stakes = (Inspector && typeof Inspector.getAssessmentStakes === 'function')
      ? Inspector.getAssessmentStakes(document)
      : { isHighStakes: false, attemptsAllowed: Infinity, attemptsUsed: 0, attemptsRemaining: Infinity, canSafelyAttempt: true };

    const currentQuizId = getQuizId(window.location.href);
    const quizMemory = loadQuizMemory(currentQuizId);
    const pastAttempts = quizMemory.attempts || [];
    const lastAttemptSelections = pastAttempts.length > 0 ? pastAttempts[pastAttempts.length - 1].selections : null;

    try {
      // Phase 1: Scholar solves all questions with context of previous attempts
      const candidateAudits = [];

      for (let i = 0; i < currentQuestions.length; i++) {
        const q = currentQuestions[i];

        if (i > 0) {
          // Token-aware pacing between question AI solving calls to prevent burst rate limits
          const paceMs = stakes.isHighStakes ? Math.round(1400 + Math.random() * 600) : Math.round(500 + Math.random() * 400);
          await new Promise(r => setTimeout(r, paceMs));
        }

        if (activeHud) {
          activeHud.setState('solving', {
            total: currentQuestions.length,
            current: i + 1,
            questionNumber: q.questionNumber,
            statusText: `Agent 2 (Scholar) solving Question ${q.questionNumber}...`
          });
        }

        const prevChoice = lastAttemptSelections ? (lastAttemptSelections[q.questionNumber] || lastAttemptSelections[q.id]) : null;
        const isMultiMarkOrHighStakes = Boolean(stakes.isHighStakes || (q.marks && q.marks >= 2));
        const scholarAns = await Scholar.solveQuestion(q, courseContext, {
          ...config,
          previousSelection: prevChoice,
          previousSelections: lastAttemptSelections,
          isRetry: pastAttempts.length > 0,
          isHighStakes: isMultiMarkOrHighStakes,
          marks: q.marks || 1.0
        });

        // Step 2: Auditor cross-examines & consensus
        if (activeHud) {
          activeHud.setState('solving', {
            total: currentQuestions.length,
            current: i + 1,
            questionNumber: q.questionNumber,
            statusText: `Agent 3 (Auditor) red-teaming Question ${q.questionNumber}...`
          });
        }
        const audited = Auditor.auditAnswer(q, scholarAns, {
          questionNumber: q.questionNumber,
          previousSelection: prevChoice,
          isRetry: pastAttempts.length > 0
        });

        candidateAudits.push(audited);
      }

      // Phase 2: Autonomous Mastermind CSP Permutation Engine (Practice Quizzes)
      let finalAudits = candidateAudits;
      if (Mastermind && typeof Mastermind.deduceNextVector === 'function' && !stakes.isHighStakes) {
        const mastermindPlan = Mastermind.deduceNextVector(currentQuestions, candidateAudits, pastAttempts, currentQuizId);
        if (mastermindPlan && mastermindPlan.applied) {
          finalAudits = mastermindPlan.resolvedAudits;
          console.log('[StudyPilot Mastermind] Applied CSP Delta Vector:', mastermindPlan);
          if (activeHud) {
            activeHud.setState('solving', {
              statusText: `🧠 Mastermind AI: ${mastermindPlan.notes || 'Applied optimal CSP delta vector'}`
            });
          }
        }
      } else if (Auditor && typeof Auditor.resolveVectorCollision === 'function' && pastAttempts.length > 0 && !stakes.isHighStakes) {
        const collision = Auditor.resolveVectorCollision(currentQuestions, candidateAudits, pastAttempts);
        if (collision.collisionDetected) {
          finalAudits = collision.resolvedResults;
          console.log('[StudyPilot Swarm] Resolved vector collision against prior attempts:', collision);
        }
      }

      // Phase 3: Sentry actuates each question's final selection with pacing
      for (let i = 0; i < currentQuestions.length; i++) {
        const q = currentQuestions[i];
        const consensus = finalAudits[i];

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

      // Save current attempt selections to persistent session memory
      const currentSelections = {};
      currentQuestions.forEach((q, idx) => {
        const key = q.questionNumber || q.id || String(idx + 1);
        currentSelections[key] = finalAudits[idx].selectedKey;
      });
      saveQuizSelections(currentQuizId, currentSelections);

      // Step 3.5: Agent 6 (The Inspector) Pre-Submission Radio Verification
      const Inspector = window.StudyPilotInspector;
      if (Inspector && typeof Inspector.verifyAllQuestionsAttempted === 'function') {
        const audit = Inspector.verifyAllQuestionsAttempted(document);
        if (!audit.isAllAttempted) {
          console.warn(`[Inspector] HALT: ${audit.unattemptedCount} unanswered questions detected!`, audit.unattemptedQuestions);
          if (activeHud) {
            activeHud.setState('solving', {
              statusText: `🚨 Inspector Alert: Q${audit.unattemptedQuestions.map(u => u.questionNumber).join(', ')} missing! Re-solving...`
            });
          }
          for (const missing of audit.unattemptedQuestions) {
            const parsedQ = currentQuestions.find(cq => String(cq.questionNumber) === String(missing.questionNumber)) || (
              Scribe && typeof Scribe.parseMoodleQuestions === 'function' && missing.node
                ? (Scribe.parseMoodleQuestions(missing.node.ownerDocument || document).questions.find(q => String(q.questionNumber) === String(missing.questionNumber)) || null)
                : null
            ) || {
              id: missing.node.id,
              questionNumber: missing.questionNumber,
              questionText: (missing.node.innerText || '').trim(),
              options: []
            };
            const isMissingMultiMarkOrHighStakes = Boolean(stakes.isHighStakes || (parsedQ.marks && parsedQ.marks >= 2));
            const scholarAns = await Scholar.solveQuestion(parsedQ, courseContext, {
              ...config,
              isHighStakes: isMissingMultiMarkOrHighStakes,
              marks: parsedQ.marks || 1.0
            });
            const consensus = Auditor.auditAnswer(parsedQ, scholarAns);
            await Sentry.actuateSelection(parsedQ, consensus, speedMode);
            const selKey = parsedQ.questionNumber || parsedQ.id || String(missing.questionNumber);
            currentSelections[selKey] = consensus.selectedKey;
          }
          saveQuizSelections(currentQuizId, currentSelections);
          const reAudit = Inspector.verifyAllQuestionsAttempted(document);
          if (!reAudit.isAllAttempted) {
            throw new Error(`Inspector Security Block: ${reAudit.unattemptedCount} radio buttons unselected. Submission halted.`);
          }
        }
      }

      // Step 4: Auto-Submit if enabled
      if (config.autoSubmit) {
        if (activeHud) {
          activeHud.setState('submitting', {
            statusText: 'Agent 4 (Sentry) finishing attempt...'
          });
        }
        await Sentry.clickNextOrFinish(document);
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

  async function markDoneAndNext() {
    const Sentry = window.StudyPilotSentry;
    const Navigator = window.StudyPilotNavigator;

    if (activeHud) {
      activeHud.setState('solving', { statusText: 'Marking topic as done...' });
    }

    if (Sentry && typeof Sentry.clickMarkAsDone === 'function') {
      await Sentry.clickMarkAsDone(document);
    }

    if (activeHud) {
      activeHud.setState('complete', { statusText: 'Topic Done! Advancing...' });
    }

    if (Navigator) {
      setTimeout(() => {
        Navigator.navigateToNextActivity(document);
      }, 800);
    }
  }

  function navigateNext() {
    const qid = getQuizId(window.location.href);
    if (qid && typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(`sp_quiz_outcome_${qid}`);
        if (raw) {
          const outcome = JSON.parse(raw);
          outcome.accepted = true;
          localStorage.setItem(`sp_quiz_outcome_${qid}`, JSON.stringify(outcome));
        } else {
          localStorage.setItem(`sp_quiz_outcome_${qid}`, JSON.stringify({ accepted: true, timestamp: Date.now() }));
        }
      } catch (e) {}
    }
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
      const success = await Sentry.confirmSubmitAllModal(document);
      if (!success && activeHud) {
        activeHud.setState('idle', { statusText: 'Ready for Final Submission' });
      }
    }
  }

  async function attemptQuiz() {
    const Sentry = window.StudyPilotSentry;
    if (Sentry) {
      if (activeHud) {
        activeHud.setState('submitting', { statusText: 'Launching quiz attempt...' });
      }
      await Sentry.clickAttemptQuiz(document);
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
  window.__STUDYPILOT_MARK_DONE__ = markDoneAndNext;
  window.__STUDYPILOT_NAVIGATE_NEXT__ = navigateNext;
  window.__STUDYPILOT_SUBMIT_SUMMARY__ = submitSummary;
  window.__STUDYPILOT_ATTEMPT_QUIZ__ = attemptQuiz;
})();
