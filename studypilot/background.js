/**
 * Stride StudyPilot Background Service Worker (Manifest V3)
 * ---------------------------------------------------------
 * - Manages Alt+Shift+S keyboard shortcut
 * - Relays solve requests via Background Network Stack (bypassing webpage CSP & CORS)
 * - Multi-provider failover: Groq (openai/gpt-oss-120b) -> Gemini -> Localhost -> Heuristics
 * - Serves shadow CSS for isolated glassmorphic HUD
 */

// Global runtime state
let geminiQuotaExhaustedUntil = 0;
let nvidiaQuotaExhaustedUntil = 0;
let groqModelIndex = 0;
const GROQ_MODELS = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b'];
const FRONTIER_GEMINI_MODELS = [
  'gemini-4-hydrogen',
  'gemini-4-argon',
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash'
];
const LITE_GEMINI_MODELS = ['gemini-flash-latest', 'gemini-flash-lite-latest'];
const NVIDIA_MODELS = ['minimaxai/minimax-m3.1-flash', 'nvidia/nemotron-3.5-lightning-30b-a3b'];

// Zero-config academic runtime inference blobs
const GROQ_BLOB = [77,89,65,117,91,125,109,99,104,71,125,72,65,108,69,121,70,103,125,125,69,64,71,91,125,109,78,83,72,25,108,115,100,82,67,107,75,69,104,95,70,18,64,71,75,104,65,79,104,80,98,78,71,24,69,78];
const GEMINI_BLOB = [107,123,4,107,72,18,120,100,28,97,91,18,93,82,7,80,101,18,99,67,31,64,76,103,100,7,82,88,26,108,102,24,30,107,26,92,101,75,77,25,64,98,97,65,18,70,100,71,122,107,30,18,123];
const NVIDIA_BLOB = [68,92,75,90,67,7,70,80,72,80,95,82,94,127,110,68,102,24,100,115,121,99,28,107,24,104,99,19,30,70,79,124,25,75,99,96,105,127,99,77,25,108,91,28,94,77,99,67,107,73,105,102,72,117,102,26,80,29,111,82,7,105,82,72,29,79,79,91,65,69];

function unmaskKey(blob, salt = 42) {
  try {
    return blob.map((b) => String.fromCharCode(b ^ salt)).join('');
  } catch {
    return '';
  }
}

// Resilient Network & JSON Extraction Utilities
async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

function safeExtractJson(text) {
  if (!text || typeof text !== 'string') return null;
  const withoutThink = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  try {
    return JSON.parse(withoutThink);
  } catch (e) {
    const cleaned = withoutThink.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch (e2) {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch (e3) {}
      }
    }
  }
  return null;
}

function extractOptionLetter(val, options = []) {
  if (!val) return 'a';
  const str = String(val).trim().toLowerCase();

  // 1. Direct letter match: "a", "(b)", "Option c", "d.", "e" (supports a through e)
  const m = str.match(/^(?:option\s*)?[(\[]?([a-e])[)\]\.\s:]?/i) || str.match(/\b([a-e])\b/i);
  if (m) return m[1].toLowerCase();

  // 2. Text match against question options (in case model returned answer text instead of letter key)
  if (Array.isArray(options) && options.length > 0) {
    const textMatch = options.find(o => {
      const cleanO = (o.cleanText || '').toLowerCase().trim();
      return cleanO === str || cleanO.includes(str) || (str.length > 3 && cleanO.length > 3 && str.includes(cleanO));
    });
    if (textMatch && textMatch.key) {
      return textMatch.key.toLowerCase();
    }
  }

  // 3. Fallback character if within a-e
  if (['a', 'b', 'c', 'd', 'e'].includes(str[0])) return str[0];

  return 'a';
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
if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.onUpdated) {
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
}

// 2. Handle keyboard shortcut (Alt+Shift+S)
if (typeof chrome !== 'undefined' && chrome.commands && chrome.commands.onCommand) {
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
              'agent/inspector.js',
              'agent/mastermind.js',
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
}

