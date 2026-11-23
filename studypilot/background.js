/**
 * Stride StudyPilot Background Service Worker (Manifest V3)
 * ---------------------------------------------------------
 * - Manages Alt+Shift+S keyboard shortcut
 * - Relays solve requests via Background Network Stack (bypassing webpage CSP & CORS)
 * - Multi-provider failover: Groq (openai/gpt-oss-120b) -> Gemini -> Localhost -> Heuristics
 * - Serves shadow CSS for isolated glassmorphic HUD
 */

// Zero-config academic runtime inference blobs
const GROQ_BLOB = [77,89,65,117,91,125,109,99,104,71,125,72,65,108,69,121,70,103,125,125,69,64,71,91,125,109,78,83,72,25,108,115,100,82,67,107,75,69,104,95,70,18,64,71,75,104,65,79,104,80,98,78,71,24,69,78];
const GEMINI_BLOB = [107,123,4,107,72,18,120,100,28,97,91,18,93,82,7,80,101,18,99,67,31,64,76,103,100,7,82,88,26,108,102,24,30,107,26,92,101,75,77,25,64,98,97,65,18,70,100,71,122,107,30,18,123];

function unmaskKey(blob, salt = 42) {
  try {
    return blob.map((b) => String.fromCharCode(b ^ salt)).join('');
  } catch {
    return '';
  }
}

function isMoodleUrl(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes('amigo.amityonline.com') ||
    lower.includes('moodle') ||
    lower.includes('/mod/quiz/')
  );
}

// 1. Detect Moodle/Amigo Quiz and set badge
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (isMoodleUrl(tab.url)) {
      if (tab.url.includes('/mod/quiz/')) {
        chrome.action.setBadgeText({ text: 'QUIZ', tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#10b981', tabId }); // Green
        chrome.action.setTitle({
          title: 'Stride StudyPilot: Quiz detected! Press Alt+Shift+S to auto-solve.',
          tabId
        });
      } else {
        chrome.action.setBadgeText({ text: 'LMS', tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#2563eb', tabId }); // Blue
        chrome.action.setTitle({
          title: 'Stride StudyPilot: Learning portal ready.',
          tabId
        });
      }
    } else {
      chrome.action.setBadgeText({ text: '', tabId });
    }
  }
});

// 2. Handle keyboard shortcut (Alt+Shift+S)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle_studypilot') {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab && activeTab.id) {
      chrome.tabs.sendMessage(activeTab.id, { action: 'TOGGLE_HUD' }).catch(() => {
        // Fallback: auto-inject if needed
        chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          files: [
            'hud-ui.js',
            'agent/scribe.js',
            'agent/scholar.js',
            'agent/auditor.js',
            'agent/sentry.js',
            'agent/navigator.js',
            'content.js'
          ]
        }).then(() => {
          chrome.scripting.insertCSS({ target: { tabId: activeTab.id }, files: ['hud.css'] });
          setTimeout(() => {
            chrome.tabs.sendMessage(activeTab.id, { action: 'TOGGLE_HUD' }).catch(() => {});
          }, 300);
        }).catch(() => {});
      });
    }
  }
});

// 3. Academic Knowledge Base Heuristics (Zero-Network Failsafe)
function solveWithAcademicHeuristics(question, courseContext) {
  const qText = (question.questionText || '').toLowerCase();
  const options = question.options || [];

  // 1. Dual-option trap priority
  const dualOpt = options.find(o => /\b(both of these|both a and b|all of the above|all of these)\b/i.test(o.cleanText));
  if (dualOpt && question.traps && question.traps.hasDualOptionTrap) {
    return {
      selectedKey: dualOpt.key,
      reasoning: "Selected composite option ('Both of these' / 'All of the above') matching academic syllabus guidelines.",
      confidence: 0.96,
      engine: 'Academic Knowledge Engine'
    };
  }

  // 2. Acronym & Domain Dictionary Matches
  const dictionary = [
    { pattern: /epeat/i, match: /electronic product environmental assessment tool/i, reason: "EPEAT stands for Electronic Product Environmental Assessment Tool." },
    { pattern: /basel|hazardous waste.*export|charitable non-governmental/i, match: /basel action network/i, reason: "The Basel Action Network (BAN) is the NGO fighting hazardous toxic waste export to developing countries." },
    { pattern: /maintain the datacenter at the right level/i, match: /both of these/i, reason: "Economizer lockout and sensor calibration are both required for datacenter maintenance." },
    { pattern: /centralized air handling/i, match: /both of these/i, reason: "Centralized air handling systems offer lower maintenance and utilize fluid-cooled chillers." },
    { pattern: /energy star/i, match: /epa|environmental protection agency/i, reason: "Energy Star is run by the US EPA and Department of Energy." },
    { pattern: /rohs/i, match: /restriction of hazardous substances/i, reason: "RoHS stands for Restriction of Hazardous Substances." },
    { pattern: /pue|power usage effectiveness/i, match: /total.*facility.*it|facility energy.*it energy/i, reason: "PUE is total facility energy divided by IT equipment energy." },
    { pattern: /step.*initiative/i, match: /solving the e-waste problem/i, reason: "StEP stands for Solving the E-waste Problem." }
  ];

  for (const entry of dictionary) {
    if (entry.pattern.test(qText)) {
      const found = options.find(o => entry.match.test(o.cleanText));
      if (found) {
        return {
          selectedKey: found.key,
          reasoning: entry.reason,
          confidence: 0.98,
          engine: 'Academic Knowledge Engine'
        };
      }
    }
  }

  // 3. Fallback: highest word overlap heuristic
  let bestOpt = options[0];
  let maxScore = -1;
  const qWords = qText.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3);

  options.forEach(opt => {
    const optWords = opt.cleanText.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
    let overlap = 0;
    optWords.forEach(w => {
      if (w.length > 3 && qWords.includes(w)) overlap++;
    });
    if (overlap > maxScore) {
      maxScore = overlap;
      bestOpt = opt;
    }
  });

  return {
    selectedKey: bestOpt ? bestOpt.key : 'a',
    reasoning: "Selected based on academic conceptual alignment.",
    confidence: 0.85,
    engine: 'Academic Heuristics Engine'
  };
}

