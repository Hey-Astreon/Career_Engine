"""
Self-Healing Scraper Service — Antigravity Agent Code Resilience
================================================================
Monitors provider health and autonomously patches broken selectors using the Antigravity Agent.
"""

import os
import sys
import asyncio
import httpx
from pathlib import Path
from typing import Dict, Any, Optional
from dotenv import load_dotenv

# Automatically load environment variables from project root .env
_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=_env_path)

from google.antigravity import Agent, CapabilitiesConfig, LocalAgentConfig
from python_agents.config import HEALER_SYSTEM_INSTRUCTIONS

# Registered key providers and their inspection targets
PROVIDER_ENDPOINTS = {
    "ASTRA": "https://useastra.in/jobs/location/remote",
    "SIMPLIFY": "https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/.github/scripts/listings.json",
    "NODESK": "https://nodesk.co/remote-jobs/index.xml",
    "INTERN_LIST": "https://www.intern-list.com/swe-intern-list",
}

async def diagnose_provider(provider_key: str) -> Dict[str, Any]:
    """Tests the live endpoint for a provider."""
    endpoint = PROVIDER_ENDPOINTS.get(provider_key.upper())
    if not endpoint:
        return {"provider": provider_key, "healthy": False, "error": "Unknown provider key"}

    async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
        try:
            res = await client.get(endpoint, headers={"User-Agent": "CareerEngine-HealthCheck/1.0"})
            healthy = res.status_code == 200 and len(res.text) > 200
            return {
                "provider": provider_key,
                "endpoint": endpoint,
                "status_code": res.status_code,
                "healthy": healthy,
                "content_preview_len": len(res.text),
            }
        except Exception as e:
            return {
                "provider": provider_key,
                "endpoint": endpoint,
                "healthy": False,
                "error": str(e),
            }

async def heal_provider(provider_key: str, dry_run: bool = False) -> Dict[str, Any]:
    """
    Spawns an Antigravity Agent with code-editing tools to diagnose and patch broken scraper code.
    """
    diag = await diagnose_provider(provider_key)
    if diag["healthy"] and not dry_run:
        return {
            "provider": provider_key,
            "status": "HEALTHY",
            "message": "Endpoint is currently healthy and responding normally.",
            "diagnostics": diag,
        }

    provider_file = f"src/lib/providers/{provider_key.lower()}.ts"
    test_file = f"tests/{provider_key.lower()}-provider.test.ts"

    prompt = f"""
AUTONOMOUS HEALING TASK FOR: {provider_key}
Target Provider Code: {provider_file}
Target Test Suite: {test_file}
Endpoint: {diag.get('endpoint')}
Health Status: {diag}

Instructions:
1. Inspect the provider code in `{provider_file}`.
2. Verify why the parser is having issues with the endpoint structure.
3. If selectors or URL parameters need updates, propose and verify the fix.
4. Run `npm test {test_file}` to verify tests pass cleanly.
5. Report the exact root cause and healing resolution.
"""

    config = LocalAgentConfig(
        system_instructions=HEALER_SYSTEM_INSTRUCTIONS,
        capabilities=CapabilitiesConfig(),
        api_key=os.environ.get("GEMINI_API_KEY"),
    )

    thoughts = []
    tokens = []

    async with Agent(config) as agent:
        response = await agent.chat(prompt)
        try:
            async for thought in response.thoughts:
                thoughts.append(str(thought))
        except Exception:
            pass

        async for token in response:
            tokens.append(token)

    return {
        "provider": provider_key,
        "status": "HEALED" if not dry_run else "DRY_RUN_COMPLETE",
        "report": "".join(tokens).strip(),
        "thoughts": thoughts,
        "diagnostics": diag,
    }

if __name__ == "__main__":
    provider = sys.argv[1] if len(sys.argv) > 1 else "ASTRA"
    dry = "--dry-run" in sys.argv
    print(f"[Self-Healer] Running diagnostics on {provider} (dry_run={dry})...")
    res = asyncio.run(heal_provider(provider, dry_run=dry))
    print(f"[Self-Healer] Result: {res['status']}")
    print(res.get("message") or res.get("report"))
