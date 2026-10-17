import { chromium, Page, Frame } from "playwright";
import * as fs from "fs";
import * as path from "path";
import { buildBookmarkletHref } from "../../src/lib/autopilot/bookmarklet";
import { generateAutopilotToken } from "../../src/lib/autopilot/tokenUtils";

interface FormTarget {
  id: string;
  ats: string;
  company: string;
  role: string;
  url: string;
}

type FailureReasonKey =
  | "IFRAME_INVISIBLE"
  | "SHADOW_DOM_INVISIBLE"
  | "FILE_UPLOAD_SKIPPED"
  | "CHECKBOX_SKIPPED"
  | "CUSTOM_DROPDOWN_OR_COMBOBOX"
  | "UNMATCHED_EDUCATION_FIELD"
  | "UNMATCHED_DEMOGRAPHIC_EEO"
  | "UNMATCHED_OTHER_PATTERN"
  | "DUPLICATE_TYPE_SKIPPED"
  | "SELECT_OR_RADIO_VALUE_MISMATCH";

interface InspectedField {
  frameUrl: string;
  inIframe: boolean;
  inShadowDom: boolean;
  tag: string;
  type: string;
  name: string;
  id: string;
  label: string;
  placeholder: string;
  roleAttr: string;
  filled: boolean;
  apMarkedFilled: boolean;
  currentValue: string;
  failureReason?: FailureReasonKey;
}

interface FormBenchmarkResult {
  target: FormTarget;
  httpStatus: number | null;
  finalUrl: string;
  hudMounted: boolean;
  hudStatusText: string;
  apDetectedFields: number;
  apReportedFilled: number;
  totalInteractiveFields: number;
  topLevelInteractiveFields: number;
  iframeInteractiveFields: number;
  shadowDomInteractiveFields: number;
  filledFields: number;
  missedFields: number;
  fillRatePct: number;
  trappedInIframe: boolean;
  cspErrors: string[];
  cspBlockedFetch: boolean;
  untypedFieldCounts: {
    fileUploads: number;
    checkboxes: number;
    customDropdowns: number;
    radios: number;
  };
  failureBreakdown: Record<FailureReasonKey, number>;
  fields: InspectedField[];
  error?: string;
}

const MOCK_ORIGIN = "https://astrework.local";

const MOCK_PROFILE = {
  profileId: "benchmark-candidate-001",
  fullName: "Test Candidate",
  firstName: "Test",
  lastName: "Candidate",
  title: "Software Engineer",
  email: "test.candidate@stanford.edu",
  phone: "+1-415-555-0192",
  location: "San Francisco, CA",
  linkedinUrl: "https://www.linkedin.com/in/test-candidate",
  githubUrl: "https://github.com/test-candidate",
  portfolioUrl: "https://testcandidate.dev",
  professionalSummary:
    "Full-stack Software Engineer and Computer Science student experienced in TypeScript, Python, React, Next.js, and distributed cloud infrastructure.",
  workAuthorized: true,
  requiresVisa: false,
  salaryRange: "$120,000 - $150,000",
  pronouns: "He/him",
  gender: "Male",
  race: "Asian",
  veteran: "I am not a veteran",
  disability: "I do not have a disability",
  highestEducation: "Bachelor's Degree",
  noticePeriod: "Immediately",
  currentCompany: "Acme Cloud",
  _context: {
    skills: ["TypeScript", "Python", "React", "Next.js", "Node.js", "PostgreSQL", "Docker"],
    experience: [
      "Software Engineering Intern at Acme Cloud: Built high-throughput telemetry services in TypeScript and Python.",
      "Undergraduate Researcher at Systems AI Lab: Engineered automated evaluation pipelines and web dashboards."
    ],
    education: ["B.S. in Computer Science, Stanford University (Expected 2026, GPA: 3.9/4.0)"]
  }
};

function createMockSession(target: FormTarget) {
  return {
    session: {
      jobId: target.id,
      company: target.company,
      jobTitle: target.role,
      jobUrl: target.url,
      jdText: `${target.role} at ${target.company}. Looking for strong software engineering, Python, TypeScript, and problem-solving skills.`,
      tailoredSummary: `Motivated candidate applying for ${target.role} at ${target.company} with hands-on experience building production TypeScript and Python systems.`,
      talkingPoints: [
        "Built scalable full-stack web applications and distributed APIs",
        "Strong foundation in algorithms, systems design, and modern AI tooling"
      ],
      salaryRange: "$125,000 - $145,000",
      createdAt: new Date().toISOString()
    }
  };
}

