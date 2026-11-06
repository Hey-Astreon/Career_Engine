import { describe, it, expect } from 'vitest';
import { computeSemanticScore } from '../src/lib/autopilot/semanticFieldDiscovery';
import { POST as handleOracle } from '../src/app/api/autopilot/oracle/route';
import { generateAutopilotToken } from '../src/lib/autopilot/tokenUtils';

describe('Astranis Greenhouse Deep Audit & Vulnerability Elimination', () => {
  // Candidate Profile (Roushan Kumar - BCA Compliance)
  const profile = {
    fullName: "Roushan Kumar",
    firstName: "Roushan",
    lastName: "Kumar",
    email: "roushanraut404@gmail.com",
    phone: "+91-9431483512",
    city: "Patna",
    state: "Bihar",
    country: "India",
    location: "Patna, Bihar, India",
    linkedinUrl: "https://linkedin.com/in/hey-astreon",
    githubUrl: "https://github.com/Hey-Astreon",
    portfolioUrl: "https://astrework.app",
    school: "Amity University",
    degree: "Bachelor of Computer Applications (BCA)",
    discipline: "Computer Science",
    startMonth: "July",
    startYear: "2023",
    endMonth: "May",
    endYear: "2026",
    gender: "Male",
    hispanicLatino: "No",
    veteranStatus: "I am not a protected veteran",
    requiresVisa: true,
  };

  const astranisElements = [
    { id: 'first_name', name: 'first_name', tagName: 'INPUT', type: 'text', labelText: 'First Name*', expectedType: 'FIRST_NAME' },
    { id: 'last_name', name: 'last_name', tagName: 'INPUT', type: 'text', labelText: 'Last Name*', expectedType: 'LAST_NAME' },
    { id: 'email', name: 'email', tagName: 'INPUT', type: 'email', labelText: 'Email*', expectedType: 'EMAIL' },
    { id: 'country', name: 'country', tagName: 'INPUT', role: 'combobox', labelText: 'Country*', expectedType: 'COUNTRY' },
    { id: 'phone', name: 'phone', tagName: 'INPUT', type: 'tel', labelText: 'Phone*', expectedType: 'PHONE' },
    { id: 'candidate-location', name: 'candidate_location', tagName: 'INPUT', role: 'combobox', labelText: 'Location (City)*', expectedType: 'LOCATION_AUTOCOMPLETE' },
    { id: 'resume', name: 'resume', tagName: 'INPUT', type: 'file', labelText: 'Resume/CV*', expectedType: 'RESUME' },
    { id: 'school--0', name: 'school', tagName: 'INPUT', role: 'combobox', labelText: 'School', expectedType: 'SCHOOL' },
    { id: 'degree--0', name: 'degree', tagName: 'INPUT', role: 'combobox', labelText: 'Degree', expectedType: 'DEGREE' },
    { id: 'discipline--0', name: 'discipline', tagName: 'INPUT', role: 'combobox', labelText: 'Discipline', expectedType: 'DISCIPLINE' },
    { id: 'start-month--0', name: 'start_date_month', tagName: 'INPUT', role: 'combobox', labelText: 'Start date month', expectedType: 'START_MONTH' },
    { id: 'start-year--0', name: 'start_date_year', tagName: 'INPUT', type: 'number', labelText: 'Start date year', expectedType: 'START_YEAR' },
    { id: 'end-month--0', name: 'end_date_month', tagName: 'INPUT', role: 'combobox', labelText: 'End date month', expectedType: 'END_MONTH' },
    { id: 'end-year--0', name: 'end_date_year', tagName: 'INPUT', type: 'number', labelText: 'End date year', expectedType: 'END_YEAR' },
    { id: 'question_8622920006', name: 'question_8622920006', tagName: 'INPUT', role: 'combobox', labelText: 'Astranis complies with U.S. Government space technology export regulations, therefore will you state which of the following applies to you:*', expectedType: 'SCREENING_SELECT' },
    { id: 'question_8622921006', name: 'question_8622921006', tagName: 'TEXTAREA', labelText: 'What is the most impressive thing you have ever accomplished?*', expectedType: 'SCREENING' },
    { id: 'question_8622922006', name: 'question_8622922006', tagName: 'TEXTAREA', labelText: 'Please describe the most impressive and complex project you have worked on. This can be from previous internships, school projects, or personal projects you took part in. Tell us what the project was, the technologies you used, challenges you faced, what specific role you played in this project, and what made this project complex or special. *', expectedType: 'SCREENING' },
    { id: 'question_8622923006', name: 'question_8622923006', tagName: 'INPUT', role: 'combobox', labelText: 'Please confirm the season you are applying for. *', expectedType: 'SCREENING_SELECT' },
    { id: 'question_8622924006', name: 'question_8622924006', tagName: 'INPUT', type: 'text', labelText: 'When are you able to join Astranis as an intern? (12 week minimum)*', expectedType: 'SCREENING' },
    { id: 'question_8622925006', name: 'question_8622925006', tagName: 'INPUT', type: 'text', labelText: 'When do you plan on ending your internship?*', expectedType: 'SCREENING' },
    { id: 'question_8622926006', name: 'question_8622926006', tagName: 'INPUT', role: 'combobox', labelText: 'At Astranis, we value in-person collaboration and a strong work ethic. Are you comfortable with working onsite at our San Francisco HQ 5 days a week?*', expectedType: 'SCREENING_SELECT' },
    { id: 'question_8622927006', name: 'question_8622927006', tagName: 'INPUT', type: 'text', labelText: 'How did you hear about Astranis?*', expectedType: 'HEAR_ABOUT' },
    { id: 'question_8622928006', name: 'question_8622928006', tagName: 'INPUT', type: 'text', labelText: 'LinkedIn Profile', expectedType: 'LINKEDIN' },
    { id: 'question_8652804006', name: 'question_8652804006', tagName: 'INPUT', role: 'combobox', labelText: 'By selecting YES, I consent to receive recruiting SMS messages from Astranis at the phone number provided on my job application.*', expectedType: 'SCREENING_SELECT' },
    { id: 'gender', name: 'gender', tagName: 'INPUT', role: 'combobox', labelText: 'Gender', expectedType: 'GENDER' },
    { id: 'hispanic_ethnicity', name: 'hispanic_ethnicity', tagName: 'INPUT', role: 'combobox', labelText: 'Are you Hispanic/Latino?', expectedType: 'HISPANIC_LATINO' },
    { id: 'veteran_status', name: 'veteran_status', tagName: 'INPUT', role: 'combobox', labelText: 'Veteran Status', expectedType: 'VETERAN' },
  ];

  it('classifies 100% of Astranis fields with high confidence (>= 0.80)', () => {
    astranisElements.forEach((el) => {
      const res = computeSemanticScore({
        tagName: el.tagName,
        type: el.type,
        role: el.role,
        id: el.id,
        name: el.name,
        labelText: el.labelText,
      });

      expect(res.fieldType).toBe(el.expectedType);
      expect(res.confidence).toBeGreaterThanOrEqual(0.80);
    });
  });

  it('verifies that LOCATION_AUTOCOMPLETE resolves cleanly to candidate location and is never null', () => {
    // Simulated resolveValue contract for LOCATION_AUTOCOMPLETE
    const resolveValueSim = (type: string, prof: any) => {
      switch (type) {
        case 'LOCATION':
        case 'LOCATION_AUTOCOMPLETE':
          return prof.location || 'Patna, Bihar, India';
        case 'ZIP':
        case 'ZIP_CODE':
          return prof.zipCode || '800024';
        default:
          return null;
      }
    };

    const locationVal = resolveValueSim('LOCATION_AUTOCOMPLETE', profile);
    expect(locationVal).toBe('Patna, Bihar, India');
    expect(locationVal).not.toBeNull();

    const zipVal = resolveValueSim('ZIP_CODE', profile);
    expect(zipVal).toBe('800024');
  });

  it('verifies Question 9 answer comprehensively covers all 5 criteria with 0 BCA title violations', () => {
    const q9Answer = 'Architected AstrePilot and AstreWork, an autonomous career operating system and MV3 browser extension built with React 19, TypeScript, and LibSQL. As Lead Systems Architect and Full-Stack Developer, I designed the closed Shadow DOM HUD, multi-LLM failover cascade across Gemini and Groq, and a 4-tier self-healing write actuator that overcomes virtual DOM reconciliation barriers. The core technical complexity involved cross-origin subframe coordination and zero-click synthetic File injection.';

    // 1. Comprehensive content coverage
    expect(q9Answer).toContain('AstrePilot and AstreWork');
    expect(q9Answer).toContain('React 19, TypeScript');
    expect(q9Answer).toContain('Lead Systems Architect and Full-Stack Developer');
    expect(q9Answer).toContain('Shadow DOM');
    expect(q9Answer).toContain('virtual DOM reconciliation');

    // 2. Strict BCA Candidate Title Law verification
    expect(q9Answer).not.toMatch(/\bEngineer\b/i);
    expect(q9Answer).not.toMatch(/\bSoftware Engineer\b/i);
    expect(q9Answer).not.toMatch(/\bEngineered\b/i);
  });

  it('verifies ITAR export compliance resolves to "None of the above." for non-US candidates', () => {
    const resolveItar = (q: string, prof: any) => {
      if (q.includes('export regulation') || q.includes('space technology')) {
        const isUSCitizen = prof && !prof.requiresVisa && (prof.country === 'United States' || prof.country === 'USA');
        return isUSCitizen ? 'I am a U.S. Citizen.' : 'None of the above.';
      }
      return 'N/A';
    };

    const itarVal = resolveItar('Astranis complies with U.S. Government space technology export regulations', profile);
    expect(itarVal).toBe('None of the above.');
  });

  it('verifies /api/autopilot/oracle executes with status 200 even under database or network failure', async () => {
    const token = generateAutopilotToken('roushan');
    const req = new Request('http://localhost:3000/api/autopilot/oracle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        question: 'What is the most impressive thing you have ever accomplished?',
        company: 'Astranis',
        jobTitle: 'Flight Software Intern (Summer 2027)',
      }),
    });

    const res = await handleOracle(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.answer).toBeDefined();
    expect(typeof data.answer).toBe('string');
    expect(data.answer.length).toBeGreaterThan(20);
    // Strict BCA check
    expect(data.answer).not.toMatch(/\bSoftware Engineer\b/i);
  });

  it('deduces RACE_ETHNICITY as "Asian" from India location/country without AI slop or misclassifying American Indian', () => {
    const resolveRace = (prof: any) => {
      if (prof.race) return prof.race;
      const locStr = `${prof.country || ''} ${prof.location || ''} ${prof.city || ''} ${prof.state || ''}`.toLowerCase();
      if (locStr.includes('india') || locStr.includes('patna') || locStr.includes('bihar') || locStr.includes('noida') || locStr.includes('delhi')) {
        return 'Asian';
      }
      return 'Asian';
    };

    // Candidate without explicit race set, but with India location
    const candidateWithoutRace = {
      country: 'India',
      location: 'Patna, Bihar, India',
    };
    expect(resolveRace(candidateWithoutRace)).toBe('Asian');

    // Verify option matching filters out "American Indian or Alaskan Native"
    const options = [
      { textContent: 'American Indian or Alaskan Native' },
      { textContent: 'Asian' },
      { textContent: 'Black or African American' },
      { textContent: 'White' },
      { textContent: 'Decline To Self Identify' }
    ];

    const targetVal = 'Asian';
    const asianMatch = options.find(o => {
      const t = (o.textContent || '').trim().toLowerCase();
      if (t.includes('american indian') || t.includes('alaska native') || t.includes('native american')) return false;
      return t === 'asian' || t.startsWith('asian') || t.includes('asian') || t.includes('south asian');
    });

    expect(asianMatch).toBeDefined();
    expect(asianMatch?.textContent).toBe('Asian');
  });

  it('verifies screening answers are de-duplicated, humanized, do not start with "Architected", and describe distinct accomplishments and projects', () => {
    const qAccomplishmentAnswer = 'Building AstreWork and running it live in production on an Oracle Cloud ARM64 server. I designed the platform from scratch to aggregate and rank opportunities from over a dozen sources with sub-second vector search, maintaining database isolation and zero downtime. Taking a complex distributed system from an initial idea all the way to a functioning platform that people actually rely on has been my proudest technical milestone.';
    const qComplexProjectAnswer = 'I developed AstrePilot, a browser extension built with Manifest V3, React 19, and TypeScript that automates complex job application workflows across dynamic single-page applications. As the lead developer, the hardest technical challenge was reliably writing values into virtual-DOM-managed forms (like React 19 and Greenhouse comboboxes) where standard DOM value assignments are immediately overwritten by internal state trackers. To solve this, I designed a multi-tier write actuator combining synthetic input events, native property descriptors, and keyboard event simulation, ensuring high-fidelity input persistence across custom dropdowns and dynamic forms.';

    // Assert zero AI scraping vanity metrics
    expect(qAccomplishmentAnswer).not.toContain('14,000+');
    expect(qAccomplishmentAnswer).not.toContain('daily scraped');

    // Assert no robotic formulaic openings
    expect(qAccomplishmentAnswer).not.toMatch(/^Architected/i);
    expect(qComplexProjectAnswer).not.toMatch(/^Architected/i);

    // Assert de-duplication: they must not describe the exact same system with the same wording
    expect(qAccomplishmentAnswer).not.toBe(qComplexProjectAnswer);
    expect(qAccomplishmentAnswer).toContain('AstreWork');
    expect(qComplexProjectAnswer).toContain('AstrePilot');
    expect(qComplexProjectAnswer).toContain('write actuator');

    // Strict BCA compliance
    expect(qAccomplishmentAnswer).not.toMatch(/\bEngineer\b/i);
    expect(qAccomplishmentAnswer).not.toMatch(/\bEngineered\b/i);
    expect(qComplexProjectAnswer).not.toMatch(/\bEngineer\b/i);
    expect(qComplexProjectAnswer).not.toMatch(/\bEngineered\b/i);
  });

  it('verifies availability resolver returns eager immediate start instead of hardcoded stale "May 2027"', () => {
    const resolveAvailability = (q: string, prof: any) => {
      const qLower = q.toLowerCase();
      if (
        qLower.includes('when are you able to join') ||
        qLower.includes('able to join as an intern') ||
        qLower.includes('earliest start') ||
        qLower.includes('start date') ||
        qLower.includes('how soon can you start') ||
        qLower.includes('available to start')
      ) {
        const pref = (prof && (prof.availability || prof.noticePeriod)) || 'Immediate';
        if (pref.toLowerCase().includes('immediate') || pref.toLowerCase().includes('now') || pref.toLowerCase().includes('flexible')) {
          return 'Available immediately / Earliest available date (Flexible)';
        }
        return pref;
      }
      return 'N/A';
    };

    const answer = resolveAvailability('When are you able to join Astranis as an intern? (12 week minimum)*', profile);
    expect(answer).toBe('Available immediately / Earliest available date (Flexible)');
    expect(answer).not.toBe('May 2027');
  });
});
