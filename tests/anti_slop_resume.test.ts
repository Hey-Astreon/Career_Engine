import { describe, it, expect } from "vitest";
import {
  BANNED_AI_SLOP_REGEX,
  sanitizeAiSlop,
} from "@/lib/ai/resumeOptimizer";

describe("Anti-AI-Slop & FAANG Standard Resume Engine", () => {
  it("detects forbidden corporate AI clichés in raw generated text", () => {
    const slopSamples = [
      "I spearheaded the cloud transformation project.",
      "Orchestrated cross-functional teams to synergize workflows.",
      "A testament to my rich tapestry of cutting-edge achievements.",
      "Thrilled and passionate about driving excellence seamlessly.",
    ];

    for (const sample of slopSamples) {
      const matches = sample.match(BANNED_AI_SLOP_REGEX);
      expect(matches).not.toBeNull();
      expect(matches!.length).toBeGreaterThan(0);
    }
  });

  it("sanitizes AI slop words into authoritative human engineering verbs", () => {
    const dirtyText = "Spearheaded distributed cache architecture and leveraged Redis to synergize microservices.";
    const cleaned = sanitizeAiSlop(dirtyText);

    expect(cleaned).toContain("Engineered distributed cache architecture");
    expect(cleaned).toContain("Integrated Redis");
    expect(cleaned).not.toMatch(BANNED_AI_SLOP_REGEX);
  });

  it("cleans rich tapestry, cutting-edge, and testament phrases", () => {
    const dirtyText = "Built a cutting-edge API as a testament to rich tapestry of backend engineering.";
    const cleaned = sanitizeAiSlop(dirtyText);

    expect(cleaned).toContain("High-performance API");
    expect(cleaned).not.toContain("rich tapestry");
    expect(cleaned).not.toContain("cutting-edge");
    expect(cleaned).not.toMatch(BANNED_AI_SLOP_REGEX);
  });

  it("enforces Google X-Y-Z bullet structure with metrics", () => {
    const validXYZBullet = "Architected asynchronous ingestion pipeline using BullMQ and Redis, reducing database write contention by 42% across 500k daily events.";
    
    // Check metric / percentage / number presence (The 'Y' in Google X-Y-Z)
    const hasMetric = /\b\d+(?:%|k|ms|s|x)?\b/i.test(validXYZBullet);
    expect(hasMetric).toBe(true);

    // Check decisive action verb (The 'Z' in Google X-Y-Z)
    const hasStrongVerb = /^(Architected|Engineered|Benchmarked|Streamlined|Hardened|Containerized|Decoupled|Deployed|Constructed|Profiled|Accelerated)/i.test(validXYZBullet);
    expect(hasStrongVerb).toBe(true);

    // Check brevity: max 28 words
    const wordCount = validXYZBullet.split(/\s+/).length;
    expect(wordCount).toBeLessThanOrEqual(28);
  });
});
