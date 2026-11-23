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
    if (plan.nextItem) {
      if (plan.nextItem.element && typeof plan.nextItem.element.click === 'function') {
        plan.nextItem.element.click();
        return { success: true, target: plan.nextItem.title, url: plan.nextItem.href };
      }
      if (plan.nextItem.href) {
        window.location.href = plan.nextItem.href;
        return { success: true, target: plan.nextItem.title, url: plan.nextItem.href };
      }
    }

    // Fallback: check standard Moodle bottom navigation (activity-navigation)
    const nextActivityLink = doc.querySelector('.activity-navigation .next a, a[title*="Next" i], #next-activity-link, .nav-item-next a');
    if (nextActivityLink) {
      nextActivityLink.click();
      return { success: true, target: 'Next Activity', url: nextActivityLink.href };
    }

    return { success: false, reason: 'No next activity found in course curriculum' };
  }

  function findNextIncompleteQuiz(doc = document) {
    const plan = getCurriculumPlan(doc);
    const incompleteQuizzes = plan.items.filter(it => it.isQuiz && !it.isCompleted);
    return incompleteQuizzes[0] || null;
  }

  return {
    getCurriculumPlan,
    navigateToNextActivity,
    findNextIncompleteQuiz
  };
});