/**
 * Inspects a Frame (either main frame or child iframe) for all interactive application fields.
 */
async function inspectFrameFields(frame: Frame, isIframe: boolean): Promise<InspectedField[]> {
  try {
    return await frame.evaluate((inIframeFlag: boolean) => {
      const results: InspectedField[] = [];
      const seenRadioGroups = new Set<string>();

      function isVisible(el: Element): boolean {
        const htmlEl = el as HTMLElement;
        if (!htmlEl || !htmlEl.getBoundingClientRect) return false;
        const style = window.getComputedStyle(htmlEl);
        if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
          return false;
        }
        const rect = htmlEl.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }

      function isCookieOrSiteChrome(el: Element): boolean {
        let cur: Element | null = el;
        while (cur) {
          const id = (cur.id || "").toLowerCase();
          const cls = (typeof cur.className === "string" ? cur.className : "").toLowerCase();
          const role = (cur.getAttribute("role") || "").toLowerCase();
          if (
            id.includes("onetrust") ||
            id.includes("cookie") ||
            id.includes("cybotcookiebot") ||
            cls.includes("onetrust") ||
            cls.includes("cookie-banner") ||
            cls.includes("cookie_banner") ||
            id === "ap-hud" ||
            cls.includes("ap-hud") ||
            cur.tagName === "NAV" ||
            cur.tagName === "FOOTER" ||
            role === "navigation"
          ) {
            return true;
          }
          cur = cur.parentElement;
        }
        return false;
      }

      function extractLabel(el: Element): string {
        const htmlEl = el as HTMLElement;
        const ariaLabel = el.getAttribute("aria-label");
        if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();

        const ariaLabelledBy = el.getAttribute("aria-labelledby");
        if (ariaLabelledBy) {
          const labelTexts = ariaLabelledBy
            .split(/\s+/)
            .map((id) => document.getElementById(id)?.textContent?.trim() || "")
            .filter(Boolean);
          if (labelTexts.length > 0) return labelTexts.join(" ");
        }

        const inputEl = el as HTMLInputElement;
        if (inputEl.labels && inputEl.labels.length > 0) {
          const lbl = inputEl.labels[0].textContent?.trim();
          if (lbl) return lbl;
        }

        if (el.id) {
          try {
            const explicit = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
            if (explicit && explicit.textContent?.trim()) {
              return explicit.textContent.trim();
            }
          } catch {
            // ignore selector escape errors
          }
        }

        const wrappingLabel = el.closest("label");
        if (wrappingLabel && wrappingLabel.textContent?.trim()) {
          return wrappingLabel.textContent.trim();
        }

        // Check nearby field container (up to 3 levels) for label/legend/question text
        let parent: HTMLElement | null = htmlEl.parentElement;
        for (let depth = 0; depth < 4 && parent; depth++) {
          const labelChild = parent.querySelector(
            "label, legend, [class*='label'], [class*='Label'], [data-qa*='label']"
          );
          if (labelChild && labelChild !== el && labelChild.textContent?.trim()) {
            return labelChild.textContent.trim();
          }
          parent = parent.parentElement;
        }

        return (el.getAttribute("placeholder") || el.getAttribute("name") || el.id || "").trim();
      }

      function collectNodes(root: Document | ShadowRoot, inShadow: boolean): Array<{ el: Element; inShadow: boolean }> {
        const selector = [
          "input:not([type='hidden']):not([type='submit']):not([type='button']):not([type='reset']):not([type='image'])",
          "textarea",
          "select"
        ].join(", ");

        const found: Array<{ el: Element; inShadow: boolean }> = [];
        root.querySelectorAll(selector).forEach((el) => {
          found.push({ el, inShadow });
        });

        root.querySelectorAll("*").forEach((el) => {
          if (el.shadowRoot) {
            found.push(...collectNodes(el.shadowRoot, true));
          }
        });
        return found;
      }

      const rawNodes = collectNodes(document, false);

      // Prefer scoping to application form if one or more forms exist and contain >= 3 inputs,
      // otherwise inspect all visible non-chrome inputs on the page.
      const allCandidateNodes = rawNodes.filter(({ el }) => {
        if (isCookieOrSiteChrome(el)) return false;
        const input = el as HTMLInputElement;
        if (input.disabled || input.readOnly) return false;
        // File inputs are often 0x0 or opacity:0 styled with a dropzone label
        if (input.type === "file") {
          const parentVisible = input.parentElement ? isVisible(input.parentElement) : false;
          return isVisible(el) || parentVisible;
        }
        return isVisible(el);
      });

      const seenClassificationTypes = new Set<string>();

      for (const { el, inShadow } of allCandidateNodes) {
        const tag = el.tagName.toUpperCase();
        const rawType = (el.getAttribute("type") || (tag === "TEXTAREA" ? "textarea" : tag === "SELECT" ? "select" : "text")).toLowerCase();
        const name = el.getAttribute("name") || "";
        const id = el.id || "";
        const placeholder = el.getAttribute("placeholder") || "";
        const roleAttr = el.getAttribute("role") || "";

        if (rawType === "radio") {
          const groupKey = name || id || extractLabel(el);
          if (seenRadioGroups.has(groupKey)) continue;
          seenRadioGroups.add(groupKey);
        }

        let isGroupedCheckbox = false;
        if (rawType === "checkbox") {
          const qContainer = el.closest(".application-question, .custom-question, [class*='question']");
          if (qContainer) {
            const qTitle = (qContainer.querySelector(".application-label, [class*='label'], legend, h3, h4")?.textContent?.trim() || "").toLowerCase();
            if (qTitle && (/pronoun/i.test(qTitle) || /how did you hear/i.test(qTitle) || /hear about/i.test(qTitle) || /source/i.test(qTitle))) {
              if (seenRadioGroups.has(qTitle)) continue;
              seenRadioGroups.add(qTitle);
              isGroupedCheckbox = true;
            }
          }
        }

        const label = extractLabel(el).replace(/\s+/g, " ").slice(0, 140);
        const apMarkedFilled = el.classList.contains("ap-filled-field");

        let filled = false;
        let currentValue = "";

        if (rawType === "radio") {
          const radios = name
            ? Array.from(document.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`)) as HTMLInputElement[]
            : [el as HTMLInputElement];
          const checked = radios.find((r) => r.checked);
          filled = Boolean(checked) || radios.some((r) => r.classList.contains("ap-filled-field"));
          currentValue = checked ? checked.value : "";
        } else if (isGroupedCheckbox) {
          const qContainer = el.closest(".application-question, .custom-question, [class*='question']");
          const allCbs = qContainer ? Array.from(qContainer.querySelectorAll("input[type='checkbox']")) as HTMLInputElement[] : [el as HTMLInputElement];
          const anyChecked = allCbs.some((cb) => cb.checked || cb.classList.contains("ap-filled-field"));
          filled = anyChecked;
          currentValue = anyChecked ? "answered" : "";
        } else if (rawType === "checkbox") {
          const cb = el as HTMLInputElement;
          filled = cb.checked || apMarkedFilled;
          currentValue = cb.checked ? "checked" : "";
        } else if (tag === "SELECT") {
          const sel = el as HTMLSelectElement;
          const val = sel.value || "";
          const selectedOpt = sel.options[sel.selectedIndex];
          const isPlaceholderOpt =
            !val ||
            val === "" ||
            /^(select|choose|--|please select)/i.test((selectedOpt?.text || "").trim());
          filled = (!isPlaceholderOpt && val.length > 0) || apMarkedFilled;
          currentValue = val;
        } else {
          const inp = el as HTMLInputElement | HTMLTextAreaElement;
          currentValue = (inp.value || "").trim();
          filled = currentValue.length > 0 || apMarkedFilled;
        }

        let failureReason: FailureReasonKey | undefined;
        if (!filled) {
          const combinedText = `${name} ${id} ${label} ${placeholder}`.toLowerCase();
          const clsText = (typeof el.className === "string" ? el.className : "").toLowerCase();

          if (inIframeFlag) {
            failureReason = "IFRAME_INVISIBLE";
          } else if (inShadow) {
            failureReason = "SHADOW_DOM_INVISIBLE";
          } else if (rawType === "file") {
            failureReason = "FILE_UPLOAD_SKIPPED";
          } else if (rawType === "checkbox") {
            failureReason = "CHECKBOX_SKIPPED";
          } else if (
            roleAttr === "combobox" ||
            clsText.includes("select__input") ||
            el.getAttribute("aria-autocomplete") === "list" ||
            id.startsWith("react-select-")
          ) {
            failureReason = "CUSTOM_DROPDOWN_OR_COMBOBOX";
          } else if (
            /\b(school|university|college|degree|discipline|major|graduation|gpa|education)\b/i.test(combinedText)
          ) {
            failureReason = "UNMATCHED_EDUCATION_FIELD";
          } else if (
            /\b(gender|race|ethnic|hispanic|veteran|disability|handicap|pronoun|sexual orientation|demographic)\b/i.test(combinedText)
          ) {
            failureReason = "UNMATCHED_DEMOGRAPHIC_EEO";
          } else if (tag === "SELECT" || rawType === "radio") {
            failureReason = "SELECT_OR_RADIO_VALUE_MISMATCH";
          } else {
            // Check if it matched one of the standard patterns that already had a filled field
            const isKnownPattern =
              /\b(first.?name|last.?name|full.?name|email|phone|mobile|location|city|address|linkedin|github|portfolio|website|salary|compensation|visa|sponsorship|authorized)\b/i.test(
                combinedText
              );
            if (isKnownPattern && seenClassificationTypes.has(combinedText.slice(0, 12))) {
              failureReason = "DUPLICATE_TYPE_SKIPPED";
            } else {
              failureReason = "UNMATCHED_OTHER_PATTERN";
              seenClassificationTypes.add(combinedText.slice(0, 12));
            }
          }
        }

        results.push({
          frameUrl: window.location.href,
          inIframe: inIframeFlag,
          inShadowDom: inShadow,
          tag,
          type: rawType,
          name,
          id,
          label,
          placeholder,
          roleAttr,
          filled,
          apMarkedFilled,
          currentValue: currentValue.slice(0, 80),
          failureReason
        });
      }

      return results;
    }, isIframe);
  } catch (err) {
    console.warn(`  [inspectFrameFields] Frame eval skipped (${frame.url()}): ${(err as Error).message}`);
    return [];
  }
}

async function runSingleFormBenchmark(
  page: Page,
  target: FormTarget,
  bookmarkletCode: string
): Promise<FormBenchmarkResult> {
  const cspErrors: string[] = [];
  let cspBlockedFetch = false;

  const consoleListener = (msg: { type: () => string; text: () => string }) => {
    const text = msg.text();
    if (
      /Content Security Policy|CSP|Refused to connect|Refused to execute|Refused to load/i.test(
        text
      )
    ) {
      cspErrors.push(text.slice(0, 240));
    }
  };
  const pageErrorListener = (err: Error) => {
    if (/Content Security Policy|CSP|EvalError/i.test(err.message)) {
      cspErrors.push(err.message.slice(0, 240));
    }
  };

  page.on("console", consoleListener);
  page.on("pageerror", pageErrorListener);

  // Route all AstrePilot API calls so the harness runs 100% standalone offline
  await page.route(`${MOCK_ORIGIN}/api/autopilot/**`, async (route) => {
    const reqUrl = route.request().url();
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json"
    };

    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }

    if (reqUrl.endsWith("/profile")) {
      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify(MOCK_PROFILE)
      });
      return;
    }

    if (reqUrl.endsWith("/session")) {
      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify(createMockSession(target))
      });
      return;
    }

    if (reqUrl.endsWith("/answer")) {
      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          answer:
            "I have built and scaled production TypeScript, Python, and React systems and am excited to contribute to this engineering team."
        })
      });
      return;
    }

    if (reqUrl.endsWith("/log")) {
      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify({ ok: true, id: "mock-log-id" })
      });
      return;
    }

    await route.fulfill({ status: 404, headers: corsHeaders, body: "{}" });
  });

  let httpStatus: number | null = null;
  try {
    console.log(`\n[Benchmark] Navigating to ${target.ats} — ${target.company} (${target.url})`);
    const response = await page.goto(target.url, {
      waitUntil: "domcontentloaded",
      timeout: 45000
    });
    httpStatus = response ? response.status() : null;

    // Wait for client-side hydration (Ashby, Workable, and embedded Greenhouse iframes)
    await page.waitForTimeout(4000);

    // Scroll down to trigger any lazy-loaded application forms or embedded iframes
    await page.evaluate(() => {
      window.scrollTo(0, Math.min(document.body.scrollHeight * 0.5, 1800));
    });
    await page.waitForTimeout(3000);

    // Install a fetch fallback in case page CSP blocks connect-src to https://astrework.local
    await page.evaluate(
      ({ origin, profile, sessionPayload }) => {
        const origFetch = window.fetch.bind(window);
        (window as unknown as { __apCspBlockedFetch?: boolean }).__apCspBlockedFetch = false;
        window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
          const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
          if (urlStr.startsWith(origin)) {
            try {
              return await origFetch(input, init);
            } catch {
              (window as unknown as { __apCspBlockedFetch?: boolean }).__apCspBlockedFetch = true;
              let bodyObj: unknown = { ok: true };
              if (urlStr.endsWith("/profile")) bodyObj = profile;
              else if (urlStr.endsWith("/session")) bodyObj = sessionPayload;
              else if (urlStr.endsWith("/answer")) {
                bodyObj = {
                  answer:
                    "I have built and scaled production TypeScript, Python, and React systems and am excited to contribute to this engineering team."
                };
              }
              return new Response(JSON.stringify(bodyObj), {
                status: 200,
                headers: { "Content-Type": "application/json" }
              });
            }
          }
          return origFetch(input, init);
        };
      },
      {
        origin: MOCK_ORIGIN,
        profile: MOCK_PROFILE,
        sessionPayload: createMockSession(target)
      }
    );

    // Inject the compiled bookmarklet script into the top-level page context
    await page.evaluate(bookmarkletCode);

    // Wait for #ap-hud to initialize and finish profile load + scanFields()
    await page.waitForFunction(
      () => {
        const statusEl = document.getElementById("ap-status-text");
        if (!statusEl) return false;
        const txt = statusEl.textContent || "";
        return (
          txt.includes("Ready —") ||
          txt.includes("No fillable fields") ||
          txt.includes("Error") ||
          txt.includes("Invalid")
        );
      },
      { timeout: 12000 }
    ).catch(() => {});

    const hudMounted = await page.evaluate(() => Boolean(document.getElementById("ap-hud")));
    const initialStatusText = await page.evaluate(
      () => document.getElementById("ap-status-text")?.textContent?.trim() || ""
    );

    const apDetectedDomCount = await page.evaluate(
      () => document.querySelectorAll("#ap-fields > div").length
    );

    // Click #ap-autofill if present (NEVER click any form submit button)
    const hasAutofillBtn = await page.evaluate(() => Boolean(document.getElementById("ap-autofill")));
    if (hasAutofillBtn) {
      await page.click("#ap-autofill");
      // Wait for AstrePilot decodeFill animation & AI screening answers to finish
      await page
        .waitForFunction(
          () => {
            const statusEl = document.getElementById("ap-status-text");
            const txt = statusEl?.textContent || "";
            return txt.startsWith("✦");
          },
          { timeout: 60000 }
        )
        .catch(() => {});
      await page.waitForTimeout(500);
    }

    const finalStatusText = await page.evaluate(
      () => document.getElementById("ap-status-text")?.textContent?.trim() || initialStatusText
    );

    cspBlockedFetch = await page.evaluate(
      () => Boolean((window as unknown as { __apCspBlockedFetch?: boolean }).__apCspBlockedFetch)
    );

    const apReportedFilledMatch = finalStatusText.match(/✦\s*(\d+)\s*\/\s*(\d+)/);
    const apReportedFilled = apReportedFilledMatch ? parseInt(apReportedFilledMatch[1], 10) : 0;
    const apDetectedFields = apReportedFilledMatch
      ? parseInt(apReportedFilledMatch[2], 10)
      : apDetectedDomCount;

    // Inspect top-level document and all child iframes
    const mainFrame = page.mainFrame();
    const topLevelFields = await inspectFrameFields(mainFrame, false);

    const childFrames = page.frames().filter((f) => f !== mainFrame);
    const iframeFields: InspectedField[] = [];
    for (const cf of childFrames) {
      const cfUrl = cf.url();
      // Ignore recaptcha / analytics / blank utility frames unless they contain actual application inputs
      if (/recaptcha|hcaptcha| turnstile|doubleclick|googletagmanager|about:blank/i.test(cfUrl)) {
        continue;
      }
      const fieldsInCf = await inspectFrameFields(cf, true);
      iframeFields.push(...fieldsInCf);
    }

    const allFields = [...topLevelFields, ...iframeFields];
    const totalInteractiveFields = allFields.length;
    const filledFields = allFields.filter((f) => f.filled).length;
    const missedFields = totalInteractiveFields - filledFields;
    const fillRatePct =
      totalInteractiveFields > 0
        ? Number(((filledFields / totalInteractiveFields) * 100).toFixed(1))
        : 0;

    const failureBreakdown: Record<FailureReasonKey, number> = {
      IFRAME_INVISIBLE: 0,
      SHADOW_DOM_INVISIBLE: 0,
      FILE_UPLOAD_SKIPPED: 0,
      CHECKBOX_SKIPPED: 0,
      CUSTOM_DROPDOWN_OR_COMBOBOX: 0,
      UNMATCHED_EDUCATION_FIELD: 0,
      UNMATCHED_DEMOGRAPHIC_EEO: 0,
      UNMATCHED_OTHER_PATTERN: 0,
      DUPLICATE_TYPE_SKIPPED: 0,
      SELECT_OR_RADIO_VALUE_MISMATCH: 0
    };

    for (const f of allFields) {
      if (!f.filled && f.failureReason) {
        failureBreakdown[f.failureReason]++;
      }
    }

    const untypedFieldCounts = {
      fileUploads: allFields.filter((f) => f.type === "file").length,
      checkboxes: allFields.filter((f) => f.type === "checkbox").length,
      customDropdowns: allFields.filter(
        (f) =>
          f.roleAttr === "combobox" ||
          f.id.startsWith("react-select-") ||
          f.failureReason === "CUSTOM_DROPDOWN_OR_COMBOBOX"
      ).length,
      radios: allFields.filter((f) => f.type === "radio").length
    };

    const trappedInIframe = topLevelFields.length === 0 && iframeFields.length > 0;
    const shadowDomInteractiveFields = allFields.filter((f) => f.inShadowDom).length;

    console.log(
      `  -> Status: HTTP ${httpStatus} | HUD: "${finalStatusText}" | Total Fields: ${totalInteractiveFields} (Top: ${topLevelFields.length}, Iframe: ${iframeFields.length}) | Filled: ${filledFields} | Missed: ${missedFields} | Rate: ${fillRatePct}%`
    );

    return {
      target,
      httpStatus,
      finalUrl: page.url(),
      hudMounted,
      hudStatusText: finalStatusText,
      apDetectedFields,
      apReportedFilled,
      totalInteractiveFields,
      topLevelInteractiveFields: topLevelFields.length,
      iframeInteractiveFields: iframeFields.length,
      shadowDomInteractiveFields,
      filledFields,
      missedFields,
      fillRatePct,
      trappedInIframe,
      cspErrors: Array.from(new Set(cspErrors)),
      cspBlockedFetch,
      untypedFieldCounts,
      failureBreakdown,
      fields: allFields
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  -> Error benchmarking ${target.url}: ${message}`);
    return {
      target,
      httpStatus,
      finalUrl: page.url(),
      hudMounted: false,
      hudStatusText: `ERROR: ${message}`,
      apDetectedFields: 0,
      apReportedFilled: 0,
      totalInteractiveFields: 0,
      topLevelInteractiveFields: 0,
      iframeInteractiveFields: 0,
      shadowDomInteractiveFields: 0,
      filledFields: 0,
      missedFields: 0,
      fillRatePct: 0,
      trappedInIframe: false,
      cspErrors: Array.from(new Set(cspErrors)),
      cspBlockedFetch,
      untypedFieldCounts: { fileUploads: 0, checkboxes: 0, customDropdowns: 0, radios: 0 },
      failureBreakdown: {
        IFRAME_INVISIBLE: 0,
        SHADOW_DOM_INVISIBLE: 0,
        FILE_UPLOAD_SKIPPED: 0,
        CHECKBOX_SKIPPED: 0,
        CUSTOM_DROPDOWN_OR_COMBOBOX: 0,
        UNMATCHED_EDUCATION_FIELD: 0,
        UNMATCHED_DEMOGRAPHIC_EEO: 0,
        UNMATCHED_OTHER_PATTERN: 0,
        DUPLICATE_TYPE_SKIPPED: 0,
        SELECT_OR_RADIO_VALUE_MISMATCH: 0
      },
      fields: [],
      error: message
    };
  } finally {
    page.off("console", consoleListener);
    page.off("pageerror", pageErrorListener);
  }
}

function generateMarkdownReport(results: FormBenchmarkResult[]): string {
  const totalFieldsAll = results.reduce((sum, r) => sum + r.totalInteractiveFields, 0);
  const totalFilledAll = results.reduce((sum, r) => sum + r.filledFields, 0);
  const totalMissedAll = results.reduce((sum, r) => sum + r.missedFields, 0);
  const weightedFillRate =
    totalFieldsAll > 0 ? ((totalFilledAll / totalFieldsAll) * 100).toFixed(1) : "0.0";
  const meanFormFillRate =
    results.length > 0
      ? (results.reduce((sum, r) => sum + r.fillRatePct, 0) / results.length).toFixed(1)
      : "0.0";

  const aggregateFailures: Record<FailureReasonKey, number> = {
    IFRAME_INVISIBLE: 0,
    SHADOW_DOM_INVISIBLE: 0,
    FILE_UPLOAD_SKIPPED: 0,
    CHECKBOX_SKIPPED: 0,
    CUSTOM_DROPDOWN_OR_COMBOBOX: 0,
    UNMATCHED_EDUCATION_FIELD: 0,
    UNMATCHED_DEMOGRAPHIC_EEO: 0,
    UNMATCHED_OTHER_PATTERN: 0,
    DUPLICATE_TYPE_SKIPPED: 0,
    SELECT_OR_RADIO_VALUE_MISMATCH: 0
  };

  for (const r of results) {
    (Object.keys(aggregateFailures) as FailureReasonKey[]).forEach((k) => {
      aggregateFailures[k] += r.failureBreakdown[k] || 0;
    });
  }

  const failureDescriptions: Record<FailureReasonKey, string> = {
    CUSTOM_DROPDOWN_OR_COMBOBOX:
      "Custom React-Select / ARIA combobox inputs (`role=\"combobox\"`, `react-select-*`) where native `<select>` or label matching fails",
    UNMATCHED_OTHER_PATTERN:
      "Unmatched custom/standard inputs (e.g., Country, Pronouns, Start Date, Referral source, or label placed outside `<label for>` causing `classifyField()` score < 3)",
    IFRAME_INVISIBLE:
      "Fields trapped inside child/cross-origin `<iframe>` (`#grnhse_iframe` on company-embedded pages), invisible to top-level `document.querySelectorAll`",
    FILE_UPLOAD_SKIPPED:
      "Resume / Cover Letter `<input type=\"file\">` uploads excluded from `scanFields()` selector",
    CHECKBOX_SKIPPED:
      "Checkboxes (`<input type=\"checkbox\">` for GDPR consent, multi-select questions, terms) excluded from `scanFields()` selector",
    UNMATCHED_DEMOGRAPHIC_EEO:
      "EEO / Demographic fields (Gender, Race/Ethnicity, Veteran status, Disability) missing from `FIELD_PATTERNS`",
    UNMATCHED_EDUCATION_FIELD:
      "University / Education fields (School, Degree, Discipline/Major, Graduation Year) missing from `FIELD_PATTERNS`",
    SELECT_OR_RADIO_VALUE_MISMATCH:
      "Native `<select>` or `<input type=\"radio\">` controls where option text/value did not match boolean/string profile value",
    DUPLICATE_TYPE_SKIPPED:
      "Secondary field classifying to an already-seen `FIELD_PATTERNS` type skipped due to `if (seenTypes[type]) return;` deduplication",
    SHADOW_DOM_INVISIBLE:
      "Fields encapsulated inside Shadow DOM roots invisible to `document.querySelectorAll`"
  };

  const rankedFailures = (Object.entries(aggregateFailures) as Array<[FailureReasonKey, number]>)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  const lines: string[] = [];
  lines.push("# AstrePilot Form-Fill Baseline Benchmark Report");
  lines.push("");
  lines.push(`- **Generated At**: ${new Date().toISOString()}`);
  lines.push(`- **Forms Tested**: ${results.length}`);
  lines.push(`- **Total Interactive Fields Discovered**: ${totalFieldsAll}`);
  lines.push(`- **Total Fields Successfully Filled**: ${totalFilledAll}`);
  lines.push(`- **Total Fields Missed**: ${totalMissedAll}`);
  lines.push(`- **Aggregate Fill-Rate Score (Weighted across all fields)**: **${weightedFillRate}%** (${totalFilledAll} / ${totalFieldsAll})`);
  lines.push(`- **Mean Per-Form Fill-Rate Score**: **${meanFormFillRate}%**`);
  lines.push("");
  lines.push("## 1. Per-Form Breakdown Table");
  lines.push("");
  lines.push(
    "| # | ATS Platform | Company & Role | Total Fields (Top / Iframe) | AP Detected | Filled | Missed | Fill Rate % | Iframe Trapped? | CSP Issues / Untyped Fields |"
  );
  lines.push(
    "|---|---|---|---|---|---|---|---|---|---|"
  );

  results.forEach((r, idx) => {
    const untypedSummary = `Files: ${r.untypedFieldCounts.fileUploads}, Checkboxes: ${r.untypedFieldCounts.checkboxes}, Comboboxes: ${r.untypedFieldCounts.customDropdowns}, Radios: ${r.untypedFieldCounts.radios}`;
    const cspSummary =
      r.cspErrors.length > 0 || r.cspBlockedFetch
        ? `CSP warnings (${r.cspErrors.length}); ${untypedSummary}`
        : `None; ${untypedSummary}`;
    lines.push(
      `| ${idx + 1} | ${r.target.ats} | **${r.target.company}** — ${r.target.role} ([link](${r.target.url})) | **${r.totalInteractiveFields}** (${r.topLevelInteractiveFields} / ${r.iframeInteractiveFields}) | ${r.apDetectedFields} | **${r.filledFields}** | ${r.missedFields} | **${r.fillRatePct}%** | ${r.trappedInIframe ? "Yes (100% in iframe)" : "No"} | ${cspSummary} |`
    );
  });

  lines.push("");
  lines.push("## 2. Ranked List of Top Failure Reasons");
  lines.push("");
  lines.push("| Rank | Failure Category | Missed Fields | % of All Missed Fields | Root Cause in `src/lib/autopilot/bookmarklet.ts` |");
  lines.push("|---|---|---|---|---|");

  rankedFailures.forEach(([key, count], index) => {
    const pctOfMissed = totalMissedAll > 0 ? ((count / totalMissedAll) * 100).toFixed(1) : "0.0";
    lines.push(
      `| ${index + 1} | \`${key}\` | **${count}** | ${pctOfMissed}% | ${failureDescriptions[key]} |`
    );
  });

  lines.push("");
  lines.push("## 3. Detailed Per-Form Field Diagnostics");
  lines.push("");

  results.forEach((r, idx) => {
    lines.push(`### ${idx + 1}. ${r.target.company} — ${r.target.role} (${r.target.ats})`);
    lines.push(`- **URL**: ${r.target.url}`);
    lines.push(`- **HUD Status**: \`${r.hudStatusText}\``);
    lines.push(
      `- **Counts**: ${r.filledFields} filled / ${r.totalInteractiveFields} total (${r.fillRatePct}%) — Top-level: ${r.topLevelInteractiveFields}, Iframe: ${r.iframeInteractiveFields}, Shadow DOM: ${r.shadowDomInteractiveFields}`
    );
    lines.push(
      `- **Untyped Controls Present**: ${r.untypedFieldCounts.fileUploads} file uploads, ${r.untypedFieldCounts.checkboxes} checkboxes, ${r.untypedFieldCounts.customDropdowns} custom comboboxes, ${r.untypedFieldCounts.radios} radio groups`
    );
    if (r.cspErrors.length > 0) {
      lines.push(`- **CSP Console Messages (${r.cspErrors.length})**: \`${r.cspErrors[0]}\``);
    }
    const missedList = r.fields
      .filter((f) => !f.filled)
      .slice(0, 12)
      .map(
        (f) =>
          `\`<${f.tag.toLowerCase()} type="${f.type}">\` "${f.label || f.name || f.id || "unlabeled"}" → \`${f.failureReason}\``
      );
    if (missedList.length > 0) {
      lines.push(`- **Sample Missed Fields**: ${missedList.join("; ")}`);
    }
    lines.push("");
  });

  return lines.join("\n");
}

async function main() {
  const formsPath = path.resolve(__dirname, "forms.json");
  const outputDir = path.resolve(__dirname, "output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const targets: FormTarget[] = JSON.parse(fs.readFileSync(formsPath, "utf-8"));
  const token = generateAutopilotToken("benchmark-candidate-001");
  const href = buildBookmarkletHref(token, MOCK_ORIGIN);
  const bookmarkletCode = decodeURIComponent(href.replace(/^javascript:/, ""));

  console.log(`[Benchmark] Loaded ${targets.length} ATS forms. Launching headless Chromium...`);
  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-web-security"]
  });

  const results: FormBenchmarkResult[] = [];
  for (const target of targets) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    });
    await context.addInitScript("window.__name = (fn) => fn;");
    const page = await context.newPage();
    const res = await runSingleFormBenchmark(page, target, bookmarkletCode);
    results.push(res);
    await context.close();
  }

  await browser.close();

  const rawJsonPath = path.join(outputDir, "results.json");
  fs.writeFileSync(rawJsonPath, JSON.stringify(results, null, 2), "utf-8");

  const reportMd = generateMarkdownReport(results);
  const reportPath = path.join(outputDir, "report.md");
  fs.writeFileSync(reportPath, reportMd, "utf-8");

  console.log(`\n[Benchmark] Complete! Report saved to: ${reportPath}`);
}

main().catch((err) => {
  console.error("[Benchmark] Fatal error:", err);
  process.exit(1);
});
