/**
 * Tests for Stride StudyPilot 5-Agent Swarm
 * ----------------------------------------
 * Verifies Scribe (DOM parser, traps, & curriculum),
 * Scholar & Auditor (academic solver & adversarial red-team),
 * Sentry (pacing, synthetic actuation, submission lifecycle, video),
 * and Navigator (curriculum traverse & auto-progression).
 */

import { describe, it, expect } from "vitest";
import StudyPilotScribe from "../studypilot/agent/scribe.js";
import StudyPilotAuditor from "../studypilot/agent/auditor.js";
import StudyPilotSentry from "../studypilot/agent/sentry.js";
import StudyPilotNavigator from "../studypilot/agent/navigator.js";

// Lightweight Mock DOM for Amigo Moodle Quiz & Curriculum Environment
function createMockAmigoMoodleDOM(): any {
  function makeInput(id: string, name: string, type: string) {
    const el = {
      tagName: "INPUT",
      id,
      name,
      type,
      checked: false,
      focus: () => {},
      blur: () => {},
      scrollIntoView: () => {},
      click() {
        this.checked = true;
      },
      dispatchEvent(e: any) {
        if (e && (e.type === "click" || e.type === "change")) {
          this.checked = true;
        }
        return true;
      },
    };
    return el;
  }

  function makeOption(key: string, text: string, inputId: string, inputName: string) {
    const input = makeInput(inputId, inputName, "radio");
    const label = {
      tagName: "LABEL",
      innerText: `${key}. ${text}`,
      textContent: `${key}. ${text}`,
      click() {
        input.checked = true;
      },
      dispatchEvent: () => true,
    };
    const container = {
      querySelector(sel: string) {
        if (sel.includes("input")) return input;
        if (sel.includes("label")) return label;
        return null;
      },
    };
    return { container, input, label };
  }

  const q1Opts = [
    makeOption("a", "Lockout Economizer whenever necessary", "q1_a", "q1_r"),
    makeOption("b", "Establish a humidity sensor calibration schedule", "q1_b", "q1_r"),
    makeOption("c", "None of these", "q1_c", "q1_r"),
    makeOption("d", "Both of these", "q1_d", "q1_r"),
  ];

  const q2Opts = [
    makeOption("a", "Reduced carbon emissions", "q2_a", "q2_r"),
    makeOption("b", "Higher electronic waste toxicity", "q2_b", "q2_r"),
    makeOption("c", "Energy conservation", "q2_c", "q2_r"),
  ];

  function makeQuestionNode(id: string, qno: string, qtext: string, options: any[]) {
    return {
      id,
      querySelector(sel: string) {
        if (sel.includes(".no") || sel.includes(".qno")) {
          return { textContent: `Question ${qno}` };
        }
        if (sel.includes(".qtext")) {
          return { innerText: qtext, textContent: qtext };
        }
        return null;
      },
      querySelectorAll(sel: string) {
        if (sel.includes(".answer")) {
          return options.map((o) => o.container);
        }
        return [];
      },
    };
  }

  const q1Node = makeQuestionNode("q1", "1", "To maintain the datacenter at the right level", q1Opts);
  const q2Node = makeQuestionNode("q2", "2", "Which of the following is NOT a benefit of green computing?", q2Opts);

  // Mock Curriculum Sidebar Links
  const sidebarLinks = [
    {
      innerText: "4.1.2 Green Values in Practice",
      textContent: "4.1.2 Green Values in Practice",
      getAttribute: (attr: string) => attr === "href" ? "https://amigo.amityonline.com/mod/page/view.php?id=194190" : null,
      classList: { contains: (cls: string) => false },
      querySelector: () => null,
      click: () => {},
    },
    {
      innerText: "Quiz : 4.1.2 Green Values in Practice",
      textContent: "Quiz : 4.1.2 Green Values in Practice",
      getAttribute: (attr: string) => attr === "href" ? "https://amigo.amityonline.com/mod/quiz/attempt.php?attempt=105094177&cmid=239078" : null,
      classList: { contains: (cls: string) => cls === "active" },
      querySelector: () => null,
      click: () => {},
    },
    {
      innerText: "✓ 4.1.3 Green IT Metrics and Meas...",
      textContent: "✓ 4.1.3 Green IT Metrics and Meas...",
      getAttribute: (attr: string) => attr === "href" ? "https://amigo.amityonline.com/mod/page/view.php?id=194191" : null,
      classList: { contains: (cls: string) => false },
      querySelector: (s: string) => s.includes("check") ? {} : null,
      click: () => {},
    },
    {
      innerText: "✓ Quiz : 4.1.3 Green IT Metrics an...",
      textContent: "✓ Quiz : 4.1.3 Green IT Metrics an...",
      getAttribute: (attr: string) => attr === "href" ? "https://amigo.amityonline.com/mod/quiz/view.php?id=239079" : null,
      classList: { contains: (cls: string) => false },
      querySelector: (s: string) => s.includes("check") ? {} : null,
      click: () => {},
    },
  ];

  const finishAttemptBtn = {
    tagName: "BUTTON",
    className: "btn btn-primary mod_quiz-next-nav",
    innerText: "Finish attempt ...",
    textContent: "Finish attempt ...",
    value: "Finish attempt ...",
    clicked: false,
    click() {
      this.clicked = true;
    },
  };

  const doc = {
    title: "Quiz : 4.1.2 Green Values in Practice | AMIGO",
    querySelector(sel: string) {
      if (sel.includes(".page-header-headings") || sel.includes("h1")) {
        return { innerText: "Green computing (CSE433)-Semester III", textContent: "Green computing (CSE433)-Semester III" };
      }
      if (sel.includes("Finish attempt") || sel.includes("mod_quiz-next-nav")) {
        return finishAttemptBtn;
      }
      return null;
    },
    querySelectorAll(sel: string) {
      if (sel.includes(".que")) {
        return [q1Node, q2Node];
      }
      if (sel.includes("a") || sel.includes("courseindex") || sel.includes("drawer")) {
        return sidebarLinks;
      }
      if (sel.includes("button")) {
        return [finishAttemptBtn];
      }
      return [];
    },
    getElementById(id: string) {
      const allInputs = [...q1Opts.map((o) => o.input), ...q2Opts.map((o) => o.input)];
      return allInputs.find((i) => i.id === id) || null;
    },
  };

  return { doc, finishAttemptBtn };
}

