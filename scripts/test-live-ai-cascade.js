/**
 * Stride StudyPilot — Live End-to-End AI Cascade & 30-Question Exam Simulation
 * ============================================================================
 * Rigorously benchmarks all live AI tiers against the real internet:
 *  1. Google Gemini 3.5 Flash
 *  2. NVIDIA NIM Mistral Large 1T (1-Trillion Parameter)
 *  3. Groq 3-Model Rotator (120B, Qwen 27B, 20B)
 *  4. Full 30-question live exam simulation with timing and failure telemetry
 */

const background = require('../studypilot/background.js');

const REAL_GREEN_COMPUTING_EXAM_30 = [
  {
    id: "q1",
    questionNumber: 1,
    questionText: "Which operating system is academically considered the most energy efficient and green for enterprise servers?",
    options: [
      { key: "a", cleanText: "Windows Vista" },
      { key: "b", cleanText: "Windows XP" },
      { key: "c", cleanText: "Linux" },
      { key: "d", cleanText: "Apple macOS" }
    ]
  },
  {
    id: "q2",
    questionNumber: 2,
    questionText: "Social, economic, and ecological equity form the three foundational pillars for achieving:",
    options: [
      { key: "a", cleanText: "Social development" },
      { key: "b", cleanText: "Economic development" },
      { key: "c", cleanText: "Sustainable development" },
      { key: "d", cleanText: "Ecological development" }
    ]
  },
  {
    id: "q3",
    questionNumber: 3,
    questionText: "What does PUE stand for in data center green metrics?",
    options: [
      { key: "a", cleanText: "Power Usage Effectiveness" },
      { key: "b", cleanText: "Public Utility Energy" },
      { key: "c", cleanText: "Process Unit Efficiency" },
      { key: "d", cleanText: "Power Utilization Estimation" }
    ]
  },
  {
    id: "q4",
    questionNumber: 4,
    questionText: "How is Power Usage Effectiveness (PUE) calculated?",
    options: [
      { key: "a", cleanText: "IT Equipment Energy / Total Facility Energy" },
      { key: "b", cleanText: "Total Facility Energy / IT Equipment Energy" },
      { key: "c", cleanText: "Cooling Energy / Server Energy" },
      { key: "d", cleanText: "Total Power / Grid Power" }
    ]
  },
  {
    id: "q5",
    questionNumber: 5,
    questionText: "What is an ideal or perfect PUE ratio for an ultra-green data center?",
    options: [
      { key: "a", cleanText: "0.0" },
      { key: "b", cleanText: "1.0" },
      { key: "c", cleanText: "2.0" },
      { key: "d", cleanText: "100%" }
    ]
  },
  {
    id: "q6",
    questionNumber: 6,
    questionText: "What is the primary toxic heavy metal found in the cathode ray tube (CRT) funnel glass of obsolete computer monitors?",
    options: [
      { key: "a", cleanText: "Lead" },
      { key: "b", cleanText: "Aluminum" },
      { key: "c", cleanText: "Iron" },
      { key: "d", cleanText: "Silicon" }
    ]
  },
  {
    id: "q7",
    questionNumber: 7,
    questionText: "Which component of a discarded CRT monitor contains the highest concentration of directly recoverable copper scrap value?",
    options: [
      { key: "a", cleanText: "Cathode deflection yoke" },
      { key: "b", cleanText: "Phosphor coating" },
      { key: "c", cleanText: "Plastic bezel" },
      { key: "d", cleanText: "Front panel faceplate" }
    ]
  },
  {
    id: "q8",
    questionNumber: 8,
    questionText: "Which materials are primarily extracted and recycled from spent alkaline batteries?",
    options: [
      { key: "a", cleanText: "Steel casing and zinc" },
      { key: "b", cleanText: "Gold and platinum" },
      { key: "c", cleanText: "Mercury and cadmium" },
      { key: "d", cleanText: "Lithium polymer and cobalt" }
    ]
  },
  {
    id: "q9",
    questionNumber: 9,
    questionText: "The European Union directive restricting specific hazardous substances in electrical and electronic equipment is known as:",
    options: [
      { key: "a", cleanText: "RoHS" },
      { key: "b", cleanText: "Energy Star" },
      { key: "c", cleanText: "LEED" },
      { key: "d", cleanText: "ISO 9001" }
    ]
  },
  {
    id: "q10",
    questionNumber: 10,
    questionText: "Which United Nations treaty controls the transboundary movement and disposal of hazardous electronic waste to developing countries?",
    options: [
      { key: "a", cleanText: "Kyoto Protocol" },
      { key: "b", cleanText: "Basel Convention" },
      { key: "c", cleanText: "Paris Agreement" },
      { key: "d", cleanText: "Montreal Protocol" }
    ]
  },
  {
    id: "q11",
    questionNumber: 11,
    questionText: "The Energy Star rating program was jointly created and managed by which US agency?",
    options: [
      { key: "a", cleanText: "Environmental Protection Agency (EPA) and Department of Energy" },
      { key: "b", cleanText: "Federal Communications Commission (FCC)" },
      { key: "c", cleanText: "NASA" },
      { key: "d", cleanText: "National Science Foundation" }
    ]
  },
  {
    id: "q12",
    questionNumber: 12,
    questionText: "In virtualization, what is the main green computing benefit of server consolidation?",
    options: [
      { key: "a", cleanText: "Reduces the number of physical idle servers and lowers total cooling power" },
      { key: "b", cleanText: "Increases the hardware manufacturing rate" },
      { key: "c", cleanText: "Eliminates all network bandwidth requirements" },
      { key: "d", cleanText: "Forces software to run without electricity" }
    ]
  },
  {
    id: "q13",
    questionNumber: 13,
    questionText: "What does ACPI stand for in green computer power management?",
    options: [
      { key: "a", cleanText: "Advanced Configuration and Power Interface" },
      { key: "b", cleanText: "Automated Cooling Power Integration" },
      { key: "c", cleanText: "Allied Control Processing Interface" },
      { key: "d", cleanText: "Application Computing Power Index" }
    ]
  },
  {
    id: "q14",
    questionNumber: 14,
    questionText: "In the ACPI specification, which global system state represents total software and hardware power off (mechanical off)?",
    options: [
      { key: "a", cleanText: "G0 (Working)" },
      { key: "b", cleanText: "G1 (Sleeping)" },
      { key: "c", cleanText: "G2 (Soft Off)" },
      { key: "d", cleanText: "G3 (Mechanical Off)" }
    ]
  },
  {
    id: "q15",
    questionNumber: 15,
    questionText: "Dynamic Voltage and Frequency Scaling (DVFS) in green CPUs achieves energy savings because dynamic power consumption is proportional to:",
    options: [
      { key: "a", cleanText: "Frequency times voltage squared (f * V^2)" },
      { key: "b", cleanText: "Voltage only" },
      { key: "c", cleanText: "Current divided by resistance" },
      { key: "d", cleanText: "Clock rate cubed divided by voltage" }
    ]
  },
  {
    id: "q16",
    questionNumber: 16,
    questionText: "What does the 3R concept stand for in environmental waste management?",
    options: [
      { key: "a", cleanText: "Reduce, Reuse, Recycle" },
      { key: "b", cleanText: "Recover, Refactor, Release" },
      { key: "c", cleanText: "Remove, Rebuild, Replace" },
      { key: "d", cleanText: "Read, Record, Report" }
    ]
  },
  {
    id: "q17",
    questionNumber: 17,
    questionText: "Which method is the most environmentally damaging and toxic way of disposing of e-waste?",
    options: [
      { key: "a", cleanText: "Open-air burning and acid bath leaching" },
      { key: "b", cleanText: "Automated shredding and magnetic separation" },
      { key: "c", cleanText: "Refurbishment and donation" },
      { key: "d", cleanText: "Closed-loop polymer recycling" }
    ]
  },
  {
    id: "q18",
    questionNumber: 18,
    questionText: "What does EPEAT stand for in sustainable electronics purchasing?",
    options: [
      { key: "a", cleanText: "Electronic Product Environmental Assessment Tool" },
      { key: "b", cleanText: "Energy Preservation and Environmental Audit Tool" },
      { key: "c", cleanText: "Ecological Purchasing and Energy Action Task" },
      { key: "d", cleanText: "Enterprise Performance and Equipment Audit Technique" }
    ]
  },
  {
    id: "q19",
    questionNumber: 19,
    questionText: "Which type of data center cooling utilizes outside ambient air to cool servers when the outside temperature is sufficiently low?",
    options: [
      { key: "a", cleanText: "Economizer (free cooling)" },
      { key: "b", cleanText: "Liquid nitrogen submersion" },
      { key: "c", cleanText: "High-power compressor chilling" },
      { key: "d", cleanText: "Geothermal active heating" }
    ]
  },
  {
    id: "q20",
    questionNumber: 20,
    questionText: "In green data center design, hot aisle / cold aisle containment is designed to:",
    options: [
      { key: "a", cleanText: "Prevent the mixing of server exhaust air and cooling intake air" },
      { key: "b", cleanText: "Heat the administrative offices" },
      { key: "c", cleanText: "Increase server fan speeds to maximum" },
      { key: "d", cleanText: "Eliminate the need for air filtration" }
    ]
  },
  {
    id: "q21",
    questionNumber: 21,
    questionText: "What is Carbon Usage Effectiveness (CUE) in Green IT?",
    options: [
      { key: "a", cleanText: "Total CO2 emissions caused by data center total energy / IT equipment energy" },
      { key: "b", cleanText: "Total coal burned per server rack" },
      { key: "c", cleanText: "Server cost divided by tree count" },
      { key: "d", cleanText: "Water evaporation rate per kilowatt hour" }
    ]
  },
  {
    id: "q22",
    questionNumber: 22,
    questionText: "Which international initiative, hosted by UN universities, is dedicated to 'Solving the E-waste Problem'?",
    options: [
      { key: "a", cleanText: "StEP Initiative" },
      { key: "b", cleanText: "Greenpeace" },
      { key: "c", cleanText: "IEEE Smart Grid" },
      { key: "d", cleanText: "W3C Green Web" }
    ]
  },
  {
    id: "q23",
    questionNumber: 23,
    questionText: "Life Cycle Assessment (LCA) in Green Computing measures environmental impact across:",
    options: [
      { key: "a", cleanText: "Raw material extraction, manufacturing, distribution, usage, and end-of-life disposal" },
      { key: "b", cleanText: "Only the retail warranty period" },
      { key: "c", cleanText: "Only software compilation time" },
      { key: "d", cleanText: "The server delivery shipping time only" }
    ]
  },
  {
    id: "q24",
    questionNumber: 24,
    questionText: "What does Water Usage Effectiveness (WUE) measure in modern data center facilities?",
    options: [
      { key: "a", cleanText: "Annual water consumption (liters) divided by IT equipment energy (kWh)" },
      { key: "b", cleanText: "Rainwater collection percentage" },
      { key: "c", cleanText: "Humidity levels in server chassis" },
      { key: "d", cleanText: "Water used by facility cafeteria staff" }
    ]
  },
  {
    id: "q25",
    questionNumber: 25,
    questionText: "Which metric is the reciprocal of PUE and directly reflects Data Center infrastructure Efficiency (DCiE)?",
    options: [
      { key: "a", cleanText: "IT Equipment Energy / Total Facility Energy (1 / PUE)" },
      { key: "b", cleanText: "PUE squared" },
      { key: "c", cleanText: "Total facility energy divided by battery runtime" },
      { key: "d", cleanText: "CUE multiplied by WUE" }
    ]
  },
  {
    id: "q26",
    questionNumber: 26,
    questionText: "What is the green computing benefit of Solid State Drives (SSDs) compared to traditional mechanical Hard Disk Drives (HDDs)?",
    options: [
      { key: "a", cleanText: "Lower power consumption, zero moving parts, and lower heat dissipation" },
      { key: "b", cleanText: "SSDs generate their own solar power" },
      { key: "c", cleanText: "SSDs are made entirely from biodegradable bamboo" },
      { key: "d", cleanText: "SSDs require high-voltage mechanical motors" }
    ]
  },
  {
    id: "q27",
    questionNumber: 27,
    questionText: "In green software engineering, 'energy-efficient coding' emphasizes:",
    options: [
      { key: "a", cleanText: "Minimizing unnecessary CPU wakeups, reducing polling, and optimizing algorithmic complexity" },
      { key: "b", cleanText: "Writing endless while(true) loops" },
      { key: "c", cleanText: "Running background graphics at 240 fps continuously" },
      { key: "d", cleanText: "Preventing the computer from ever entering sleep mode" }
    ]
  },
  {
    id: "q28",
    questionNumber: 28,
    questionText: "A Microgrid integrated with renewable energy for a green campus or data center typically incorporates:",
    options: [
      { key: "a", cleanText: "Local distributed generation (solar/wind), energy storage systems (batteries), and smart grid controls" },
      { key: "b", cleanText: "Only diesel generators running 24/7" },
      { key: "c", cleanText: "Single unidirectional power lines with no control" },
      { key: "d", cleanText: "Manual switches with no battery backup" }
    ]
  },
  {
    id: "q29",
    questionNumber: 29,
    questionText: "What does Green Enterprise Architecture (GEA) ensure for an organization?",
    options: [
      { key: "a", cleanText: "Aligns IT processes, infrastructure, and business operations with environmental sustainability goals" },
      { key: "b", cleanText: "Paints all office server chassis green" },
      { key: "c", cleanText: "Replaces all computers with paper notepads" },
      { key: "d", cleanText: "Focuses exclusively on quarterly stock profits without regard to energy" }
    ]
  },
  {
    id: "q30",
    questionNumber: 30,
    questionText: "Which organization launched the 'Basel Action Network' (BAN) to monitor toxic trade and electronics dumping?",
    options: [
      { key: "a", cleanText: "A charitable non-governmental watchdog organization dedicated to toxic trade justice" },
      { key: "b", cleanText: "A commercial hardware manufacturer consortium" },
      { key: "c", cleanText: "A mining corporation association" },
      { key: "d", cleanText: "A commercial shipping freight lobby" }
    ]
  }
];

