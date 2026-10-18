"""
Autonomous Stealth Job Harvester — AstreWork Antigravity Agent Core
====================================================================
Uses Playwright with anti-detection headers, human-like timing,
and network response interception to harvest live startup and tech roles
from Wellfound and Jobright.ai.
"""

import sys
import os
import asyncio
import json
import re
import random
from typing import Dict, Any, List, Optional
from playwright.async_api import async_playwright

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
]

async def harvest_wellfound_jobs(
    query: str = "software engineer",
    remote_only: bool = True,
    max_jobs: int = 25,
) -> List[Dict[str, Any]]:
    """
    Harvests remote startup jobs from Wellfound using Playwright network interception
    and DOM fallback.
    """
    jobs: List[Dict[str, Any]] = []
    intercepted_graphql: List[Dict[str, Any]] = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-setuid-sandbox",
            ],
        )
        context = await browser.new_context(
            user_agent=USER_AGENTS[0],
            viewport={"width": 1280, "height": 800},
            locale="en-US",
        )

        page = await context.new_page()

        # Intercept background GraphQL responses from Wellfound
        async def handle_response(response):
            try:
                if "graphql" in response.url and response.status == 200:
                    text = await response.text()
                    data = json.loads(text)
                    if "data" in data and any("search" in k.lower() or "job" in k.lower() or "talent" in k.lower() for k in data["data"].keys()):
                        intercepted_graphql.append(data)
            except Exception:
                pass

        page.on("response", handle_response)

        target_url = "https://wellfound.com/jobs"
        params = []
        if remote_only:
            params.append("remote=true")
        if query:
            clean_q = query.lower()
            if "intern" in clean_q:
                params.append("role=Software+Engineer")
                params.append("experience=internship")
            elif "software" in clean_q or "engineer" in clean_q or "developer" in clean_q:
                params.append("role=Software+Engineer")
            params.append(f"q={urllib.parse.quote(query)}")
        if params:
            target_url += "?" + "&".join(params)

        print(f"[StealthScraper] Navigating to {target_url}...")
        try:
            await page.goto(target_url, wait_until="domcontentloaded", timeout=25000)
            await asyncio.sleep(2.0)

            # Proactively fill search bar if present on public page
            try:
                job_input = await page.query_selector('input[placeholder*="Job title" i], input[placeholder*="title" i], input[placeholder*="role" i]')
                if job_input:
                    await job_input.fill(query or "Software Engineer Intern")
                    loc_input = await page.query_selector('input[placeholder*="Location" i]')
                    if loc_input and remote_only:
                        await loc_input.fill("Remote")
                    search_btn = await page.query_selector('button:has-text("Search"), input[type="submit"]')
                    if search_btn:
                        await search_btn.click()
                    else:
                        await page.keyboard.press("Enter")
                    await asyncio.sleep(2.5)
            except Exception as e:
                pass

            # Scroll down to trigger client-side hydration
            await page.evaluate("window.scrollBy(0, 800)")
            await asyncio.sleep(1.5)

            # 1. First-class Loophole: Extract from Apollo Client store or __NEXT_DATA__ directly from page memory
            try:
                apollo_jobs = await page.evaluate("""() => {
                    const results = [];
                    let store = null;
                    if (typeof window.__APOLLO_CLIENT__ !== 'undefined' && window.__APOLLO_CLIENT__.extract) {
                        store = window.__APOLLO_CLIENT__.extract();
                    } else {
                        const nextScript = document.getElementById('__NEXT_DATA__');
                        if (nextScript) {
                            try {
                                const parsed = JSON.parse(nextScript.textContent);
                                store = parsed?.props?.pageProps?.apolloState || parsed?.props?.pageProps?.initialApolloState;
                            } catch (e) {}
                        }
                    }
                    if (!store) return results;

                    for (const [key, val] of Object.entries(store)) {
                        if (key.includes('JobListing') && val && val.title) {
                            let company = 'Startup';
                            if (val.startup && val.startup.__ref && store[val.startup.__ref]) {
                                company = store[val.startup.__ref].name || company;
                            } else if (val.company && val.company.__ref && store[val.company.__ref]) {
                                company = store[val.company.__ref].name || company;
                            }
                            const isRemote = val.remote === true || 
                                (Array.isArray(val.locationNames) && val.locationNames.some(l => typeof l === 'string' && l.toLowerCase().includes('remote')));
                            const location = isRemote ? 'Remote' : ((Array.isArray(val.locationNames) && val.locationNames[0]) || 'Remote');
                            const slug = val.slug || (val.id ? `job-${val.id}` : 'startup-job');
                            const url = val.id ? `https://wellfound.com/jobs/${val.id}-${slug}` : `https://wellfound.com/jobs/${slug}`;
                            results.push({
                                title: val.title,
                                company: company,
                                location: location,
                                url: url,
                                salary: val.compensation || null,
                                jobType: val.jobType || (val.title.toLowerCase().includes('intern') ? 'internship' : 'full-time'),
                                rawDescription: val.description || `${val.title} at ${company}. Live startup role on Wellfound.`,
                                isRemote: isRemote
                            });
                        }
                    }
                    return results;
                }""")
                if isinstance(apollo_jobs, list):
                    for it in apollo_jobs:
                        if len(jobs) >= max_jobs:
                            break
                        jobs.append(it)
            except Exception as e:
                print(f"[StealthScraper] Apollo state evaluation note: {e}")

            # 2. Check if GraphQL interception yielded items
            for payload in intercepted_graphql:
                data_obj = payload.get("data", {})
                for top_key, top_val in data_obj.items():
                    listings = []
                    if isinstance(top_val, dict):
                        listings = top_val.get("listings") or top_val.get("results") or top_val.get("jobs") or []
                    elif isinstance(top_val, list):
                        listings = top_val
                    for item in listings:
                        if len(jobs) >= max_jobs:
                            break
                        title = item.get("title") or item.get("role")
                        company_obj = item.get("startup") or item.get("company", {})
                        company_name = company_obj.get("name") if isinstance(company_obj, dict) else "Startup"
                        slug = item.get("slug") or item.get("id")
                        url = f"https://wellfound.com/jobs/{slug}" if slug else target_url
                        salary = item.get("compensation") or item.get("salary")
                        
                        if title and company_name:
                            jobs.append({
                                "title": title,
                                "company": company_name,
                                "location": "Remote",
                                "url": url,
                                "salary": salary,
                                "rawDescription": f"{title} at {company_name}. Live startup role on Wellfound.",
                            })

            # DOM Scraping Fallback if GraphQL didn't yield
            if len(jobs) == 0:
                raw_links = await page.query_selector_all("a[href*='/jobs/']")
                for link_el in raw_links:
                    if len(jobs) >= max_jobs:
                        break
                    try:
                        href = await link_el.get_attribute("href")
                        if not href or any(skip in href for skip in ["/signup", "/faq", "/login"]) or href.rstrip("/").endswith("/jobs"):
                            continue
                        
                        raw_text = (await link_el.inner_text()).strip()
                        if not raw_text or len(raw_text) < 3 or "open position" in raw_text.lower():
                            continue

                        title = raw_text.split("\n")[0].strip()

                        # Try resolving company name from parent context
                        company = "Startup"
                        parent = await link_el.evaluate_handle("el => el.closest('div[class*=\"styles_jobListing\"], div[class*=\"styles_company\"], li, tr') || el.parentElement")
                        if parent:
                            comp_el = await parent.query_selector("a[href*='/company/'], h4, span[class*='company']")
                            if comp_el:
                                comp_text = (await comp_el.inner_text()).strip()
                                if comp_text:
                                    company = comp_text.split("\n")[0].strip()

                        full_url = href if href.startswith("http") else f"https://wellfound.com{href}"

                        jobs.append({
                            "title": title,
                            "company": company,
                            "location": "Remote",
                            "url": full_url,
                            "rawDescription": f"{title} at {company}. Live startup role on Wellfound.",
                        })
                    except Exception:
                        continue

        except Exception as e:
            print(f"[StealthScraper] Wellfound harvest exception: {e}")
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

    print(f"[StealthScraper] Successfully harvested {len(jobs)} jobs from Wellfound.")
    return jobs

