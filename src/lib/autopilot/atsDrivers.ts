/**
 * atsDrivers.ts
 * -------------
 * Modular ATS Driver Architecture for AstrePilot & AstreWork.
 * Provides deterministic schema detection and field mapping for enterprise ATS portals
 * (iCIMS, Workday, Greenhouse, Lever, Ashby, etc.), bypassing brittle fuzzy heuristics.
 */

export interface AtsFieldMapping {
  type: string;
  selectors: string[];
  transform?: (val: any) => any;
  required?: boolean;
}

/**
 * Deterministic Selector Mapping Table for iCIMS / Cotiviti Enterprise Portals.
 * Derived from ground-truth DOM inventories of live iCIMS candidate portals.
 */
export const ICIMS_EXACT_MAP: AtsFieldMapping[] = [
  // 1. Resume File Upload
  {
    type: 'RESUME',
    selectors: [
      'input#PortalProfileFields\\.Resume_File',
      'input[name="PortalProfileFields.Resume_File"]',
      'input[id*="Resume_File"]',
      'input[type="file"][name*="Resume"]',
      'input[type="file"]'
    ]
  },
  // 2. Login Credentials
  {
    type: 'LOGIN_ID',
    selectors: [
      'input#PersonProfileFields\\.Login',
      'input[name="PersonProfileFields.Login"]',
      'input[id$="Login"]'
    ]
  },
  {
    type: 'PASSWORD',
    selectors: [
      'input#PersonProfileFields\\.Password',
      'input[name="PersonProfileFields.Password"]',
      'input[type="password"]:not([id*="Confirm"]):not([name*="Confirm"]):not([id*="_Confirm"])'
    ]
  },
  {
    type: 'CONFIRM_PASSWORD',
    selectors: [
      'input#PersonProfileFields\\.Password_Confirm',
      'input[name="PersonProfileFields.Password_Confirm"]',
      'input[type="password"][id*="Confirm"]',
      'input[type="password"][name*="Confirm"]'
    ]
  },
  // 3. Candidate Identity
  {
    type: 'FIRST_NAME',
    selectors: [
      'input#PersonProfileFields\\.FirstName',
      'input[name="PersonProfileFields.FirstName"]',
      'input[id$="FirstName"]'
    ]
  },
  {
    type: 'LAST_NAME',
    selectors: [
      'input#PersonProfileFields\\.LastName',
      'input[name="PersonProfileFields.LastName"]',
      'input[id$="LastName"]'
    ]
  },
  {
    type: 'EMAIL',
    selectors: [
      'input#PersonProfileFields\\.Email',
      'input[name="PersonProfileFields.Email"]',
      'input[id$="Email"]'
    ]
  },
  {
    type: 'PREFERRED_NAME',
    selectors: [
      'input#rcf2039',
      'input[name="rcf2039"]',
      'input[id$="rcf2039"]'
    ]
  },
  // 4. Phone
  {
    type: 'PHONE_TYPE',
    selectors: [
      'select#-1_PersonProfileFields\\.PhoneType',
      'select[name$="PhoneType"]',
      'select[id$="PhoneType"]'
    ]
  },
  {
    type: 'PHONE',
    selectors: [
      'input#-1_PersonProfileFields\\.PhoneNumber',
      'input[name$="PhoneNumber"]',
      'input[id$="PhoneNumber"]'
    ]
  },
  // 5. SMS / Text Consent
  {
    type: 'TEXT_CONSENT',
    selectors: [
      'select#rcf3553',
      'select[name="rcf3553"]',
      'select[id$="rcf3553"]',
      'select[name*="rcf3553"]'
    ]
  },
  // 6. Address Block
  {
    type: 'ADDRESS_TYPE',
    selectors: [
      'select#-1_PersonProfileFields\\.AddressType',
      'select[name$="AddressType"]',
      'select[id$="AddressType"]'
    ]
  },
  {
    type: 'ADDRESS',
    selectors: [
      'input#-1_PersonProfileFields\\.AddressStreet1',
      'input[name$="AddressStreet1"]',
      'input[id$="AddressStreet1"]'
    ]
  },
  {
    type: 'APT',
    selectors: [
      'input#-1_PersonProfileFields\\.AddressStreet2',
      'input[name$="AddressStreet2"]',
      'input[id$="AddressStreet2"]'
    ]
  },
  {
    type: 'CITY',
    selectors: [
      'input#-1_PersonProfileFields\\.AddressCity',
      'input[name$="AddressCity"]',
      'input[id$="AddressCity"]'
    ]
  },
  {
    type: 'ZIP',
    selectors: [
      'input#-1_PersonProfileFields\\.AddressZip',
      'input[name$="AddressZip"]',
      'input[id$="AddressZip"]'
    ]
  },
  {
    type: 'COUNTRY',
    selectors: [
      'select#-1_PersonProfileFields\\.AddressCountry',
      'select[name$="AddressCountry"]',
      'select[id$="AddressCountry"]'
    ]
  },
  {
    type: 'STATE',
    selectors: [
      'select#-1_PersonProfileFields\\.AddressState',
      'select[name$="AddressState"]',
      'select[id$="AddressState"]'
    ]
  },
  // 7. Referral Sources
  {
    type: 'HEAR_ABOUT',
    selectors: [
      'select#rcf3048',
      'select[name="rcf3048"]',
      'select[id$="rcf3048"]',
      'select[name*="rcf3048"]'
    ]
  },
  {
    type: 'HEAR_ABOUT_DETAIL',
    selectors: [
      'select#rcf3049',
      'select[name="rcf3049"]',
      'select[id$="rcf3049"]',
      'input#rcf3049_Text',
      'input[name="rcf3049_Text"]',
      'input[id$="rcf3049_Text"]'
    ]
  },
  // 8. Work Experience / Employment Block (All custom Cotiviti/iCIMS IDs)
  {
    type: 'COMPANY',
    selectors: [
      'input#-1_PersonProfileFields\\.rcf3212',
      'input[name$="rcf3212"]',
      'input[id$="rcf3212"]',
      'input[name*="rcf3212"]'
    ]
  },
  {
    type: 'EXP_STATE',
    selectors: [
      'select#-1_PersonProfileFields\\.rcf3217',
      'select[name$="rcf3217"]',
      'select[id$="rcf3217"]',
      'select[name*="rcf3217"]'
    ]
  },
  {
    type: 'EMPLOYMENT_TITLE',
    selectors: [
      'input#-1_PersonProfileFields\\.rcf3213',
      'input[name$="rcf3213"]',
      'input[id$="rcf3213"]',
      'input[name*="rcf3213"]'
    ]
  },
  {
    type: 'START_MONTH',
    selectors: [
      'select#-1_PersonProfileFields\\.rcf3214_Month',
      'select[name$="rcf3214_Month"]',
      'select[id$="rcf3214_Month"]'
    ]
  },
  {
    type: 'START_DAY',
    selectors: [
      'select#-1_PersonProfileFields\\.rcf3214_Date',
      'select[name$="rcf3214_Date"]',
      'select[id$="rcf3214_Date"]'
    ]
  },
  {
    type: 'START_YEAR',
    selectors: [
      'input#-1_PersonProfileFields\\.rcf3214_Year',
      'input[name$="rcf3214_Year"]',
      'input[id$="rcf3214_Year"]'
    ]
  },
  {
    type: 'END_MONTH',
    selectors: [
      'select#-1_PersonProfileFields\\.rcf3215_Month',
      'select[name$="rcf3215_Month"]',
      'select[id$="rcf3215_Month"]'
    ]
  },
  {
    type: 'END_DAY',
    selectors: [
      'select#-1_PersonProfileFields\\.rcf3215_Date',
      'select[name$="rcf3215_Date"]',
      'select[id$="rcf3215_Date"]'
    ]
  },
  {
    type: 'END_YEAR',
    selectors: [
      'input#-1_PersonProfileFields\\.rcf3215_Year',
      'input[name$="rcf3215_Year"]',
      'input[id$="rcf3215_Year"]'
    ]
  },
  {
    type: 'WORK_DESCRIPTION',
    selectors: [
      'textarea#-1_PersonProfileFields\\.rcf3219',
      'textarea[name$="rcf3219"]',
      'textarea[id$="rcf3219"]'
    ]
  },
  {
    type: 'REASON_FOR_LEAVING',
    selectors: [
      'textarea#-1_PersonProfileFields\\.rcf3268',
      'textarea[name$="rcf3268"]',
      'textarea[id$="rcf3268"]'
    ]
  }
];

