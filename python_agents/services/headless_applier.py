"""
Autonomous Headless Applier — AstrePilot Cloud Worker (Playwright + Antigravity Agent)
======================================================================================
"""

import sys
import os
import asyncio
import time
from typing import Dict, Any, Optional
from playwright.async_api import async_playwright

async def fill_application_form(
    url: str,
    candidate_profile: Optional[Dict[str, Any]] = None,
    screenshot_dir: str = "scratch",
    auto_submit: bool = False,
) -> Dict[str, Any]:
    """
    Autonomously loads an ATS application page, maps form fields,
    fills profile data, captures a full-page verification screenshot,
    and returns a structured application result.
    """
    os.makedirs(screenshot_dir, exist_ok=True)
    profile = candidate_profile or {
        "fullName": "Roushan Kumar",
        "firstName": "Roushan",
        "lastName": "Kumar",
        "email": "playboxstation460@gmail.com",
        "phone": "+91 9876543210",
        "linkedinUrl": "https://linkedin.com/in/roushan-kumar",
        "githubUrl": "https://github.com/Hey-Astreon",
        "portfolioUrl": "https://astrework.app",
        "city": "Bengaluru",
        "location": "Bengaluru, India",
    }

    results = {
        "url": url,
        "fields_filled": 0,
        "fields_detected": 0,
        "screenshot_path": None,
        "status": "STAGED",
        "timestamp": time.time(),
    }

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await context.new_page()

        try:
            print(f"[AstrePilot Applier] Navigating to {url}...")
            await page.goto(url, wait_until="networkidle", timeout=30000)

            # Wait slightly for client-side forms to render
            await asyncio.sleep(1.0)

            inputs = await page.query_selector_all("input:not([type=hidden]):not([type=submit]), textarea, select")
            results["fields_detected"] = len(inputs)
            print(f"[AstrePilot Applier] Found {len(inputs)} visible form controls.")

            for inp in inputs:
                try:
                    name = (await inp.get_attribute("name") or "").lower()
                    inp_id = (await inp.get_attribute("id") or "").lower()
                    inp_type = (await inp.get_attribute("type") or "text").lower()
                    placeholder = (await inp.get_attribute("placeholder") or "").lower()
                    aria_label = (await inp.get_attribute("aria-label") or "").lower()

                    tag_name = await inp.evaluate("el => el.tagName.toLowerCase()")
                    label_text = ""
                    try:
                        label_text = await inp.evaluate("""el => {
                            const lbl = el.closest('label') || document.querySelector('label[for="' + el.id + '"]');
                            return lbl ? lbl.innerText.toLowerCase() : '';
                        }""")
                    except Exception:
                        pass

                    descriptor = f"{name} {inp_id} {placeholder} {aria_label} {label_text}"

                    value_to_fill = None

                    if any(k in descriptor for k in ["first name", "firstname", "given name"]):
                        value_to_fill = profile.get("firstName") or profile["fullName"].split()[0]
                    elif any(k in descriptor for k in ["last name", "lastname", "surname", "family name"]):
                        value_to_fill = profile.get("lastName") or profile["fullName"].split()[-1]
                    elif any(k in descriptor for k in ["full name", "fullname", "your name", "name"]):
                        value_to_fill = profile["fullName"]
                    elif any(k in descriptor for k in ["email", "e-mail"]):
                        value_to_fill = profile["email"]
                    elif any(k in descriptor for k in ["phone", "mobile", "tel"]):
                        value_to_fill = profile["phone"]
                    elif "linkedin" in descriptor:
                        value_to_fill = profile["linkedinUrl"]
                    elif "github" in descriptor:
                        value_to_fill = profile["githubUrl"]
                    elif any(k in descriptor for k in ["portfolio", "website", "personal site"]):
                        value_to_fill = profile["portfolioUrl"]
                    elif any(k in descriptor for k in ["city", "location", "address"]):
                        value_to_fill = profile.get("location") or "Remote"
                    elif any(k in descriptor for k in ["require sponsorship", "need sponsorship", "visa sponsorship"]):
                        value_to_fill = "Yes" if profile.get("requiresVisa") else "No"
                    elif any(k in descriptor for k in ["authorized to work", "legally authorized", "work authorization"]):
                        value_to_fill = "Yes" if profile.get("workAuthorized", True) else "No"
                    elif any(k in descriptor for k in ["salary", "compensation", "expected salary"]):
                        raw_salary = str(profile.get("salaryRange") or "100000")
                        if inp_type == "number":
                            nums = re.findall(r"\d+", raw_salary)
                            value_to_fill = nums[0] if nums else "100000"
                        else:
                            value_to_fill = raw_salary

                    if value_to_fill:
                        if tag_name == "select":
                            # Try selecting by label
                            options = await inp.query_selector_all("option")
                            for opt in options:
                                txt = await opt.inner_text()
                                if any(w in txt.lower() for w in value_to_fill.lower().split()):
                                    val = await opt.get_attribute("value")
                                    await inp.select_option(value=val)
                                    results["fields_filled"] += 1
                                    break
                        else:
                            await inp.fill(value_to_fill)
                            results["fields_filled"] += 1

                except Exception as field_err:
                    print(f"[AstrePilot Applier] Field fill warning: {field_err}")

            # Capture full-page screenshot
            screenshot_file = os.path.join(screenshot_dir, f"staged_app_{int(time.time())}.png")
            await page.screenshot(path=screenshot_file, full_page=True)
            results["screenshot_path"] = os.path.abspath(screenshot_file)
            print(f"[AstrePilot Applier] Saved staged verification screenshot to {screenshot_file}")

            if auto_submit:
                submit_btn = await page.query_selector("button[type=submit], input[type=submit]")
                if submit_btn:
                    await submit_btn.click()
                    results["status"] = "SUBMITTED"
                    await asyncio.sleep(2.0)
            else:
                results["status"] = "STAGED_FOR_REVIEW"

        finally:
            try:
                await page.close()
            except Exception:
                pass
            try:
                await context.close()
            except Exception:
                pass
            try:
                await browser.close()
            except Exception:
                pass

    return results

if __name__ == "__main__":
    test_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000/simulate"
    print(f"[AstrePilot Applier] Running test application against {test_url}...")
    res = asyncio.run(fill_application_form(test_url))
    print(f"[AstrePilot Applier] Result: {res['status']} | Fields filled: {res['fields_filled']}/{res['fields_detected']}")
    print(f"[AstrePilot Applier] Verification screenshot: {res['screenshot_path']}")