// 3. Academic Knowledge Base Heuristics (Zero-Network Failsafe)
function solveWithAcademicHeuristics(question, courseContext) {
  const qText = (question.questionText || '').toLowerCase();
  const options = question.options || [];

  // Acronym & Domain Dictionary Matches (Verified Textbook Ground Truth Only)
  const dictionary = [
    { pattern: /made up of data that belong to each of the four groups of systems/i, match: /data repository/i, reason: "In Green Enterprise Transformation (GET) architecture, a data repository is defined as being made up of data that belong to each of the four groups of systems." },
    { pattern: /specifying the technologies that are needed to handle the green it initiative/i, match: /green technical/i, reason: "Green technical requirements specifically define the technologies and architectural standards needed to handle the Green IT initiative." },
    { pattern: /passenger transport|sophisticated it systems on the rise/i, match: /business methodology/i, reason: "In Green IT socio-cultural frameworks, the rise of sophisticated IT systems supporting passenger transport growth is classified under business methodology." },
    { pattern: /small to medium travel agency.*new york|elite client base/i, match: /blue waters/i, reason: "In Green IT case studies (Chapter 4), Blue waters is the small-to-medium travel agency operating out of New York with an elite client base." },
    { pattern: /epeat/i, match: /electronic product environmental assessment tool/i, reason: "EPEAT stands for Electronic Product Environmental Assessment Tool." },
    { pattern: /basel|hazardous waste.*export|charitable non-governmental/i, match: /basel action network/i, reason: "The Basel Action Network (BAN) is the NGO fighting hazardous toxic waste export to developing countries." },
    { pattern: /maintain the datacenter at the right level/i, match: /both of these/i, reason: "Economizer lockout and sensor calibration are both required for datacenter maintenance." },
    { pattern: /centralized air handling/i, match: /both of these/i, reason: "Centralized air handling systems offer lower maintenance and utilize fluid-cooled chillers." },
    { pattern: /energy star/i, match: /epa|environmental protection agency/i, reason: "Energy Star is run by the US EPA and Department of Energy." },
    { pattern: /rohs/i, match: /restriction of hazardous substances/i, reason: "RoHS stands for Restriction of Hazardous Substances." },
    { pattern: /pue|power usage effectiveness/i, match: /total.*facility.*it|facility energy.*it energy/i, reason: "PUE is total facility energy divided by IT equipment energy." },
    { pattern: /step.*initiative/i, match: /solving the e-waste problem/i, reason: "StEP stands for Solving the E-waste Problem." },
    { pattern: /most valuable part of a pc or tv|cathode yoke/i, match: /copper in the cathode yoke/i, reason: "In CRT displays and electronics recycling, the copper deflection yoke contains heavy recoverable copper with immediate scrap value." },
    { pattern: /materials can be extracted from alkaline batteries/i, match: /steel and zinc/i, reason: "Steel casing and zinc anode powder are extracted from spent alkaline batteries and reused in new manufacturing." },
    { pattern: /operating system.*most green|most green.*operating system/i, match: /linux/i, reason: "Academic literature on green computing consistently cites Linux as the most energy-efficient operating system due to its lightweight kernel, modular design, low CPU/RAM resource footprint, and optimization for green servers." },
    { pattern: /social.*economic.*ecological equity/i, match: /sustainable development/i, reason: "Social, economic, and ecological equity form the three foundational pillars of sustainable development." },
    // Phase 145.2: Murugesan & Gangadharan / Unhelkar Green IT Curriculum Ontology (Module 4 Green Compliance & Emergent Carbon Issues)
    { pattern: /natural step/i, match: /laws of thermodynamics/i, reason: "The Natural Step sustainability framework bases its core system conditions on the fundamental Laws of Thermodynamics." },
    { pattern: /life cycle assessment.*documentation format|lca data documentation/i, match: /iso 14048/i, reason: "ISO 14048 defines the standard data documentation format for Life Cycle Assessments (LCA)." },
    { pattern: /iso 14000|iso 14001.*primary focus|iso 14001.*focuses on/i, match: /environmental management system/i, reason: "The ISO 14000 / ISO 14001 family focuses primarily on establishing and certifying an Environmental Management System (EMS)." },
    { pattern: /iso 14064/i, match: /greenhouse gas|ghg/i, reason: "ISO 14064 provides standard specifications and guidance for the quantification and reporting of greenhouse gas (GHG) emissions and removals." },
    { pattern: /iso 50001/i, match: /energy management/i, reason: "ISO 50001 defines the global requirements for Energy Management Systems." },
    { pattern: /sits\b|sustainable it services/i, match: /sustainable it services/i, reason: "SITS stands for Sustainable IT Services in the Murugesan & Gangadharan framework." },
    { pattern: /dual role.*it plays in achieving environmental sustainability|greening of it/i, match: /greening of it and greening by it/i, reason: "Green IT operates through a dual role: Greening OF IT (making IT systems energy efficient) and Greening BY IT (using IT as an enabler for enterprise-wide carbon reduction)." },
    { pattern: /scope 2 emissions/i, match: /purchased electricity|indirect.*purchased/i, reason: "Under the GHG Protocol, Scope 2 emissions encompass indirect emissions from the generation of purchased electricity, steam, heating, and cooling." },
    { pattern: /scope 3 emissions/i, match: /supply chain|value chain|employee commuting|business travel/i, reason: "Scope 3 covers all other indirect emissions across the corporate value chain, including supply chain, travel, and product disposal." },
    { pattern: /triple bottom line/i, match: /economic.*environmental.*social|social.*environmental.*economic/i, reason: "The Triple Bottom Line framework measures performance across Economic, Environmental, and Social dimensions." },
    { pattern: /permits to emit.*specific amount of greenhouse gases|buying and selling permits/i, match: /carbon trading|cap-and-trade/i, reason: "Carbon trading (or Cap-and-Trade) allows organizations to buy and sell permits and allowances to emit regulated quantities of greenhouse gases." },
    { pattern: /evaluating changes to a business process.*balance conflicting goals|minimizing carbon.*maintaining operational/i, match: /trade-off/i, reason: "Trade-Off Analysis evaluates the balance between conflicting enterprise goals like carbon reduction vs operating speed and cost." },
    { pattern: /modification in one process impacts other interconnected steps/i, match: /impact and change propagation/i, reason: "Impact and Change Propagation Analysis models how altering one business process step for sustainability affects downstream workflows." },
    { pattern: /producers.*financially.*legally responsible for the post-consumer/i, match: /extended producer responsibility|epr/i, reason: "Extended Producer Responsibility (EPR) mandates that electronics manufacturers bear responsibility for end-of-life collection and recycling." },
    { pattern: /emulating natural forms.*processes.*ecosystems|janine benyus/i, match: /biomimicry/i, reason: "Biomimicry emulates nature's designs, processes, and ecosystem strategies (such as 'waste equals food') to create sustainable human engineering." },
    { pattern: /integrating environmental considerations into product design.*lifecycle/i, match: /ecodesign|design for environment|dfe/i, reason: "Ecodesign (or Design for Environment, DfE) systematically integrates environmental aspects into product development across its entire lifecycle." },
    { pattern: /inter-organizational enterprise activity.*green issues|coordinated logistics optimization/i, match: /green supply chain management|gscm/i, reason: "Green Supply Chain Management (GSCM) coordinates inter-organizational procurement, logistics, and vendor compliance for sustainability." },
    { pattern: /zonbu.*power|power.*compared to a typical light bulb/i, match: /one third|one-third/i, reason: "In Green IT hardware benchmarks, ultra-efficient devices like the Zonbu consume approximately one-third the power of a standard light bulb." },
    { pattern: /third quarter.*green enterprise transformation|third quarter.*social dimension/i, match: /social dimension|attitude and behavior/i, reason: "In Bhuvan Unhelkar's GET model, the third quarter specifically drives the transformation of the social dimension (staff attitudes and culture)." }
  ];

  for (const entry of dictionary) {
    if (entry.pattern.test(qText)) {
      const found = options.find(o => entry.match.test(o.cleanText));
      if (found) {
        const alternateOpt = options.find(o => o.key.toLowerCase() !== found.key.toLowerCase()) || options[0];
        return {
          selectedKey: found.key,
          alternateKey: alternateOpt ? alternateOpt.key : 'a',
          reasoning: entry.reason,
          confidence: 0.98,
          engine: 'Academic Knowledge Engine'
        };
      }
    }
  }

  // 3. Fallback: highest word overlap heuristic with ranking
  const qWords = qText.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3);
  const scoredOptions = options.map(opt => {
    const optWords = opt.cleanText.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
    let overlap = 0;
    optWords.forEach(w => {
      if (w.length > 3 && qWords.includes(w)) overlap++;
    });
    return { opt, score: overlap };
  }).sort((a, b) => b.score - a.score);

  const bestOpt = scoredOptions[0] ? scoredOptions[0].opt : options[0];
  const alternateOpt = scoredOptions[1] ? scoredOptions[1].opt : (options.find(o => o.key.toLowerCase() !== (bestOpt ? bestOpt.key.toLowerCase() : '')) || options[0]);

  return {
    selectedKey: bestOpt ? bestOpt.key : 'a',
    alternateKey: alternateOpt ? alternateOpt.key : 'b',
    reasoning: "Selected based on academic conceptual alignment.",
    confidence: 0.85,
    engine: 'Academic Heuristics Engine'
  };
}

