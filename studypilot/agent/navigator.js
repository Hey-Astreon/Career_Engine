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

  // Strictly filter only non-credit items that have NO radio button / completion tracking in AMIGO
  const NON_CREDIT_REGEX = /\b(announcements?|discussion\s*forum|interactive\s*slm|virtual\s*lab|student\s*support|planner|beSocial|e-magazine|academic\s*planner|help\s*us\s*plan|course\s*objectives|learning\s*outcomes)\b/i;
  const NON_CURRICULUM_REGEX = NON_CREDIT_REGEX;

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
    // ONLY follow if it points to an academic curriculum topic (not static non-credit links!)
    const nextActivityLink = doc.querySelector(
      '#next-activity-link a, #next-activity-link, .activity-navigation .next a, a[title*="Next" i], .nav-item-next a, .activity-navigation a[title*="Next" i]'
    );
    if (nextActivityLink) {
      const linkText = (nextActivityLink.innerText || nextActivityLink.textContent || (typeof nextActivityLink.getAttribute === 'function' && nextActivityLink.getAttribute('title')) || '').trim();
      const linkHref = nextActivityLink.href || (typeof nextActivityLink.getAttribute === 'function' && nextActivityLink.getAttribute('href')) || '';
      
      if (!NON_CURRICULUM_REGEX.test(linkText) && !NON_CURRICULUM_REGEX.test(linkHref)) {
        if (typeof nextActivityLink.click === 'function') {
          nextActivityLink.click();
          return { success: true, target: linkText || 'Next Activity', url: linkHref };
        }
        if (linkHref) {
          window.location.href = linkHref;
          return { success: true, target: linkText || 'Next Activity', url: linkHref };
        }
      }
    }

    // Strategy 4: Text search across all links (strictly ignoring non-curriculum links)
    const allLinks = Array.from(doc.querySelectorAll('a.btn, .activity-navigation a, a'));
    for (const link of allLinks) {
      const txt = (link.innerText || link.textContent || '').trim().toLowerCase();
      const href = link.href || '';
      if (NON_CURRICULUM_REGEX.test(txt) || NON_CURRICULUM_REGEX.test(href)) {
        continue;
      }
      if (txt.includes('next activity') || txt === 'next >' || txt.includes('next chapter') || txt.includes('next topic')) {
        link.click();
        return { success: true, target: link.innerText.trim(), url: link.href };
      }
    }

    // Strategy 5: Ultimate Rescue — find any incomplete academic activity across the whole course!
    const finalRescue = findNextIncompleteActivity(doc);
    if (finalRescue) {
      if (finalRescue.element && typeof finalRescue.element.click === 'function') {
        finalRescue.element.click();
        return { success: true, target: finalRescue.title, url: finalRescue.href };
      }
      if (finalRescue.href) {
        window.location.href = finalRescue.href;
        return { success: true, target: finalRescue.title, url: finalRescue.href };
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