/**
 * Checks if the given URL, hostname, or DOM signals indicate an iCIMS application environment.
 */
export function isIcimsEnvironment(urlOrHostname: string, domSignalsText: string = ''): boolean {
  const target = (urlOrHostname || '').toLowerCase();
  const domText = (domSignalsText || '').toLowerCase();

  if (target.includes('icims.com') || target.includes('icims_content_iframe')) return true;
  if (
    domText.includes('icims_content_iframe') ||
    domText.includes('personprofilefields') ||
    domText.includes('portalprofilefields') ||
    domText.includes('icims_table') ||
    domText.includes('icims_mainwrapper')
  ) {
    return true;
  }
  return false;
}

/**
 * Deterministic Selector Mapping Table for Greenhouse Portals
 * (job-boards.greenhouse.io, boards.greenhouse.io).
 */
export const GREENHOUSE_EXACT_MAP: AtsFieldMapping[] = [
  { type: 'FIRST_NAME', selectors: ['input#first_name', 'input[name="first_name"]'] },
  { type: 'LAST_NAME', selectors: ['input#last_name', 'input[name="last_name"]'] },
  { type: 'PREFERRED_NAME', selectors: ['input#preferred_name', 'input[name="preferred_name"]'] },
  { type: 'EMAIL', selectors: ['input#email', 'input[name="email"]'] },
  { type: 'PHONE', selectors: ['input#phone', 'input[name="phone"]'] },
  { type: 'CITY', selectors: ['input#candidate-location', 'input[name="candidate_location"]'] },
  { type: 'RESUME', selectors: ['input#resume[type="file"]', 'input[type="file"][name*="resume"]'] },
  { type: 'SCHOOL', selectors: ['input#school--0', 'input[id^="school--"]', '.select__control:has(label#school--0-label)'] },
  { type: 'DEGREE', selectors: ['input#degree--0', 'input[id^="degree--"]'] },
  { type: 'DISCIPLINE', selectors: ['input#discipline--0', 'input[id^="discipline--"]'] },
  { type: 'START_MONTH', selectors: ['input#start-month--0', 'input[id^="start-month--"]'] },
  { type: 'START_YEAR', selectors: ['input#start-year--0', 'input[id^="start-year--"]'] },
  { type: 'END_MONTH', selectors: ['input#end-month--0', 'input[id^="end-month--"]'] },
  { type: 'END_YEAR', selectors: ['input#end-year--0', 'input[id^="end-year--"]'] },
  { type: 'GENDER', selectors: ['input#gender', 'select#gender'] },
  { type: 'HISPANIC_LATINO', selectors: ['input#hispanic_ethnicity', 'select#hispanic_ethnicity'] },
  { type: 'VETERAN', selectors: ['input#veteran_status', 'select#veteran_status'] },
  { type: 'DISABILITY', selectors: ['input#disability_status', 'select#disability_status'] }
];