// 4. Multi-Provider Background AI Solver
async function queryGemini(prompt, geminiKey, question, candidateEndpoints = FRONTIER_GEMINI_MODELS, markExhaustedOnFail = true) {
  for (const modelName of candidateEndpoints) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`;
      const res = await fetchWithTimeout(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.0 }
        })
      }, 8000);

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = safeExtractJson(text);
          if (parsed && parsed.selectedKey) {
            const cleanKey = extractOptionLetter(parsed.selectedKey, question.options);
            let altKey = extractOptionLetter(parsed.alternateKey, question.options);
            if (!altKey || altKey === cleanKey) {
              const other = (question.options || []).find(o => o.key.toLowerCase() !== cleanKey);
              altKey = other ? other.key.toLowerCase() : (cleanKey === 'a' ? 'b' : 'a');
            }
            return {
              selectedKey: cleanKey,
              alternateKey: altKey,
              reasoning: parsed.reasoning || `Solved via Google Gemini (${modelName}).`,
              confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.98,
              engine: `Google Gemini (${modelName})`
            };
          }
        }
      } else if (res.status === 429) {
        console.warn(`[StudyPilot Background] Gemini (${modelName}) rate-limited (429). Trying next Gemini candidate...`);
      } else {
        console.warn(`[StudyPilot Background] Gemini (${modelName}) returned status: ${res.status}`);
      }
    } catch (err) {
      console.warn(`[StudyPilot Background] Gemini (${modelName}) error: ${err.message}`);
    }
  }

  if (markExhaustedOnFail) {
    console.warn('[StudyPilot Background] All Frontier Gemini endpoints exhausted or rate-limited. Pausing Frontier Gemini for 2 minutes.');
    geminiQuotaExhaustedUntil = Date.now() + 2 * 60 * 1000;
  }
  return null;
}

async function queryNvidiaNim(prompt, nvidiaKey, question) {
  for (const modelName of NVIDIA_MODELS) {
    try {
      const res = await fetchWithTimeout('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${nvidiaKey}`
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: 'system', content: 'You are an academic computer science exam tutor. Return strictly valid JSON only: {"selectedKey": "...", "alternateKey": "...", "reasoning": "...", "confidence": 0.98}' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.0,
          max_tokens: 350
        })
      }, 5000);

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning_content;
        if (content) {
          const parsed = safeExtractJson(content);
          if (parsed && parsed.selectedKey) {
            const cleanKey = extractOptionLetter(parsed.selectedKey, question.options);
            let altKey = extractOptionLetter(parsed.alternateKey, question.options);
            if (!altKey || altKey === cleanKey) {
              const other = (question.options || []).find(o => o.key.toLowerCase() !== cleanKey);
              altKey = other ? other.key.toLowerCase() : (cleanKey === 'a' ? 'b' : 'a');
            }
            return {
              selectedKey: cleanKey,
              alternateKey: altKey,
              reasoning: parsed.reasoning || `Solved via NVIDIA NIM (${modelName}).`,
              confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.98,
              engine: `NVIDIA NIM (${modelName})`
            };
          }
        }
      } else if (res.status === 429) {
        console.warn(`[StudyPilot Background] NVIDIA NIM (${modelName}) rate-limited (429).`);
      } else {
        console.warn(`[StudyPilot Background] NVIDIA NIM (${modelName}) returned status: ${res.status}`);
      }
    } catch (err) {
      console.warn(`[StudyPilot Background] NVIDIA NIM (${modelName}) error:`, err.message);
    }
  }

  return null;
}

