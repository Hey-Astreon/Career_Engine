"""
Deep Resume Tailorer & ATS Optimizer — Antigravity Agent Core
=============================================================
Rewrites candidate bullet points and aligns technical keywords to target job descriptions.
"""

import os
import sys
import asyncio
from pathlib import Path
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

# Automatically load environment variables from project root .env
_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=_env_path)

from google.antigravity import Agent, LocalAgentConfig, CapabilitiesConfig

TAILOR_SYSTEM_INSTRUCTIONS = """You are the Senior Staff ATS Resume Optimizer for Career Engine.
Your purpose is to deeply analyze a target job description and tailor candidate project and experience bullet points
to maximize ATS relevance, keyword density, and human recruiter impact.

RULES:
1. Use the STAR (Situation, Task, Action, Result) and Google X-Y-Z formula: "Accomplished [X], as measured by [Y], by doing [Z]".
2. Begin every bullet with a high-impact active verb (e.g., Engineered, Architected, Spearheaded, Accelerated, Streamlined).
3. Seamlessly weave in relevant keywords from the job description (frameworks, databases, protocols, testing tools).
4. Strictly NO hallucinating metrics or technologies not present in the candidate's background.
5. Provide a calculated ATS Match Score (0-100) and actionable keyword breakdown.
"""

async def tailor_resume_bullets(
    job_description: str,
    current_bullets: List[str],
    candidate_skills: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Analyzes job description and transforms candidate resume bullets using an Antigravity Agent.
    """
    bullets_text = "\n".join([f"- {b}" for b in current_bullets])
    skills_text = ", ".join(candidate_skills or [])

    prompt = f"""
TARGET JOB DESCRIPTION:
{job_description}

CANDIDATE SKILLS:
{skills_text or "TypeScript, Next.js, Python, PostgreSQL, Redis, Docker, Microservices, CI/CD, Distributed Systems"}

EXISTING RESUME BULLETS:
{bullets_text}

TASK:
1. Identify the top 5 essential keywords/skills required by this job description.
2. Rewrite each resume bullet to highlight those keywords and elevate technical impact.
3. Calculate an estimated ATS match score before and after.

Output your response cleanly formatted as:
### Key Technical Signals
- [List 5 key skills/signals]

### Tailored Bullet Points
- [Tailored Bullet 1]
- [Tailored Bullet 2]
- [Tailored Bullet 3]

### ATS Match Assessment
Before: [Score]% | After: [Score]%
Summary: [1 sentence summary of improvements]
"""

    config = LocalAgentConfig(
        system_instructions=TAILOR_SYSTEM_INSTRUCTIONS,
        capabilities=CapabilitiesConfig(),
        api_key=os.environ.get("GEMINI_API_KEY"),
    )

    tokens = []
    thoughts = []

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
        "tailored_output": "".join(tokens).strip(),
        "thoughts": thoughts,
        "success": True,
    }

if __name__ == "__main__":
    sample_jd = "Seeking a Software Engineer with expertise in distributed microservices, TypeScript, Go, and high-throughput Kafka / Redis pipelines."
    sample_bullets = [
        "Worked on backend APIs using TypeScript and Express.",
        "Managed database queries and caching with Redis.",
        "Created CI/CD pipeline with GitHub Actions."
    ]
    print("[Resume Tailorer] Running sample tailoring task...")
    res = asyncio.run(tailor_resume_bullets(sample_jd, sample_bullets))
    print("\n" + res["tailored_output"])