export function isGreenhouseEnvironment(urlOrHostname: string, domSignalsText: string = ''): boolean {
  const target = (urlOrHostname || '').toLowerCase();
  const domText = (domSignalsText || '').toLowerCase();

  if (target.includes('greenhouse.io')) return true;
  if (
    domText.includes('job-boards.greenhouse.io') ||
    domText.includes('boards.greenhouse.io') ||
    domText.includes('application-form') ||
    domText.includes('react-select-') ||
    domText.includes('select-shell remix-css')
  ) {
    return true;
  }
  return false;
}

export interface AtsDriverDefinition {
  engine: string;
  iframeSelector?: string;
  submitButtonSelector?: string;
  fieldMap: Record<string, string>;
  mappingList: AtsFieldMapping[];
}

export const icimsDriver: AtsDriverDefinition = {
  engine: 'ICIMS',
  iframeSelector: '#icims_content_iframe',
  submitButtonSelector: 'input#cp_form_submit_1, input[name="profileButton"]',
  fieldMap: {
    'INPUT#PersonProfileFields.FirstName': 'FIRST_NAME',
    'INPUT#PersonProfileFields.LastName': 'LAST_NAME',
    'INPUT#PersonProfileFields.Email': 'EMAIL',
    'SELECT#-1_PersonProfileFields.PhoneType': 'PHONE_TYPE',
    'INPUT#-1_PersonProfileFields.PhoneNumber': 'PHONE',
    'SELECT#rcf3553': 'TEXT_CONSENT',
    'SELECT#-1_PersonProfileFields.AddressType': 'ADDRESS_TYPE',
    'INPUT#-1_PersonProfileFields.AddressStreet1': 'ADDRESS',
    'INPUT#-1_PersonProfileFields.AddressStreet2': 'APT',
    'INPUT#-1_PersonProfileFields.AddressCity': 'CITY',
    'SELECT#-1_PersonProfileFields.AddressCountry': 'COUNTRY',
    'SELECT#-1_PersonProfileFields.AddressState': 'STATE',
    'INPUT#-1_PersonProfileFields.AddressZip': 'ZIP',
    'SELECT#rcf3048': 'HEAR_ABOUT',
    'SELECT#rcf3049': 'HEAR_ABOUT_DETAIL',
    'INPUT#rcf3049_Text': 'HEAR_ABOUT_DETAIL',
    'INPUT#-1_PersonProfileFields.rcf3212': 'COMPANY',
    'SELECT#-1_PersonProfileFields.rcf3217': 'EXP_STATE',
    'INPUT#-1_PersonProfileFields.rcf3213': 'EMPLOYMENT_TITLE',
    'SELECT#-1_PersonProfileFields.rcf3214_Month': 'START_MONTH',
    'SELECT#-1_PersonProfileFields.rcf3214_Date': 'START_DAY',
    'INPUT#-1_PersonProfileFields.rcf3214_Year': 'START_YEAR',
    'SELECT#-1_PersonProfileFields.rcf3215_Month': 'END_MONTH',
    'SELECT#-1_PersonProfileFields.rcf3215_Date': 'END_DAY',
    'INPUT#-1_PersonProfileFields.rcf3215_Year': 'END_YEAR',
    'TEXTAREA#-1_PersonProfileFields.rcf3219': 'WORK_DESCRIPTION',
    'TEXTAREA#-1_PersonProfileFields.rcf3268': 'REASON_FOR_LEAVING',
    'INPUT#PersonProfileFields.Login': 'LOGIN_ID',
    'INPUT#PersonProfileFields.Password': 'PASSWORD',
    'INPUT#PersonProfileFields.Password_Confirm': 'CONFIRM_PASSWORD',
    'INPUT#rcf2039': 'PREFERRED_NAME',
    'INPUT#PortalProfileFields.Resume_File': 'RESUME'
  },
  mappingList: ICIMS_EXACT_MAP
};

