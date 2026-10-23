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