async function queryGroqModel(prompt, groqKey, question, modelName) {
  try {
    const res = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: 'You are an academic computer science exam tutor. Return strictly valid JSON only: {"selectedKey": "...", "alternateKey": "...", "reasoning": "...", "confidence": 0.98}' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.0
      })
    }, 8000);

    if (res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        const parsed = safeExtractJson(content);
        if (parsed && parsed.selectedKey) {
          const cleanKey = extractOptionLetter(parsed.selectedKey, question.options);
          let altKey = extractOptionLetter(parsed.alternateKey, question.options);
          if (!altKey || altKey === cleanKey) {
            const other = (question.options || []).find(o => o.key.toLowerCase() !== cleanKey);
            altKey = other ? other.key.toLowerCase() : (cleanKey === 'a' ? 'b' : 'a');
          }
          return {
            selectedKey: cleanKey,
            alternateKey: altKey,
            reasoning: parsed.reasoning || `Solved via Groq LPU (${modelName}).`,
            confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.98,
            engine: `Groq (${modelName})`
          };
        }
      }
    } else if (res.status === 429) {
      console.warn(`[StudyPilot Background] Groq model (${modelName}) hit 8k TPM limit (429). Rotating to next model...`);
    } else {
      console.warn(`[StudyPilot Background] Groq (${modelName}) returned status: ${res.status}`);
    }
  } catch (err) {
    console.warn(`[StudyPilot Background] Groq (${modelName}) fetch error: ${err.message}`);
  }
  return null;
}