async def harvest_jobright_jobs(
    query: str = "software engineer intern",
    max_jobs: int = 25,
) -> List[Dict[str, Any]]:
    """
    Harvests developer & internship jobs from Jobright AI using headless automation
    and search API interception.
    """
    jobs: List[Dict[str, Any]] = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-setuid-sandbox",
            ],
        )
        context = await browser.new_context(
            user_agent=USER_AGENTS[1],
            viewport={"width": 1280, "height": 800},
            locale="en-US",
        )

        page = await context.new_page()

        async def handle_response(response):
            try:
                if ("api" in response.url or "job" in response.url) and response.status == 200:
                    text = await response.text()
                    if text.startswith("{") or text.startswith("["):
                        data = json.loads(text)
                        items = data.get("jobs") or data.get("data") or data.get("results")
                        if isinstance(items, list):
                            for it in items:
                                if len(jobs) >= max_jobs:
                                    break
                                title = it.get("title") or it.get("job_title")
                                company = it.get("company") or it.get("company_name")
                                apply_url = it.get("apply_url") or it.get("url") or it.get("job_url")
                                loc = it.get("location") or "Remote"
                                if title and company:
                                    jobs.append({
                                        "title": title,
                                        "company": company,
                                        "location": loc,
                                        "url": apply_url or "https://jobright.ai",
                                        "rawDescription": f"{title} at {company}. Harvested from Jobright AI.",
                                    })
            except Exception:
                pass

        page.on("response", handle_response)

        import urllib.parse
        encoded_query = urllib.parse.quote(query or "software engineer intern")
        target_url = f"https://jobright.ai/jobs?query={encoded_query}"
        print(f"[StealthScraper] Navigating to {target_url}...")
        try:
            await page.goto(target_url, wait_until="domcontentloaded", timeout=25000)
            await asyncio.sleep(3.0)

            # Fallback DOM scrape if API didn't populate
            if len(jobs) == 0:
                raw_links = await page.query_selector_all("a[href*='/jobs/info/'], a[href*='/job/'], a[href*='/jobs/']")
                for link_el in raw_links:
                    if len(jobs) >= max_jobs:
                        break
                    try:
                        href = await link_el.get_attribute("href")
                        text = (await link_el.inner_text()).strip()
                        if not text or not href:
                            continue

                        lines = [line.strip() for line in text.split("\n") if line.strip()]
                        company = "Tech Startup"
                        title = text
                        if len(lines) >= 2:
                            company = lines[0].split("•")[0].strip()
                            title = lines[-1].strip()
                        elif "•" in text:
                            parts = text.split("•")
                            company = parts[0].strip()
                            title = parts[-1].strip()

                        full_url = f"https://jobright.ai{href}" if href.startswith("/") else href

                        jobs.append({
                            "title": title,
                            "company": company,
                            "location": "Remote",
                            "url": full_url,
                            "rawDescription": f"{title} at {company}. Harvested from Jobright AI.",
                        })
                    except Exception:
                        continue

        except Exception as e:
            print(f"[StealthScraper] Jobright harvest exception: {e}")
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

    print(f"[StealthScraper] Successfully harvested {len(jobs)} jobs from Jobright AI.")
    return jobs

async def harvest_jobs(
    source: str = "wellfound",
    query: str = "software engineer",
    remote_only: bool = True,
    max_jobs: int = 25,
) -> List[Dict[str, Any]]:
    """
    Main dispatch function for stealth scraping.
    """
    normalized_source = source.lower().strip()
    if normalized_source == "jobright":
        return await harvest_jobright_jobs(query=query, max_jobs=max_jobs)
    else:
        return await harvest_wellfound_jobs(query=query, remote_only=remote_only, max_jobs=max_jobs)
