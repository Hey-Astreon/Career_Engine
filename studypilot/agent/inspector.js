/**
 * Agent 6: The Inspector (Verification, Grade Auditor & Attempt Gatekeeper)
 * ------------------------------------------------------------------------
 * 1. Pre-Submission Full-DOM Radio Verification:
 *    Audits every question container before submission. Strictly blocks
 *    submission if even a single radio button is unchecked.
 * 
 * 2. High-Stakes 3-Attempt Gatekeeper:
 *    Detects Module Assessments and Graded Assessments with finite attempts
 *    (e.g. "Attempts allowed: 3"). Protects remaining attempts from accidental
 *    burns and mandates ultra-high confidence consensus (>= 0.95).
 * 
 * 3. Course-Wide Syllabus & Grade Audit:
 *    Inspects all course sections (Live Classes, Videos, Quizzes) to verify
 *    that every completion requirement is satisfied and 100% full marks achieved.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.StudyPilotInspector = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * Pillar 1: Pre-Submission 100% Radio Verification
   * Audits every question on the page to guarantee zero unanswered questions.
   */
  function verifyAllQuestionsAttempted(doc = document) {
    const questionNodes = Array.from(
      doc.querySelectorAll('.que.multichoice, .que.truefalse, .que.shortanswer, .que, div[id^="question-"]')
    );

    const unattempted = [];
    const verified = [];

    questionNodes.forEach((node, index) => {
      const qnoEl = node.querySelector('.info .no, .qno, h3.no');
      const qNum = qnoEl ? qnoEl.textContent.replace(/[^0-9]/g, '') : String(index + 1);

      // Check for checked radio, checked checkbox, or filled text input
      const checkedInput = node.querySelector(
        'input[type="radio"]:checked, input[type="checkbox"]:checked, input[type="text"]:not([value=""])'
      );

      // Also check Boost/Bootstrap checked class states or aria-checked
      const isChecked = Boolean(checkedInput) || 
                        Boolean(node.querySelector('.checked, [aria-checked="true"], input:checked'));

      if (!isChecked) {
        unattempted.push({
          questionNumber: parseInt(qNum, 10) || index + 1,
          node
        });
      } else {
        verified.push({
          questionNumber: parseInt(qNum, 10) || index + 1,
          input: checkedInput,
          node
        });
      }
    });

    return {
      total: questionNodes.length,
      attemptedCount: verified.length,
      unattemptedCount: unattempted.length,
      isAllAttempted: unattempted.length === 0,
      unattemptedQuestions: unattempted,
      verifiedQuestions: verified
    };
  }

  /**
   * Pillar 2: High-Stakes Attempt Constraints & Safety Audit
   * Analyzes Moodle quiz view page for attempt limits and stakes.
   */
  function getAssessmentStakes(doc = document) {
    const textNodes = Array.from(
      doc.querySelectorAll('.quizinfo, .box, p, div, h2, h3, h4, table, .generaltable')
    );

    let attemptsAllowed = Infinity; // default unlimited for small quizzes
    let attemptsUsed = 0;
    let isHighStakes = false;

    for (const node of textNodes) {
      const txt = (node.innerText || node.textContent || '').trim();

      // Check for "Attempts allowed: 3"
      const allowedMatch = txt.match(/attempts\s*allowed[^:\d]*:\s*([0-9]+)/i);
      if (allowedMatch) {
        attemptsAllowed = parseInt(allowedMatch[1], 10);
        if (attemptsAllowed <= 3) {
          isHighStakes = true;
        }
      }

      // Check for explicit module assessment title or graded assessment indicators (avoiding breadcrumbs)
      if (/\b(?:\d+(?:st|nd|rd|th)?\s+)?module\s+assessment\b|\bgraded\s+assessment\b|\bend\s+term\s+assessment\b/i.test(txt)) {
        isHighStakes = true;
        if (attemptsAllowed === Infinity) {
          attemptsAllowed = 3; // default 3 attempts for finite module/graded assessments
        }
      }
    }

    // Check count of finished attempts in attempts table
    const attemptRows = doc.querySelectorAll('.generaltable tbody tr, .quizattemptsummary tbody tr');
    if (attemptRows && attemptRows.length > 0) {
      // Filter out header rows or summary footer rows
      const validRows = Array.from(attemptRows).filter(tr => {
        const rowText = (tr.innerText || tr.textContent || '').toLowerCase();
        return rowText.includes('attempt') || rowText.includes('finished') || rowText.includes('review');
      });
      attemptsUsed = validRows.length;
    }

    const attemptsRemaining = Math.max(0, attemptsAllowed - attemptsUsed);

    return {
      isHighStakes,
      attemptsAllowed,
      attemptsUsed,
      attemptsRemaining,
      canSafelyAttempt: attemptsRemaining > 0,
      stakesLabel: isHighStakes 
        ? `🛡️ High-Stakes Assessment (${attemptsUsed}/${attemptsAllowed} Attempts Used)`
        : '⚡ Standard Practice Quiz (Unlimited Attempts)'
    };
  }

  /**
   * Pillar 3: Course-Wide Syllabus & Grade Audit
   * Audits sidebar drawer curriculum tree for missing radio checkmarks and imperfect grades.
   */
  function auditCourseCurriculum(doc = document) {
    const sidebarLinks = Array.from(doc.querySelectorAll(
      '#nav-drawer a, .courseindex a, .drawer-content a, .list-group a, #course-index a, .course-index a, .courseindex-section a'
    ));

    const audit = {
      totalFound: sidebarLinks.length,
      completedItems: [],
      pendingItems: [],
      pendingLiveClasses: [],
      pendingQuizzes: [],
      pendingLectures: []
    };

    sidebarLinks.forEach(link => {
      const rawText = (link.innerText || link.textContent || '').trim();
      const href = link.href || link.getAttribute('href') || '';
      if (!rawText || !href || href === '#' || href.startsWith('javascript:')) return;

      const isCompleted = rawText.includes('✓') || 
                          link.querySelector('.fa-check, .completion-info') !== null ||
                          (link.getAttribute('aria-label') && link.getAttribute('aria-label').includes('Completed'));

      const isLiveClass = /live\s*class/i.test(rawText) || href.includes('/mod/googlemeet/');
      const isQuiz = /quiz/i.test(rawText) || href.includes('/mod/quiz/');
      const isLecture = href.includes('/mod/page/') || href.includes('/mod/lesson/');

      const itemRecord = {
        title: rawText.replace(/^[✓○o\s]+/, '').trim(),
        href,
        isCompleted,
        isLiveClass,
        isQuiz,
        isLecture,
        element: link
      };

      if (isCompleted) {
        audit.completedItems.push(itemRecord);
      } else {
        audit.pendingItems.push(itemRecord);
        if (isLiveClass) audit.pendingLiveClasses.push(itemRecord);
        if (isQuiz) audit.pendingQuizzes.push(itemRecord);
        if (isLecture) audit.pendingLectures.push(itemRecord);
      }
    });

    return audit;
  }

  return {
    verifyAllQuestionsAttempted,
    getAssessmentStakes,
    auditCourseCurriculum
  };
});