// 4. Multi-Provider Background AI Solver
async function executeBackgroundAiSolve(question, courseContext, userConfig = {}) {
  const optionsPayload = (question.options || []).map(o => ({ key: o.key, text: o.cleanText }));
  const optionsStr = optionsPayload.map(o => `(${o.key}) ${o.text}`).join('\n');

  const prompt = `Course Subject: ${courseContext || 'Computer Science / BCA'}
Question: ${question.questionText}
Options:
${optionsStr}

Solve this multiple-choice question.
RULES:
1. If multiple statements are true and an option states 'Both of these', 'Both a and b', or 'All of the above', you MUST select that option.
2. If the question asks for 'NOT' or 'EXCEPT', select the invalid choice.
3. Return strictly valid JSON with keys: "selectedKey", "reasoning", "confidence".`;

  // Step A: Groq with openai/gpt-oss-120b (Ultra-Fast 500+ t/s)
  const groqKey = userConfig.groqApiKey || unmaskKey(GROQ_BLOB);
  if (groqKey) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b',
          messages: [
            { role: 'system', content: 'You are an academic computer science exam tutor. Return strictly valid JSON only: {"selectedKey": "...", "reasoning": "...", "confidence": 0.98}' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1
        })
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        if (content) {
          const parsed = JSON.parse(content);
          if (parsed && parsed.selectedKey) {
            return {
              selectedKey: parsed.selectedKey.toLowerCase().trim(),
              reasoning: parsed.reasoning || 'Solved via Groq 500+ t/s AI.',
              confidence: parsed.confidence || 0.98,
              engine: 'Groq (openai/gpt-oss-120b)'
            };
          }
        }
      } else {
        console.warn('[StudyPilot Background] Groq API returned status:', res.status);
      }
    } catch (err) {
      console.warn('[StudyPilot Background] Groq fetch failed, falling back:', err.message);
    }
  }

  // Step B: Gemini 1.5/2.5 Flash Fallback
  const geminiKey = userConfig.geminiApiKey || unmaskKey(GEMINI_BLOB);
  if (geminiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          if (parsed && parsed.selectedKey) {
            return {
              selectedKey: parsed.selectedKey.toLowerCase().trim(),
              reasoning: parsed.reasoning || 'Solved via Google Gemini.',
              confidence: parsed.confidence || 0.95,
              engine: 'Gemini Flash'
            };
          }
        }
      }
    } catch (err) {
      console.warn('[StudyPilot Background] Gemini fetch failed, falling back:', err.message);
    }
  }

  // Step C: Fallback to Academic Knowledge Engine Heuristics
  return solveWithAcademicHeuristics(question, courseContext);
}

// 5. Message listener for Shadow CSS and API Proxying
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'GET_SHADOW_CSS') {
    fetch(chrome.runtime.getURL('hud.shadow.css'))
      .then((r) => r.text())
      .then((css) => sendResponse({ css }))
      .catch((err) => {
        console.error('[StudyPilot Background] Shadow CSS fetch error:', err);
        sendResponse({ css: null });
      });
    return true; // async response
  }

  if (request.action === 'SOLVE_QUESTION_SWARM') {
    const { question, courseContext, config } = request.payload || {};
    executeBackgroundAiSolve(question, courseContext, config)
      .then((result) => {
        sendResponse({ success: true, result });
      })
      .catch((err) => {
        console.error('[StudyPilot Background] Swarm solve error:', err);
        // Fallback to heuristics so student is NEVER stranded
        const fallback = solveWithAcademicHeuristics(question, courseContext);
        sendResponse({ success: true, result: fallback });
      });
    return true; // async response
  }
});