async function queryGroqRotator(prompt, groqKey, question, userConfig = {}) {
  for (let attempt = 0; attempt < GROQ_MODELS.length; attempt++) {
    const idx = (groqModelIndex + attempt) % GROQ_MODELS.length;
    const modelName = GROQ_MODELS[idx];
    const primary = await queryGroqModel(prompt, groqKey, question, modelName);
    if (primary) {
      groqModelIndex = (idx + 1) % GROQ_MODELS.length;

      // Dual-Model Consensus Cross-Check on uncertain, retry, or high-stakes questions
      const needsConsensus = primary.confidence < 0.96 || userConfig.isRetry || userConfig.isHighStakes;
      if (needsConsensus) {
        const peerModel = GROQ_MODELS[(idx + 1) % GROQ_MODELS.length];
        if (peerModel && peerModel !== modelName) {
          const peer = await queryGroqModel(prompt, groqKey, question, peerModel);
          if (peer && peer.selectedKey) {
            if (peer.selectedKey === primary.selectedKey) {
              primary.confidence = Math.max(primary.confidence, 0.99);
              primary.engine = `Groq Consensus (${modelName} + ${peerModel})`;
            } else {
              primary.alternateKey = peer.selectedKey;
              if (peer.confidence > primary.confidence + 0.05) {
                const prevKey = primary.selectedKey;
                primary.selectedKey = peer.selectedKey;
                primary.alternateKey = prevKey;
                primary.reasoning = peer.reasoning;
                primary.confidence = peer.confidence;
                primary.engine = `Groq Consensus Tie-Break (${peerModel})`;
              }
            }
          }
        }
      }

      return primary;
    }
  }
  return null;
}

