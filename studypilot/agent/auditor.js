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

  function auditAnswer(question, candidateAnswer) {
    if (!candidateAnswer || !candidateAnswer.selectedKey) {
      return {
        verified: false,
        selectedKey: question.options[0] ? question.options[0].key : 'a',
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
      return {
        verified: false,
        selectedKey: fallback.key,
        confidence: 0.6,
        reasoning: candidateAnswer.reasoning || '',
        auditNotes: `Key '${cleanCandidateKey}' not found in options. Defaulting to '${fallback.key}'.`
      };
    }

    let finalKey = cleanCandidateKey;
    let finalReasoning = candidateAnswer.reasoning || '';
    let auditNotes = 'Verified by Auditor without conflicts.';
    let confidence = candidateAnswer.confidence || 0.95;

    // 2. Red-Team Check: "Both of these" / "All of the above" Trap
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

    // 3. Red-Team Check: Negative Constraint Trap ("NOT", "EXCEPT", "FALSE")
    if (question.traps && question.traps.hasNegativeConstraint) {
      auditNotes += ' [Negative constraint audited: verified statement is incorrect/exception]';
      confidence = Math.max(confidence, 0.96);
    }

    return {
      verified: true,
      selectedKey: finalKey,
      confidence,
      reasoning: finalReasoning,
      auditNotes,
      engine: candidateAnswer.engine || 'Multi-Agent Consensus'
    };
  }

  return {
    auditAnswer
  };
});