export const workdayDriver: AtsDriverDefinition = {
  engine: 'WORKDAY',
  submitButtonSelector: 'button[data-automation-id="bottom-navigation-next-button"]',
  fieldMap: {},
  mappingList: []
};

export const greenhouseDriver: AtsDriverDefinition = {
  engine: 'GREENHOUSE',
  submitButtonSelector: 'button#submit_app, input[type="submit"]',
  fieldMap: {},
  mappingList: GREENHOUSE_EXACT_MAP
};

export const leverDriver: AtsDriverDefinition = {
  engine: 'LEVER',
  submitButtonSelector: 'button#btn-submit',
  fieldMap: {},
  mappingList: []
};

export const ashbyDriver: AtsDriverDefinition = {
  engine: 'ASHBY',
  submitButtonSelector: 'button[type="submit"]',
  fieldMap: {},
  mappingList: []
};

export function detectAtsEngine(url: string, htmlSnippet: string = ''): string {
  if (isIcimsEnvironment(url, htmlSnippet)) return 'ICIMS';
  if ((url || '').toLowerCase().includes('myworkdayjobs.com') || (htmlSnippet || '').toLowerCase().includes('data-automation-id')) return 'WORKDAY';
  if (isGreenhouseEnvironment(url, htmlSnippet)) return 'GREENHOUSE';
  if ((url || '').toLowerCase().includes('lever.co')) return 'LEVER';
  if ((url || '').toLowerCase().includes('ashbyhq.com')) return 'ASHBY';
  return 'GENERIC';
}

