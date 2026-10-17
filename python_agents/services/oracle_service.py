"""
Oracle Service — Antigravity Agent Screening Question Generator
===============================================================
"""

from typing import Dict, Any, Optional
from google.antigravity import Agent
from python_agents.config import get_oracle_agent_config

async def generate_screening_answer(
    question: str,
    company: Optional[str] = None,
    job_title: Optional[str] = None,
    job_description: Optional[str] = None,
    profile_context: Optional[Dict[str, Any]] = None,
    max_length: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Generates a grounded, high-impact screening answer using an Antigravity Agent.
    """
    profile_summary = ""
    if profile_context:
        full_name = profile_context.get("fullName", "Candidate")
        title = profile_context.get("title", "")
        skills = ", ".join(profile_context.get("skills", []) or [])
        projects = profile_context.get("projects", [])
        project_bullets = "\n".join([f"- {p.get('title')}: {p.get('description', '')}" for p in projects[:4]])
        
        profile_summary = f"""
Candidate Name: {full_name}
Target Title: {title}
Core Skills: {skills}
Verified Projects:
{project_bullets}
"""

    prompt = f"""
QUESTION TO ANSWER:
"{question}"

TARGET POSITION:
Company: {company or "Target Company"}
Role: {job_title or "Software Engineer / Technical Role"}
Job Context: {job_description or "Fast-paced technology role requiring strong problem solving."}

CANDIDATE CONTEXT:
{profile_summary or "High-velocity engineer with proven experience in TypeScript, Python, distributed systems, and modern web architectures."}

INSTRUCTIONS:
Write an authentic, highly convincing response directly answering the question.
- Format directly as the candidate's answer without preambles or meta commentary.
- Highlight demonstrable skills and enthusiasm for {company or 'the company'}.
{f'- Keep the answer under {max_length} characters.' if max_length else '- Keep to 1-2 focused paragraphs.'}
"""

    config = get_oracle_agent_config()
    thoughts = []
    
    async with Agent(config) as agent:
        response = await agent.chat(prompt)
        
        # Collect thoughts if streamed
        try:
            async for thought in response.thoughts:
                thoughts.append(str(thought))
        except Exception:
            pass

        # Collect response text
        tokens = []
        async for token in response:
            tokens.append(token)
            
        final_answer = "".join(tokens).strip()

    return {
        "answer": final_answer,
        "thoughts": thoughts,
        "success": True,
    }
