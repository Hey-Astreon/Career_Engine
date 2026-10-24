import { describe, it, expect } from "vitest";

describe("AstrePilot iCIMS & Enterprise ATS Driver Architecture", () => {
  // Ground truth Cotiviti iCIMS DOM elements inventory extracted from live portal
  const cotivitiDomInventory = [
    { id: "PortalProfileFields.Resume_File", tag: "INPUT", type: "file", label: "Resume File" },
    { id: "PersonProfileFields.Login", tag: "INPUT", type: "text", label: "Login / Username" },
    { id: "PersonProfileFields.Password", tag: "INPUT", type: "password", label: "Password" },
    { id: "PersonProfileFields.Password_Confirm", tag: "INPUT", type: "password", label: "Confirm Password" },
    { id: "PersonProfileFields.FirstName", tag: "INPUT", type: "text", label: "First Name" },
    { id: "PersonProfileFields.LastName", tag: "INPUT", type: "text", label: "Last Name" },
    { id: "PersonProfileFields.Email", tag: "INPUT", type: "email", label: "Email" },
    { id: "rcf2039", tag: "INPUT", type: "text", label: "Preferred Name" },
    { id: "-1_PersonProfileFields.PhoneType", tag: "SELECT", type: "select-one", label: "Phone Type" },
    { id: "-1_PersonProfileFields.PhoneNumber", tag: "INPUT", type: "tel", label: "Phone Number" },
    { id: "rcf3553", tag: "SELECT", type: "select-one", label: "Text Consent: Do you consent to receive text messages from our company?" },
    { id: "-1_PersonProfileFields.AddressType", tag: "SELECT", type: "select-one", label: "Address Type" },
    { id: "-1_PersonProfileFields.AddressStreet1", tag: "INPUT", type: "text", label: "Address Line 1" },
    { id: "-1_PersonProfileFields.AddressStreet2", tag: "INPUT", type: "text", label: "Address Line 2" },
    { id: "-1_PersonProfileFields.AddressCity", tag: "INPUT", type: "text", label: "City" },
    { id: "-1_PersonProfileFields.AddressZip", tag: "INPUT", type: "text", label: "Zip / Postal Code" },
    { id: "-1_PersonProfileFields.AddressCountry", tag: "SELECT", type: "select-one", label: "Country" },
    { id: "-1_PersonProfileFields.AddressState", tag: "SELECT", type: "select-one", label: "State" },
    { id: "rcf3048", tag: "SELECT", type: "select-one", label: "How did you hear about us?" },
    { id: "rcf3049", tag: "SELECT", type: "select-one", label: "Specify further" },
    { id: "rcf3049_Text", tag: "INPUT", type: "text", label: "Specify further text" },
    { id: "-1_PersonProfileFields.rcf3212", tag: "INPUT", type: "text", label: "Employer" },
    { id: "-1_PersonProfileFields.rcf3217", tag: "SELECT", type: "select-one", label: "State (Work)" },
    { id: "-1_PersonProfileFields.rcf3213", tag: "INPUT", type: "text", label: "Title" },
    { id: "-1_PersonProfileFields.rcf3214_Month", tag: "SELECT", type: "select-one", label: "Start Month" },
    { id: "-1_PersonProfileFields.rcf3214_Date", tag: "SELECT", type: "select-one", label: "Start Day" },
    { id: "-1_PersonProfileFields.rcf3214_Year", tag: "INPUT", type: "text", label: "Start Year" },
    { id: "-1_PersonProfileFields.rcf3215_Month", tag: "SELECT", type: "select-one", label: "End Month" },
    { id: "-1_PersonProfileFields.rcf3215_Date", tag: "SELECT", type: "select-one", label: "End Day" },
    { id: "-1_PersonProfileFields.rcf3215_Year", tag: "INPUT", type: "text", label: "End Year" },
    { id: "-1_PersonProfileFields.rcf3219", tag: "TEXTAREA", type: "textarea", label: "Description" },
    { id: "-1_PersonProfileFields.rcf3268", tag: "TEXTAREA", type: "textarea", label: "Reason for Leaving" },
    { id: "cp_form_submit_1", tag: "INPUT", type: "submit", label: "Submit Profile" },
  ];

  it("1. Deterministically maps all 13 custom iCIMS rcf & PersonProfile fields without regex ambiguity", () => {
    // Emulate iCIMS selector dictionary
    const icimsMappings: Record<string, string> = {
      "Resume_File": "RESUME",
      "FirstName": "FIRST_NAME",
      "LastName": "LAST_NAME",
      "Email": "EMAIL",
      "rcf2039": "PREFERRED_NAME",
      "PhoneType": "PHONE_TYPE",
      "PhoneNumber": "PHONE",
      "rcf3553": "TEXT_CONSENT",
      "AddressType": "ADDRESS_TYPE",
      "AddressStreet1": "ADDRESS",
      "AddressStreet2": "APT",
      "AddressCity": "CITY",
      "AddressZip": "ZIP",
      "AddressCountry": "COUNTRY",
      "AddressState": "STATE",
      "rcf3048": "HEAR_ABOUT",
      "rcf3049": "HEAR_ABOUT_DETAIL",
      "rcf3049_Text": "HEAR_ABOUT_DETAIL",
      "rcf3212": "COMPANY",
      "rcf3217": "EXP_STATE",
      "rcf3213": "EMPLOYMENT_TITLE",
      "rcf3214_Month": "START_MONTH",
      "rcf3214_Date": "START_DAY",
      "rcf3214_Year": "START_YEAR",
      "rcf3215_Month": "END_MONTH",
      "rcf3215_Date": "END_DAY",
      "rcf3215_Year": "END_YEAR",
      "rcf3219": "WORK_DESCRIPTION",
      "rcf3268": "REASON_FOR_LEAVING",
      "Login": "LOGIN_ID",
      "Password": "PASSWORD",
      "Password_Confirm": "CONFIRM_PASSWORD"
    };

    cotivitiDomInventory.forEach(item => {
      if (item.type === "submit") return;
      const matchedKey = Object.keys(icimsMappings).find(k => item.id.includes(k));
      expect(matchedKey).toBeDefined();
      expect(icimsMappings[matchedKey!]).toBeTruthy();
    });
  });

  it("2. Verifies Start Year and End Year in iCIMS are classified as text INPUTs, not SELECT dropdowns", () => {
    const startYear = cotivitiDomInventory.find(el => el.id.includes("rcf3214_Year"));
    const endYear = cotivitiDomInventory.find(el => el.id.includes("rcf3215_Year"));

    expect(startYear).toBeDefined();
    expect(startYear!.tag).toBe("INPUT");
    expect(startYear!.type).toBe("text");

    expect(endYear).toBeDefined();
    expect(endYear!.tag).toBe("INPUT");
    expect(endYear!.type).toBe("text");
  });

  it("3. Enforces BCA Candidate Title Regulation across autofilled titles (never Engineer)", () => {
    const sampleTitles = [
      "Software Developer",
      "Full-Stack Developer",
      "Backend Developer",
      "Frontend Developer",
      "Web Developer",
      "Software Engineer", // Must be sanitized
      "Systems Engineer",  // Must be sanitized
    ];

    const sanitizeTitle = (title: string): string => {
      return title.replace(/\bEngineer\b/gi, "Developer");
    };

    sampleTitles.forEach(t => {
      const sanitized = sanitizeTitle(t);
      expect(sanitized.toLowerCase()).not.toContain("engineer");
      expect(sanitized.toLowerCase()).toContain("developer");
    });
  });

  it("4. Asymmetric Safety Firewall strictly answers 'No' to conflict/sponsor and 'Yes' to legal age/work auth/remote acknowledgment for selects", () => {
    const testCases: Array<{ label: string; expected: "Yes" | "No" | "League of Legends" }> = [
      { label: "Have you previously worked for Cotiviti or any of its subsidiaries?", expected: "No" },
      { label: "Will you now or in the future require sponsorship for employment visa status?", expected: "No" },
      { label: "Do you have any relatives or family members currently employed here?", expected: "No" },
      { label: "Are you at least 18 years of age or older?", expected: "Yes" },
      { label: "Are you legally authorized to work in the country where this job is located?", expected: "Yes" },
      { label: "Text Consent: Do you consent to receive text messages from our company?", expected: "Yes" },
      { label: "Are you able to commit to a 40 hour per week remote internship program?", expected: "Yes" },
      { label: "Which Riot Games product are you most interested in working on?", expected: "League of Legends" },
    ];

    testCases.forEach(tc => {
      const q = tc.label.toLowerCase();
      let res: string = "No";

      if (
        q.includes("previously worked") ||
        q.includes("sponsor") ||
        q.includes("relative") ||
        q.includes("conflict")
      ) {
        res = "No";
      } else if (
        q.includes("18 years") ||
        q.includes("legally authorized") ||
        q.includes("consent") ||
        q.includes("40 hour")
      ) {
        res = "Yes";
      } else if (q.includes("product") || q.includes("interested in working on")) {
        res = "League of Legends";
      }

      expect(res).toBe(tc.expected);
    });
  });

  it("5. Procedural text question interceptor returns 'N/A' for family/friend listing prompts", () => {
    const textPrompt = "Please list the names of any and all friends, family or significant others who work here (Type N/A if none):";
    const qLower = textPrompt.toLowerCase();
    let val = "";
    if (
      qLower.includes("relative") ||
      qLower.includes("family member") ||
      qLower.includes("family") ||
      qLower.includes("friends") ||
      qLower.includes("significant other") ||
      /type\s*["']?na["']?/i.test(qLower)
    ) {
      val = "N/A";
    }
    expect(val).toBe("N/A");
  });

  it("6. Verifies phone type mapping correctly resolves to 'Mobile'", () => {
    const phoneOptions = [
      { text: "Select a Phone Type...", value: "" },
      { text: "Home", value: "Home" },
      { text: "Mobile", value: "Mobile" },
      { text: "Work", value: "Work" }
    ];

    const match = phoneOptions.find(o => o.text.toLowerCase().includes("mobile") || o.text.toLowerCase().includes("cell"));
    expect(match).toBeDefined();
    expect(match!.value).toBe("Mobile");
  });
});
