import { describe, it, expect, vi } from 'vitest';
import {
  rankProjectsForContext,
  sanitizeScreeningText,
  buildScreeningSystemPrompt,
  detectProceduralAnswer,
  type CandidateProjectContext,
} from '@/lib/ai/screeningHelper';

describe('Phase 88: Real-Time JD-Aware Context Engine & Screening Sanitizer', () => {
  describe('rankProjectsForContext (RAG Project Relevance Ranking)', () => {
    const candidateProjects: CandidateProjectContext[] = [
      {
        title: 'Distributed Scraping Pipeline',
        description: 'Built high-throughput Puppeteer scrapers with Redis caching and rate limiting',
        techStack: 'Node.js, TypeScript, Redis, Puppeteer, PostgreSQL',
      },
      {
        title: 'Flight Telemetry & Orbit Controller',
        description: 'Real-time telemetry streaming over WebSocket with quaternion orientation Kalman filtering',
        techStack: 'Rust, C++, WebSockets, Flight Software, Real-Time OS',
      },
      {
        title: 'E-Commerce React Storefront',
        description: 'Next.js storefront with Stripe checkout and Tailwind CSS styling',
        techStack: 'React, Next.js, Stripe, Tailwind CSS',
      },
      {
        title: 'Prisma LibSQL Database Adapter',
        description: 'Engineered WAL mode SQLite client with Turso cloud failover routing',
        techStack: 'TypeScript, LibSQL, Turso, SQLite',
      },
    ];

    it('ranks flight software and telemetry project top when JD mentions flight software and satellites', () => {
      const question = 'What is the most impressive thing you have ever accomplished?';
      const jd = 'Astranis builds next-generation geostationary communications satellites. Seeking a Flight Software Intern to work on satellite embedded systems and telemetry.';

      const ranked = rankProjectsForContext(candidateProjects, question, jd);

      expect(ranked.length).toBeLessThanOrEqual(3);
      expect(ranked[0].title).toBe('Flight Telemetry & Orbit Controller');
    });

    it('ranks database adapter top when question targets database and distributed architecture', () => {
      const question = 'Describe a time you solved a complex database consistency or storage challenge.';
      const jd = 'Seeking a backend developer to manage distributed Turso LibSQL database architecture and caching.';

      const ranked = rankProjectsForContext(candidateProjects, question, jd);

      expect(ranked[0].title).toBe('Prisma LibSQL Database Adapter');
    });

    it('returns up to 3 projects when list exceeds 3', () => {
      const ranked = rankProjectsForContext(candidateProjects, 'Tell me about yourself');
      expect(ranked.length).toBe(3);
    });

    it('safely handles empty or small project arrays', () => {
      expect(rankProjectsForContext([], 'test')).toEqual([]);
      const single = [candidateProjects[0]];
      expect(rankProjectsForContext(single, 'test')).toEqual(single);
    });
  });

  describe('sanitizeScreeningText (Anti-AI Slop & BCA Title Compliance)', () => {
    it('strips forbidden corporate AI slop buzzwords', () => {
      const slop = 'I spearheaded a cutting-edge initiative where I leveraged multi-threading and utilized distributed caches to seamlessly deliver results.';
      const cleaned = sanitizeScreeningText(slop, false);

      expect(cleaned).not.toContain('spearheaded');
      expect(cleaned).not.toContain('cutting-edge');
      expect(cleaned).not.toContain('leveraged');
      expect(cleaned).not.toContain('utilized');
      expect(cleaned).not.toContain('seamlessly');

      expect(cleaned).toContain('built');
      expect(cleaned).toContain('high-performance');
      expect(cleaned).toContain('integrated');
      expect(cleaned).toContain('used');
      expect(cleaned).toContain('directly');
    });

    it('strictly enforces BCA Candidate Title compliance (Developer instead of Engineer)', () => {
      const engineerText = 'As a Software Engineer with 2 years of experience as a Backend Engineer and Systems Engineer in our Engineering department, I worked as an engineer.';
      const cleaned = sanitizeScreeningText(engineerText, true);

      expect(cleaned).not.toContain('Software Engineer');
      expect(cleaned).not.toContain('Backend Engineer');
      expect(cleaned).not.toContain('Systems Engineer');
      expect(cleaned).not.toContain('as an engineer');
      expect(cleaned).not.toContain('Engineering');

      expect(cleaned).toContain('Software Developer');
      expect(cleaned).toContain('Backend Developer');
      expect(cleaned).toContain('Systems Architect');
      expect(cleaned).toContain('as a developer');
      expect(cleaned).toContain('Development');
    });

    it('preserves clean text without unneeded mutations', () => {
      const clean = 'I built a real-time WebSocket telemetry pipeline using Node.js and TypeScript.';
      expect(sanitizeScreeningText(clean, true)).toBe(clean);
    });
  });

  describe('Procedural Guardrails & Screening Prompt', () => {
    it('detects nepotism, conflict of interest, and NA compliance questions as procedural answers', () => {
      expect(detectProceduralAnswer('Do you have any relatives currently working at Astranis? (Type NA if none)')).toBe('N/A');
      expect(detectProceduralAnswer('Are you related to any employee at this company?')).toBe('None');
      expect(detectProceduralAnswer('Are you subject to any non-compete agreements?')).toBe('None');
    });

    it('assembles system prompt containing anti-slop rules, candidate grounding, and BCA Title Law', () => {
      const prompt = buildScreeningSystemPrompt('Roushan Kumar', 'Full-Stack Developer', 'Patna, Bihar');

      expect(prompt).toContain('Roushan Kumar');
      expect(prompt).toContain('Full-Stack Developer');
      expect(prompt).toContain('FIRST PERSON');
      expect(prompt).toContain('BCA TITLE LAW (MANDATORY)');
      expect(prompt).toContain('NEVER refer to yourself as an "Engineer"');
      expect(prompt).toContain('Software Developer');
    });
  });
});