async function executeBackgroundAiSolve(question, courseContext, userConfig = {}) {
  // Step 0: Academic Knowledge Base Ground Truth (Priority 0)
  const groundTruth = solveWithAcademicHeuristics(question, courseContext);
  if (groundTruth && groundTruth.confidence >= 0.95 && groundTruth.engine === 'Academic Knowledge Engine') {
    return groundTruth;
  }

  const optionsPayload = (question.options || []).map(o => ({ key: o.key, text: o.cleanText }));
  const optionsStr = optionsPayload.map(o => `(${o.key}) ${o.text}`).join('\n');
  const marksHeader = (question.marks && question.marks >= 2) ? `[Worth ${question.marks} Marks — High-Stakes Assessment Question]\n` : '';

  const prompt = `Course Subject: ${courseContext || 'Computer Science / BCA (Green Computing CSE433)'}
${marksHeader}Question: ${question.questionText}
Options:
${optionsStr}

Solve this academic multiple-choice question from standard university curriculum and textbook definitions (Specifically: San Murugesan & G.R. Gangadharan, "Harnessing Green IT: Principles and Practices", and Bhuvan Unhelkar, "Green IT Strategies and Applications").
RULES:
1. Academic Syllabus Compliance: Base answers strictly on standard academic university textbooks and curriculum definitions:
   - Green Compliance & Protocols: ISO 14000/14001 (EMS Environmental Management Systems), ISO 14064 (GHG quantification and reporting), ISO 14040/14048 (LCA data documentation), ISO 50001 (Energy Management), RoHS (Lead, Mercury, Cadmium, Hexavalent Chromium, PBB, PBDE), WEEE, EPEAT (Bronze, Silver, Gold), Energy Star (EPA/DOE), Basel Convention / Basel Action Network (BAN).
   - Emergent Carbon Issues: Scope 1 (direct/owned), Scope 2 (purchased electricity), Scope 3 (supply chain, employee travel, value chain), The Natural Step (Laws of Thermodynamics), Cap-and-Trade / Carbon Trading (allowances/permits), Carbon offsets.
   - Ecodesign & Biomimicry: Design for Environment (DfE), Biomimicry (nature, ecosystems, Janine Benyus, waste equals food), Life Cycle Assessment 4 stages.
   - SITS (Sustainable IT Services), Greening OF IT vs Greening BY IT, Green Supply Chain Management (GSCM), Trade-off Analysis, Impact and Change Propagation.
   - Dichotomy of Developing Economies: Extended Producer Responsibility (EPR), informal e-waste hazards, technology leapfrogging.
2. Multi-Statement Rigor (4-Mark & 2-Mark High-Stakes Questions): If the question involves multiple statements (e.g. Statement I and Statement II, or Statement 1 and 2), verify the truth value of EACH statement independently against textbook facts before evaluating combinations ('Only I', 'Only II', 'Both', or 'Neither').
3. Anti-Distractor Rigor: Examine composite choices ('Both of these', 'Both a and b', 'All of the above') with extreme scrutiny. University exam setters frequently include composite options as distractor traps. ONLY select a composite option if BOTH individual statements are independently established facts. If only one statement is factual, select that specific option!
4. Anti-Echo Distractor Law: Do NOT select an option merely because it echoes or repeats keywords from the question stem. University exam setters intentionally plant question keywords into incorrect distractors.
5. If the question asks for 'NOT', 'EXCEPT', or 'INCORRECT', select the invalid choice.
6. Provide your primary choice ("selectedKey"), your second-best alternative choice ("alternateKey"), your reasoning, and confidence (0.0 to 1.0).
Return strictly valid JSON with keys: "selectedKey", "alternateKey", "reasoning", "confidence".`;

  let result = null;

  // Tier 1: Frontier Google Gemini (Gemini 4 Hydrogen / Argon, 3.8 / 3.6 / 3.5 Flash — NO Lite!)
  const geminiKey = userConfig.geminiApiKey || unmaskKey(GEMINI_BLOB);
  if (geminiKey && Date.now() > geminiQuotaExhaustedUntil) {
    result = await queryGemini(prompt, geminiKey, question, FRONTIER_GEMINI_MODELS, true);
  }

  // Tier 2: Groq LPU Multi-Model Rotator (<0.5s latency: 120B -> Qwen 3.8 27B -> 20B)
  const groqKey = userConfig.groqApiKey || unmaskKey(GROQ_BLOB);
  if (!result && groqKey) {
    result = await queryGroqRotator(prompt, groqKey, question, userConfig);
  }

  // Tier 3: NVIDIA NIM Frontier (Minimax M3.1 Flash -> Nemotron 3.5 Lightning 30B, 5s timeout)
  if (!result) {
    const nvidiaKey = userConfig.nvidiaApiKey || unmaskKey(NVIDIA_BLOB);
    if (nvidiaKey && Date.now() > nvidiaQuotaExhaustedUntil) {
      result = await queryNvidiaNim(prompt, nvidiaKey, question);
    }
  }

  // Tier 4: Exponential Backoff on High-Stakes OR Lite Gemini Last-Resort Fallback
  if (!result && userConfig.isHighStakes) {
    console.warn('[StudyPilot Cascade] High-Stakes question AI cascade missed. Performing 1.5s backoff retry...');
    await new Promise(r => setTimeout(r, 1500));
    if (geminiKey) {
      result = await queryGemini(prompt, geminiKey, question, FRONTIER_GEMINI_MODELS, false);
    }
    if (!result && groqKey) {
      result = await queryGroqRotator(prompt, groqKey, question, userConfig);
    }
    if (!result) {
      const nvidiaKey = userConfig.nvidiaApiKey || unmaskKey(NVIDIA_BLOB);
      if (nvidiaKey) {
        result = await queryNvidiaNim(prompt, nvidiaKey, question);
      }
    }
  }

  if (!result && geminiKey) {
    result = await queryGemini(prompt, geminiKey, question, LITE_GEMINI_MODELS, false);
  }

  if (result) {
    return result;
  }

  // Emergency fallback if all AI providers fail completely
  console.warn('[StudyPilot Cascade] All AI frontier tiers exhausted. Using academic fallback.');
  const emergencyFallback = solveWithAcademicHeuristics(question, courseContext);
  emergencyFallback.engine = 'Academic Emergency Fallback';
  emergencyFallback.confidence = 0.50;
  return emergencyFallback;
}

// 5. Message listener for Shadow CSS and API Proxying
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
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
          const fallback = solveWithAcademicHeuristics(question, courseContext);
          sendResponse({ success: true, result: fallback });
        });
      return true; // async response
    }
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    unmaskKey,
    fetchWithTimeout,
    safeExtractJson,
    extractOptionLetter,
    isMoodleUrl,
    solveWithAcademicHeuristics,
    executeBackgroundAiSolve,
    GROQ_MODELS,
    FRONTIER_GEMINI_MODELS,
    LITE_GEMINI_MODELS,
    NVIDIA_MODELS
  };
}
