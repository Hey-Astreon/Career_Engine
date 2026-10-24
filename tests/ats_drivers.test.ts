import { describe, it, expect } from 'vitest';
import {
  detectAtsEngine,
  icimsDriver,
  workdayDriver,
  greenhouseDriver,
  leverDriver,
  ashbyDriver,
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

  it('falls back to GENERIC for unknown job board URLs', () => {
    const engine = detectAtsEngine('https://careers.somecompany.com/apply/now');
    expect(engine).toBe('GENERIC');
  });

  describe('iCIMS Driver Specs', () => {
    it('contains all ground-truth Cotiviti fields in fieldMap', () => {
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

    it('enforces iframe context and specifies #icims_content_iframe', () => {
      expect(icimsDriver.iframeSelector).toBe('#icims_content_iframe');
      expect(icimsDriver.submitButtonSelector).toBe('input#cp_form_submit_1, input[name="profileButton"]');
    });
  });
});
