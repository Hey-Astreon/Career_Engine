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
  // Strictly filter only non-credit items that have NO radio button / completion tracking in AMIGO
  const NON_CREDIT_REGEX = /\b(announcements?|discussion\s*forum|interactive\s*slm|virtual\s*lab|student\s*support|planner|beSocial|e-magazine|academic\s*planner|help\s*us\s*plan|course\s*objectives|learning\s*outcomes)\b/i;
  const NON_CURRICULUM_REGEX = NON_CREDIT_REGEX;
  const CURRICULUM_TITLE_REGEX = /^\s*[✓o○\s]*(live\s*class|\d+\.\d+|quiz\s*:|syllabus|glossary|study\s*material|audio\s*slm|.*module.*assessment|\d+[a-z]{2}\s*module)/i;

  function extractCourseContext(doc = document) {
    const parts = [];

    // 1. Extract full breadcrumb hierarchy if present (e.g. Course > Module > Topic)
    const breadcrumbContainer = doc.querySelector('nav.breadcrumb, .breadcrumb, ol.breadcrumb, nav[aria-label*="breadcrumb" i]');
    if (breadcrumbContainer) {
      const items = Array.from(breadcrumbContainer.querySelectorAll('li, a, span'))
        .map(el => (el.innerText || el.textContent || '').trim())
        .filter(t => t.length > 1 && !['home', 'my courses', 'courses', 'amigo dashboard', '/', '»', '>', '·'].includes(t.toLowerCase()));
      
      const uniqueItems = Array.from(new Set(items));
      if (uniqueItems.length > 0) {
        parts.push(uniqueItems.join(' > '));
      }
    }

    // 2. Check page title or headings
    const titleEl = doc.querySelector('.page-header-headings h1, h1, .course-header');
    const titleText = titleEl ? (titleEl.innerText || titleEl.textContent || '').trim() : '';

    // 3. Check sidebar course name or AMIGO title
    const courseEl = doc.querySelector('.course-title, #course-index, .course-header, .header-title');
    const courseText = courseEl ? (courseEl.innerText || courseEl.textContent || '').trim() : '';

    // 4. Document Title fallback (e.g. "Quiz : 4.1.2 Green Values in Practice" or "2_Sem 3_CSE433")
    const docTitle = doc.title ? doc.title.split('|')[0].trim() : '';

    if (parts.length > 0) {
      return parts.join(' | ');
    }

    return titleText || courseText || docTitle || 'Amity University BCA Course';
  }

  function detectPageMode(doc = document, currentUrl = (typeof window !== 'undefined' ? window.location.href : '')) {
    if (currentUrl.includes('/mod/quiz/processattempt.php') || (doc.title && doc.title.toLowerCase().includes('error'))) {
      return 'quiz-process-error';
    }
    if (currentUrl.includes('/mod/quiz/summary.php') || (doc.querySelector && doc.querySelector('.quizsummary'))) {
      return 'quiz-summary';
    }
    if (currentUrl.includes('/mod/quiz/review.php')) {
      return 'quiz-review';
    }
    if (currentUrl.includes('/mod/quiz/attempt.php') || (doc.querySelector && doc.querySelector('.que'))) {
      return 'quiz-attempt';
    }
    if (currentUrl.includes('/mod/quiz/view.php')) {
      return 'quiz-view';
    }
    if (currentUrl.includes('/mod/googlemeet/')) {
      return 'live-class';
    }
    if (currentUrl.includes('/mod/resource/')) {
      return 'resource-page';
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
      // 1. Question ID or Index & Marks / Weight
      const id = node.id || `question-${index + 1}`;
      const qnoEl = node.querySelector('.info .no, .qno, h3.no');
      const questionNumber = qnoEl ? qnoEl.textContent.replace(/[^0-9]/g, '') : String(index + 1);

      // Extract question marks / weight (e.g. "Marked out of 4.00" or "Marked out of 2.00")
      let marks = 1.0;
      const gradeEl = node.querySelector('.info .grade, .grade, .state');
      if (gradeEl) {
        const gTxt = (gradeEl.innerText || gradeEl.textContent || '').trim();
        const m = gTxt.match(/marked\s*out\s*of\s*([0-9\.]+)/i) || gTxt.match(/([0-9\.]+)\s*marks?/i);
        if (m) {
          marks = parseFloat(m[1]) || 1.0;
        }
      }

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

        // Robust Option Key & Text Extraction (Immune to Leading Numbers in CleanText)
        // 1. Check for dedicated Moodle answer number element (e.g. <span class="answernumber">a. </span>)
        const answerNumberEl = (label && typeof label.querySelector === 'function')
          ? label.querySelector('.answernumber')
          : ((optNode && typeof optNode.querySelector === 'function') ? optNode.querySelector('.answernumber') : null);

        let key = '';
        let cleanText = rawText;

        if (answerNumberEl && answerNumberEl !== label) {
          const numTxt = (answerNumberEl.innerText || answerNumberEl.textContent || '').trim();
          // Answer numbers are strictly short tokens like "a.", "b)", "(c)" (<= 4 chars)
          if (numTxt.length <= 4) {
            const m = numTxt.match(/^([a-z])[\.\)]?/i);
            if (m) {
              key = m[1].toLowerCase();
              cleanText = rawText.replace(new RegExp('^' + numTxt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*', 'i'), '').trim();
            }
          }
        }

        if (!key) {
          // Strictly match single letter a-z followed by dot or paren and whitespace: e.g. "a. " or "B) "
          // NEVER match numbers [0-9] so numeric options like "1.5 degrees" or "2.0 PUE" are NOT corrupted!
          const letterMatch = rawText.match(/^([a-z])[\.\)]\s+(.*)/i);
          if (letterMatch) {
            key = letterMatch[1].toLowerCase();
            cleanText = letterMatch[2].trim();
          } else {
            // Canonical zero-index fallback: 0 -> 'a', 1 -> 'b', 2 -> 'c', 3 -> 'd'
            key = String.fromCharCode(97 + optIdx);
            cleanText = rawText;
          }
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
        marks, // Question marks / weight (1.0, 2.0, 4.0)
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

      // Strictly skip non-credit links like announcements, discussion forums, interactive slm
      if (NON_CREDIT_REGEX.test(rawText) || NON_CREDIT_REGEX.test(href)) {
        return;
      }

      // Check if it's a credit item: numbered topic, quiz, lecture, live class, or study material
      const isNumbered = CURRICULUM_TITLE_REGEX.test(rawText);
      const isQuiz = rawText.toLowerCase().includes('quiz') || href.includes('/mod/quiz/');
      const isLecture = href.includes('/mod/page/') || href.includes('/mod/lesson/');
      const isLiveClass = href.includes('/mod/googlemeet/') || /live\s*class/i.test(rawText);
      const isResource = href.includes('/mod/resource/') || /study\s*material|syllabus|glossary|audio\s*slm/i.test(rawText);

      if (!isNumbered && !isQuiz && !isLecture && !isLiveClass && !isResource) {
        return;
      }

      if (seenHrefs.has(href)) return;
      seenHrefs.add(href);

      const hasCheckmark = rawText.includes('✓') || rawText.includes('\u2713') || rawText.includes('\u2714') ||
        (typeof node.querySelector === 'function' && node.querySelector('.fa-check, .completion-check, .activity-completed') !== null) ||
        Boolean(typeof node.getAttribute === 'function' && node.getAttribute('aria-label') && (node.getAttribute('aria-label').includes('Completed') || node.getAttribute('aria-label').includes('Done')));

      const isExplicitPending = rawText.startsWith('○') || rawText.startsWith('o ') || rawText.startsWith('O ') || rawText.includes('\u25CB') ||
        (typeof node.querySelector === 'function' && node.querySelector('.fa-circle-o, .fa-circle-thin') !== null) ||
        Boolean(typeof node.getAttribute === 'function' && node.getAttribute('aria-label') && (node.getAttribute('aria-label').includes('Not completed') || node.getAttribute('aria-label').includes('To do')));

      // Check if this is an imperfect practice quiz that student still needs to master (Target: 100%)
      let hasImperfectPracticeScore = false;
      const quizId = (href.match(/[?&]id=([0-9]+)/) || [])[1] || '';
      if (isQuiz && quizId && typeof localStorage !== 'undefined') {
        try {
          const outcomeRaw = localStorage.getItem(`sp_quiz_outcome_${quizId}`);
          if (outcomeRaw) {
            const outcome = JSON.parse(outcomeRaw);
            if (!outcome.isPerfect && !outcome.isHighStakes && !outcome.accepted) {
              hasImperfectPracticeScore = true;
            }
          }
        } catch (e) {}
      }

      const isCompleted = hasCheckmark && !isExplicitPending && !hasImperfectPracticeScore;

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

  function hasPassiveViewCompletion(doc = document) {
    const candidates = Array.from(doc.querySelectorAll('.badge, .completion-info, [data-region="completion-info"], span, div'));
    for (const el of candidates) {
      const txt = (el.innerText || el.textContent || '').trim();
      if (/done:\s*view/i.test(txt)) {
        return true;
      }
    }
    return false;
  }

  function extractQuizGrade(doc = document) {
    const textNodes = Array.from(doc.querySelectorAll('h2, h3, h4, p, div.feedback, .quizinfo, .generaltable, .box, div, td, th'));

    // Priority 1: Search specifically for "Highest grade", "Final grade", "Your final grade for this quiz is", or "Overall grade"
    // STRICTLY skip "Grade to pass: 15.00 out of 30.00" threshold text!
    for (const node of textNodes) {
      const txt = (node.innerText || node.textContent || '').trim();
      if (/grade\s*to\s*pass|passing\s*grade/i.test(txt)) {
        continue;
      }
      const match = txt.match(/(?:highest\s*grade|final\s*grade|overall\s*grade|your\s*final\s*grade[^0-9]*)[^0-9]*(?:is|:)?\s*([0-9\.]+)\s*(?:\/|\s*out of\s*)\s*([0-9\.]+)/i);
      if (match) {
        const score = parseFloat(match[1]);
        const total = parseFloat(match[2]);
        const percentage = total > 0 ? (score / total) * 100 : 0;
        const isPerfect = total > 0 && Math.abs(score - total) < 0.01;
        return {
          hasGrade: true,
          score,
          total,
          percentage,
          isPerfect,
          gradeText: `${score} / ${total}`
        };
      }
    }

    // Priority 2: Fallback for other grade labels (strictly ignoring "Grade to pass")
    for (const node of textNodes) {
      const txt = (node.innerText || node.textContent || '').trim();
      if (/grade\s*to\s*pass|passing\s*grade/i.test(txt)) {
        continue;
      }
      const match = txt.match(/(?:your\s*grade|grade)[^0-9]*(?:is|:)?\s*([0-9\.]+)\s*(?:\/|\s*out of\s*)\s*([0-9\.]+)/i);
      if (match) {
        const score = parseFloat(match[1]);
        const total = parseFloat(match[2]);
        const percentage = total > 0 ? (score / total) * 100 : 0;
        const isPerfect = total > 0 && Math.abs(score - total) < 0.01;
        return {
          hasGrade: true,
          score,
          total,
          percentage,
          isPerfect,
          gradeText: `${score} / ${total}`
        };
      }
    }

    return { hasGrade: false, score: 0, total: 0, percentage: 0, isPerfect: false, gradeText: '' };
  }

  function extractQuizAttemptsHistory(doc = document) {
    const rows = Array.from(doc.querySelectorAll('.generaltable tbody tr, .quizattemptsummary tbody tr, table tr'));
    const attempts = [];

    rows.forEach((tr) => {
      const text = (tr.innerText || tr.textContent || '').trim();
      if (!/attempt\s*\d+/i.test(text)) return;

      const marksMatch = text.match(/marks?[^:\d]*:\s*([0-9\.]+)\s*(?:\/|\s*out of\s*)\s*([0-9\.]+)/i) ||
                         text.match(/([0-9\.]+)\s*\/\s*([0-9\.]+)/);
      const gradeMatch = text.match(/grade[^:\d]*:\s*([0-9\.]+)\s*(?:\/|\s*out of\s*)\s*([0-9\.]+)/i);

      const attemptMatch = text.match(/attempt\s*([0-9]+)/i);
      const attemptNum = attemptMatch ? parseInt(attemptMatch[1], 10) : attempts.length + 1;

      if (marksMatch || gradeMatch) {
        const score = marksMatch ? parseFloat(marksMatch[1]) : (gradeMatch ? parseFloat(gradeMatch[1]) : 0);
        const total = marksMatch ? parseFloat(marksMatch[2]) : (gradeMatch ? parseFloat(gradeMatch[2]) : 0);
        attempts.push({
          attemptNumber: attemptNum,
          score,
          total,
          percentage: total > 0 ? (score / total) * 100 : 0,
          gradeText: gradeMatch ? `${gradeMatch[1]}/${gradeMatch[2]}` : `${score}/${total}`
        });
      }
    });

    // Fallback: Card or Div layout in Moodle Boost
    if (attempts.length === 0) {
      const candidateDivs = Array.from(doc.querySelectorAll('div, td, table, section')).filter(el => {
        const h = el.querySelector('h3, h4, th, strong');
        return h && /attempt\s*\d+/i.test(h.innerText || '');
      });

      candidateDivs.forEach((div) => {
        const txt = div.innerText || div.textContent || '';
        const attemptMatch = txt.match(/attempt\s*([0-9]+)/i);
        const marksMatch = txt.match(/marks?[^:\d]*\s*([0-9\.]+)\s*\/\s*([0-9\.]+)/i);
        const gradeMatch = txt.match(/grade[^:\d]*\s*([0-9\.]+)\s*(?:out of|\/)\s*([0-9\.]+)/i);
        if (marksMatch || gradeMatch) {
          attempts.push({
            attemptNumber: attemptMatch ? parseInt(attemptMatch[1], 10) : attempts.length + 1,
            score: marksMatch ? parseFloat(marksMatch[1]) : parseFloat(gradeMatch[1]),
            total: marksMatch ? parseFloat(marksMatch[2]) : parseFloat(gradeMatch[2]),
            percentage: marksMatch ? (parseFloat(marksMatch[1]) / parseFloat(marksMatch[2])) * 100 : 0,
            gradeText: gradeMatch ? `${gradeMatch[1]}/${gradeMatch[2]}` : ''
          });
        }
      });
    }

    // Sort by attempt number ascending
    attempts.sort((a, b) => a.attemptNumber - b.attemptNumber);

    // --- Phase 144: Enhanced Stagnation & Regression Detection ---
    let isStagnant = false;
    let consecutiveStagnantCount = 0;
    let consecutiveZeroCount = 0;
    let scoreRegressed = false;
    let bestScore = 0;

    // Compute best historical score and consecutive-zero trailing count
    for (const a of attempts) {
      if (a.score > bestScore) bestScore = a.score;
    }
    // Count trailing zero-score attempts (from newest backward)
    for (let i = attempts.length - 1; i >= 0; i--) {
      if (attempts[i].percentage < 0.01) {
        consecutiveZeroCount++;
      } else {
        break;
      }
    }

    if (attempts.length >= 2) {
      const last = attempts[attempts.length - 1];
      const prev = attempts[attempts.length - 2];

      // Classic stagnation: two equal consecutive scores (not perfect)
      if (Math.abs(last.score - prev.score) < 0.01 && last.percentage < 99) {
        consecutiveStagnantCount = 1;
        if (attempts.length >= 3) {
          const prev2 = attempts[attempts.length - 3];
          if (Math.abs(prev.score - prev2.score) < 0.01) {
            consecutiveStagnantCount = 2;
          }
        }
        isStagnant = true;
      }

      // Score regression: latest score is less than 50% of the best historical score
      // e.g. 5/10 on Attempt 1 → 0/10 on Attempt 2 = regression (0 < 0.5 * 5)
      if (bestScore > 0 && last.score < bestScore * 0.5 && last.percentage < 99) {
        scoreRegressed = true;
      }
    }

    return {
      attempts,
      totalAttempts: attempts.length,
      isStagnant,
      consecutiveStagnantCount,
      consecutiveZeroCount,
      scoreRegressed,
      bestScore,
      lastAttempt: attempts.length > 0 ? attempts[attempts.length - 1] : null
    };
  }

  return {
    parseMoodleQuestions,
    extractCourseContext,
    detectPageMode,
    parseCurriculum,
    hasPassiveViewCompletion,
    extractQuizGrade,
    extractQuizAttemptsHistory
  };
});
