/**
 * Agent 1: The Scribe (Perception, Traps & Curriculum Sensor)
 * -----------------------------------------------------------
 * Scrapes Amity Online (AMIGO) & Moodle quiz questions, options,
 * and syllabus navigation tree from the live DOM.
 * Detects negative constraint traps and dual-option traps.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.StudyPilotScribe = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const NEGATIVE_REGEX = /\b(not|except|incorrect|false|never|unlikely|cannot)\b/i;
  const DUAL_OPTION_REGEX = /\b(both of these|both a and b|both b and c|all of the above|all of these|none of these|none of the above|neither)\b/i;
  const NON_CURRICULUM_REGEX = /\b(glossary|syllabus|live class|announcement|discussion forum|interactive slm|audio slm|virtual lab|student support|planner|beSocial)\b/i;
  const CURRICULUM_TITLE_REGEX = /^\s*[✓o○\s]*(\d+\.\d+|quiz\s*:|.*module.*assessment|\d+[a-z]{2}\s*module)/i;

  function extractCourseContext(doc = document) {
    // 1. Check page title or breadcrumbs
    const titleEl = doc.querySelector('.page-header-headings h1, .breadcrumb, h1, .course-header');
    const titleText = titleEl ? (titleEl.innerText || titleEl.textContent || '').trim() : '';

    // 2. Check sidebar course name or AMIGO title
    const courseEl = doc.querySelector('.course-title, #course-index, .course-header, .header-title');
    const courseText = courseEl ? (courseEl.innerText || courseEl.textContent || '').trim() : '';

    // 3. Document Title fallback (e.g. "Quiz : 4.1.2 Green Values in Practice" or "2_Sem 3_CSE433")
    const docTitle = doc.title ? doc.title.split('|')[0].trim() : '';

    return titleText || courseText || docTitle || 'Amity University BCA Course';
  }

  function detectPageMode(doc = document, currentUrl = (typeof window !== 'undefined' ? window.location.href : '')) {
    if (currentUrl.includes('/mod/quiz/summary.php') || (doc.querySelector && doc.querySelector('.quizsummary'))) {
      return 'quiz-summary';
    }
    if (currentUrl.includes('/mod/quiz/review.php')) {
      return 'quiz-review';
    }
    if (currentUrl.includes('/mod/quiz/attempt.php') || (doc.querySelector && doc.querySelector('.que'))) {
      return 'quiz-attempt';
    }
    if (currentUrl.includes('/mod/quiz/view.php') || (doc.querySelector && doc.querySelector('.quizinfo, #intro, input[value*="Attempt quiz" i], button[value*="Attempt quiz" i]'))) {
      return 'quiz-view';
    }
    if (currentUrl.includes('/mod/page/view.php') || currentUrl.includes('/mod/lesson/') || (doc.querySelector && doc.querySelector('.modtype_page, video, iframe[src*="video"]'))) {
      return 'lecture-page';
    }
    if (currentUrl.includes('/course/view.php') || currentUrl.includes('/my/')) {
      return 'course-home';
    }
    return 'unknown';
  }

  function parseMoodleQuestions(doc = document) {
    const questionNodes = doc.querySelectorAll('.que.multichoice, .que.truefalse, .que.shortanswer, .que, div[id^="question-"]');
    const questions = [];

    questionNodes.forEach((node, index) => {
      // 1. Question ID or Index
      const id = node.id || `question-${index + 1}`;
      const qnoEl = node.querySelector('.info .no, .qno, h3.no');
      const questionNumber = qnoEl ? qnoEl.textContent.replace(/[^0-9]/g, '') : String(index + 1);

      // 2. Question Text
      const qtextEl = node.querySelector('.qtext, .formulation .qtext, .formulation');
      if (!qtextEl) return;

      // Extract question text without answers
      let questionText = '';
      const pureQText = node.querySelector('.qtext');
      if (pureQText) {
        questionText = (pureQText.innerText || pureQText.textContent || '').trim();
      } else {
        // Clone and strip answer section
        const clone = qtextEl.cloneNode(true);
        const ansSection = clone.querySelector('.answer');
        if (ansSection) ansSection.remove();
        questionText = (clone.innerText || clone.textContent || '').trim();
      }

      if (!questionText) return;

      // 3. Extract Options
      const options = [];
      let optionContainers = Array.from(node.querySelectorAll('.answer > div, .answer .r0, .answer .r1, .answer .form-check, .answer label, .formulation .answer > div'));

      // Fallback: search all inputs inside the question
      if (optionContainers.length === 0) {
        const directInputs = Array.from(node.querySelectorAll('input[type="radio"], input[type="checkbox"]'));
        optionContainers = directInputs.map(inp => inp.closest('label') || inp.parentElement).filter(Boolean);
      }

      optionContainers.forEach((optNode, optIdx) => {
        let input = optNode.querySelector('input[type="radio"], input[type="checkbox"]');
        if (!input && optNode.tagName === 'INPUT') {
          input = optNode;
        }

        if (!input) {
          // Check sibling input or by ID
          const labelFor = optNode.getAttribute && optNode.getAttribute('for');
          if (labelFor) {
            input = doc.getElementById(labelFor);
          }
        }

        if (!input) return;

        // Extract label element
        let label = optNode.tagName === 'LABEL' ? optNode : optNode.querySelector('label');
        if (!label && input.id) {
          label = doc.querySelector(`label[for="${input.id}"]`);
        }
        if (!label) label = optNode;

        const rawText = (label.innerText || label.textContent || '').trim();

        // Extract option key (e.g. "a", "b", "c", "d" or option index)
        const letterMatch = rawText.match(/^([a-z0-9])[\.\)]\s*(.*)/i);
        let key = '';
        let cleanText = rawText;

        if (letterMatch) {
          key = letterMatch[1].toLowerCase();
          cleanText = letterMatch[2].trim();
        } else {
          key = String.fromCharCode(97 + optIdx); // fallback 'a', 'b', 'c', 'd'
        }

        // Avoid duplicate options
        if (!options.some(o => o.key === key && o.inputId === input.id)) {
          options.push({
            key,
            rawText,
            cleanText,
            inputId: input.id,
            inputName: input.name,
            inputElement: input,
            labelElement: label,
            isCheckbox: input.type === 'checkbox'
          });
        }
      });

      // 4. Trap Detection
      const hasNegativeConstraint = NEGATIVE_REGEX.test(questionText);
      const hasDualOptionTrap = options.some(opt => DUAL_OPTION_REGEX.test(opt.cleanText));

      questions.push({
        id,
        questionNumber: parseInt(questionNumber, 10) || index + 1,
        questionText,
        options,
        isMultipleChoice: options.some(o => o.isCheckbox),
        traps: {
          hasNegativeConstraint,
          hasDualOptionTrap
        },
        containerElement: node
      });
    });

    return {
      courseContext: extractCourseContext(doc),
      questionsCount: questions.length,
      questions
    };
  }

  function isUrlActive(itemHref, currentHref) {
    if (!itemHref || !currentHref) return false;
    try {
      const uItem = new URL(itemHref, 'https://amigo.amityonline.com');
      const uCurr = new URL(currentHref, 'https://amigo.amityonline.com');
      if (uItem.pathname !== uCurr.pathname) return false;

      const idItem = uItem.searchParams.get('id');
      const idCurr = uCurr.searchParams.get('id');
      if (idItem && idCurr) {
        return idItem === idCurr;
      }

      const attItem = uItem.searchParams.get('attempt');
      const attCurr = uCurr.searchParams.get('attempt');
      if (attItem && attCurr) {
        return attItem === attCurr;
      }

      const cmidItem = uItem.searchParams.get('cmid');
      const cmidCurr = uCurr.searchParams.get('cmid');
      if (cmidItem && cmidCurr) {
        return cmidItem === cmidCurr;
      }

      return uItem.search === uCurr.search;
    } catch (e) {
      return itemHref === currentHref;
    }
  }

  function parseCurriculum(doc = document, currentUrl = (typeof window !== 'undefined' ? window.location.href : '')) {
    // Queries sidebar drawer curriculum items from AMIGO / Moodle
    let linkNodes = Array.from(doc.querySelectorAll(
      '#nav-drawer a, .courseindex a, .drawer-content a, .list-group a, #course-index a, .course-index a, .courseindex-section a, .activity-item a'
    ));

    // Fallback only if no sidebar drawer items were found
    if (linkNodes.length === 0) {
      linkNodes = Array.from(doc.querySelectorAll('a[href*="/mod/page/"], a[href*="/mod/quiz/"], a[href*="/mod/lesson/"]'));
    }

    const items = [];
    const seenHrefs = new Set();

    linkNodes.forEach((node) => {
      const href = node.getAttribute('href') || '';
      if (!href || href === '#' || href.startsWith('javascript:')) return;

      const rawText = (node.innerText || node.textContent || '').trim();
      if (!rawText) return;

      // Strictly skip non-curriculum links like glossary, syllabus, live classes, forums
      if (NON_CURRICULUM_REGEX.test(rawText) || NON_CURRICULUM_REGEX.test(href)) {
        return;
      }

      // Ensure it is an academic topic (numbered chapter, quiz, or module assessment)
      const isNumbered = CURRICULUM_TITLE_REGEX.test(rawText);
      const isQuiz = rawText.toLowerCase().includes('quiz') || href.includes('/mod/quiz/');
      const isLecture = href.includes('/mod/page/') || href.includes('/mod/lesson/');

      if (!isNumbered && !isQuiz && !href.includes('/mod/quiz/')) {
        return;
      }

      if (seenHrefs.has(href)) return;
      seenHrefs.add(href);

      const isCompleted = rawText.includes('✓') || 
                          (typeof node.querySelector === 'function' && node.querySelector('.fa-check, .completion-info, .autocompletion') !== null) ||
                          Boolean(typeof node.getAttribute === 'function' && node.getAttribute('aria-label') && node.getAttribute('aria-label').includes('Completed'));

      const isCurrent = (node.classList && node.classList.contains('active')) || 
                        (typeof node.getAttribute === 'function' && node.getAttribute('aria-current') === 'true') ||
                        isUrlActive(href, currentUrl);

      items.push({
        title: rawText.replace(/^[✓○o\s]+/, '').trim(),
        rawTitle: rawText,
        href,
        isQuiz,
        isLecture,
        isCompleted,
        isCurrent,
        element: node
      });
    });

    // Determine current & next activity
    let currentIndex = items.findIndex(it => it.isCurrent);
    if (currentIndex === -1 && currentUrl) {
      currentIndex = items.findIndex(it => isUrlActive(it.href, currentUrl));
    }

    const currentItem = currentIndex >= 0 ? items[currentIndex] : null;
    const nextItem = currentIndex >= 0 && currentIndex + 1 < items.length ? items[currentIndex + 1] : null;

    return {
      items,
      currentItem,
      nextItem,
      totalCount: items.length
    };
  }

  return {
    parseMoodleQuestions,
    extractCourseContext,
    detectPageMode,
    parseCurriculum
  };
});
