import { describe, it, expect } from 'vitest';
import {
  detectAtsEngine,
  icimsDriver,
  workdayDriver,
  greenhouseDriver,
  leverDriver,
  ashbyDriver,
  smartrecruitersDriver,
  bamboohrDriver,
  workableDriver,
  taleoDriver,
  WORKDAY_EXACT_MAP,
  ASHBY_EXACT_MAP,
  LEVER_EXACT_MAP,
  SMARTRECRUITERS_EXACT_MAP,
  BAMBOOHR_EXACT_MAP,
  WORKABLE_EXACT_MAP,
  TALEO_EXACT_MAP,
} from '@/lib/autopilot/atsDrivers';

describe('ATS Driver Registry & Detection', () => {
  it('correctly detects iCIMS from hostname', () => {
    const engine = detectAtsEngine('https://careers-cotiviti.icims.com/jobs/1234/job');
    expect(engine).toBe('ICIMS');
  });

  it('correctly detects iCIMS from iframe markup snippet', () => {
    const engine = detectAtsEngine(
      'https://jobs.example.com/apply',
      '<iframe id="icims_content_iframe" src="..."></iframe>'
    );
    expect(engine).toBe('ICIMS');
  });

  it('correctly detects Workday from URL', () => {
    const engine = detectAtsEngine('https://adobe.wd5.myworkdayjobs.com/en-US/external_careers/job/123');
    expect(engine).toBe('WORKDAY');
  });

  it('correctly detects Workday from data-automation-id snippet', () => {
    const engine = detectAtsEngine('https://careers.company.com/apply', '<div data-automation-id="workdayApplication"></div>');
    expect(engine).toBe('WORKDAY');
  });

  it('correctly detects Greenhouse from URL', () => {
    const engine = detectAtsEngine('https://boards.greenhouse.io/stripe/jobs/5678');
    expect(engine).toBe('GREENHOUSE');
  });

  it('correctly detects Lever from URL', () => {
    const engine = detectAtsEngine('https://jobs.lever.co/figma/abc-123');
    expect(engine).toBe('LEVER');
  });

  it('correctly detects Ashby from URL', () => {
    const engine = detectAtsEngine('https://jobs.ashbyhq.com/openai/xyz-999');
    expect(engine).toBe('ASHBY');
  });

  it('correctly detects SmartRecruiters from URL', () => {
    const engine = detectAtsEngine('https://jobs.smartrecruiters.com/AcmeCorp/123-developer');
    expect(engine).toBe('SMARTRECRUITERS');
  });

  it('correctly detects BambooHR from URL', () => {
    const engine = detectAtsEngine('https://acme.bamboohr.com/careers/45');
    expect(engine).toBe('BAMBOOHR');
  });

  it('correctly detects Workable from URL', () => {
    const engine = detectAtsEngine('https://apply.workable.com/tech-inc/j/ABC12345/');
    expect(engine).toBe('WORKABLE');
  });

  it('correctly detects Taleo / Oracle Cloud Recruiting from URL', () => {
    const engine = detectAtsEngine('https://acme.taleo.net/careersection/2/jobdetail.ftl');
    expect(engine).toBe('TALEO');
  });

  it('correctly detects Breezy HR from URL', () => {
    const engine = detectAtsEngine('https://1-glance-inc.breezy.hr/p/9ef34bc35794-full-stack-developer-intern/apply');
    expect(engine).toBe('BREEZY');
  });

  it('falls back to GENERIC for unknown job board URLs', () => {
    const engine = detectAtsEngine('https://careers.somecompany.com/apply/now');
    expect(engine).toBe('GENERIC');
  });

  describe('Top-10 ATS Driver Specifications & Mapping Tables', () => {
    it('contains all ground-truth Cotiviti fields in iCIMS fieldMap', () => {
      expect(icimsDriver.fieldMap['INPUT#PersonProfileFields.FirstName']).toBe('FIRST_NAME');
      expect(icimsDriver.fieldMap['INPUT#PersonProfileFields.LastName']).toBe('LAST_NAME');
      expect(icimsDriver.fieldMap['INPUT#PersonProfileFields.Email']).toBe('EMAIL');
      expect(icimsDriver.fieldMap['SELECT#-1_PersonProfileFields.PhoneType']).toBe('PHONE_TYPE');
      expect(icimsDriver.fieldMap['INPUT#-1_PersonProfileFields.PhoneNumber']).toBe('PHONE');
      expect(icimsDriver.fieldMap['SELECT#rcf3553']).toBe('TEXT_CONSENT');
      expect(icimsDriver.fieldMap['INPUT#-1_PersonProfileFields.AddressStreet1']).toBe('ADDRESS');
      expect(icimsDriver.fieldMap['INPUT#-1_PersonProfileFields.AddressCity']).toBe('CITY');
      expect(icimsDriver.fieldMap['SELECT#-1_PersonProfileFields.AddressCountry']).toBe('COUNTRY');
      expect(icimsDriver.fieldMap['SELECT#-1_PersonProfileFields.AddressState']).toBe('STATE');
      expect(icimsDriver.fieldMap['INPUT#-1_PersonProfileFields.AddressZip']).toBe('ZIP');
      expect(icimsDriver.fieldMap['SELECT#rcf3048']).toBe('HEAR_ABOUT');
      expect(icimsDriver.fieldMap['INPUT#-1_PersonProfileFields.rcf3212']).toBe('COMPANY');
      expect(icimsDriver.fieldMap['INPUT#-1_PersonProfileFields.rcf3213']).toBe('EMPLOYMENT_TITLE');
      expect(icimsDriver.fieldMap['SELECT#-1_PersonProfileFields.rcf3214_Month']).toBe('START_MONTH');
      expect(icimsDriver.fieldMap['INPUT#-1_PersonProfileFields.rcf3214_Year']).toBe('START_YEAR');
      expect(icimsDriver.fieldMap['SELECT#-1_PersonProfileFields.rcf3215_Month']).toBe('END_MONTH');
      expect(icimsDriver.fieldMap['INPUT#-1_PersonProfileFields.rcf3215_Year']).toBe('END_YEAR');
      expect(icimsDriver.fieldMap['TEXTAREA#-1_PersonProfileFields.rcf3219']).toBe('WORK_DESCRIPTION');
      expect(icimsDriver.fieldMap['TEXTAREA#-1_PersonProfileFields.rcf3268']).toBe('REASON_FOR_LEAVING');
    });

    it('enforces iframe context for iCIMS and specifies #icims_content_iframe', () => {
      expect(icimsDriver.iframeSelector).toBe('#icims_content_iframe');
      expect(icimsDriver.submitButtonSelector).toBe('input#cp_form_submit_1, input[name="profileButton"]');
    });

    it('validates Workday mapping list coverage for all core sections', () => {
      expect(workdayDriver.engine).toBe('WORKDAY');
      expect(workdayDriver.submitButtonSelector).toBe('button[data-automation-id="bottom-navigation-next-button"]');
      expect(WORKDAY_EXACT_MAP.length).toBeGreaterThanOrEqual(20);
      const types = WORKDAY_EXACT_MAP.map(m => m.type);
      expect(types).toContain('FIRST_NAME');
      expect(types).toContain('LAST_NAME');
      expect(types).toContain('EMAIL');
      expect(types).toContain('PHONE');
      expect(types).toContain('ADDRESS');
      expect(types).toContain('RESUME');
      expect(types).toContain('COMPANY');
      expect(types).toContain('SCHOOL');
      expect(types).toContain('DISABILITY');
    });

    it('validates Ashby mapping list coverage', () => {
      expect(ashbyDriver.engine).toBe('ASHBY');
      expect(ASHBY_EXACT_MAP.length).toBeGreaterThanOrEqual(7);
      const types = ASHBY_EXACT_MAP.map(m => m.type);
      expect(types).toContain('FULL_NAME');
      expect(types).toContain('EMAIL');
      expect(types).toContain('PHONE');
      expect(types).toContain('RESUME');
      expect(types).toContain('LINKEDIN');
    });

    it('validates Lever mapping list coverage', () => {
      expect(leverDriver.engine).toBe('LEVER');
      expect(LEVER_EXACT_MAP.length).toBeGreaterThanOrEqual(8);
      const types = LEVER_EXACT_MAP.map(m => m.type);
      expect(types).toContain('FULL_NAME');
      expect(types).toContain('EMAIL');
      expect(types).toContain('PHONE');
      expect(types).toContain('RESUME');
      expect(types).toContain('COMPANY');
    });

    it('validates SmartRecruiters mapping list coverage', () => {
      expect(smartrecruitersDriver.engine).toBe('SMARTRECRUITERS');
      expect(SMARTRECRUITERS_EXACT_MAP.length).toBeGreaterThanOrEqual(5);
      const types = SMARTRECRUITERS_EXACT_MAP.map(m => m.type);
      expect(types).toContain('FIRST_NAME');
      expect(types).toContain('LAST_NAME');
      expect(types).toContain('RESUME');
    });

    it('validates BambooHR, Taleo, and Workable driver definitions', () => {
      expect(bamboohrDriver.engine).toBe('BAMBOOHR');
      expect(BAMBOOHR_EXACT_MAP.length).toBeGreaterThanOrEqual(7);

      expect(taleoDriver.engine).toBe('TALEO');
      expect(TALEO_EXACT_MAP.length).toBeGreaterThanOrEqual(7);

      expect(workableDriver.engine).toBe('WORKABLE');
      expect(WORKABLE_EXACT_MAP.length).toBeGreaterThanOrEqual(6);
    });
  });
});