async function runLiveBenchmark() {
  console.log("================================================================================");
  console.log("🔬 STRIDE STUDYPILOT — LIVE FRONTIER AI CASCADE BENCHMARK & EXAM SIMULATION");
  console.log("================================================================================");
  console.log("Candidate Tiers:");
  console.log(" - Tier 1: Google Gemini 3.5 Flash (models/gemini-3.5-flash)");
  console.log(" - Tier 2: NVIDIA NIM Mistral Large 1T (1-Trillion Parameter Frontier Model)");
  console.log(" - Tier 3: Groq 3-Model Rotator (openai/gpt-oss-120b, qwen3.8-27b, gpt-oss-20b)");
  console.log(" - Tier 4: Exponential Backoff & Retry Guard");
  console.log("--------------------------------------------------------------------------------\n");

  const results = [];
  let groundTruthCount = 0;
  let tier1Count = 0;
  let tier2Count = 0;
  let tier3Count = 0;
  let emergencyFallbackCount = 0;
  let totalLatency = 0;

  console.log("Executing 30-Question Live Exam Simulation with Live Network Requests...\n");

  for (let i = 0; i < REAL_GREEN_COMPUTING_EXAM_30.length; i++) {
    const q = REAL_GREEN_COMPUTING_EXAM_30[i];
    const startTime = Date.now();

    try {
      const res = await background.executeBackgroundAiSolve(q, "Computer Science (Green Computing)", {
        isHighStakes: true
      });
      const duration = Date.now() - startTime;
      totalLatency += duration;

      const engineName = res.engine || "Unknown";
      if (engineName.includes("Academic Knowledge Engine")) groundTruthCount++;
      else if (engineName.includes("Gemini")) tier1Count++;
      else if (engineName.includes("NVIDIA")) tier2Count++;
      else if (engineName.includes("Groq")) tier3Count++;
      else emergencyFallbackCount++;

      results.push({
        qNum: q.questionNumber,
        selectedKey: res.selectedKey.toUpperCase(),
        engine: engineName,
        confidence: res.confidence,
        durationMs: duration,
        reasoning: res.reasoning
      });

      console.log(`[Q${String(q.questionNumber).padStart(2, '0')}/30] (${res.selectedKey.toUpperCase()}) | ${engineName.padEnd(36)} | ${duration}ms | Conf: ${res.confidence}`);
    } catch (err) {
      console.error(`[Q${q.questionNumber}] FAILED:`, err.message);
      results.push({
        qNum: q.questionNumber,
        selectedKey: "FAIL",
        engine: "ERROR",
        durationMs: Date.now() - startTime,
        error: err.message
      });
    }

    // Gentle pacing to simulate real Sentry pacing (300ms)
    await new Promise(r => setTimeout(r, 300));
  }

  console.log("\n================================================================================");
  console.log("📊 30-QUESTION LIVE EXAM SIMULATION REPORT");
  console.log("================================================================================");
  console.log(`Total Questions Tested:       ${REAL_GREEN_COMPUTING_EXAM_30.length}`);
  console.log(`Total Exam Solve Time:        ${(totalLatency / 1000).toFixed(2)} seconds`);
  console.log(`Average Latency per Question: ${(totalLatency / REAL_GREEN_COMPUTING_EXAM_30.length).toFixed(0)} ms`);
  console.log(`Priority 0 (Ground Truth):    ${groundTruthCount} / 30 (${((groundTruthCount / 30) * 100).toFixed(1)}%)`);
  console.log(`Tier 1 (Google Gemini):       ${tier1Count} / 30 (${((tier1Count / 30) * 100).toFixed(1)}%)`);
  console.log(`Tier 2 (NVIDIA NIM DGX):      ${tier2Count} / 30 (${((tier2Count / 30) * 100).toFixed(1)}%)`);
  console.log(`Tier 3 (Groq 3-Model):        ${tier3Count} / 30 (${((tier3Count / 30) * 100).toFixed(1)}%)`);
  console.log(`Emergency Fallbacks:          ${emergencyFallbackCount} / 30 (Must be 0)`);
  console.log("--------------------------------------------------------------------------------");

  if (emergencyFallbackCount === 0 && (groundTruthCount + tier1Count + tier2Count + tier3Count) === 30) {
    console.log("✅ 100% SUCCESS: All 30 questions answered by Frontier AI Engines & Ground Truth with ZERO drops!");
  } else {
    console.warn(`⚠️ WARNING: ${emergencyFallbackCount} questions dropped to fallback!`);
  }
}

runLiveBenchmark().catch(err => {
  console.error("FATAL Benchmark Error:", err);
  process.exit(1);
});
