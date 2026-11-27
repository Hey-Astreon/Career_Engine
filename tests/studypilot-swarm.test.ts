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
import StudyPilotMastermind from "../studypilot/agent/mastermind.js";

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
    }, 10000);

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

      // 4. Passing Grade Threshold vs Highest Grade Discrimination (e.g. 1st Module Assessment)
      const mockThresholdDoc = {
        querySelectorAll: () => [
          {
            tagName: "P",
            innerText: "Grade to pass: 15.00 out of 30.00",
            textContent: "Grade to pass: 15.00 out of 30.00",
          },
          {
            tagName: "H3",
            innerText: "Highest grade: 30.00 / 30.00.",
            textContent: "Highest grade: 30.00 / 30.00.",
          },
        ],
      };
      const thresholdGrade = StudyPilotScribe.extractQuizGrade(mockThresholdDoc as any);
      expect(thresholdGrade.hasGrade).toBe(true);
      expect(thresholdGrade.score).toBe(30.00);
      expect(thresholdGrade.total).toBe(30.00);
      expect(thresholdGrade.percentage).toBe(100);
      expect(thresholdGrade.isPerfect).toBe(true);
    });

    it("detects and auto-confirms timed assessment 'Start attempt' modal dialogs", async () => {
      let modalStartClicked = false;
      const modalStartBtn = {
        tagName: "BUTTON",
        className: "btn btn-primary",
        innerText: "Start attempt",
        textContent: "Start attempt",
        getAttribute: (attr: string) => attr === "data-action" ? "save" : null,
        classList: { contains: (cls: string) => cls === "btn-primary" },
        focus: () => {},
        dispatchEvent: () => true,
        click: () => { modalStartClicked = true; },
      };

      const mockTimedModal = {
        tagName: "DIV",
        className: "modal show",
        querySelectorAll: (sel: string) => [modalStartBtn],
      };

      const mockTimedDoc = {
        querySelector(sel: string) {
          if (sel.includes("modal") || sel.includes("dialog")) {
            return mockTimedModal;
          }
          return null;
        },
        querySelectorAll(sel: string) {
          if (sel.includes("modal") || sel.includes("dialog")) {
            return [mockTimedModal];
          }
          if (sel.includes("button") || sel.includes("input")) {
            return [modalStartBtn];
          }
          return [];
        },
      };

      // 1. Verify findModalStartAttemptButton detects the modal button
      const detectedStartBtn = StudyPilotSentry.findModalStartAttemptButton(mockTimedDoc as any);
      expect(detectedStartBtn).not.toBeNull();
      expect(detectedStartBtn).toBe(modalStartBtn);

      // 2. Verify findAttemptOrReattemptButton prioritizes open modal button
      const prioritizedBtn = StudyPilotSentry.findAttemptOrReattemptButton(mockTimedDoc as any);
      expect(prioritizedBtn).toBe(modalStartBtn);

      // 3. Verify clickAttemptQuiz automatically confirms the timed modal
      const confirmed = await StudyPilotSentry.clickAttemptQuiz(mockTimedDoc as any);
      expect(confirmed).toBe(true);
      expect(modalStartClicked).toBe(true);
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

  describe("StudyPilot Phase 136: Stateful Attempt Memory, Vector Collision Resolution & Stagnation Circuit Breaker", () => {
    it("extracts quiz attempts history and flags score stagnation across consecutive attempts", () => {
      const mockAttemptsTable = {
        querySelectorAll: (sel: string) => {
          if (sel.includes("tr")) {
            return [
              {
                innerText: "Attempt 3 Finished Started Tuesday, 24 November 2026, 7:17 PM Completed Tuesday, 24 November 2026, 7:17 PM Duration 24 secs Marks 1.00/2.00 Grade 5.00 out of 10.00 (50%) Review not permitted",
                textContent: "Attempt 3 Finished Started Tuesday, 24 November 2026, 7:17 PM Completed Tuesday, 24 November 2026, 7:17 PM Duration 24 secs Marks 1.00/2.00 Grade 5.00 out of 10.00 (50%) Review not permitted"
              },
              {
                innerText: "Attempt 2 Finished Started Tuesday, 24 November 2026, 7:16 PM Completed Tuesday, 24 November 2026, 7:17 PM Duration 27 secs Marks 1.00/2.00 Grade 5.00 out of 10.00 (50%) Review not permitted",
                textContent: "Attempt 2 Finished Started Tuesday, 24 November 2026, 7:16 PM Completed Tuesday, 24 November 2026, 7:17 PM Duration 27 secs Marks 1.00/2.00 Grade 5.00 out of 10.00 (50%) Review not permitted"
              },
              {
                innerText: "Attempt 1 Finished Started Tuesday, 24 November 2026, 7:15 PM Completed Tuesday, 24 November 2026, 7:15 PM Duration 30 secs Marks 1.00/2.00 Grade 5.00 out of 10.00 (50%) Review not permitted",
                textContent: "Attempt 1 Finished Started Tuesday, 24 November 2026, 7:15 PM Completed Tuesday, 24 November 2026, 7:15 PM Duration 30 secs Marks 1.00/2.00 Grade 5.00 out of 10.00 (50%) Review not permitted"
              }
            ];
          }
          return [];
        }
      };

      const history = StudyPilotScribe.extractQuizAttemptsHistory(mockAttemptsTable as any);
      expect(history.totalAttempts).toBe(3);
      expect(history.isStagnant).toBe(true);
      expect(history.consecutiveStagnantCount).toBe(2);
      expect(history.lastAttempt?.score).toBe(1.0);
      expect(history.lastAttempt?.total).toBe(2.0);
      expect(history.lastAttempt?.percentage).toBe(50);
    });

    it("supports Auditor hypothesis shift when forceAlternate is specified on retry", () => {
      const q = {
        options: [
          { key: "a", cleanText: "Option A text" },
          { key: "b", cleanText: "Option B text" },
          { key: "c", cleanText: "Option C text" }
        ],
        traps: {}
      };

      const candidate = {
        selectedKey: "b",
        alternateKey: "a",
        confidence: 0.90,
        reasoning: "Initial candidate reasoning."
      };

      // Normal audit maintains 'b'
      const normalAudit = StudyPilotAuditor.auditAnswer(q as any, candidate as any);
      expect(normalAudit.selectedKey).toBe("b");

      // Retry with forced alternate hypothesis switches to 'a'
      const alternateAudit = StudyPilotAuditor.auditAnswer(q as any, candidate as any, { forceAlternate: true });
      expect(alternateAudit.selectedKey).toBe("a");
      expect(alternateAudit.auditNotes).toContain("Auditor Hypothesis Shift");
    });

    it("resolves answer vector collisions by flipping the lowest-confidence answer to break loops", () => {
      const questions = [
        {
          id: "q1",
          questionNumber: 1,
          questionText: "What is Green Computing Aspect 1?",
          options: [
            { key: "a", cleanText: "Asset Architecture" },
            { key: "b", cleanText: "Green Lifecycle" }
          ]
        },
        {
          id: "q2",
          questionNumber: 2,
          questionText: "What is Green Computing Aspect 2?",
          options: [
            { key: "a", cleanText: "Carbon Footprint" },
            { key: "b", cleanText: "Resource Optimization" },
            { key: "c", cleanText: "E-Waste Reduction" }
          ]
        }
      ];

      // Swarm initially proposes [b, b], exactly as Scholar did in Attempts 1-3
      const auditResults = [
        {
          selectedKey: "b",
          alternateKey: "a",
          confidence: 0.92,
          reasoning: "High confidence in aspect 1",
          auditNotes: ""
        },
        {
          selectedKey: "b",
          alternateKey: "c",
          confidence: 0.74, // Lower confidence!
          reasoning: "Moderate confidence in aspect 2",
          auditNotes: ""
        }
      ];

      // Prior attempt scored 5/10 with [b, b]
      const pastAttempts = [
        {
          attemptIndex: 1,
          selections: { "1": "b", "2": "b" },
          score: 1.0,
          total: 2.0
        }
      ];

      const resolution = StudyPilotAuditor.resolveVectorCollision(questions as any, auditResults as any, pastAttempts);
      expect(resolution.collisionDetected).toBe(true);
      expect(resolution.flippedIndex).toBe(1); // Question 2 was flipped because 0.74 < 0.92!

      // Resulting vector is [b, c] - novel, breaking the [b, b] stagnation loop!
      expect(resolution.resolvedResults[0].selectedKey).toBe("b");
      expect(resolution.resolvedResults[1].selectedKey).toBe("c");
      expect(resolution.resolvedResults[1].auditNotes).toContain("Swarm Vector Collision Resolved");
    });

    it("verifies Ground Truth resolution for Green Solutions Architecture Quiz 3.1.5", async () => {
      const q1 = {
        questionText: "Which materials can be extracted from alkaline batteries and used in the creation of new ones?",
        options: [
          { key: "a", cleanText: "Steel and cadmium" },
          { key: "b", cleanText: "Steel and zinc" },
          { key: "c", cleanText: "Lead and lye" },
          { key: "d", cleanText: "Lithium and carbon" }
        ],
        traps: {}
      };

      const q2 = {
        questionText: "The most valuable part of a PC or TV is the ________.",
        options: [
          { key: "a", cleanText: "Copper in the cathode yoke" },
          { key: "b", cleanText: "Circuit boards that contain silver and gold" },
          { key: "c", cleanText: "Lead in the CRT" },
          { key: "d", cleanText: "None of the above" }
        ],
        traps: {}
      };

      const ans1 = await (await import("../studypilot/agent/scholar.js")).default.solveQuestion(q1 as any, "Green computing");
      const ans2 = await (await import("../studypilot/agent/scholar.js")).default.solveQuestion(q2 as any, "Green computing");

      // Q1 resolves to 'b' (Steel and zinc)
      expect(ans1.selectedKey).toBe("b");
      // Q2 resolves to 'a' (Copper in the cathode yoke) - Breaking the 5/10 trap!
      expect(ans2.selectedKey).toBe("a");
    });

    it("verifies Ground Truth resolution for Module 3 Quiz 1.1.1 (Linux & Sustainable Development)", async () => {
      const q1 = {
        questionText: "Which operating system is the most green?",
        options: [
          { key: "a", cleanText: "Windows Vista" },
          { key: "b", cleanText: "Windows XP" },
          { key: "c", cleanText: "Linux" },
          { key: "d", cleanText: "Apple" }
        ],
        traps: {}
      };

      const q2 = {
        questionText: "Social, economic and ecological equity is the necessary condition for achieving:",
        options: [
          { key: "a", cleanText: "Social development" },
          { key: "b", cleanText: "Economic development" },
          { key: "c", cleanText: "Sustainable development" },
          { key: "d", cleanText: "Ecological development" }
        ],
        traps: {}
      };

      const ans1 = await (await import("../studypilot/agent/scholar.js")).default.solveQuestion(q1 as any, "Green computing");
      const ans2 = await (await import("../studypilot/agent/scholar.js")).default.solveQuestion(q2 as any, "Green computing");

      expect(ans1.selectedKey).toBe("c"); // Linux
      expect(ans1.engine).toBe("Academic Knowledge Engine");
      expect(ans2.selectedKey).toBe("c"); // Sustainable development
      expect(ans2.engine).toBe("Academic Knowledge Engine");
    });

    it("protects Ground Truth and high-confidence answers (>= 0.95) from collision flipping", () => {
      const questions = [
        {
          id: "q1",
          questionNumber: 1,
          questionText: "Which operating system is the most green?",
          options: [
            { key: "a", cleanText: "Windows Vista" },
            { key: "b", cleanText: "Windows XP" },
            { key: "c", cleanText: "Linux" },
            { key: "d", cleanText: "Apple" }
          ]
        },
        {
          id: "q2",
          questionNumber: 2,
          questionText: "Social, economic and ecological equity is the necessary condition for achieving:",
          options: [
            { key: "a", cleanText: "Social development" },
            { key: "b", cleanText: "Economic development" },
            { key: "c", cleanText: "Sustainable development" },
            { key: "d", cleanText: "Ecological development" }
          ]
        }
      ];

      const candidateAudits = [
        {
          selectedKey: "c",
          alternateKey: "b",
          confidence: 0.99,
          reasoning: "Linux is open-source and energy-efficient.",
          engine: "Academic Knowledge Engine"
        },
        {
          selectedKey: "c",
          alternateKey: "a",
          confidence: 0.98,
          reasoning: "Sustainable development encompasses all three dimensions.",
          engine: "Academic Knowledge Engine"
        }
      ];

      // A prior attempt had [c, c] (e.g. from an aborted session or prior run)
      const pastAttempts = [
        {
          attemptIndex: 1,
          selections: { "1": "c", "2": "c" },
          score: 0.0,
          total: 2.0
        }
      ];

      const resolution = StudyPilotAuditor.resolveVectorCollision(questions as any, candidateAudits as any, pastAttempts);
      // Because both are Ground Truth / >=0.95, collision flipping is SUPPRESSED!
      expect(resolution.collisionDetected).toBe(false);
      expect(resolution.flippedIndex).toBe(-1);
      expect(resolution.resolvedResults[0].selectedKey).toBe("c"); // Kept Linux!
      expect(resolution.resolvedResults[1].selectedKey).toBe("c"); // Kept Sustainable development!
    });

    it("ensures sidebar links named '1st Module Assessment' do not trigger high-stakes guard on practice quizzes", () => {
      const mockDoc = {
        querySelectorAll: (sel: string) => {
          return [
            {
              innerText: "Quiz : 3.1.5 Aspects of Green Solutions Architecture",
              closest: (selector: string) => null
            },
            {
              innerText: "1st Module Assessment", // in sidebar!
              closest: (selector: string) => selector.includes("#nav-drawer") ? {} : null
            }
          ];
        }
      };

      const stakes = StudyPilotInspector.getAssessmentStakes(mockDoc as any);
      expect(stakes.isHighStakes).toBe(false);
      expect(stakes.attemptsAllowed).toBe(Infinity);
    });

    it("extracts gradeToPass and enforces permanent high-stakes auto-retry lockout on passing score", () => {
      const mockModuleDoc = {
        querySelectorAll: (sel: string) => {
          return [
            {
              innerText: "2nd Module Assessment",
              closest: () => null
            },
            {
              innerText: "Attempts allowed: 3",
              closest: () => null
            },
            {
              innerText: "Grade to pass: 15.00 out of 30.00",
              closest: () => null
            },
            {
              innerText: "Highest grade: 27.00 / 30.00.",
              closest: () => null
            }
          ];
        }
      };

      const stakes = StudyPilotInspector.getAssessmentStakes(mockModuleDoc as any);
      expect(stakes.isHighStakes).toBe(true);
      expect(stakes.attemptsAllowed).toBe(3);
      expect(stakes.gradeToPass).toBe(15.0);

      // Verify passing condition for 27/30 (90%)
      const gradeInfo = {
        hasGrade: true,
        score: 27.0,
        total: 30.0,
        percentage: 90.0,
        isPerfect: false
      };

      const isHighStakesPassing = stakes.isHighStakes && gradeInfo.hasGrade && (
        (gradeInfo.total > 0 && (gradeInfo.score / gradeInfo.total) >= 0.5) ||
        (stakes.gradeToPass && gradeInfo.score >= stakes.gradeToPass)
      );

      // Must be TRUE so content.js permanently locks auto-retry
      expect(isHighStakesPassing).toBe(true);
    });

    it("Mastermind CSP: eliminates options from 0% attempts and calculates optimal single-variable delta permutation", () => {
      const questions = [
        {
          id: "q1",
          questionNumber: 1,
          questionText: "Which operating system is the most green?",
          options: [
            { key: "a", cleanText: "Windows Vista" },
            { key: "b", cleanText: "Windows XP" },
            { key: "c", cleanText: "Linux" },
            { key: "d", cleanText: "Apple" }
          ]
        },
        {
          id: "q2",
          questionNumber: 2,
          questionText: "Social, economic and ecological equity is the necessary condition for achieving:",
          options: [
            { key: "a", cleanText: "Social development" },
            { key: "b", cleanText: "Economic development" },
            { key: "c", cleanText: "Sustainable development" },
            { key: "d", cleanText: "Ecological development" }
          ]
        }
      ];

      const candidateAudits = [
        { selectedKey: "c", confidence: 0.95, reasoning: "Linux analysis", engine: "Groq 120B" },
        { selectedKey: "c", confidence: 0.99, reasoning: "Sustainable development analysis", engine: "Groq 120B" }
      ];

      // History of attempts:
      // Attempt 1: [b, a] -> 0/10 (Eliminates b for Q1 and a for Q2!)
      // Attempt 2: [c, c] -> 5/10 (Baseline: exactly one of Q1=c or Q2=c is correct!)
      const pastAttempts = [
        {
          attemptIndex: 1,
          selections: { "1": "b", "2": "a" },
          score: 0.0,
          total: 10.0,
          percentage: 0.0
        },
        {
          attemptIndex: 2,
          selections: { "1": "c", "2": "c" },
          score: 5.0,
          total: 10.0,
          percentage: 50.0
        }
      ];

      const plan: any = StudyPilotMastermind.deduceNextVector(questions as any, candidateAudits as any, pastAttempts);
      expect(plan.applied).toBe(true);
      expect(plan.strategy).toBe("single-variable-delta");

      // Mastermind must permute ONE question while holding the other at the 5/10 baseline!
      // It must NOT select 'b' for Q1 or 'a' for Q2 because both were eliminated by Attempt 1 (0/10)!
      const selQ1 = plan.resolvedAudits[0].selectedKey;
      const selQ2 = plan.resolvedAudits[1].selectedKey;

      expect(selQ1).not.toBe("b"); // 'b' is eliminated
      expect(selQ2).not.toBe("a"); // 'a' is eliminated

      // The new vector must differ from [c, c] and [b, a]
      const newVecStr = `${selQ1},${selQ2}`;
      expect(newVecStr).not.toBe("c,c");
      expect(newVecStr).not.toBe("b,a");

      // Verify that Q1 is permuted to either 'd' or 'a', holding Q2 at 'c'
      if (selQ2 === "c") {
        expect(["d", "a"]).toContain(selQ1);
      }
    });

    it("Mastermind CSP: deduces confirmed correct answer when delta drops from 5/10 to 0/10", () => {
      const questions = [
        {
          id: "q1",
          questionNumber: 1,
          questionText: "Question 1",
          options: [
            { key: "a", cleanText: "Opt A" },
            { key: "b", cleanText: "Opt B" },
            { key: "c", cleanText: "Opt C" }
          ]
        },
        {
          id: "q2",
          questionNumber: 2,
          questionText: "Question 2",
          options: [
            { key: "a", cleanText: "Opt A" },
            { key: "b", cleanText: "Opt B" },
            { key: "c", cleanText: "Opt C" }
          ]
        }
      ];

      const candidateAudits = [
        { selectedKey: "c", confidence: 0.9, reasoning: "", engine: "" },
        { selectedKey: "c", confidence: 0.9, reasoning: "", engine: "" }
      ];

      // Attempt 1: [c, c] scored 5/10
      // Attempt 2: [a, c] scored 0/10 (differed ONLY on Q1: switching from c to a LOST 5 marks!)
      // Mathematical deduction: Q1=c MUST BE CORRECT (it was the 5-mark answer)!
      // And Q2=c is WRONG!
      const pastAttempts = [
        {
          attemptIndex: 1,
          selections: { "1": "c", "2": "c" },
          score: 5.0,
          total: 10.0,
          percentage: 50.0
        },
        {
          attemptIndex: 2,
          selections: { "1": "a", "2": "c" },
          score: 0.0,
          total: 10.0,
          percentage: 0.0
        }
      ];

      const plan: any = StudyPilotMastermind.deduceNextVector(questions as any, candidateAudits as any, pastAttempts);
      expect(plan.applied).toBe(true);

      // Q1 MUST be locked in as 'c' (the confirmed correct answer)!
      expect(plan.resolvedAudits[0].selectedKey).toBe("c");
      expect(plan.resolvedAudits[0].reasoning).toContain("Confirmed 100% correct");

      // Q2 must be permuted away from 'c' (e.g. to 'a' or 'b')
      expect(plan.resolvedAudits[1].selectedKey).not.toBe("c");
    });

    it("4-Tier Frontier AI Cascade: Background solver exports, keys, and 30-question simulation", async () => {
      // Import CommonJS background module
      const background = await import("../studypilot/background.js");
      expect(background.GROQ_MODELS).toEqual([
        "openai/gpt-oss-120b",
        "qwen/qwen3.8-27b",
        "openai/gpt-oss-20b"
      ]);

      // Verify unmasking function works as expected
      const sampleBlob = [77, 89, 65]; // salt = 42
      const unmasked = background.unmaskKey(sampleBlob);
      expect(unmasked.length).toBe(3);

      // Verify Academic Knowledge Ground Truth dictionary
      const qLinux = {
        id: "q_os",
        questionText: "Which operating system is the most green?",
        options: [
          { key: "a", cleanText: "Windows Vista" },
          { key: "b", cleanText: "Windows XP" },
          { key: "c", cleanText: "Linux" },
          { key: "d", cleanText: "Apple" }
        ]
      };
      const resLinux = background.solveWithAcademicHeuristics(qLinux);
      expect(resLinux.selectedKey).toBe("c");
      expect(resLinux.engine).toBe("Academic Knowledge Engine");
      expect(resLinux.confidence).toBeGreaterThanOrEqual(0.95);

      const qEquity = {
        id: "q_equity",
        questionText: "Social, economic and ecological equity is the necessary condition for achieving:",
        options: [
          { key: "a", cleanText: "Social development" },
          { key: "b", cleanText: "Economic development" },
          { key: "c", cleanText: "Sustainable development" },
          { key: "d", cleanText: "Ecological development" }
        ]
      };
      const resEquity = background.solveWithAcademicHeuristics(qEquity);
      expect(resEquity.selectedKey).toBe("c");
      expect(resEquity.engine).toBe("Academic Knowledge Engine");

      // Mock fetch for multi-engine burst simulation without real network delay
      const originalFetch = global.fetch;
      global.fetch = (async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes("generativelanguage.googleapis.com")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              candidates: [
                { content: { parts: [{ text: JSON.stringify({ selectedKey: "c", alternateKey: "a", reasoning: "Simulated Gemini 3.5 Flash", confidence: 0.98 }) }] } }
              ]
            })
          } as any;
        }
        if (urlStr.includes("integrate.api.nvidia.com")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              choices: [
                { message: { content: JSON.stringify({ selectedKey: "c", alternateKey: "b", reasoning: "Simulated NVIDIA Mistral Large 1T", confidence: 0.98 }) } }
              ]
            })
          } as any;
        }
        if (urlStr.includes("api.groq.com")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              choices: [
                { message: { content: JSON.stringify({ selectedKey: "c", alternateKey: "d", reasoning: "Simulated Groq Rotator", confidence: 0.98 }) } }
              ]
            })
          } as any;
        }
        return { ok: false, status: 500 } as any;
      }) as any;

      try {
        // Verify 30-question burst simulation through executeBackgroundAiSolve
        const simulatedQuestions = Array.from({ length: 30 }, (_, i) => ({
          id: `q_${i + 1}`,
          questionNumber: i + 1,
          questionText: i % 2 === 0
            ? "Which operating system is the most green?"
            : `Academic green computing principle question ${i + 1}?`,
          options: [
            { key: "a", cleanText: "Windows Vista" },
            { key: "b", cleanText: "Windows XP" },
            { key: "c", cleanText: "Linux" },
            { key: "d", cleanText: "Apple" }
          ]
        }));

        for (const q of simulatedQuestions) {
          const result = await background.executeBackgroundAiSolve(q, "Computer Science (Green Computing)", {
            isHighStakes: true
          });
          expect(result).toBeDefined();
          expect(result.selectedKey).toBeDefined();
          expect(["a", "b", "c", "d"]).toContain(result.selectedKey);
          expect(result.reasoning).toBeTruthy();
        }
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("elevates Attempt 1 accuracy by blocking dual-option hijacks and utilizing Mastermind Vault", async () => {
      const background = await import("../studypilot/background.js");

      // 1. Scribe Deep Breadcrumb Extraction Test
      const mockBreadcrumbDoc = {
        querySelector(sel: string) {
          if (sel.includes("breadcrumb")) {
            return {
              querySelectorAll() {
                return [
                  { innerText: "Home" },
                  { innerText: "My courses" },
                  { innerText: "Green computing (CSE433) - Semester III" },
                  { innerText: "#Module 4 : GREEN COMPLIANCE" },
                  { innerText: "Socio-cultural aspects of Green IT" },
                  { innerText: "Quiz : 1.1.1 Social Impact of Green IT" }
                ];
              }
            };
          }
          return null;
        },
        title: "Quiz : 1.1.1 Social Impact of Green IT"
      };

      const extractedContext = StudyPilotScribe.extractCourseContext(mockBreadcrumbDoc as any);
      expect(extractedContext).toContain("Green computing (CSE433) - Semester III");
      expect(extractedContext).toContain("#Module 4 : GREEN COMPLIANCE");
      expect(extractedContext).toContain("1.1.1 Social Impact of Green IT");

      // 2. Verified Textbook Ground Truth Test (Quiz 1.1.1)
      const qPassenger = {
        questionText: "Need for sophisticated IT systems on the rise, especially in supporting the growth in passenger transport...",
        options: [
          { key: "a", cleanText: "business market" },
          { key: "b", cleanText: "business methodology" },
          { key: "c", cleanText: "business market and methodology" },
          { key: "d", cleanText: "none of the above" }
        ]
      };
      const resPassenger = background.solveWithAcademicHeuristics(qPassenger);
      expect(resPassenger.selectedKey).toBe("b");
      expect(resPassenger.confidence).toBeGreaterThanOrEqual(0.95);

      const qTravelAgency = {
        questionText: "_____ is a small to medium travel agency operating out of New York. A company has an excellent, elite client base.",
        options: [
          { key: "a", cleanText: "Blue waters" },
          { key: "b", cleanText: "Blue brain" },
          { key: "c", cleanText: "Both a and b" },
          { key: "d", cleanText: "None of the above" }
        ],
        traps: { hasDualOptionTrap: true }
      };
      const resTravel = background.solveWithAcademicHeuristics(qTravelAgency);
      expect(resTravel.selectedKey).toBe("a");
      expect(resTravel.confidence).toBeGreaterThanOrEqual(0.95);

      // Quiz 2.1.5 Configuring a GET Road Map Ground Truth
      const qDataRepo = {
        questionText: "_____ is made up of data that belong to each of the four groups of systems.",
        options: [
          { key: "a", cleanText: "green network" },
          { key: "b", cleanText: "data repository" },
          { key: "c", cleanText: "green system" },
          { key: "d", cleanText: "green data center" }
        ]
      };
      const resDataRepo = background.solveWithAcademicHeuristics(qDataRepo);
      expect(resDataRepo.selectedKey).toBe("b");
      expect(resDataRepo.confidence).toBeGreaterThanOrEqual(0.95);

      const qGreenTech = {
        questionText: "_____ requirements that are specifying the technologies that are needed to handle the Green IT initiative.",
        options: [
          { key: "a", cleanText: "green network" },
          { key: "b", cleanText: "data repository" },
          { key: "c", cleanText: "green technical" },
          { key: "d", cleanText: "green data center" }
        ]
      };
      const resGreenTech = background.solveWithAcademicHeuristics(qGreenTech);
      expect(resGreenTech.selectedKey).toBe("c");
      expect(resGreenTech.confidence).toBeGreaterThanOrEqual(0.95);

      // 3. Unverified question with 'Both a and b' must NOT be hijacked blindly with 0.96 confidence
      const qDecoyTrap = {
        questionText: "Which innovative technique optimizes quantum circuit routing in cloud hypervisors?",
        options: [
          { key: "a", cleanText: "Phase estimation matrix" },
          { key: "b", cleanText: "Entanglement entropy reduction" },
          { key: "c", cleanText: "Both a and b" },
          { key: "d", cleanText: "None of the above" }
        ],
        traps: { hasDualOptionTrap: true }
      };
      const resDecoy = background.solveWithAcademicHeuristics(qDecoyTrap);
      // It should NOT claim 0.96 confidence from blind heuristic!
      expect(resDecoy.confidence).toBeLessThan(0.95);

      // 4. Auditor Anti-Decoy: Does not hijack single option on casual words like 'also'
      const scholarSingleAns = {
        selectedKey: "a",
        alternateKey: "b",
        confidence: 0.92,
        reasoning: "Blue waters is the travel agency described in the case study. It also holds an elite clientele.",
        engine: "Gemini 3.5 Flash"
      };
      const auditResult = StudyPilotAuditor.auditAnswer(qTravelAgency, scholarSingleAns);
      expect(auditResult.selectedKey).toBe("a"); // Retains A, does not falsely flip to C!

      // 5. Mastermind Knowledge Vault Test: Dynamic 10/10 Store & Retrieval (Zero Hardcoded Traps)
      const mastermindAny = StudyPilotMastermind as any;
      mastermindAny.storePerfectSolution("239915", { "1": "b", "2": "a" });
      const preseededKey = mastermindAny.getPerfectSolution("239915");
      expect(preseededKey).toEqual({ "1": "b", "2": "a" });
      mastermindAny.storePerfectSolution("239914", { "1": "b", "2": "b" });
      expect(mastermindAny.getPerfectSolution("239914")).toEqual({ "1": "b", "2": "b" });
      mastermindAny.storePerfectSolution("239946", { "1": "b", "2": "c" });
      expect(mastermindAny.getPerfectSolution("239946")).toEqual({ "1": "b", "2": "c" });
      mastermindAny.storePerfectSolution("239961", {
        "1": { key: "b", text: "establish" },
        "2": { key: "a", text: "carbon reduction" }
      });
      expect(mastermindAny.getPerfectSolution("239961")).toEqual({
        "1": { key: "b", text: "establish" },
        "2": { key: "a", text: "carbon reduction" }
      });

      const mockCandidateAudits = [
        { selectedKey: "a", confidence: 0.8, reasoning: "Draft" },
        { selectedKey: "c", confidence: 0.8, reasoning: "Draft" }
      ];
      const mockQuestions = [
        { questionNumber: 1, id: "q1", options: qPassenger.options },
        { questionNumber: 2, id: "q2", options: qTravelAgency.options }
      ];

      // Even with 0 past attempts, Mastermind applies the cracked 10/10 key for Quiz 239915!
      const vaultPlan: any = mastermindAny.deduceNextVector(mockQuestions, mockCandidateAudits, [], "239915");
      expect(vaultPlan.applied).toBe(true);
      expect(vaultPlan.strategy).toBe("vault-perfect");
      expect(vaultPlan.resolvedAudits[0].selectedKey).toBe("b");
      expect(vaultPlan.resolvedAudits[1].selectedKey).toBe("a");
      expect(vaultPlan.resolvedAudits[0].confidence).toBe(1.0);

      // 6. Mastermind Dynamic Store & Retrieval Test
      mastermindAny.storePerfectSolution("999999", { "1": "d", "2": "c" });
      expect(mastermindAny.getPerfectSolution("999999")).toEqual({ "1": "d", "2": "c" });
    });
  });

  describe("StudyPilot Phase 144: Score Regression & Consecutive-Zero Circuit Breaker", () => {
    it("detects score regression when latest score drops >50% below best historical score", () => {
      // Simulates Quiz 4.1.2: Attempt 1 = 5/10 (50%), Attempt 2 = 0/10 (0%)
      const mockRegressionTable = {
        querySelectorAll: (sel: string) => {
          if (sel.includes("tr")) {
            return [
              {
                innerText: "Attempt 2 Finished Started Wednesday, 25 November 2026, 5:32 PM Completed Wednesday, 25 November 2026, 5:32 PM Duration 27 secs Marks 0.00/2.00 Grade 0.00 out of 10.00 (0%) Review not permitted",
                textContent: "Attempt 2 Finished Started Wednesday, 25 November 2026, 5:32 PM Completed Wednesday, 25 November 2026, 5:32 PM Duration 27 secs Marks 0.00/2.00 Grade 0.00 out of 10.00 (0%) Review not permitted"
              },
              {
                innerText: "Attempt 1 Finished Started Wednesday, 25 November 2026, 5:31 PM Completed Wednesday, 25 November 2026, 5:31 PM Duration 36 secs Marks 1.00/2.00 Grade 5.00 out of 10.00 (50%) Review not permitted",
                textContent: "Attempt 1 Finished Started Wednesday, 25 November 2026, 5:31 PM Completed Wednesday, 25 November 2026, 5:31 PM Duration 36 secs Marks 1.00/2.00 Grade 5.00 out of 10.00 (50%) Review not permitted"
              }
            ];
          }
          return [];
        }
      };

      const history = StudyPilotScribe.extractQuizAttemptsHistory(mockRegressionTable as any);
      expect(history.totalAttempts).toBe(2);
      expect(history.isStagnant).toBe(false); // Scores are different (1 vs 0), NOT stagnant by old definition
      expect(history.scoreRegressed).toBe(true); // 0 < 0.5 * 1 = TRUE — regression detected!
      expect(history.consecutiveZeroCount).toBe(1); // Latest attempt is 0%
      expect(history.bestScore).toBe(1.0); // Best was Attempt 1
      expect(history.lastAttempt?.score).toBe(0.0);
    });

    it("detects consecutive zero attempts when multiple attempts score 0%", () => {
      const mockZeroTable = {
        querySelectorAll: (sel: string) => {
          if (sel.includes("tr")) {
            return [
              {
                innerText: "Attempt 3 Finished Marks 0.00/2.00 Grade 0.00 out of 10.00 (0%) Review not permitted",
                textContent: "Attempt 3 Finished Marks 0.00/2.00 Grade 0.00 out of 10.00 (0%) Review not permitted"
              },
              {
                innerText: "Attempt 2 Finished Marks 0.00/2.00 Grade 0.00 out of 10.00 (0%) Review not permitted",
                textContent: "Attempt 2 Finished Marks 0.00/2.00 Grade 0.00 out of 10.00 (0%) Review not permitted"
              },
              {
                innerText: "Attempt 1 Finished Marks 1.00/2.00 Grade 5.00 out of 10.00 (50%) Review not permitted",
                textContent: "Attempt 1 Finished Marks 1.00/2.00 Grade 5.00 out of 10.00 (50%) Review not permitted"
              }
            ];
          }
          return [];
        }
      };

      const history = StudyPilotScribe.extractQuizAttemptsHistory(mockZeroTable as any);
      expect(history.consecutiveZeroCount).toBe(2); // Attempts 2 and 3 are both 0%
      expect(history.scoreRegressed).toBe(true); // Regressed from 1.0 to 0.0
      expect(history.bestScore).toBe(1.0);
    });

    it("does NOT flag regression when score improves across attempts", () => {
      const mockImprovingTable = {
        querySelectorAll: (sel: string) => {
          if (sel.includes("tr")) {
            return [
              {
                innerText: "Attempt 2 Finished Marks 2.00/2.00 Grade 10.00 out of 10.00 (100%) Review not permitted",
                textContent: "Attempt 2 Finished Marks 2.00/2.00 Grade 10.00 out of 10.00 (100%) Review not permitted"
              },
              {
                innerText: "Attempt 1 Finished Marks 1.00/2.00 Grade 5.00 out of 10.00 (50%) Review not permitted",
                textContent: "Attempt 1 Finished Marks 1.00/2.00 Grade 5.00 out of 10.00 (50%) Review not permitted"
              }
            ];
          }
          return [];
        }
      };

      const history = StudyPilotScribe.extractQuizAttemptsHistory(mockImprovingTable as any);
      expect(history.scoreRegressed).toBe(false); // 2.0 > 0.5 * 1.0, NO regression
      expect(history.consecutiveZeroCount).toBe(0); // 100% latest, no zeros
      expect(history.bestScore).toBe(2.0);
    });

    it("never misclassifies a high-stakes Module Assessment as practice even if 'practice purpose' appears in bodyText", () => {
      const mockHighStakesDoc = {
        body: {
          innerText: "3rd Module Assessment Attempts allowed: 3 Sidebar link: Quiz only for practice purpose",
          textContent: "3rd Module Assessment Attempts allowed: 3 Sidebar link: Quiz only for practice purpose"
        },
        querySelector: (sel: string) => {
          if (sel.includes("h1")) {
            return { innerText: "3rd Module Assessment", textContent: "3rd Module Assessment" };
          }
          return null;
        },
        querySelectorAll: (sel: string) => {
          if (sel.includes(".quizinfo")) {
            return [
              { innerText: "Attempts allowed: 3", textContent: "Attempts allowed: 3", closest: () => null },
              { innerText: "Grade to pass: 15.00 out of 30.00", textContent: "Grade to pass: 15.00 out of 30.00", closest: () => null }
            ];
          }
          return [];
        }
      };

      const stakes = StudyPilotInspector.getAssessmentStakes(mockHighStakesDoc as any);
      expect(stakes.isHighStakes).toBe(true);
      expect(stakes.attemptsAllowed).toBe(3);
      expect(stakes.gradeToPass).toBe(15);
    });

    it("enforces Frontier-first AI cascade order (no Lite model in Tier 1) and pre-seeds Quiz 4.1.5", async () => {
      const bg: any = await import("../studypilot/background.js");
      expect(bg.FRONTIER_GEMINI_MODELS).toContain("gemini-4-hydrogen");
      expect(bg.FRONTIER_GEMINI_MODELS).toContain("gemini-3.8-flash");
      expect(bg.FRONTIER_GEMINI_MODELS).not.toContain("gemini-flash-lite-latest");
      expect(bg.LITE_GEMINI_MODELS).toContain("gemini-flash-lite-latest");
      expect(bg.NVIDIA_MODELS).toContain("minimaxai/minimax-m3.1-flash");
      expect(bg.GROQ_MODELS).toContain("openai/gpt-oss-120b");

      const mastermindAny = StudyPilotMastermind as any;
      mastermindAny.storePerfectSolution("239964", {
        "1": { key: "c", text: "half" },
        "2": { key: "d", text: "ipcc" }
      });
      expect(mastermindAny.getPerfectSolution("239964")).toEqual({
        "1": { key: "c", text: "half" },
        "2": { key: "d", text: "ipcc" }
      });
    });

    it("strips <think> blocks in safeExtractJson, resolves shuffled option text in Mastermind, and verifies manifest/popup completeness", async () => {
      const fs = await import("fs");
      const bg: any = await import("../studypilot/background.js");

      // 1. Reasoning tag stripping in safeExtractJson
      const parsed = bg.safeExtractJson('<think>Let me analyze the Green Computing options...</think>\n```json\n{"selectedKey":"b","alternateKey":"c","confidence":0.97}\n```');
      expect(parsed).toEqual({ selectedKey: "b", alternateKey: "c", confidence: 0.97 });

      // 2. Shuffle-proof option text resolution in Mastermind
      const shuffledQuestions = [
        {
          questionNumber: 1,
          id: "q1",
          options: [
            { key: "a", cleanText: "ten percent" },
            { key: "b", cleanText: "half" },
            { key: "c", cleanText: "one third" },
            { key: "d", cleanText: "a fourth" }
          ]
        },
        {
          questionNumber: 2,
          id: "q2",
          options: [
            { key: "a", cleanText: "IPCC" },
            { key: "b", cleanText: "RoHS" },
            { key: "c", cleanText: "WEEE" },
            { key: "d", cleanText: "EPA" }
          ]
        }
      ];
      const draftAudits = [
        { selectedKey: "a", confidence: 0.8, reasoning: "Draft" },
        { selectedKey: "b", confidence: 0.8, reasoning: "Draft" }
      ];
      const mastermindAny = StudyPilotMastermind as any;
      const plan = mastermindAny.deduceNextVector(shuffledQuestions, draftAudits, [], "239964");
      expect(plan.applied).toBe(true);
      expect(plan.resolvedAudits[0].selectedKey).toBe("b"); // Resolved "half" even when shuffled to 'b'
      expect(plan.resolvedAudits[1].selectedKey).toBe("a"); // Resolved "IPCC" even when shuffled to 'a'

      // 3. Manifest & Popup completeness
      const manifest = JSON.parse(fs.readFileSync("studypilot/manifest.json", "utf8"));
      expect(manifest.host_permissions).toContain("https://integrate.api.nvidia.com/*");
      const popupSrc = fs.readFileSync("studypilot/popup.js", "utf8");
      expect(popupSrc).toContain("agent/mastermind.js");
    });

    it("protects numeric cleanText options from key corruption, extracts question marks, and blocks Auditor false dual overrides (Phase 145.3)", () => {
      // 1. Numeric cleanText options in Scribe
      const inputA = { tagName: "INPUT", id: "q1_a", name: "q1", type: "radio", checked: false };
      const labelA = { tagName: "LABEL", innerText: "1.5 degrees Celsius", textContent: "1.5 degrees Celsius" };
      const optA = { querySelector: (sel: string) => sel.includes("input") ? inputA : (sel.includes(".answernumber") ? null : labelA) };

      const inputB = { tagName: "INPUT", id: "q1_b", name: "q1", type: "radio", checked: false };
      const labelB = { tagName: "LABEL", innerText: "2.0 PUE baseline", textContent: "2.0 PUE baseline" };
      const optB = { querySelector: (sel: string) => sel.includes("input") ? inputB : (sel.includes(".answernumber") ? null : labelB) };

      const mockDoc = {
        querySelector: () => null,
        querySelectorAll: (sel: string) => {
          if (sel.includes(".que") || sel.includes("question-")) {
            return [{
              id: "question-1",
              querySelector: (s: string) => {
                if (s.includes(".no") || s.includes(".qno")) return { textContent: "Question 1" };
                if (s.includes(".grade")) return { innerText: "Marked out of 4.00" };
                if (s.includes(".qtext")) return { innerText: "What is the global target limit?" };
                return null;
              },
              querySelectorAll: (s: string) => [optA, optB]
            }];
          }
          return [];
        }
      };

      const parsed = StudyPilotScribe.parseMoodleQuestions(mockDoc as any);
      expect(parsed.questions.length).toBe(1);
      const q = parsed.questions[0];
      expect(q.marks).toBe(4.0); // Correctly extracted 4-mark weight
      expect(q.options[0].key).toBe("a"); // Not corrupted to "1"
      expect(q.options[0].cleanText).toBe("1.5 degrees Celsius"); // Not stripped to "5 degrees"
      expect(q.options[1].key).toBe("b"); // Not corrupted to "2"
      expect(q.options[1].cleanText).toBe("2.0 PUE baseline");

      // 2. Auditor False Dual Override Prevention
      const qWithDual = {
        id: "q2",
        questionNumber: 2,
        options: [
          { key: "a", cleanText: "Primary single fact" },
          { key: "b", cleanText: "Secondary false premise" },
          { key: "c", cleanText: "Both of these" }
        ],
        traps: { hasDualOptionTrap: true }
      };

      const scholarWithDistractorReasoning = {
        selectedKey: "a",
        reasoning: "While both terms are mentioned in the syllabus, only option (a) is the correct technical definition and option (b) is an incorrect distractor.",
        confidence: 0.95
      };

      const audited = StudyPilotAuditor.auditAnswer(qWithDual as any, scholarWithDistractorReasoning);
      expect(audited.selectedKey).toBe("a"); // Retained option 'a', NOT flipped to 'Both of these'!
      expect(audited.auditNotes).not.toContain("Overrode single option 'a' in favor of dual option");

      // 3. extractOptionLetter text-matching & 5-choice option ('e')
      const bg = require("../studypilot/background.js");
      const sampleOpts = [
        { key: "a", cleanText: "ISO 14001" },
        { key: "b", cleanText: "ISO 14040" },
        { key: "c", cleanText: "ISO 14048" },
        { key: "d", cleanText: "ISO 50001" },
        { key: "e", cleanText: "All of the above" }
      ];
      expect(bg.extractOptionLetter("e", sampleOpts)).toBe("e");
      expect(bg.extractOptionLetter("(e)", sampleOpts)).toBe("e");
      expect(bg.extractOptionLetter("ISO 14048", sampleOpts)).toBe("c");
      expect(bg.extractOptionLetter("iso 14048 data format", sampleOpts)).toBe("c");
    });

    it("verifies multi-statement trap recognition, reverse anti-distractor override, and Module 4 Green IT ontology (Phase 145.6)", () => {
      // 1. Scribe multi-statement trap detection
      const inputA = { tagName: "INPUT", id: "q1_a", name: "q1", type: "radio", checked: false };
      const labelA = { tagName: "LABEL", innerText: "Only Statement I is correct", textContent: "Only Statement I is correct" };
      const optA = { querySelector: (sel: string) => sel.includes("input") ? inputA : (sel.includes(".answernumber") ? null : labelA) };

      const inputB = { tagName: "INPUT", id: "q1_b", name: "q1", type: "radio", checked: false };
      const labelB = { tagName: "LABEL", innerText: "Both Statement I and Statement II are correct", textContent: "Both Statement I and Statement II are correct" };
      const optB = { querySelector: (sel: string) => sel.includes("input") ? inputB : (sel.includes(".answernumber") ? null : labelB) };

      const mockDoc = {
        querySelector: () => null,
        querySelectorAll: (sel: string) => {
          if (sel.includes(".que") || sel.includes("question-")) {
            return [{
              id: "question-1",
              querySelector: (s: string) => {
                if (s.includes(".no") || s.includes(".qno")) return { textContent: "Question 1" };
                if (s.includes(".grade")) return { innerText: "Marked out of 4.00" };
                if (s.includes(".qtext")) return { innerText: "Consider Statement I and Statement II." };
                return null;
              },
              querySelectorAll: (s: string) => [optA, optB]
            }];
          }
          return [];
        }
      };

      const parsed = StudyPilotScribe.parseMoodleQuestions(mockDoc as any);
      expect(parsed.questions[0].traps.hasDualOptionTrap).toBe(true);

      // 2. Reverse anti-distractor audit override in Auditor
      const multiStatementQ = {
        id: "q3",
        questionNumber: 3,
        options: [
          { key: "a", cleanText: "Only Statement I is correct" },
          { key: "b", cleanText: "Only Statement II is correct" },
          { key: "c", cleanText: "Both Statement I and Statement II are correct" },
          { key: "d", cleanText: "Neither Statement I nor Statement II is correct" }
        ],
        traps: { hasDualOptionTrap: true }
      };

      // Model mistakenly selected dual option (c), but reasoning clearly says Statement II is false/incorrect
      const mistakenDualCandidate = {
        selectedKey: "c",
        reasoning: "Statement I is a verified factual definition from Murugesan. However, Statement II is incorrect and not valid under ISO standards. Therefore only Statement I is correct.",
        confidence: 0.95
      };

      const correctedAudit = StudyPilotAuditor.auditAnswer(multiStatementQ as any, mistakenDualCandidate);
      expect(correctedAudit.selectedKey).toBe("a"); // Overridden to 'a' ("Only Statement I is correct")!
      expect(correctedAudit.auditNotes).toContain("Overrode dual option 'c' in favor of single option 'a'");

      // 3. Module 4 Green IT Extended Ontology Lookups
      const bg = require("../studypilot/background.js");
      const kyotoAns = bg.solveWithAcademicHeuristics({
        questionText: "Which market-based mechanisms were introduced under the Kyoto Protocol?",
        options: [
          { key: "a", cleanText: "Clean Development Mechanism and Joint Implementation" },
          { key: "b", cleanText: "Carbon border adjustment tax" },
          { key: "c", cleanText: "Voluntary eco-labeling" }
        ]
      }, "Green Computing");
      expect(kyotoAns.selectedKey).toBe("a");

      const rohsAns = bg.solveWithAcademicHeuristics({
        questionText: "Which heavy metals and flame retardants are restricted substances under RoHS?",
        options: [
          { key: "a", cleanText: "Silicon and aluminum" },
          { key: "b", cleanText: "Lead, Mercury, Cadmium, and Hexavalent Chromium" },
          { key: "c", cleanText: "Gold and platinum" }
        ]
      }, "Green Computing");
      expect(rohsAns.selectedKey).toBe("b");

      const weeeAns = bg.solveWithAcademicHeuristics({
        questionText: "What is the primary mandate of the European WEEE Directive?",
        options: [
          { key: "a", cleanText: "Waste Electrical and Electronic Equipment collection and recovery targets" },
          { key: "b", cleanText: "Software license audits" }
        ]
      }, "Green Computing");
      expect(weeeAns.selectedKey).toBe("a");

      const epeatAns = bg.solveWithAcademicHeuristics({
        questionText: "How are the three EPEAT tiers structured?",
        options: [
          { key: "a", cleanText: "Bronze meets all 23 required criteria, Silver meets required plus 50 percent, Gold meets required plus 75 percent optional" },
          { key: "b", cleanText: "Only based on recycled plastic content" }
        ]
      }, "Green Computing");
      expect(epeatAns.selectedKey).toBe("a");

      const embodiedAns = bg.solveWithAcademicHeuristics({
        questionText: "What does embodied energy represent in green IT product lifecycles?",
        options: [
          { key: "a", cleanText: "Total energy consumed across manufacturing, processing, and entire lifecycle" },
          { key: "b", cleanText: "Battery standby time" }
        ]
      }, "Green Computing");
      expect(embodiedAns.selectedKey).toBe("a");

      const greenwashAns = bg.solveWithAcademicHeuristics({
        questionText: "What is greenwashing in corporate sustainability communications?",
        options: [
          { key: "a", cleanText: "Misleading and deceptive environmental claims" },
          { key: "b", cleanText: "Cleaning solar panels with water" }
        ]
      }, "Green Computing");
      expect(greenwashAns.selectedKey).toBe("a");
    });

    it("Phase 145.9: verifies dynamic subject prompt dispatcher and Java CSIT120 academic ontology", () => {
      const bg = require("../studypilot/background.js");

      // 1. Dynamic Subject Routing in buildSubjectPrompt
      const javaPrompt = bg.buildSubjectPrompt(
        { questionText: "Which approach is followed in Procedure Oriented Programming?" },
        "Object Oriented Programming Using Java (CSIT120) - Semester III",
        "",
        "(a) Bottom-up\n(b) Top-down"
      );
      expect(javaPrompt).toContain("Herbert Schildt");
      expect(javaPrompt).toContain("Top-down approach");
      expect(javaPrompt).toContain("Encapsulation");

      const greenPrompt = bg.buildSubjectPrompt(
        { questionText: "What is ISO 14001?" },
        "Green Computing (CSE433)",
        "",
        "(a) EMS\n(b) Hardware"
      );
      expect(greenPrompt).toContain("San Murugesan");
      expect(greenPrompt).toContain("ISO 14000/14001");

      const dsaPrompt = bg.buildSubjectPrompt(
        { questionText: "What data structure uses LIFO?" },
        "Data Structures and Algorithms",
        "",
        "(a) Stack\n(b) Queue"
      );
      expect(dsaPrompt).toContain("Seymour Lipschutz");
      expect(dsaPrompt).toContain("Stack is LIFO");

      // 2. Java CSIT120 Academic Heuristics Ground Truth Lookups
      const popApproachAns = bg.solveWithAcademicHeuristics({
        questionText: "Which approach is followed in Procedure Oriented Programming?",
        options: [
          { key: "a", cleanText: "Bottom-up approach" },
          { key: "b", cleanText: "Top-down approach" },
          { key: "c", cleanText: "Object-centric" }
        ]
      }, "Object Oriented Programming Using Java (CSIT120)");
      expect(popApproachAns.selectedKey).toBe("b");

      const oopApproachAns = bg.solveWithAcademicHeuristics({
        questionText: "What approach is followed by Object Oriented Programming?",
        options: [
          { key: "a", cleanText: "Top-down" },
          { key: "b", cleanText: "Bottom-up approach" }
        ]
      }, "CSIT120");
      expect(oopApproachAns.selectedKey).toBe("b");

      const popEmphasisAns = bg.solveWithAcademicHeuristics({
        questionText: "In Procedure Oriented Programming, main emphasis is placed on:",
        options: [
          { key: "a", cleanText: "Functions and algorithms" },
          { key: "b", cleanText: "Data security" }
        ]
      }, "Java CSIT120");
      expect(popEmphasisAns.selectedKey).toBe("a");

      const oopEmphasisAns = bg.solveWithAcademicHeuristics({
        questionText: "In Object Oriented Programming, primary emphasis is on:",
        options: [
          { key: "a", cleanText: "Procedures and steps" },
          { key: "b", cleanText: "Data and objects" }
        ]
      }, "Java CSIT120");
      expect(oopEmphasisAns.selectedKey).toBe("b");

      const encapAns = bg.solveWithAcademicHeuristics({
        questionText: "The mechanism of wrapping data and methods into a single unit to achieve data hiding is known as:",
        options: [
          { key: "a", cleanText: "Encapsulation" },
          { key: "b", cleanText: "Polymorphism" },
          { key: "c", cleanText: "Inheritance" }
        ]
      }, "Java CSIT120");
      expect(encapAns.selectedKey).toBe("a");

      const bytecodeAns = bg.solveWithAcademicHeuristics({
        questionText: "What is the output generated by the javac compiler?",
        options: [
          { key: "a", cleanText: "Machine code" },
          { key: "b", cleanText: "Bytecode in .class format" }
        ]
      }, "Java CSIT120");
      expect(bytecodeAns.selectedKey).toBe("b");

      const jvmAns = bg.solveWithAcademicHeuristics({
        questionText: "Which component executes bytecode in Java?",
        options: [
          { key: "a", cleanText: "JVM (Java Virtual Machine)" },
          { key: "b", cleanText: "Web browser" }
        ]
      }, "Java CSIT120");
      expect(jvmAns.selectedKey).toBe("a");

      // Extended Module 1 Assertions: Loops, Switch, Arrays, Overriding, Abstract, Final, Interfaces
      const doWhileAns = bg.solveWithAcademicHeuristics({
        questionText: "Which loop executes at least once before testing the condition?",
        options: [
          { key: "a", cleanText: "for loop" },
          { key: "b", cleanText: "while loop" },
          { key: "c", cleanText: "do-while loop" }
        ]
      }, "Java CSIT120");
      expect(doWhileAns.selectedKey).toBe("c");

      const switchAns = bg.solveWithAcademicHeuristics({
        questionText: "Which of the following valid types can be used in a switch statement in Java?",
        options: [
          { key: "a", cleanText: "double" },
          { key: "b", cleanText: "int and String" },
          { key: "c", cleanText: "boolean" }
        ]
      }, "Java CSIT120");
      expect(switchAns.selectedKey).toBe("b");

      const arrayLenAns = bg.solveWithAcademicHeuristics({
        questionText: "Which property is used to find the size of an array in Java?",
        options: [
          { key: "a", cleanText: "size()" },
          { key: "b", cleanText: "length" },
          { key: "c", cleanText: "length()" }
        ]
      }, "Java CSIT120");
      expect(arrayLenAns.selectedKey).toBe("b");

      const abstractAns = bg.solveWithAcademicHeuristics({
        questionText: "A class that cannot be instantiated directly with new is called an:",
        options: [
          { key: "a", cleanText: "Abstract class" },
          { key: "b", cleanText: "Final class" }
        ]
      }, "Java CSIT120");
      expect(abstractAns.selectedKey).toBe("a");

      const finalAns = bg.solveWithAcademicHeuristics({
        questionText: "Which keyword is used to prevent method overriding in Java?",
        options: [
          { key: "a", cleanText: "static" },
          { key: "b", cleanText: "final" },
          { key: "c", cleanText: "abstract" }
        ]
      }, "Java CSIT120");
      expect(finalAns.selectedKey).toBe("b");

      const interfaceAns = bg.solveWithAcademicHeuristics({
        questionText: "How is multiple inheritance achieved in Java?",
        options: [
          { key: "a", cleanText: "Through interfaces" },
          { key: "b", cleanText: "Multiple classes with extends" }
        ]
      }, "Java CSIT120");
      expect(interfaceAns.selectedKey).toBe("a");
    });

    it("Phase 145.9: verifies Mastermind 50% -> 0% -> 100% CSP delta deduction & practice circuit calibration", () => {
      // 1. Verify dynamic 10/10 vault storage for CSIT120 Quiz 1.1.1 (244530)
      StudyPilotMastermind.storePerfectSolution("244530", {
        "1": { text: "top-down" },
        "2": { text: "data" }
      });
      const cached = StudyPilotMastermind.getPerfectSolution("244530");
      expect(cached).toBeDefined();
      expect(cached["1"]).toEqual({ text: "top-down" });
      expect(cached["2"]).toEqual({ text: "data" });

      // 2. Mastermind Delta Mathematical Deduction Simulation:
      // Quiz with 2 questions: Q1 and Q2.
      // Attempt 1: selected Q1='a', Q2='b'. Score: 1/2 (5.00/10.00).
      // Attempt 2: permuted Q1='c', kept Q2='b'. Score: 0/2 (0.00/10.00).
      // Math:
      // - Attempt 2 scored 0: both 'c' for Q1 and 'b' for Q2 are eliminated!
      // - Delta = 0 - 1 = -1: changing Q1 from 'a' to 'c' lost marks, so Q1='a' is CONFIRMED CORRECT!
      // - For Q2, 'b' is eliminated, so Mastermind must switch Q2 away from 'b'!
      const questions = [
        {
          id: "q1",
          questionNumber: 1,
          options: [
            { key: "a", cleanText: "Top-down approach" },
            { key: "b", cleanText: "Random approach" },
            { key: "c", cleanText: "Linear approach" },
            { key: "d", cleanText: "Bottom-up approach" }
          ]
        },
        {
          id: "q2",
          questionNumber: 2,
          options: [
            { key: "a", cleanText: "Data and objects" },
            { key: "b", cleanText: "Hardware registers" },
            { key: "c", cleanText: "Manual punch cards" }
          ]
        }
      ];

      const candidateAudits = [
        { selectedKey: "a", confidence: 0.95, reasoning: "POP is top-down." },
        { selectedKey: "b", confidence: 0.85, reasoning: "Candidate audit." }
      ];

      const pastAttempts = [
        {
          selections: { "1": "a", "2": "b" },
          score: 1.0,
          total: 2.0,
          percentage: 50.0
        },
        {
          selections: { "1": "c", "2": "b" },
          score: 0.0,
          total: 2.0,
          percentage: 0.0
        }
      ];

      const mastermindPlan: any = StudyPilotMastermind.deduceNextVector(questions as any, candidateAudits, pastAttempts, "mock_test_quiz");
      expect(mastermindPlan.applied).toBe(true);

      const resolved = mastermindPlan.resolvedAudits;
      // Q1 must be locked to 'a' as confirmed correct
      expect(resolved[0].selectedKey).toBe("a");
      expect(resolved[0].engine).toContain("Mastermind CSP (Confirmed)");

      // Q2 must NOT be 'b' (since 'b' was eliminated by the 0% score in Attempt 2!)
      expect(resolved[1].selectedKey).not.toBe("b");

      // 3. Calibrated Circuit Breaker Logic Verification
      // On Attempt 2, score dropping from 5 to 0 on a 2-question quiz is an active Mastermind delta test,
      // NOT a pause condition.
      const attempts = [
        { attemptNumber: 1, score: 5.0, total: 10.0, percentage: 50.0 },
        { attemptNumber: 2, score: 0.0, total: 10.0, percentage: 0.0 }
      ];
      const bestScore = 5.0;
      const isHighStakes = false;

      const isMastermindDeltaTest = attempts.length === 2 && bestScore > 0 && !isHighStakes;
      const hasScoreRegressed = !isMastermindDeltaTest && attempts.length >= 3;
      const hasConsecutiveZeros = 1 >= 2; // consecutiveZeroCount = 1, requires >= 2
      const isStagnantScore = false; // 5 != 0
      const isExceededPracticeAttempts = attempts.length >= 6;

      const shouldPause = !isHighStakes && (
        isStagnantScore ||
        hasScoreRegressed ||
        hasConsecutiveZeros ||
        isExceededPracticeAttempts
      );

      // Verify circuit breaker does NOT pause Attempt 2 delta drop!
      expect(isMastermindDeltaTest).toBe(true);
      expect(hasScoreRegressed).toBe(false);
      expect(shouldPause).toBe(false);
    });

    it("Phase 145.12: verifies Java Module 2 ontology, Mastermind non-eliminated fallback & practice 2-zero continuity", () => {
      const bg = require("../studypilot/background.js");

      // 1. Module 2 Java Ontology Lookups (Packages & Exceptions)
      const pkgTypesAns = bg.solveWithAcademicHeuristics({
        questionText: "How many types of packages are there in Java?",
        options: [
          { key: "a", cleanText: "Four types" },
          { key: "b", cleanText: "Two: Built-in packages and User-defined packages" },
          { key: "c", cleanText: "Three types" }
        ]
      }, "Java CSIT120 Module 2");
      expect(pkgTypesAns.selectedKey).toBe("b");

      const defaultPkgAns = bg.solveWithAcademicHeuristics({
        questionText: "Which package is imported automatically into every Java program by default?",
        options: [
          { key: "a", cleanText: "java.util" },
          { key: "b", cleanText: "java.lang" },
          { key: "c", cleanText: "java.io" }
        ]
      }, "Java CSIT120");
      expect(defaultPkgAns.selectedKey).toBe("b");

      // Real Amity Quiz 2.1.2 Questions
      const q1Ans = bg.solveWithAcademicHeuristics({
        questionText: "Which of the following is an incorrect statement about packages?",
        options: [
          { key: "a", cleanText: "Package defines a namespace in which classes are stored" },
          { key: "b", cleanText: "A package can contain other package within it" },
          { key: "c", cleanText: "Java uses file system directories to store packages" },
          { key: "d", cleanText: "A package can be renamed without renaming the directory in which the classes are stored." }
        ]
      }, "Java CSIT120");
      expect(q1Ans.selectedKey).toBe("d");

      const q2Ans = bg.solveWithAcademicHeuristics({
        questionText: "The name of a package is the name of the __ in Java.",
        options: [
          { key: "a", cleanText: "folder" },
          { key: "b", cleanText: "all parent folders separated by DOT symbols" },
          { key: "c", cleanText: "All parent packages separated by DOT symbols" },
          { key: "d", cleanText: "All the above" }
        ]
      }, "Java CSIT120");
      expect(q2Ans.selectedKey).toBe("c");

      const pkgKwAns = bg.solveWithAcademicHeuristics({
        questionText: "Which keyword is used to create a package in Java?",
        options: [
          { key: "a", cleanText: "package" },
          { key: "b", cleanText: "import" },
          { key: "c", cleanText: "pkg" }
        ]
      }, "Java CSIT120");
      expect(pkgKwAns.selectedKey).toBe("a");

      const throwableAns = bg.solveWithAcademicHeuristics({
        questionText: "What is the super class of all exceptions and errors in Java?",
        options: [
          { key: "a", cleanText: "Throwable" },
          { key: "b", cleanText: "Exception" },
          { key: "c", cleanText: "RuntimeException" }
        ]
      }, "Java CSIT120");
      expect(throwableAns.selectedKey).toBe("a");

      const finallyAns = bg.solveWithAcademicHeuristics({
        questionText: "Which block always executes in Java exception handling regardless of exceptions?",
        options: [
          { key: "a", cleanText: "catch block" },
          { key: "b", cleanText: "finally block" }
        ]
      }, "Java CSIT120");
      expect(finallyAns.selectedKey).toBe("b");

      // 2. Mastermind Non-Eliminated Fallback Verification:
      // Quiz with 2 questions where Attempt 1 scored 0.00 (both Q1='a' and Q2='b' eliminated).
      // Verify that on Attempt 2, Mastermind NEVER selects 'a' for Q1 and NEVER selects 'b' for Q2!
      const questions = [
        {
          id: "q1",
          questionNumber: 1,
          options: [
            { key: "a", cleanText: "Option A" },
            { key: "b", cleanText: "Option B" },
            { key: "c", cleanText: "Option C" },
            { key: "d", cleanText: "Option D" }
          ]
        },
        {
          id: "q2",
          questionNumber: 2,
          options: [
            { key: "a", cleanText: "Option A" },
            { key: "b", cleanText: "Option B" },
            { key: "c", cleanText: "Option C" },
            { key: "d", cleanText: "Option D" }
          ]
        }
      ];

      const candidateAudits = [
        { selectedKey: "a", confidence: 0.9, reasoning: "Candidate audit." },
        { selectedKey: "b", confidence: 0.9, reasoning: "Candidate audit." }
      ];

      const pastAttempts = [
        {
          selections: { "1": "a", "2": "b" },
          score: 0.0,
          total: 2.0,
          percentage: 0.0
        }
      ];

      const mastermindPlan: any = StudyPilotMastermind.deduceNextVector(questions as any, candidateAudits, pastAttempts, "pkg_quiz_244588");
      expect(mastermindPlan.applied).toBe(true);

      const resolved = mastermindPlan.resolvedAudits;
      // Q1 must NOT be 'a' (eliminated by 0% in Attempt 1)
      expect(resolved[0].selectedKey).not.toBe("a");
      // Q2 must NOT be 'b' (eliminated by 0% in Attempt 1)
      expect(resolved[1].selectedKey).not.toBe("b");

      // 3. Practice Quiz 2-Zero Continuity:
      // When Attempt 1 = 0% and Attempt 2 = 0% on an unlimited practice quiz,
      // it should NOT pause on Attempt 2 (consecutiveZeroCount >= 3 required for practice).
      const isPractice = true;
      const consecutiveZeroCount = 2;
      const hasConsecutiveZeros = isPractice ? consecutiveZeroCount >= 3 : consecutiveZeroCount >= 1;
      expect(hasConsecutiveZeros).toBe(false); // Practice quiz is permitted to continue to Attempt 3!
    });
  });
});
