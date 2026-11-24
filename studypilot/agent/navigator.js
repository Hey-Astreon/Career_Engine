/**
 * Agent 5: The Navigator (Curriculum & Autonomous Syllabus Progression)
 * --------------------------------------------------------------------
 * Traverses Amity Online AMIGO left navigation sidebar and course modules.
 * Connects lecture chapters to quizzes and automatically advances when complete.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.StudyPilotNavigator = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function getCurriculumPlan(doc = document) {
    if (typeof window.StudyPilotScribe !== 'undefined') {
      return window.StudyPilotScribe.parseCurriculum(doc, window.location.href);
    }
    return { items: [], currentItem: null, nextItem: null, totalCount: 0 };
  }

  function navigateToNextActivity(doc = document) {
    const plan = getCurriculumPlan(doc);

    // Strategy 1: If current page is in the academic curriculum, follow the strict serial order
    if (plan.currentItem && plan.nextItem) {
      if (plan.nextItem.element && typeof plan.nextItem.element.click === 'function') {
        plan.nextItem.element.click();
        return { success: true, target: plan.nextItem.title, url: plan.nextItem.href };
      }
      if (plan.nextItem.href) {
        window.location.href = plan.nextItem.href;
        return { success: true, target: plan.nextItem.title, url: plan.nextItem.href };
      }
    }

    // Strategy 2: If current page is a non-curriculum static page (e.g. Glossary, Syllabus),
    // immediately find the next incomplete chapter in the course curriculum!
    const nextIncomplete = findNextIncompleteActivity(doc);
    if (nextIncomplete) {
      if (nextIncomplete.element && typeof nextIncomplete.element.click === 'function') {
        nextIncomplete.element.click();
        return { success: true, target: nextIncomplete.title, url: nextIncomplete.href };
      }
      if (nextIncomplete.href) {
        window.location.href = nextIncomplete.href;
        return { success: true, target: nextIncomplete.title, url: nextIncomplete.href };
      }
    }

    // Strategy 3: Standard Moodle bottom navigation link (activity-navigation)
    const nextActivityLink = doc.querySelector(
      '#next-activity-link a, #next-activity-link, .activity-navigation .next a, a[title*="Next" i], .nav-item-next a, .activity-navigation a[title*="Next" i]'
    );
    if (nextActivityLink) {
      if (typeof nextActivityLink.click === 'function') {
        nextActivityLink.click();
        return { success: true, target: 'Next Activity', url: nextActivityLink.href };
      }
      if (nextActivityLink.href) {
        window.location.href = nextActivityLink.href;
        return { success: true, target: 'Next Activity', url: nextActivityLink.href };
      }
    }

    // Strategy 4: Text search across all links
    const allLinks = Array.from(doc.querySelectorAll('a.btn, .activity-navigation a, a'));
    for (const link of allLinks) {
      const txt = (link.innerText || link.textContent || '').trim().toLowerCase();
      if (txt.includes('next activity') || txt === 'next >' || txt.includes('next chapter') || txt.includes('next topic')) {
        link.click();
        return { success: true, target: link.innerText.trim(), url: link.href };
      }
    }

    return { success: false, reason: 'No next activity found in course curriculum' };
  }

  function findNextIncompleteActivity(doc = document) {
    const plan = getCurriculumPlan(doc);
    const incomplete = plan.items.filter(it => !it.isCompleted);
    return incomplete[0] || null;
  }

  function findNextIncompleteQuiz(doc = document) {
    const plan = getCurriculumPlan(doc);
    const incompleteQuizzes = plan.items.filter(it => it.isQuiz && !it.isCompleted);
    return incompleteQuizzes[0] || null;
  }

  return {
    getCurriculumPlan,
    navigateToNextActivity,
    findNextIncompleteActivity,
    findNextIncompleteQuiz
  };
});
