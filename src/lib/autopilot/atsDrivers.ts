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

/**
 * Deterministic Selector Mapping Table for Workday Enterprise Portals.
 * Covers myworkdayjobs.com multi-step applications.
 */
export const WORKDAY_EXACT_MAP: AtsFieldMapping[] = [
  { type: 'FIRST_NAME', selectors: ['input[data-automation-id="legalNameSection_firstName"]', 'input[id*="legalNameSection_firstName"]'] },
  { type: 'LAST_NAME', selectors: ['input[data-automation-id="legalNameSection_lastName"]', 'input[id*="legalNameSection_lastName"]'] },
  { type: 'PREFERRED_NAME', selectors: ['input[data-automation-id="preferredNameSection_firstName"]'] },
  { type: 'EMAIL', selectors: ['input[data-automation-id="email"]', 'input[type="email"]'] },
  { type: 'PHONE', selectors: ['input[data-automation-id="phone-number"]', 'input[data-automation-id="phoneNumber"]'] },
  { type: 'PHONE_TYPE', selectors: ['button[data-automation-id="phone-device-type"]', '[data-automation-id="phone-device-type"]'] },
  { type: 'ADDRESS', selectors: ['input[data-automation-id="addressSection_addressLine1"]'] },
  { type: 'APT', selectors: ['input[data-automation-id="addressSection_addressLine2"]'] },
  { type: 'CITY', selectors: ['input[data-automation-id="addressSection_city"]'] },
  { type: 'ZIP', selectors: ['input[data-automation-id="addressSection_postalCode"]'] },
  { type: 'STATE', selectors: ['button[data-automation-id="addressSection_countryRegion"]', '[data-automation-id="addressSection_countryRegion"]'] },
  { type: 'COUNTRY', selectors: ['button[data-automation-id="addressSection_country"]', '[data-automation-id="addressSection_country"]'] },
  { type: 'RESUME', selectors: ['input[data-automation-id="file-upload-input-ref"]', '[data-automation-id="file-upload-drop-zone"] input[type="file"]'] },
  { type: 'LINKEDIN', selectors: ['input[data-automation-id*="linkedin"]', 'input[data-automation-id="linkedinQuestion"]'] },
  { type: 'PORTFOLIO', selectors: ['input[data-automation-id*="website"]', 'input[data-automation-id*="portfolio"]'] },
  { type: 'HEAR_ABOUT', selectors: ['button[data-automation-id="sourcePrompt"]', '[data-automation-id="sourcePrompt"]'] },
  { type: 'COMPANY', selectors: ['input[data-automation-id="company"]'] },
  { type: 'EMPLOYMENT_TITLE', selectors: ['input[data-automation-id="jobTitle"]'] },
  { type: 'WORK_DESCRIPTION', selectors: ['textarea[data-automation-id="description"]'] },
  { type: 'SCHOOL', selectors: ['input[data-automation-id="school"]', 'button[data-automation-id="school"]'] },
  { type: 'DEGREE', selectors: ['button[data-automation-id="degree"]', '[data-automation-id="degree"]'] },
  { type: 'DISCIPLINE', selectors: ['button[data-automation-id="field-of-study"]', '[data-automation-id="field-of-study"]'] },
  { type: 'GENDER', selectors: ['button[data-automation-id="gender"]', 'button[data-automation-id="genderPrompt"]'] },
  { type: 'HISPANIC_LATINO', selectors: ['button[data-automation-id="hispanicOrLatino"]'] },
  { type: 'VETERAN', selectors: ['button[data-automation-id="veteranStatus"]'] },
  { type: 'DISABILITY', selectors: ['input[data-automation-id*="disability"]', 'button[data-automation-id*="disability"]'] }
];

/**
 * Deterministic Selector Mapping Table for Lever Portals (jobs.lever.co).
 */
export const LEVER_EXACT_MAP: AtsFieldMapping[] = [
  { type: 'FULL_NAME', selectors: ['input[name="name"]'] },
  { type: 'EMAIL', selectors: ['input[name="email"]'] },
  { type: 'PHONE', selectors: ['input[name="phone"]'] },
  { type: 'COMPANY', selectors: ['input[name="org"]'] },
  { type: 'LINKEDIN', selectors: ['input[name="urls[LinkedIn]"]'] },
  { type: 'GITHUB', selectors: ['input[name="urls[GitHub]"]'] },
  { type: 'PORTFOLIO', selectors: ['input[name="urls[Portfolio]"]'] },
  { type: 'RESUME', selectors: ['input[name="resume"]', 'input#resume-upload-input', 'input[type="file"][name*="resume"]'] },
  { type: 'SUMMARY', selectors: ['textarea[name="comments"]', 'textarea[name="additional-information"]'] }
];

/**
 * Deterministic Selector Mapping Table for Ashby Portals (jobs.ashbyhq.com).
 */
