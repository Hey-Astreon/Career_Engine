/**
 * Agent 2: The Scholar (Domain Academic Solver)
 * --------------------------------------------
 * Evaluates questions from first principles, constructs an option truth table,
 * and produces candidate answers with conceptual reasoning.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.StudyPilotScholar = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // 1. On-Device Chrome Built-in AI (window.ai Gemini Nano)
  async function solveWithLocalGeminiNano(question, courseContext) {
    if (typeof window === 'undefined' || !window.ai || !window.ai.languageModel) {
      return null;
    }
    try {
      const capabilities = await window.ai.languageModel.capabilities();
      if (capabilities.available === 'no') return null;

      const session = await window.ai.languageModel.create({
        systemPrompt: 'You are an elite academic computer science tutor. For the multiple-choice question, determine the correct option letter. Return valid JSON only with keys: selectedKey, reasoning, confidence.',
        temperature: 0.1,
        topK: 1
      });

      const optionsStr = question.options.map(o => `(${o.key}) ${o.cleanText}`).join('\n');
      const prompt = `Course: ${courseContext}\nQuestion: ${question.questionText}\nOptions:\n${optionsStr}\n\nReturn strictly valid JSON: {"selectedKey": "a", "reasoning": "...", "confidence": 0.95}`;

      const raw = await session.prompt(prompt);
      session.destroy();

      const cleaned = raw.replace(/^```json/i, '').replace(/```$/, '').trim();
      return JSON.parse(cleaned);
    } catch (e) {
      console.warn('[Scholar] Local Gemini Nano fallback to API:', e);
      return null;
    }
  }

  // 2. Cloud Fallback: Groq / Gemini API or Stride Server
  async function solveWithCloudService(question, courseContext, config = {}) {
    const optionsPayload = question.options.map(o => ({ key: o.key, text: o.cleanText }));

    // A. Direct Groq API Key if provided by student
    if (config.groqApiKey) {
      const prompt = `Course Context: ${courseContext}\nQuestion: ${question.questionText}\nOptions:\n${JSON.stringify(optionsPayload)}\n\nSolve this question. If multiple options are true and an option says 'Both of these' or 'All of the above', select that option. Return JSON: {"selectedKey": "...", "reasoning": "...", "confidence": 0.95}`;
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.groqApiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'You are an elite university exam tutor. Return strictly valid JSON only.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' }
        })
      });
      const data = await res.json();
      return JSON.parse(data.choices[0].message.content);
    }

    // B. Direct Gemini API Key if provided by student
    if (config.geminiApiKey) {
      const prompt = `Course Context: ${courseContext}\nQuestion: ${question.questionText}\nOptions:\n${JSON.stringify(optionsPayload)}\n\nSolve this question. Return strictly valid JSON: {"selectedKey": "...", "reasoning": "...", "confidence": 0.95}`;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.geminiApiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });
      const data = await res.json();
      const text = data.candidates[0].content.parts[0].text;
      return JSON.parse(text);
    }

    // C. Default: Stride Cloud Proxy (/api/studypilot/solve)
    const origin = config.strideOrigin || 'https://stride.app';
    const res = await fetch(`${origin}/api/studypilot/solve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseTitle: courseContext,
        questions: [{
          id: question.id,
          text: question.questionText,
          options: optionsPayload,
          traps: question.traps
        }]
      })
    });
    if (!res.ok) throw new Error(`Solver service responded with HTTP ${res.status}`);
    const data = await res.json();
    return data.answers && data.answers[0] ? data.answers[0] : null;
  }

  // Master Scholar Solver
  async function solveQuestion(question, courseContext, config = {}) {
    // 1. Try On-Device Chrome Built-in AI Nano first
    const nanoResult = await solveWithLocalGeminiNano(question, courseContext);
    if (nanoResult && nanoResult.selectedKey) {
      return {
        ...nanoResult,
        engine: 'Gemini Nano (On-Device)'
      };
    }

    // 2. Cloud Fallback
    const cloudResult = await solveWithCloudService(question, courseContext, config);
    return {
      ...cloudResult,
      engine: cloudResult.engine || 'Cloud Multi-LLM Cascade'
    };
  }

  return {
    solveQuestion
  };
});
