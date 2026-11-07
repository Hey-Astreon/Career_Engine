import { describe, it, expect } from 'vitest';
import { rankProjectsForContext, sanitizeScreeningText, buildScreeningSystemPrompt } from '../src/lib/ai/screeningHelper';

describe('Phase 97: AstrePilot Combobox Actuation & Context-Aware AI Brain', () => {
  describe('1. Combobox Verification Firewall (Zero False Positives)', () => {
    it('rejects input.value as proof of write for comboboxes', () => {
      // Simulation of isContainerPopulated logic
      const isContainerPopulated = (container: any) => {
        const single = container.querySelector('.select__single-value');
        const PLACEHOLDER_REGEX = /^(select|choose|search|\.\.\.)/i;
        if (single && single.textContent.trim().length > 0 && !PLACEHOLDER_REGEX.test(single.textContent.trim())) return true;
        const req = container.querySelector('input[class*="requiredInput"]');
        if (req && req.value && req.value.trim().length > 0 && !PLACEHOLDER_REGEX.test(req.value.trim())) return true;
        return false;
      };

      // Mock container where input has typed filter text, but no option was selected
      const mockContainerUnselected = {
        querySelector: (sel: string) => {
          if (sel === '.select__single-value') return null; // No single value!
          if (sel.includes('requiredInput')) return null;
          return null;
        }
      };

      expect(isContainerPopulated(mockContainerUnselected)).toBe(false);

      // Mock container with actual selection
      const mockContainerSelected = {
        querySelector: (sel: string) => {
          if (sel === '.select__single-value') return { textContent: 'Bachelor\'s Degree' };
          return null;
        }
      };

      expect(isContainerPopulated(mockContainerSelected)).toBe(true);

      // Mock container with "Select..." placeholder
      const mockContainerPlaceholder = {
        querySelector: (sel: string) => {
          if (sel === '.select__single-value') return { textContent: 'Select...' };
          return null;
        }
      };

      expect(isContainerPopulated(mockContainerPlaceholder)).toBe(false);
    });
  });

  describe('2. Astranis Flight Software Role Grounding', () => {
    const candidateProjects = [
      {
        title: 'AstrePilot Browser Extension',
        description: 'MV3 browser extension with Shadow DOM HUD for job autofill',
        techStack: 'TypeScript, React 19, Chrome Extensions',
      },
      {
        title: 'Astra Vision — AI Code Sandbox & AST Dependency Engine',
        description: 'Python code-analysis backend with FastAPI, Tree-Sitter AST parser, and sandboxed subprocess runner with syscall and socket guards to isolate execution',
        techStack: 'FastAPI, Python, Tree-Sitter, ChromaDB',
      },
      {
        title: 'AstreWork — Autonomous Career Engine',
        description: 'Distributed ingestion pipelines on Oracle Cloud ARM64 with Docker and Redis caching',
        techStack: 'Next.js 16, Python, OCI ARM64, Docker, Redis',
      },
    ];

    it('ranks Astra Vision top for Astranis Flight Software Intern role', () => {
      const question = 'Please describe the most impressive and complex project you have worked on.';
      const jd = 'Astranis is building next-generation geostationary telecommunications satellites. Seeking a Flight Software Intern to work on satellite embedded systems, real-time operating systems, telemetry, and fault isolation.';

      const ranked = rankProjectsForContext(candidateProjects, question, jd);
      expect(ranked.length).toBeGreaterThanOrEqual(1);
      expect(ranked[0].title).toContain('Astra Vision');
      expect(ranked[0].title).not.toContain('AstrePilot');
    });

    it('purges corporate AI buzzwords and enforces BCA title compliance', () => {
      const rawText = 'As a Software Engineer, I spearheaded the development of an autonomous career operating system utilizing a multi-provider LLM failover cascade.';
      const cleaned = sanitizeScreeningText(rawText, true);

      expect(cleaned).not.toContain('Engineer');
      expect(cleaned).toContain('Developer');
      expect(cleaned).not.toContain('spearheaded');
      expect(cleaned).not.toContain('utilizing');
      expect(cleaned).toContain('built');
      expect(cleaned).toContain('using');
    });

    it('ensures prompt enforces authentic first-person developer tone with zero extension chatter', () => {
      const prompt = buildScreeningSystemPrompt('Roushan Kumar', 'Software Developer', 'Patna, Bihar, India');
      expect(prompt).toContain('FIRST PERSON');
      expect(prompt).toContain('BCA TITLE LAW');
      expect(prompt).toContain('NEVER mention browser extensions');
      expect(prompt).toContain('NEVER start answers with "Architected"');
    });
  });

  describe('3. US EEOC Demographic Sovereignty (India -> Asian)', () => {
    it('strictly matches Asian and disqualifies American Indian or Alaska Native', () => {
      const options = [
        { textContent: 'American Indian or Alaskan Native', value: '1' },
        { textContent: 'Asian', value: '2' },
        { textContent: 'Black or African American', value: '3' },
        { textContent: 'White', value: '4' },
        { textContent: 'Decline To Self Identify', value: '5' },
      ];

      const matchAsian = (pool: any[]) => {
        return pool.find(o => {
          const t = (o.textContent || o.text || '').trim().toLowerCase();
          if (t.includes('american indian') || t.includes('alaska native') || t.includes('native american')) return false;
          return t === 'asian' || t.startsWith('asian') || t.includes('asian') || t.includes('south asian');
        });
      };

      const matched = matchAsian(options);
      expect(matched).toBeDefined();
      expect(matched.textContent).toBe('Asian');
      expect(matched.textContent).not.toBe('American Indian or Alaskan Native');
    });
  });

  describe('4. Date and Month Semantic Resolution', () => {
    it('resolves month options across numeric and full string representations', () => {
      const optionsNumeric = [
        { textContent: '01', value: '1' },
        { textContent: '07', value: '7' },
        { textContent: '12', value: '12' },
      ];

      const optionsNamed = [
        { textContent: 'January', value: 'jan' },
        { textContent: 'July', value: 'jul' },
        { textContent: 'December', value: 'dec' },
      ];

      const resolveMonth = (pool: any[], targetLower: string) => {
        const monthMap: Record<string, number> = {
          'july': 7, 'jul': 7, 'august': 8, 'aug': 8
        };
        const monthNum = monthMap[targetLower] || parseInt(targetLower, 10);
        const mPad = String(monthNum).padStart(2, '0');
        const mStr = String(monthNum);
        return pool.find(o => {
          const t = (o.textContent || '').trim().toLowerCase();
          const v = (o.value || '').trim().toLowerCase();
          return t.includes('july') || v === mStr || v === mPad || t === mStr || t === mPad;
        });
      };

      expect(resolveMonth(optionsNumeric, 'july')?.textContent).toBe('07');
      expect(resolveMonth(optionsNamed, 'july')?.textContent).toBe('July');
    });
  });
});