export const ASHBY_EXACT_MAP: AtsFieldMapping[] = [
  { type: 'FULL_NAME', selectors: ['input[data-testid="name"]', 'input[name="name"]'] },
  { type: 'EMAIL', selectors: ['input[data-testid="email"]', 'input[name="email"]'] },
  { type: 'PHONE', selectors: ['input[data-testid="phone"]', 'input[name="phone"]'] },
  { type: 'RESUME', selectors: ['[data-testid="resume-upload-dropzone"] input[type="file"]', 'input[type="file"][accept*="pdf"]', 'input[type="file"]'] },
  { type: 'LINKEDIN', selectors: ['input[name*="linkedin"]', 'input[data-testid*="linkedin"]'] },
  { type: 'GITHUB', selectors: ['input[name*="github"]', 'input[data-testid*="github"]'] },
  { type: 'PORTFOLIO', selectors: ['input[name*="portfolio"]', 'input[data-testid*="portfolio"]', 'input[name*="website"]'] },
  { type: 'CITY', selectors: ['input[name*="location"]', 'input[data-testid*="location"]'] }
];

/**
 * Deterministic Selector Mapping Table for SmartRecruiters (jobs.smartrecruiters.com).
 */
export const SMARTRECRUITERS_EXACT_MAP: AtsFieldMapping[] = [
  { type: 'FIRST_NAME', selectors: ['input#first-name-input', 'input[name="firstName"]'] },
  { type: 'LAST_NAME', selectors: ['input#last-name-input', 'input[name="lastName"]'] },
  { type: 'EMAIL', selectors: ['input#email-input', 'input[name="email"]'] },
  { type: 'PHONE', selectors: ['input#phone-number-input', 'input[name="phoneNumber"]'] },
  { type: 'CITY', selectors: ['input#location-input', 'input[name="location"]'] },
  { type: 'RESUME', selectors: ['input[type="file"][id*="resume"]', '[data-test="resume-upload"] input[type="file"]', 'input[type="file"]'] }
];

/**
 * Deterministic Selector Mapping Table for BambooHR (bamboohr.com).
 */
export const BAMBOOHR_EXACT_MAP: AtsFieldMapping[] = [
  { type: 'FIRST_NAME', selectors: ['input[name="candidate_first_name"]', 'input[id*="firstName"]'] },
  { type: 'LAST_NAME', selectors: ['input[name="candidate_last_name"]', 'input[id*="lastName"]'] },
  { type: 'EMAIL', selectors: ['input[name="candidate_email"]', 'input[id*="email"]'] },
  { type: 'PHONE', selectors: ['input[name="candidate_phone"]', 'input[id*="phone"]'] },
  { type: 'ADDRESS', selectors: ['input[name="candidate_street"]', 'input[id*="address"]'] },
  { type: 'CITY', selectors: ['input[name="candidate_city"]', 'input[id*="city"]'] },
  { type: 'ZIP', selectors: ['input[name="candidate_zip"]', 'input[id*="zip"]'] },
  { type: 'RESUME', selectors: ['input[type="file"][name*="resume"]', 'input#resume_file'] }
];

/**
 * Deterministic Selector Mapping Table for Taleo / Oracle Cloud Recruiting.
 */
export const TALEO_EXACT_MAP: AtsFieldMapping[] = [
  { type: 'FIRST_NAME', selectors: ['input[id*="FirstName"]', 'input[name*="firstName"]'] },
  { type: 'LAST_NAME', selectors: ['input[id*="LastName"]', 'input[name*="lastName"]'] },
  { type: 'EMAIL', selectors: ['input[id*="Email"]', 'input[name*="email"]'] },
  { type: 'PHONE', selectors: ['input[id*="Phone"]', 'input[name*="phone"]'] },
  { type: 'ADDRESS', selectors: ['input[id*="Address"]', 'input[name*="address"]'] },
  { type: 'CITY', selectors: ['input[id*="City"]', 'input[name*="city"]'] },
  { type: 'ZIP', selectors: ['input[id*="Zip"]', 'input[name*="zip"]'] },
  { type: 'RESUME', selectors: ['input[type="file"][id*="resume"]', 'input[type="file"][name*="resume"]', 'input[type="file"]'] }
];

/**
 * Deterministic Selector Mapping Table for Workable (apply.workable.com).
 */
