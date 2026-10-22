import { describe, it, expect } from "vitest";
import { detectProceduralAnswer, buildScreeningSystemPrompt } from "@/lib/ai/screeningHelper";

describe("Screening Procedural Question Guardrail & First-Person Prompts", () => {
  it("intercepts nepotism and relative questions with N/A or None", () => {
    const q1 = "Please identify any relatives currently employed by a Cook company. Do not include any information or identification of marital status. Type \"NA\" if not applicable";
    expect(detectProceduralAnswer(q1)).toBe("N/A");

    const q2 = "Do you have any family members or relatives employed at this company? (If none, type NA)";
    expect(detectProceduralAnswer(q2)).toBe("N/A");

    const q3 = "Are you related to any employee at Google?";
    expect(detectProceduralAnswer(q3)).toBe("None");
  });

  it("intercepts explicit 'Type NA if not applicable' questions", () => {
    const q1 = "Please list previous security clearances held. Type NA if not applicable.";
    expect(detectProceduralAnswer(q1)).toBe("N/A");

    const q2 = "If you were referred by an internal employee, enter their name. If not applicable, write N/A";
    expect(detectProceduralAnswer(q2)).toBe("N/A");

    const q3 = "If \"Yes\", please give full name during employment";
    expect(detectProceduralAnswer(q3)).toBe("N/A");
  });

  it("intercepts conflict of interest and non-compete questions", () => {
    const q1 = "Do you have any existing non-compete agreements or restrictive covenants?";
    expect(detectProceduralAnswer(q1)).toBe("None");

    const q2 = "Disclose any potential conflict of interest with our organization.";
    expect(detectProceduralAnswer(q2)).toBe("None");
  });

  it("does not intercept open-ended qualitative screening questions", () => {
    const q1 = "Why do you want to work at Cook Medical?";
    expect(detectProceduralAnswer(q1)).toBeNull();

    const q2 = "Describe a time when you engineered a distributed system with high concurrency.";
    expect(detectProceduralAnswer(q2)).toBeNull();

    const q3 = "What experience do you have with TypeScript and React 19?";
    expect(detectProceduralAnswer(q3)).toBeNull();
  });

  it("builds strict first-person prompt that forbids third-person meta-commentary", () => {
    const prompt = buildScreeningSystemPrompt("Roushan Kumar", "Full-Stack Developer", "Patna, Bihar, India");
    expect(prompt).toContain('Write strictly in the FIRST PERSON ("I", "my")');
    expect(prompt).toContain('NEVER refer to the applicant in the third person');
    expect(prompt).toContain('Roushan Kumar');
    expect(prompt).toContain('Full-Stack Developer');
  });
});
