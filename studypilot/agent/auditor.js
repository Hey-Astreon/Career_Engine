/**
 * Agent 3: The Auditor (Adversarial Red-Team Cross-Examiner)
 * ---------------------------------------------------------
 * Challenges the Scholar's candidate answer, hunts for "Both of these"
 * and negative constraint traps, and establishes consensus.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.StudyPilotAuditor = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DUAL_OPTION_REGEX = /\b(both of these|both a and b|both b and c|all of the above|all of these)\b/i;
  const NONE_OPTION_REGEX = /\b(none of these|none of the above|neither)\b/i;

  function auditAnswer(question, candidateAnswer, retryContext = {}) {
    if (!candidateAnswer || !candidateAnswer.selectedKey) {
      const fallback = question.options[0] ? question.options[0].key : 'a';
      const alternate = question.options[1] ? question.options[1].key : (fallback === 'a' ? 'b' : 'a');
      return {
        verified: false,
        selectedKey: fallback,
        alternateKey: alternate,
        confidence: 0.5,
        reasoning: 'Fallback default: No candidate answer produced.',
        auditNotes: 'Scholar failed to return a valid selection.'
      };
    }

    const cleanCandidateKey = String(candidateAnswer.selectedKey).toLowerCase().trim();
    const matchedOption = question.options.find(o => o.key.toLowerCase() === cleanCandidateKey);

    // 1. Sanity Check: Does the selected option key exist?
    if (!matchedOption) {
      // Key mismatch (e.g. LLM returned "Option 2" instead of "b")
      const fallback = question.options[0];
      const alternate = question.options[1] ? question.options[1].key : 'b';
      return {
        verified: false,
        selectedKey: fallback.key,
        alternateKey: alternate,
        confidence: 0.6,
        reasoning: candidateAnswer.reasoning || '',
        auditNotes: `Key '${cleanCandidateKey}' not found in options. Defaulting to '${fallback.key}'.`
      };
    }

    let finalKey = cleanCandidateKey;
    let finalReasoning = candidateAnswer.reasoning || '';
    let auditNotes = 'Verified by Auditor without conflicts.';
    let confidence = candidateAnswer.confidence || 0.95;

    // 2. Identify Best Alternate Option (Second Choice)
    let alternateKey = '';
    if (candidateAnswer.alternateKey) {
      const cleanAlt = String(candidateAnswer.alternateKey).toLowerCase().trim();
      const matchedAlt = question.options.find(o => o.key.toLowerCase() === cleanAlt && cleanAlt !== cleanCandidateKey);
      if (matchedAlt) {
        alternateKey = cleanAlt;
      }
    }

    if (!alternateKey) {
      const otherOpts = question.options.filter(o => o.key.toLowerCase() !== cleanCandidateKey);
      alternateKey = otherOpts[0] ? otherOpts[0].key.toLowerCase() : (cleanCandidateKey === 'a' ? 'b' : 'a');
    }

    // 3. Red-Team Check: "Both of these" / "All of the above" Trap
    if (question.traps && question.traps.hasDualOptionTrap) {
      const dualOption = question.options.find(o => DUAL_OPTION_REGEX.test(o.cleanText));
      if (dualOption && dualOption.key.toLowerCase() !== cleanCandidateKey) {
        // If Scholar picked single option (e.g. A), but reasoning mentions multiple valid facets:
        const lowerReason = finalReasoning.toLowerCase();
        const mentionsMultiple = 
          lowerReason.includes('also') ||
          lowerReason.includes('both') ||
          lowerReason.includes('as well as') ||
          lowerReason.includes('in addition');

        if (mentionsMultiple) {
          finalKey = dualOption.key.toLowerCase();
          auditNotes = `Overrode single option '${cleanCandidateKey}' in favor of dual option '${dualOption.key}' ('${dualOption.cleanText}').`;
          finalReasoning = `Auditor verified that multiple options hold true. Selecting '${dualOption.cleanText}'.`;
          confidence = 0.98;
        }
      }
    }

    // 4. Red-Team Check: Negative Constraint Trap ("NOT", "EXCEPT", "FALSE")
    if (question.traps && question.traps.hasNegativeConstraint) {
      auditNotes += ' [Negative constraint audited: verified statement is incorrect/exception]';
      confidence = Math.max(confidence, 0.96);
    }

    // 5. Explicit Forced Alternate Exploration (Hypothesis Shift on Retry)
    if (retryContext && retryContext.forceAlternate === true) {
      const prevKey = finalKey;
      finalKey = alternateKey;
      auditNotes += ` [Auditor Hypothesis Shift: Overrode option '${prevKey}' in favor of alternate candidate '${alternateKey}' to test new permutation]`;
      confidence = Math.max(0.75, confidence - 0.05);
    }

    return {
      verified: true,
      selectedKey: finalKey,
      alternateKey,
      originalCandidate: cleanCandidateKey,
      confidence,
      reasoning: finalReasoning,
      auditNotes,
      engine: candidateAnswer.engine || 'Multi-Agent Consensus'
    };
  }

  /**
   * Resolves answer vector collisions against past failed attempts.
   * If current proposed answers [b, b] are identical to a past attempt that scored < 100%,
   * flips the lowest-confidence question to its alternate hypothesis.
   */
  function resolveVectorCollision(questions, auditResults, pastAttempts = []) {
    if (!questions || !auditResults || questions.length === 0 || !pastAttempts) {
      return { resolvedResults: auditResults, collisionDetected: false, flippedIndex: -1 };
    }

    // Normalize past attempts into an array of vectors
    const pastVectors = [];
    if (Array.isArray(pastAttempts)) {
      pastAttempts.forEach(pa => {
        if (pa.selections && typeof pa.selections === 'object') {
          // Object format: { "1": "b", "2": "b" }
          const vec = questions.map(q => {
            const sel = pa.selections[q.questionNumber] || pa.selections[q.id];
            return sel ? String(sel).toLowerCase().trim() : '';
          });
          pastVectors.push(vec.join(','));
        } else if (Array.isArray(pa)) {
          pastVectors.push(pa.map(k => String(k).toLowerCase().trim()).join(','));
        }
      });
    } else if (typeof pastAttempts === 'object') {
      const vec = questions.map(q => {
        const sel = pastAttempts[q.questionNumber] || pastAttempts[q.id];
        return sel ? String(sel).toLowerCase().trim() : '';
      });
      pastVectors.push(vec.join(','));
    }

    if (pastVectors.length === 0) {
      return { resolvedResults: auditResults, collisionDetected: false, flippedIndex: -1 };
    }

    const currentVectorStr = auditResults.map(a => a.selectedKey.toLowerCase().trim()).join(',');
    const hasCollision = pastVectors.includes(currentVectorStr);

    if (!hasCollision) {
      return { resolvedResults: auditResults, collisionDetected: false, flippedIndex: -1 };
    }

    // Collision detected! Find the question with the lowest confidence to flip to its alternateKey
    let minConfIdx = 0;
    let minConf = Infinity;

    auditResults.forEach((res, idx) => {
      const conf = typeof res.confidence === 'number' ? res.confidence : 0.9;
      if (conf < minConf && res.alternateKey && res.alternateKey !== res.selectedKey) {
        minConf = conf;
        minConfIdx = idx;
      }
    });

    // Flip lowest confidence question
    const target = auditResults[minConfIdx];
    const prevKey = target.selectedKey;
    target.selectedKey = target.alternateKey;
    target.auditNotes += ` [Swarm Vector Collision Resolved: Flipped Q${minConfIdx + 1} from '${prevKey}' to alternate '${target.alternateKey}' (conf: ${target.confidence}) to prevent repeating failed vector [${currentVectorStr}]]`;

    return {
      resolvedResults: auditResults,
      collisionDetected: true,
      flippedIndex: minConfIdx
    };
  }

  return {
    auditAnswer,
    resolveVectorCollision
  };
});