export const WORKABLE_EXACT_MAP: AtsFieldMapping[] = [
  { type: 'FIRST_NAME', selectors: ['input[name="firstname"]', 'input#firstname'] },
  { type: 'LAST_NAME', selectors: ['input[name="lastname"]', 'input#lastname'] },
  { type: 'EMAIL', selectors: ['input[name="email"]', 'input#email'] },
  { type: 'PHONE', selectors: ['input[name="phone"]', 'input#phone'] },
  { type: 'CITY', selectors: ['input[name="address"]', 'input#address'] },
  { type: 'RESUME', selectors: ['input[type="file"][name*="resume"]', 'input[type="file"]'] },
  { type: 'SUMMARY', selectors: ['textarea[name="summary"]', 'textarea#summary'] }
];

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
  fieldMap: {
    'INPUT#legalNameSection_firstName': 'FIRST_NAME',
    'INPUT#legalNameSection_lastName': 'LAST_NAME',
    'INPUT#email': 'EMAIL',
    'INPUT#phone-number': 'PHONE',
    'INPUT#addressSection_addressLine1': 'ADDRESS',
    'INPUT#addressSection_city': 'CITY',
    'INPUT#addressSection_postalCode': 'ZIP'
  },
  mappingList: WORKDAY_EXACT_MAP
};

export const greenhouseDriver: AtsDriverDefinition = {
  engine: 'GREENHOUSE',
  submitButtonSelector: 'button#submit_app, input[type="submit"]',
  fieldMap: {
    'INPUT#first_name': 'FIRST_NAME',
    'INPUT#last_name': 'LAST_NAME',
    'INPUT#email': 'EMAIL',
    'INPUT#phone': 'PHONE',
    'INPUT#candidate-location': 'CITY',
    'INPUT#resume': 'RESUME'
  },
  mappingList: GREENHOUSE_EXACT_MAP
};

export const leverDriver: AtsDriverDefinition = {
  engine: 'LEVER',
  submitButtonSelector: 'button#btn-submit, button[type="submit"]',
  fieldMap: {
    'INPUT#name': 'FULL_NAME',
    'INPUT#email': 'EMAIL',
    'INPUT#phone': 'PHONE',
    'INPUT#org': 'COMPANY',
    'INPUT#resume': 'RESUME'
  },
  mappingList: LEVER_EXACT_MAP
};

export const ashbyDriver: AtsDriverDefinition = {
  engine: 'ASHBY',
  submitButtonSelector: 'button[data-testid="submit-application"], button[type="submit"]',
  fieldMap: {
    'INPUT#name': 'FULL_NAME',
    'INPUT#email': 'EMAIL',
    'INPUT#phone': 'PHONE'
  },
  mappingList: ASHBY_EXACT_MAP
};

export const smartrecruitersDriver: AtsDriverDefinition = {
  engine: 'SMARTRECRUITERS',
  submitButtonSelector: 'button[data-test="footer-submit"], button[type="submit"]',
  fieldMap: {
    'INPUT#first-name-input': 'FIRST_NAME',
    'INPUT#last-name-input': 'LAST_NAME',
    'INPUT#email-input': 'EMAIL',
    'INPUT#phone-number-input': 'PHONE'
  },
  mappingList: SMARTRECRUITERS_EXACT_MAP
};

export const bamboohrDriver: AtsDriverDefinition = {
  engine: 'BAMBOOHR',
  submitButtonSelector: 'button[type="submit"], input[type="submit"]',
  fieldMap: {},
  mappingList: BAMBOOHR_EXACT_MAP
};

export const workableDriver: AtsDriverDefinition = {
  engine: 'WORKABLE',
  submitButtonSelector: 'button[type="submit"], [data-ui="apply-button"]',
  fieldMap: {},
  mappingList: WORKABLE_EXACT_MAP
};

export const taleoDriver: AtsDriverDefinition = {
  engine: 'TALEO',
  submitButtonSelector: 'input[type="submit"], button[type="submit"]',
  fieldMap: {},
  mappingList: TALEO_EXACT_MAP
};

export function detectAtsEngine(url: string, htmlSnippet: string = ''): string {
  const target = (url || '').toLowerCase();
  const domText = (htmlSnippet || '').toLowerCase();

  if (isIcimsEnvironment(url, htmlSnippet)) return 'ICIMS';
  if (target.includes('myworkdayjobs.com') || target.includes('.myworkday.com') || domText.includes('data-automation-id')) return 'WORKDAY';
  if (isGreenhouseEnvironment(url, htmlSnippet)) return 'GREENHOUSE';
  if (target.includes('lever.co') || domText.includes('application-form') && domText.includes('lever')) return 'LEVER';
  if (target.includes('ashbyhq.com') || domText.includes('ashby-application-form') || domText.includes('data-testid="application-form"')) return 'ASHBY';
  if (target.includes('smartrecruiters.com') || domText.includes('smartrecruiters')) return 'SMARTRECRUITERS';
  if (target.includes('bamboohr.com') || domText.includes('bamboohr')) return 'BAMBOOHR';
  if (target.includes('workable.com') || domText.includes('apply.workable.com')) return 'WORKABLE';
  if (target.includes('taleo.net') || target.includes('oraclecloud.com') || domText.includes('taleo')) return 'TALEO';
  if (target.includes('breezy.hr') || domText.includes('breezy.hr')) return 'BREEZY';
  return 'GENERIC';
}


