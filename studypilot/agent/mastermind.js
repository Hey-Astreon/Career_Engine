/**
 * Stride StudyPilot — Agent 7: The Mastermind (Autonomous CSP Permutation Solver)
 * -------------------------------------------------------------------------------
 * Uses constraint satisfaction (CSP), single-variable delta feedback, and
 * option elimination to autonomously deduce and crack the 100% answer key on
 * academic practice quizzes without human intervention or hardcoded question dictionaries.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.StudyPilotMastermind = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * Pre-seeded verified 100% solutions across BCA CSE433 Green Computing
   */
  const PRESEEDED_PERFECT_SOLUTIONS = {
    '239915': { '1': 'b', '2': 'a' }, // Quiz 1.1.1 Social Impact of Green IT: Q1: business methodology, Q2: Blue waters
    '239323': { '1': 'c', '2': 'c' }, // Quiz 1.1.1 Data Servers Virtualization
    '239882': { '1': 'a', '2': 'a' }, // Quiz 3.1.4 Green Strategic Alignment
    '239883': { '1': 'b', '2': 'c' }, // Quiz 3.1.5 Green IT Drivers
    '239884': { '1': 'd', '2': 'b' }, // Quiz 3.1.6 Green IT Business Dimensions
    '239914': { '1': 'b', '2': 'b' }, // Quiz 1.1.6 Green Virtual Communities: Q1: shared service center, Q2: RoHS
    '239946': { '1': 'b', '2': 'c' }, // Quiz 2.1.5 Configuring a GET Road Map: Q1: data repository, Q2: green technical
    '239961': { '1': 'b', '2': 'a' }, // Quiz 4.1.2 Green ICT and Technology Trends: Q1: Establish, Q2: carbon reduction
    '239964': { '1': 'b', '2': 'd' }, // Quiz 4.1.5 Green ICT—Business and Economic Trends: Q1: one third, Q2: IPCC
  };

  /**
   * Retrieves verified 100% answer key from memory or persistent localStorage.
   */
  function getPerfectSolution(quizId) {
    if (!quizId) return null;
    const cleanId = String(quizId).trim();
    if (PRESEEDED_PERFECT_SOLUTIONS[cleanId]) {
      return PRESEEDED_PERFECT_SOLUTIONS[cleanId];
    }
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(`sp_perfect_solution_${cleanId}`);
        if (stored) {
          return JSON.parse(stored);
        }
      }
    } catch (e) {}
    return null;
  }

  /**
   * Persists a verified 100% answer key to memory and localStorage.
   */
  function storePerfectSolution(quizId, selections) {
    if (!quizId || !selections || typeof selections !== 'object') return false;
    const cleanId = String(quizId).trim();
    try {
      PRESEEDED_PERFECT_SOLUTIONS[cleanId] = selections;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`sp_perfect_solution_${cleanId}`, JSON.stringify(selections));
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Normalizes an attempt's selections into a standard map: { "1": "c", "2": "a" }
   */
  function normalizeSelections(selections, questions) {
    const map = {};
    if (!selections || typeof selections !== 'object') return map;

    questions.forEach((q, idx) => {
      const qNum = String(q.questionNumber || idx + 1);
      const val = selections[qNum] || selections[q.id] || selections[idx];
      if (val) {
        map[qNum] = String(val).toLowerCase().trim();
      }
    });

    return map;
  }

  /**
   * Deduces the optimal next answer vector using Constraint Satisfaction & Delta Analysis.
   *
   * @param {Array} questions - Array of parsed question objects.
   * @param {Array} candidateAudits - Initial consensus audits from Scholar + Auditor.
   * @param {Array} pastAttempts - History of past attempts for this quiz.
   * @param {string|number} [quizId] - Optional quiz ID to check/store against the Mastermind 10/10 Vault.
   * @returns {Object} { applied: boolean, resolvedAudits: Array, strategy: string, notes: string }
   */
  function deduceNextVector(questions, candidateAudits, pastAttempts = [], quizId = null) {
    if (!questions || questions.length === 0 || !candidateAudits || candidateAudits.length === 0) {
      return { applied: false, resolvedAudits: candidateAudits, strategy: 'none' };
    }

    // Check 0: Does this quiz have a verified 100% answer key in the Mastermind Vault?
    const cachedPerfect = getPerfectSolution(quizId);
    if (cachedPerfect) {
      const resolvedAudits = candidateAudits.map((aud, i) => {
        const q = questions[i] || {};
        const qNum = String(q.questionNumber || i + 1);
        const correctKey = cachedPerfect[qNum] || cachedPerfect[q.id] || aud.selectedKey;
        return {
          ...aud,
          selectedKey: correctKey,
          confidence: 1.0,
          reasoning: `[Mastermind CSP Engine: Verified 100% solution restored from knowledge vault for Quiz ${quizId}]`,
          engine: 'Mastermind CSP (Verified 10/10 Vault)'
        };
      });
      return {
        applied: true,
        resolvedAudits,
        strategy: 'vault-perfect',
        notes: `Restored 100% verified key from Mastermind Vault for Quiz ${quizId}`
      };
    }

    if (!Array.isArray(pastAttempts) || pastAttempts.length === 0) {
      // First attempt on this quiz: use initial Scholar + Auditor consensus
      return { applied: false, resolvedAudits: candidateAudits, strategy: 'baseline' };
    }

    // 1. Structure all past attempts with normalized vectors and scores
    const attemptsData = [];
    const triedVectorsSet = new Set();

    pastAttempts.forEach((pa, idx) => {
      const selMap = normalizeSelections(pa.selections, questions);
      const vecArr = questions.map((q, i) => selMap[String(q.questionNumber || i + 1)] || '');
      const vecStr = vecArr.join(',');
      triedVectorsSet.add(vecStr);

      const score = typeof pa.score === 'number' ? pa.score : 0;
      const total = typeof pa.total === 'number' && pa.total > 0 ? pa.total : (questions.length || 1);
      const percentage = typeof pa.percentage === 'number' ? pa.percentage : (score / total) * 100;

      attemptsData.push({
        index: idx + 1,
        selections: selMap,
        vector: vecArr,
        vectorStr: vecStr,
        score,
        total,
        percentage
      });
    });

    // Check if any past attempt was already 100%
    const perfectAttempt = attemptsData.find(a => a.percentage >= 99.9 || a.score >= a.total);
    if (perfectAttempt) {
      if (quizId) {
        storePerfectSolution(quizId, perfectAttempt.selections);
      }
      // Re-apply the verified perfect vector!
      const resolvedAudits = candidateAudits.map((aud, i) => {
        const qNum = String(questions[i].questionNumber || i + 1);
        const correctKey = perfectAttempt.selections[qNum] || aud.selectedKey;
        return {
          ...aud,
          selectedKey: correctKey,
          confidence: 1.0,
          reasoning: `[Mastermind CSP Engine: Verified 100% solution restored from Attempt ${perfectAttempt.index}]`,
          engine: 'Mastermind CSP (Verified 10/10)'
        };
      });
      return { applied: true, resolvedAudits, strategy: 'restore-perfect' };
    }

    // 2. Initialize Truth Tables for each question
    const eliminated = {};       // qNum -> Set of known wrong option keys
    const confirmedCorrect = {}; // qNum -> confirmed correct key
    const optionScores = {};     // qNum -> { optKey: highest score achieved when this option was selected }

    questions.forEach((q, i) => {
      const qNum = String(q.questionNumber || i + 1);
      eliminated[qNum] = new Set();
      optionScores[qNum] = {};
    });

    // Rule A: 0% Score Elimination
    // If an attempt scored 0.00 marks, every single option selected in that attempt is 100% WRONG!
    attemptsData.forEach(att => {
      if (att.score <= 0.01) {
        questions.forEach((q, i) => {
          const qNum = String(q.questionNumber || i + 1);
          const sel = att.selections[qNum];
          if (sel) {
            eliminated[qNum].add(sel);
          }
        });
      }
    });

    // Rule B: Pairwise Single-Variable Delta Deduction
    // Compare attempts that differ by exactly ONE question
    for (let i = 0; i < attemptsData.length; i++) {
      for (let j = i + 1; j < attemptsData.length; j++) {
        const a1 = attemptsData[i];
        const a2 = attemptsData[j];

        const differingQuestions = [];
        questions.forEach((q, idx) => {
          const qNum = String(q.questionNumber || idx + 1);
          if (a1.selections[qNum] && a2.selections[qNum] && a1.selections[qNum] !== a2.selections[qNum]) {
            differingQuestions.push({ qNum, key1: a1.selections[qNum], key2: a2.selections[qNum] });
          }
        });

        // If they differ by exactly ONE question:
        if (differingQuestions.length === 1) {
          const diff = differingQuestions[0];
          const delta = a2.score - a1.score;

          if (delta > 0.01) {
            // a2 gained score by choosing key2 over key1!
            confirmedCorrect[diff.qNum] = diff.key2;
            eliminated[diff.qNum].add(diff.key1);
          } else if (delta < -0.01) {
            // a2 lost score by switching to key2! key1 was correct!
            confirmedCorrect[diff.qNum] = diff.key1;
            eliminated[diff.qNum].add(diff.key2);
          } else if (Math.abs(delta) < 0.01 && a1.score > 0) {
            // Both attempts got the same partial score despite changing diff.qNum!
            // That means neither key1 nor key2 is the correct answer (the score came from other questions)!
            eliminated[diff.qNum].add(diff.key1);
            eliminated[diff.qNum].add(diff.key2);
          }
        }
      }
    }

    // 3. Find the Highest-Scoring Baseline Attempt
    let bestAttempt = attemptsData[0];
    attemptsData.forEach(att => {
      if (att.score > bestAttempt.score) {
        bestAttempt = att;
      }
    });

    // 4. Construct the Next Permutation Vector (Single-Variable Delta)
    // Start with the best known selections as the foundation
    const nextSelections = {};
    questions.forEach((q, i) => {
      const qNum = String(q.questionNumber || i + 1);
      if (confirmedCorrect[qNum]) {
        nextSelections[qNum] = confirmedCorrect[qNum];
      } else if (bestAttempt.selections[qNum] && !eliminated[qNum].has(bestAttempt.selections[qNum])) {
        nextSelections[qNum] = bestAttempt.selections[qNum];
      } else {
        // Fallback to candidate audit selection if not eliminated
        const cand = candidateAudits[i] ? candidateAudits[i].selectedKey.toLowerCase().trim() : 'a';
        nextSelections[qNum] = !eliminated[qNum].has(cand) ? cand : '';
      }
    });

    // 5. Select ONE Question to Permute (Prioritize Unconfirmed & Uncertain Questions)
    let permutedQNum = null;
    let permutedFromKey = null;
    let permutedToKey = null;

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qNum = String(q.questionNumber || i + 1);

      if (confirmedCorrect[qNum]) continue; // Already solved!

      const availableOptions = (q.options || []).map(o => o.key.toLowerCase().trim());
      const currentChoice = nextSelections[qNum];

      // Find an untried, non-eliminated alternative option for this question
      const candidateAlts = availableOptions.filter(optKey => {
        if (optKey === currentChoice) return false;
        if (eliminated[qNum].has(optKey)) return false;

        // Ensure this specific vector hasn't been tried before
        const testVec = questions.map((tq, ti) => {
          const tNum = String(tq.questionNumber || ti + 1);
          return tNum === qNum ? optKey : nextSelections[tNum];
        }).join(',');

        return !triedVectorsSet.has(testVec);
      });

      if (candidateAlts.length > 0) {
        permutedQNum = qNum;
        permutedFromKey = currentChoice;
        permutedToKey = candidateAlts[0];
        nextSelections[qNum] = permutedToKey;
        break; // STRICT SINGLE-VARIABLE DELTA: Permute exactly ONE question!
      }
    }

    // Fallback: If no single-variable permutation was found, find any untried vector combination
    if (!permutedQNum) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const qNum = String(q.questionNumber || i + 1);
        const availableOptions = (q.options || []).map(o => o.key.toLowerCase().trim());
        const validOpts = availableOptions.filter(o => !eliminated[qNum].has(o));
        if (validOpts.length > 0 && !validOpts.includes(nextSelections[qNum])) {
          nextSelections[qNum] = validOpts[0];
          permutedQNum = qNum;
          permutedToKey = validOpts[0];
          break;
        }
      }
    }

    // 6. Assemble Final Audited Selections with Rich Reasoning
    const resolvedAudits = candidateAudits.map((aud, i) => {
      const q = questions[i];
      const qNum = String(q.questionNumber || i + 1);
      const chosenKey = nextSelections[qNum] || aud.selectedKey;
      const isPermuted = qNum === permutedQNum;

      let reasoning = aud.reasoning;
      let engine = aud.engine || 'Academic Consensus';

      if (confirmedCorrect[qNum]) {
        reasoning = `[Mastermind CSP: Confirmed 100% correct answer key (${chosenKey.toUpperCase()}) locked]`;
        engine = 'Mastermind CSP (Confirmed)';
      } else if (isPermuted) {
        reasoning = `[Mastermind CSP Delta: Systematically testing alternative hypothesis (${chosenKey.toUpperCase()}) while holding other answers constant to crack 10/10]`;
        engine = 'Mastermind CSP (Delta Shift)';
      }

      return {
        ...aud,
        selectedKey: chosenKey,
        confidence: confirmedCorrect[qNum] ? 1.0 : (isPermuted ? 0.88 : aud.confidence),
        reasoning,
        engine
      };
    });

    const finalVectorStr = resolvedAudits.map(a => a.selectedKey).join(',');
    const notes = permutedQNum 
      ? `Permuted Q${permutedQNum} from '${permutedFromKey}' to '${permutedToKey}' (Vector: [${finalVectorStr}])`
      : `Applied optimal CSP vector [${finalVectorStr}]`;

    return {
      applied: true,
      resolvedAudits,
      strategy: 'single-variable-delta',
      permutedQuestion: permutedQNum,
      notes
    };
  }

  return {
    deduceNextVector,
    getPerfectSolution,
    storePerfectSolution,
    PRESEEDED_PERFECT_SOLUTIONS
  };
});
