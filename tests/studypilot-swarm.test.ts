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
import StudyPilotInspector from "../studypilot/agent/inspector.js";

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

  // Quiz 1.2.1 Green Strategic Points Mock
  const q3Opts = [
    makeOption("a", "STEP(Solving e-waste problem)", "q3_a", "q3_r"),
    makeOption("b", "Byte Back program", "q3_b", "q3_r"),
    makeOption("c", "Basel Action Network", "q3_c", "q3_r"),
    makeOption("d", "RoHS", "q3_d", "q3_r"),
  ];

  const q4Opts = [
    makeOption("a", "Electronic Product Environmental Assessment Tool", "q4_a", "q4_r"),
    makeOption("b", "Product Environmental Assessment Tool", "q4_b", "q4_r"),
    makeOption("c", "Electronic Purchase Environmental Assessment Tool", "q4_c", "q4_r"),
    makeOption("d", "Ecommerce Product Environmental Assessment Tool", "q4_d", "q4_r"),
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
  const q3Node = makeQuestionNode("q3", "1", "___________ is charitable non-governmental organization which focuses on reducing the export of hazardous waste from development countries to developing countries.", q3Opts);
  const q4Node = makeQuestionNode("q4", "2", "EPEAT stands for _______________", q4Opts);

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
      expect(StudyPilotScribe.detectPageMode({ querySelector: () => null } as any, "https://amigo.amityonline.com/mod/quiz/view.php?id=238965")).toBe("quiz-view");
      expect(StudyPilotScribe.detectPageMode({ querySelector: () => null } as any, "https://amigo.amityonline.com/mod/quiz/processattempt.php?cmid=239004")).toBe("quiz-process-error");
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

    it("filters out optional non-credit links (Announcement, Discussion Forum, Interactive SLM) and recovers from lost page", () => {
      let navigatedTarget = "";

      const staticLinks = [
        {
          innerText: "Announcement",
          textContent: "Announcement",
          getAttribute: () => "https://amigo.amityonline.com/mod/forum/view.php?id=176410",
          classList: { contains: () => false },
          querySelector: () => null,
        },
        {
          innerText: "Discussion Forum",
          textContent: "Discussion Forum",
          getAttribute: () => "https://amigo.amityonline.com/mod/forum/view.php?id=176411",
          classList: { contains: () => false },
          querySelector: () => null,
        },
        {
          innerText: "Interactive SLM",
          textContent: "Interactive SLM",
          getAttribute: () => "https://amigo.amityonline.com/mod/page/view.php?id=176412",
          classList: { contains: (cls: string) => cls === "active" }, // Currently on Interactive SLM!
          querySelector: () => null,
        },
        {
          innerText: "✓ 1.2.1 Green Strategic Points",
          textContent: "✓ 1.2.1 Green Strategic Points",
          getAttribute: () => "https://amigo.amityonline.com/mod/page/view.php?id=194200",
          classList: { contains: () => false },
          querySelector: () => null,
        },
        {
          innerText: "✓ Quiz : 1.2.1 Green Strategic Points",
          textContent: "✓ Quiz : 1.2.1 Green Strategic Points",
          getAttribute: () => "https://amigo.amityonline.com/mod/quiz/view.php?id=238965",
          classList: { contains: () => false },
          querySelector: () => null,
        },
        {
          innerText: "1.2.2 Green Value",
          textContent: "1.2.2 Green Value",
          getAttribute: () => "https://amigo.amityonline.com/mod/page/view.php?id=194201",
          classList: { contains: () => false },
          querySelector: () => null,
          click: () => { navigatedTarget = "1.2.2 Green Value"; },
        },
        {
          innerText: "Quiz : 1.2.2 Green Value",
          textContent: "Quiz : 1.2.2 Green Value",
          getAttribute: () => "https://amigo.amityonline.com/mod/quiz/view.php?id=238966",
          classList: { contains: () => false },
          querySelector: () => null,
          click: () => { navigatedTarget = "Quiz : 1.2.2 Green Value"; },
        },
      ];

      const mockLostDoc = {
        querySelectorAll: (sel: string) => sel.includes("courseindex") || sel.includes("drawer") || sel.includes("a") ? staticLinks : [],
        querySelector: () => null,
      };

      (globalThis as any).window = {
        StudyPilotScribe,
        location: { href: "https://amigo.amityonline.com/mod/page/view.php?id=176412" },
      };

      const plan = StudyPilotScribe.parseCurriculum(mockLostDoc as any, "https://amigo.amityonline.com/mod/page/view.php?id=176412");

      // Verify that Announcement, Discussion Forum, and Interactive SLM are completely excluded from items!
      expect(plan.items.some((it: any) => it.title.toLowerCase().includes("announcement"))).toBe(false);
      expect(plan.items.some((it: any) => it.title.toLowerCase().includes("discussion forum"))).toBe(false);
      expect(plan.items.some((it: any) => it.title.toLowerCase().includes("interactive slm"))).toBe(false);

      // Verify that the plan contains only the 4 academic curriculum items
      expect(plan.totalCount).toBe(4);

      // Verify findNextIncompleteActivity returns "1.2.2 Green Value"
      const nextIncomplete = StudyPilotNavigator.findNextIncompleteActivity(mockLostDoc as any);
      expect(nextIncomplete).not.toBeNull();
      expect(nextIncomplete?.title).toContain("1.2.2 Green Value");

      // Verify navigateToNextActivity recovers from Interactive SLM and clicks "1.2.2 Green Value"
      const navResult = StudyPilotNavigator.navigateToNextActivity(mockLostDoc as any);
      expect(navResult.success).toBe(true);
      expect(navResult.target).toContain("1.2.2 Green Value");
      expect(navigatedTarget).toBe("1.2.2 Green Value");
    });
  });

  describe("5. Live Amigo Quiz 1.2.1 Evaluation", () => {
    it("correctly identifies Basel Action Network (BAN) for hazardous waste question", () => {
      const q3 = {
        id: "q3",
        questionNumber: 1,
        questionText: "___________ is charitable non-governmental organization which focuses on reducing the export of hazardous waste from development countries to developing countries.",
        options: [
          { key: "a", cleanText: "STEP(Solving e-waste problem)" },
          { key: "b", cleanText: "Byte Back program" },
          { key: "c", cleanText: "Basel Action Network" },
          { key: "d", cleanText: "RoHS" },
        ],
        traps: { hasDualOptionTrap: false, hasNegativeConstraint: false }
      };

      const scholarAnswer = {
        selectedKey: "c",
        reasoning: "The Basel Action Network (BAN) is the charitable NGO focused on confronting the toxic waste trade.",
        confidence: 0.98,
      };

      const audited = StudyPilotAuditor.auditAnswer(q3 as any, scholarAnswer);
      expect(audited.selectedKey).toBe("c");
      expect(audited.verified).toBe(true);
    });

    it("correctly identifies EPEAT acronym definition", () => {
      const q4 = {
        id: "q4",
        questionNumber: 2,
        questionText: "EPEAT stands for _______________",
        options: [
          { key: "a", cleanText: "Electronic Product Environmental Assessment Tool" },
          { key: "b", cleanText: "Product Environmental Assessment Tool" },
          { key: "c", cleanText: "Electronic Purchase Environmental Assessment Tool" },
          { key: "d", cleanText: "Ecommerce Product Environmental Assessment Tool" },
        ],
        traps: { hasDualOptionTrap: false, hasNegativeConstraint: false }
      };

      const scholarAnswer = {
        selectedKey: "a",
        reasoning: "EPEAT stands for Electronic Product Environmental Assessment Tool.",
        confidence: 0.98,
      };

      const audited = StudyPilotAuditor.auditAnswer(q4 as any, scholarAnswer);
      expect(audited.selectedKey).toBe("a");
      expect(audited.verified).toBe(true);
    });
  });

  describe("6. Summary Page Submission & Confirmation Modal Lifecycle", () => {
    it("strictly avoids 'Return to attempt' button and selects 'Submit all and finish'", () => {
      let returnBtnClicked = false;
      let submitBtnClicked = false;

      const returnBtn = {
        tagName: "BUTTON",
        className: "btn btn-secondary",
        innerText: "Return to attempt",
        textContent: "Return to attempt",
        value: "Return to attempt",
        classList: { contains: (cls: string) => cls === "btn-secondary" },
        click: () => { returnBtnClicked = true; },
      };

      const submitBtn = {
        tagName: "BUTTON",
        className: "btn btn-primary",
        innerText: "Submit all and finish",
        textContent: "Submit all and finish",
        value: "Submit all and finish",
        classList: { contains: (cls: string) => cls === "btn-primary" },
        click: () => { submitBtnClicked = true; },
      };

      const returnForm = {
        tagName: "FORM",
        action: "https://amigo.amityonline.com/mod/quiz/attempt.php?attempt=105099180&cmid=238965",
        querySelector: (sel: string) => sel.includes("button") ? returnBtn : null,
      };

      const processForm = {
        tagName: "FORM",
        action: "https://amigo.amityonline.com/mod/quiz/processattempt.php",
        querySelector: (sel: string) => sel.includes("button") ? submitBtn : null,
      };

      const mockSummaryDoc = {
        querySelector(sel: string) {
          if (sel.includes('form[action*="processattempt.php"]')) {
            return processForm;
          }
          if (sel.includes("Submit all and finish")) {
            return submitBtn;
          }
          return null;
        },
        querySelectorAll(sel: string) {
          if (sel.includes("singlebutton") || sel.includes("button")) {
            // Note: returnBtn is deliberately placed FIRST in DOM order to simulate Moodle layout
            return [returnBtn, submitBtn];
          }
          return [];
        },
      };

      const selectedBtn = StudyPilotSentry.findSummarySubmitButton(mockSummaryDoc as any);
      expect(selectedBtn).not.toBeNull();
      expect((selectedBtn as any).innerText).toBe("Submit all and finish");
      expect((selectedBtn as any).innerText).not.toContain("Return to attempt");

      (selectedBtn as any).click();
      expect(submitBtnClicked).toBe(true);
      expect(returnBtnClicked).toBe(false);
    });

    it("polls for and confirms the Moodle confirmation modal while ignoring Cancel", async () => {
      let modalConfirmed = false;
      let modalCancelled = false;
      let formSubmitted = false;

      const pageSummaryBtn = {
        tagName: "BUTTON",
        className: "btn btn-primary",
        innerText: "Submit all and finish",
        textContent: "Submit all and finish",
        classList: { contains: (cls: string) => cls === "btn-primary" },
        click: () => {},
      };

      const processForm = {
        tagName: "FORM",
        action: "https://amigo.amityonline.com/mod/quiz/processattempt.php",
        querySelector: (sel: string) => sel.includes("button") ? pageSummaryBtn : null,
        requestSubmit: () => { formSubmitted = true; },
        submit: () => { formSubmitted = true; },
      };

      const modalCancelBtn = {
        tagName: "BUTTON",
        className: "btn btn-secondary",
        innerText: "Cancel",
        textContent: "Cancel",
        getAttribute: (attr: string) => attr === "data-action" ? "cancel" : null,
        classList: { contains: (cls: string) => cls === "btn-secondary" },
        click: () => { modalCancelled = true; },
      };

      const modalSubmitBtn = {
        tagName: "BUTTON",
        className: "btn btn-primary",
        innerText: "Submit all and finish",
        textContent: "Submit all and finish",
        getAttribute: (attr: string) => attr === "data-action" ? "save" : null,
        classList: { contains: (cls: string) => cls === "btn-primary" },
        focus: () => {},
        dispatchEvent: () => true,
        click: () => { 
          modalConfirmed = true; 
          processForm.submit(); 
        },
      };

      const mockModal = {
        tagName: "DIV",
        className: "modal show",
        querySelectorAll: (sel: string) => [modalCancelBtn, modalSubmitBtn],
      };

      const mockModalDoc = {
        querySelector(sel: string) {
          if (sel.includes('form[action*="processattempt.php"]')) {
            return processForm;
          }
          if (sel.includes("modal") || sel.includes("dialog")) {
            return mockModal;
          }
          return null;
        },
        querySelectorAll(sel: string) {
          if (sel.includes("modal")) {
            return [mockModal];
          }
          return [];
        },
      };

      // 1. Verify findModalSubmitButton isolates modal button from page summary button
      const detectedModalBtn = StudyPilotSentry.findModalSubmitButton(mockModalDoc as any, pageSummaryBtn as any);
      expect(detectedModalBtn).not.toBeNull();
      expect(detectedModalBtn).toBe(modalSubmitBtn);
      expect(detectedModalBtn).not.toBe(pageSummaryBtn);

      // 2. Verify confirmSubmitAllModal clicks modal button and executes form submission fallback
      const confirmed = await StudyPilotSentry.confirmSubmitAllModal(mockModalDoc as any);
      expect(confirmed).toBe(true);
      expect(modalConfirmed).toBe(true);
      expect(modalCancelled).toBe(false);
      expect(formSubmitted).toBe(true);
    });

    it("handles Finish Review and Attempt Quiz button actuations properly", async () => {
      let reviewFinished = false;
      let quizAttemptStarted = false;

      const finishReviewLink = {
        tagName: "A",
        className: "mod_quiz-finish-review",
        innerText: "Finish review",
        textContent: "Finish review",
        href: "https://amigo.amityonline.com/mod/quiz/view.php?id=238965",
        click: () => { reviewFinished = true; },
      };

      const mockReviewDoc = {
        querySelector(sel: string) {
          if (sel.includes("finish-review") || sel.includes("finishreview")) {
            return finishReviewLink;
          }
          return null;
        },
        querySelectorAll: () => [finishReviewLink],
      };

      const reviewResult = await StudyPilotSentry.clickFinishReview(mockReviewDoc as any);
      expect(reviewResult).toBe(true);
      expect(reviewFinished).toBe(true);

      const attemptQuizBtn = {
        tagName: "BUTTON",
        className: "btn btn-primary",
        innerText: "Attempt quiz",
        textContent: "Attempt quiz",
        value: "Attempt quiz",
        click: () => { quizAttemptStarted = true; },
      };

      const mockViewDoc = {
        querySelector(sel: string) {
          if (sel.includes("Attempt quiz")) {
            return attemptQuizBtn;
          }
          return null;
        },
        querySelectorAll: () => [attemptQuizBtn],
      };

      const attemptResult = await StudyPilotSentry.clickAttemptQuiz(mockViewDoc as any);
      expect(attemptResult).toBe(true);
      expect(quizAttemptStarted).toBe(true);
    });

    it("finds and actuates 'Mark as done' on manual completion pages without double-toggling completed items", async () => {
      let markDoneClicked = false;

      const liveClassDoneBtn = {
        tagName: "BUTTON",
        className: "btn btn-outline-secondary",
        innerText: "Mark as done",
        textContent: "Mark as done",
        getAttribute: (attr: string) => attr === "data-action" ? "toggle-manual-completion" : null,
        click: () => { markDoneClicked = true; },
      };

      const mockLiveClassDoc = {
        querySelector(sel: string) {
          if (sel.includes("toggle-manual-completion")) return liveClassDoneBtn;
          return null;
        },
        querySelectorAll: () => [liveClassDoneBtn],
      };

      // 1. Detects and clicks "Mark as done"
      const foundBtn = StudyPilotSentry.findMarkAsDoneButton(mockLiveClassDoc as any);
      expect(foundBtn).not.toBeNull();
      expect((foundBtn as any).innerText).toBe("Mark as done");

      const success = await StudyPilotSentry.clickMarkAsDone(mockLiveClassDoc as any);
      expect(success).toBe(true);
      expect(markDoneClicked).toBe(true);

      // 2. Ignores already completed buttons (e.g. "✓ Done" or "Done") to prevent unmarking
      const alreadyDoneBtn = {
        tagName: "BUTTON",
        className: "btn btn-outline-success",
        innerText: "✓ Done",
        textContent: "✓ Done",
        getAttribute: (attr: string) => {
          if (attr === "data-action") return "toggle-manual-completion";
          if (attr === "data-toggled") return "true";
          return null;
        },
        click: () => {},
      };

      const mockCompletedDoc = {
        querySelector: () => alreadyDoneBtn,
        querySelectorAll: () => [alreadyDoneBtn],
      };

      const completedFound = StudyPilotSentry.findMarkAsDoneButton(mockCompletedDoc as any);
      expect(completedFound).toBeNull();
    });

    it("strictly ignores optional non-credit items (Announcement, Discussion Forum, Interactive SLM) and rescues navigation to incomplete academic topics", () => {
      const announcementNode = {
        tagName: "A",
        href: "https://amigo.amityonline.com/mod/forum/view.php?id=176418",
        innerText: "Announcements",
        textContent: "Announcements",
        getAttribute: (attr: string) => attr === "href" ? "https://amigo.amityonline.com/mod/forum/view.php?id=176418" : null,
        classList: { contains: () => false },
      };

      const discussionForumNode = {
        tagName: "A",
        href: "https://amigo.amityonline.com/mod/forum/view.php?id=176419",
        innerText: "Discussion Forum : Green computing",
        textContent: "Discussion Forum : Green computing",
        getAttribute: (attr: string) => attr === "href" ? "https://amigo.amityonline.com/mod/forum/view.php?id=176419" : null,
        classList: { contains: () => false },
      };

      const interactiveSlmNode = {
        tagName: "A",
        href: "https://amigo.amityonline.com/mod/url/view.php?id=176420",
        innerText: "Interactive SLM : Green computing",
        textContent: "Interactive SLM : Green computing",
        getAttribute: (attr: string) => attr === "href" ? "https://amigo.amityonline.com/mod/url/view.php?id=176420" : null,
        classList: { contains: () => false },
      };

      let nextTopicClicked = false;
      const nextAcademicTopicNode = {
        tagName: "A",
        href: "https://amigo.amityonline.com/mod/page/view.php?id=192359",
        innerText: "o 1.2.2 Green Value",
        textContent: "o 1.2.2 Green Value",
        getAttribute: (attr: string) => attr === "href" ? "https://amigo.amityonline.com/mod/page/view.php?id=192359" : null,
        classList: { contains: () => false },
        click: () => { nextTopicClicked = true; },
      };

      const mockSidebarDoc = {
        querySelectorAll(sel: string) {
          if (sel.includes("a")) {
            return [announcementNode, discussionForumNode, interactiveSlmNode, nextAcademicTopicNode];
          }
          return [];
        },
      };

      const curriculum = StudyPilotScribe.parseCurriculum(mockSidebarDoc as any, "https://amigo.amityonline.com/mod/forum/view.php?id=176418");
      
      // Announcements, Discussion Forum, and Interactive SLM must NOT appear in the academic curriculum
      expect(curriculum.items.some(it => it.title.includes("Announcement"))).toBe(false);
      expect(curriculum.items.some(it => it.title.includes("Discussion Forum"))).toBe(false);
      expect(curriculum.items.some(it => it.title.includes("Interactive SLM"))).toBe(false);

      // Only true academic curriculum items remain
      expect(curriculum.items.length).toBe(1);
      expect(curriculum.items[0].title).toBe("1.2.2 Green Value");
      expect(curriculum.items[0].isCompleted).toBe(false);
    });

    it("accurately detects passive view completion ('Done: View') on lecture pages", () => {
      const mockLectureBadge = {
        tagName: "SPAN",
        className: "badge badge-success",
        innerText: "Done: View",
        textContent: "Done: View",
      };

      const mockLectureDocWithViewDone = {
        querySelectorAll(sel: string) {
          if (sel.includes("badge") || sel.includes("span")) {
            return [mockLectureBadge];
          }
          return [];
        },
      };

      const hasView = StudyPilotScribe.hasPassiveViewCompletion(mockLectureDocWithViewDone as any);
      expect(hasView).toBe(true);

      const mockEmptyDoc = {
        querySelectorAll: () => [],
      };
      const hasViewEmpty = StudyPilotScribe.hasPassiveViewCompletion(mockEmptyDoc as any);
      expect(hasViewEmpty).toBe(false);
    });

    it("extracts quiz highest grade and determines perfection vs re-attempt requirement", () => {
      // 1. Imperfect Grade (5.00 / 10.00)
      const mockImperfectDoc = {
        querySelectorAll: () => [
          {
            tagName: "H3",
            innerText: "Highest grade: 5.00 / 10.00.",
            textContent: "Highest grade: 5.00 / 10.00.",
          },
        ],
      };
      const imperfectGrade = StudyPilotScribe.extractQuizGrade(mockImperfectDoc as any);
      expect(imperfectGrade.hasGrade).toBe(true);
      expect(imperfectGrade.score).toBe(5.00);
      expect(imperfectGrade.total).toBe(10.00);
      expect(imperfectGrade.percentage).toBe(50);
      expect(imperfectGrade.isPerfect).toBe(false);

      // 2. Perfect Grade (10.00 / 10.00)
      const mockPerfectDoc = {
        querySelectorAll: () => [
          {
            tagName: "H3",
            innerText: "Highest grade: 10.00 / 10.00.",
            textContent: "Highest grade: 10.00 / 10.00.",
          },
        ],
      };
      const perfectGrade = StudyPilotScribe.extractQuizGrade(mockPerfectDoc as any);
      expect(perfectGrade.hasGrade).toBe(true);
      expect(perfectGrade.score).toBe(10.00);
      expect(perfectGrade.total).toBe(10.00);
      expect(perfectGrade.percentage).toBe(100);
      expect(perfectGrade.isPerfect).toBe(true);

      // 3. No Attempts / Fresh Quiz
      const mockFreshDoc = {
        querySelectorAll: () => [],
      };
      const freshGrade = StudyPilotScribe.extractQuizGrade(mockFreshDoc as any);
      expect(freshGrade.hasGrade).toBe(false);
      expect(freshGrade.isPerfect).toBe(false);
    });

    it("locates re-attempt button on imperfect quiz view pages", () => {
      const reattemptBtn = {
        tagName: "BUTTON",
        className: "btn btn-primary",
        innerText: "Re-attempt quiz",
        textContent: "Re-attempt quiz",
        value: "Re-attempt quiz",
        click: () => {},
      };

      const mockReattemptDoc = {
        querySelector(sel: string) {
          if (sel.includes("Re-attempt")) return reattemptBtn;
          return null;
        },
        querySelectorAll: () => [reattemptBtn],
      };

      const foundBtn = StudyPilotSentry.findAttemptOrReattemptButton(mockReattemptDoc as any);
      expect(foundBtn).not.toBeNull();
      expect((foundBtn as any).innerText).toBe("Re-attempt quiz");
    });

    it("seamlessly parses and processes a 30-question comprehensive module assessment", () => {
      // Simulate 30 distinct questions with diverse options and traps
      const questions30: any[] = [];
      for (let i = 1; i <= 30; i++) {
        const inputA = { tagName: "INPUT", id: `q${i}_a`, name: `q${i}`, type: "radio", checked: false, click() { this.checked = true; } };
        const labelA = { tagName: "LABEL", innerText: "a. Primary Principle", textContent: "a. Primary Principle" };
        const optA = { querySelector: (sel: string) => sel.includes("input") ? inputA : labelA };

        const inputB = { tagName: "INPUT", id: `q${i}_b`, name: `q${i}`, type: "radio", checked: false, click() { this.checked = true; } };
        const labelB = { tagName: "LABEL", innerText: "b. Secondary Standard", textContent: "b. Secondary Standard" };
        const optB = { querySelector: (sel: string) => sel.includes("input") ? inputB : labelB };

        const inputC = { tagName: "INPUT", id: `q${i}_c`, name: `q${i}`, type: "radio", checked: false, click() { this.checked = true; } };
        const labelC = { tagName: "LABEL", innerText: "c. Both of these", textContent: "c. Both of these" };
        const optC = { querySelector: (sel: string) => sel.includes("input") ? inputC : labelC };

        const qNode = {
          id: `question-${i}`,
          querySelector(sel: string) {
            if (sel.includes(".no") || sel.includes(".qno")) return { textContent: `Question ${i}` };
            if (sel.includes(".qtext")) return { innerText: `What is academic fundamental requirement #${i}?` };
            return null;
          },
          querySelectorAll(sel: string) {
            if (sel.includes(".answer") || sel.includes("label") || sel.includes("div")) return [optA, optB, optC];
            return [];
          },
        };
        questions30.push(qNode);
      }

      const mockAssessmentDoc = {
        querySelector: () => null,
        querySelectorAll(sel: string) {
          if (sel.includes(".que") || sel.includes("div[id^=\"question-\"]")) {
            return questions30;
          }
          return [];
        },
      };

      const parsed = StudyPilotScribe.parseMoodleQuestions(mockAssessmentDoc as any);
      expect(parsed.questionsCount).toBe(30);
      expect(parsed.questions.length).toBe(30);
      expect(parsed.questions[0].questionNumber).toBe(1);
      expect(parsed.questions[29].questionNumber).toBe(30);
      expect(parsed.questions[0].options.length).toBe(3);
      expect(parsed.questions[0].traps.hasDualOptionTrap).toBe(true);
    });

    it("Inspector audits pre-submission radio selections and blocks submission if any question is unattempted", () => {
      // Create 5 questions where Question 3 has NO checked input
      const qNodes: any[] = [];
      for (let i = 1; i <= 5; i++) {
        const isChecked = i !== 3; // Question 3 is missing radio selection!
        const input = isChecked ? { tagName: "INPUT", type: "radio", checked: true } : null;
        qNodes.push({
          id: `question-${i}`,
          querySelector(sel: string) {
            if (sel.includes(".no") || sel.includes(".qno")) return { textContent: `Question ${i}` };
            if (sel.includes(":checked") || sel.includes(".checked")) return input;
            return null;
          },
        });
      }

      const mockDoc = {
        querySelectorAll: () => qNodes,
      };

      const audit = StudyPilotInspector.verifyAllQuestionsAttempted(mockDoc as any);
      expect(audit.isAllAttempted).toBe(false);
      expect(audit.total).toBe(5);
      expect(audit.attemptedCount).toBe(4);
      expect(audit.unattemptedCount).toBe(1);
      expect(audit.unattemptedQuestions[0].questionNumber).toBe(3);

      // Now satisfy Question 3
      qNodes[2].querySelector = (sel: string) => {
        if (sel.includes(".no") || sel.includes(".qno")) return { textContent: `Question 3` };
        return { tagName: "INPUT", type: "radio", checked: true };
      };

      const cleanAudit = StudyPilotInspector.verifyAllQuestionsAttempted(mockDoc as any);
      expect(cleanAudit.isAllAttempted).toBe(true);
      expect(cleanAudit.unattemptedCount).toBe(0);
      expect(cleanAudit.attemptedCount).toBe(5);
    });

    it("Inspector detects high-stakes 3-attempt constraints and enforces attempt limits", () => {
      // High-Stakes Module Assessment with 3 attempts limit and 1 attempt used
      const mockHighStakesDoc = {
        querySelectorAll(sel: string) {
          if (sel.includes("tr")) {
            return [
              { innerText: "Attempt 1 Finished" },
            ];
          }
          return [
            { innerText: "Attempts allowed: 3" },
            { innerText: "Grading method: Highest grade" },
            { innerText: "1st Module Assessment" },
          ];
        },
      };

      const stakes = StudyPilotInspector.getAssessmentStakes(mockHighStakesDoc as any);
      expect(stakes.isHighStakes).toBe(true);
      expect(stakes.attemptsAllowed).toBe(3);
      expect(stakes.attemptsUsed).toBe(1);
      expect(stakes.attemptsRemaining).toBe(2);
      expect(stakes.canSafelyAttempt).toBe(true);

      // Exhausted 3-attempt assessment
      const mockExhaustedDoc = {
        querySelectorAll(sel: string) {
          if (sel.includes("tr")) {
            return [
              { innerText: "Attempt 1 Finished" },
              { innerText: "Attempt 2 Finished" },
              { innerText: "Attempt 3 Finished" },
            ];
          }
          return [
            { innerText: "Attempts allowed: 3" },
          ];
        },
      };

      const exhaustedStakes = StudyPilotInspector.getAssessmentStakes(mockExhaustedDoc as any);
      expect(exhaustedStakes.attemptsRemaining).toBe(0);
      expect(exhaustedStakes.canSafelyAttempt).toBe(false);
    });

    it("verifies strict chronological navigation on Live Class 2 and advances to Live Class 3", () => {
      let clickedItem = "";
      const currentUrl = "https://amigo.amityonline.com/mod/googlemeet/view.php?id=375981";

      const liveClassLinks = [
        {
          innerText: "✓ Live Class 1 Green computing",
          textContent: "✓ Live Class 1 Green computing",
          getAttribute: (attr: string) => attr === "href" ? "https://amigo.amityonline.com/mod/googlemeet/view.php?id=375980" : null,
          classList: { contains: () => false },
          querySelector: () => null,
        },
        {
          innerText: "✓ Live Class-2_Green computing",
          textContent: "✓ Live Class-2_Green computing",
          getAttribute: (attr: string) => attr === "href" ? currentUrl : null,
          classList: { contains: (cls: string) => cls === "active" }, // CURRENT
          querySelector: () => null,
        },
        {
          innerText: "○ Live Class-3_Green computing",
          textContent: "○ Live Class-3_Green computing",
          getAttribute: (attr: string) => attr === "href" ? "https://amigo.amityonline.com/mod/googlemeet/view.php?id=375982" : null,
          classList: { contains: () => false },
          querySelector: () => null,
          click: () => { clickedItem = "Live Class-3_Green computing"; },
        },
        {
          innerText: "○ Live Class-4_Green computing",
          textContent: "○ Live Class-4_Green computing",
          getAttribute: (attr: string) => attr === "href" ? "https://amigo.amityonline.com/mod/googlemeet/view.php?id=375983" : null,
          classList: { contains: () => false },
          querySelector: () => null,
        },
        {
          innerText: "✓ Syllabus",
          textContent: "✓ Syllabus",
          getAttribute: (attr: string) => attr === "href" ? "https://amigo.amityonline.com/mod/page/view.php?id=176416" : null,
          classList: { contains: () => false },
          querySelector: () => null,
        },
        {
          innerText: "Announcements",
          textContent: "Announcements",
          getAttribute: (attr: string) => attr === "href" ? "https://amigo.amityonline.com/mod/forum/view.php?id=176410" : null,
          classList: { contains: () => false },
          querySelector: () => null,
        },
        {
          innerText: "Discussion Forum : Green computing",
          textContent: "Discussion Forum : Green computing",
          getAttribute: (attr: string) => attr === "href" ? "https://amigo.amityonline.com/mod/forum/view.php?id=176411" : null,
          classList: { contains: () => false },
          querySelector: () => null,
        },
        {
          innerText: "Interactive SLM : Green computing",
          textContent: "Interactive SLM : Green computing",
          getAttribute: (attr: string) => attr === "href" ? "https://amigo.amityonline.com/mod/page/view.php?id=176412" : null,
          classList: { contains: () => false },
          querySelector: () => null,
        },
        {
          innerText: "○ 1.1.3 Information Technology",
          textContent: "○ 1.1.3 Information Technology",
          getAttribute: (attr: string) => attr === "href" ? "https://amigo.amityonline.com/mod/page/view.php?id=194205" : null,
          classList: { contains: () => false },
          querySelector: () => null,
        },
      ];

      const mockLiveClassDoc = {
        querySelectorAll: (sel: string) => sel.includes("a") ? liveClassLinks : [],
        querySelector: (sel: string) => null,
      };

      (globalThis as any).window = {
        StudyPilotScribe,
        location: { href: currentUrl },
      };

      // 1. Verify Page Mode is 'live-class' (NOT 'quiz-view'!)
      const pageMode = StudyPilotScribe.detectPageMode(mockLiveClassDoc as any, currentUrl);
      expect(pageMode).toBe("live-class");

      // 2. Parse curriculum
      const plan = StudyPilotScribe.parseCurriculum(mockLiveClassDoc as any, currentUrl);

      // Verify Announcements, Discussion Forum, and Interactive SLM are strictly ignored
      expect(plan.items.some(it => it.title.includes("Announcements"))).toBe(false);
      expect(plan.items.some(it => it.title.includes("Discussion Forum"))).toBe(false);
      expect(plan.items.some(it => it.title.includes("Interactive SLM"))).toBe(false);

      // Verify current item is Live Class-2
      expect(plan.currentItem).not.toBeNull();
      expect(plan.currentItem?.title).toContain("Live Class-2_Green computing");
      expect(plan.currentItem?.isCompleted).toBe(true);

      // Verify next item is Live Class-3 in chronological sequence
      expect(plan.nextItem).not.toBeNull();
      expect(plan.nextItem?.title).toContain("Live Class-3_Green computing");
      expect(plan.nextItem?.isCompleted).toBe(false);

      // Verify 1.1.3 is preserved as incomplete
      const item113 = plan.items.find(it => it.title.includes("1.1.3"));
      expect(item113).toBeDefined();
      expect(item113?.isCompleted).toBe(false);

      // 3. Verify Navigator strictly advances to Live Class-3
      const navResult = StudyPilotNavigator.navigateToNextActivity(mockLiveClassDoc as any);
      expect(navResult.success).toBe(true);
      expect(navResult.target).toContain("Live Class-3_Green computing");
      expect(clickedItem).toBe("Live Class-3_Green computing");
    });
  });
});