describe("Stride StudyPilot — 5-Agent Swarm Test Suite", () => {
  describe("1. Agent 1: The Scribe (Perception, Traps & Curriculum)", () => {
    it("parses Amigo Moodle DOM and extracts course title and questions correctly", () => {
      const { doc } = createMockAmigoMoodleDOM();
      const result = StudyPilotScribe.parseMoodleQuestions(doc);

      expect(result.courseContext).toContain("Green computing");
      expect(result.questionsCount).toBe(2);

      const q1 = result.questions[0];
      expect(q1.questionText).toBe("To maintain the datacenter at the right level");
      expect(q1.options.length).toBe(4);
      expect(q1.options[0].key).toBe("a");
      expect(q1.options[0].cleanText).toBe("Lockout Economizer whenever necessary");
      expect(q1.options[3].key).toBe("d");
      expect(q1.options[3].cleanText).toBe("Both of these");

      // Verify Dual-Option Trap Detection
      expect(q1.traps.hasDualOptionTrap).toBe(true);
      expect(q1.traps.hasNegativeConstraint).toBe(false);

      const q2 = result.questions[1];
      expect(q2.questionText).toContain("NOT a benefit of green computing");
      // Verify Negative Constraint Trap Detection
      expect(q2.traps.hasNegativeConstraint).toBe(true);
    });

    it("parses Amigo left drawer curriculum items and determines current/next activity", () => {
      const { doc } = createMockAmigoMoodleDOM();
      const plan = StudyPilotScribe.parseCurriculum(doc, "https://amigo.amityonline.com/mod/quiz/attempt.php?attempt=105094177&cmid=239078");

      expect(plan.totalCount).toBe(4);
      expect(plan.currentItem).not.toBeNull();
      expect(plan.currentItem?.title).toContain("Quiz : 4.1.2 Green Values in Practice");
      expect(plan.nextItem).not.toBeNull();
      expect(plan.nextItem?.title).toContain("4.1.3 Green IT Metrics");
      expect(plan.items[2].isCompleted).toBe(true);
    });

    it("detects page mode correctly", () => {
      const { doc } = createMockAmigoMoodleDOM();
      expect(StudyPilotScribe.detectPageMode(doc, "https://amigo.amityonline.com/mod/quiz/attempt.php?attempt=105094177&cmid=239078")).toBe("quiz-attempt");
      expect(StudyPilotScribe.detectPageMode(doc, "https://amigo.amityonline.com/mod/quiz/summary.php?attempt=105094177&cmid=239078")).toBe("quiz-summary");
      expect(StudyPilotScribe.detectPageMode({ querySelector: () => null } as any, "https://amigo.amityonline.com/mod/page/view.php?id=194191")).toBe("lecture-page");
      expect(StudyPilotScribe.detectPageMode({ querySelector: () => null } as any, "https://amigo.amityonline.com/mod/quiz/review.php?attempt=105094177")).toBe("quiz-review");
    });
  });

  describe("2. Agent 3: The Auditor (Red-Team Cross-Examiner)", () => {
    it("detects and overrides single option in favor of 'Both of these' when both options are valid", () => {
      const { doc } = createMockAmigoMoodleDOM();
      const parsed = StudyPilotScribe.parseMoodleQuestions(doc);
      const q1 = parsed.questions[0];

      // Simulated Scholar output that fell for option A but noted both in reasoning
      const scholarAnswer = {
        selectedKey: "a",
        reasoning: "Lockout economizers help, and establish a humidity calibration schedule is also required.",
        confidence: 0.9,
      };

      const audited = StudyPilotAuditor.auditAnswer(q1, scholarAnswer);
      expect(audited.selectedKey).toBe("d"); // Overridden to 'Both of these'!
      expect(audited.confidence).toBeGreaterThanOrEqual(0.98);
      expect(audited.auditNotes).toContain("Overrode single option 'a' in favor of dual option 'd'");
    });

    it("handles negative constraints and validates confidence", () => {
      const { doc } = createMockAmigoMoodleDOM();
      const parsed = StudyPilotScribe.parseMoodleQuestions(doc);
      const q2 = parsed.questions[1];

      const scholarAnswer = {
        selectedKey: "b",
        reasoning: "Higher electronic waste toxicity is harmful, not a benefit.",
        confidence: 0.95,
      };

      const audited = StudyPilotAuditor.auditAnswer(q2, scholarAnswer);
      expect(audited.selectedKey).toBe("b");
      expect(audited.verified).toBe(true);
      expect(audited.auditNotes).toContain("Negative constraint audited");
    });
  });

  describe("3. Agent 4: The Sentry (Physical Actuator & Pacing)", () => {
    it("calculates safe pacing delays according to speed mode", () => {
      const instant = StudyPilotSentry.calculatePacingDelay("instant");
      expect(instant).toBe(100);

      const ninja = StudyPilotSentry.calculatePacingDelay("ninja");
      expect(ninja).toBeGreaterThanOrEqual(600);
      expect(ninja).toBeLessThanOrEqual(1200);

      const human = StudyPilotSentry.calculatePacingDelay("humanized");
      expect(human).toBeGreaterThanOrEqual(1500);
      expect(human).toBeLessThanOrEqual(3000);
    });

    it("actuates synthetic click and marks radio input checked", async () => {
      const { doc } = createMockAmigoMoodleDOM();
      const parsed = StudyPilotScribe.parseMoodleQuestions(doc);
      const q1 = parsed.questions[0];

      const verifiedAnswer = {
        selectedKey: "d",
        confidence: 0.98,
        reasoning: "Both economizer lockout and humidity sensors are essential.",
      };

      // Actuate in instant mode for fast test execution
      const success = await StudyPilotSentry.actuateSelection(q1, verifiedAnswer, "instant");
      expect(success).toBe(true);

      const radioD = doc.getElementById("q1_d") as HTMLInputElement;
      expect(radioD.checked).toBe(true);
    });

    it("finds Finish Attempt button and triggers submission click", async () => {
      const { doc } = createMockAmigoMoodleDOM();
      const foundBtn = StudyPilotSentry.findFinishAttemptButton(doc);
      expect(foundBtn).not.toBeNull();
      expect((foundBtn as any)?.innerText).toContain("Finish attempt");
    });
  });

  describe("4. Agent 5: The Navigator (Curriculum Traversal)", () => {
    it("retrieves curriculum plan and next incomplete activity", () => {
      // Attach Scribe to global window for navigator bridge
      (globalThis as any).window = {
        StudyPilotScribe,
        location: { href: "https://amigo.amityonline.com/mod/quiz/attempt.php?attempt=105094177&cmid=239078" },
      };

      const { doc } = createMockAmigoMoodleDOM();
      const plan = StudyPilotNavigator.getCurriculumPlan(doc);
      expect(plan.totalCount).toBe(4);
      expect(plan.nextItem?.title).toContain("4.1.3 Green IT Metrics");
    });
  });
});
