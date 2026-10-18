"""
Career Engine — Antigravity Agent Core Gateway (FastAPI)
========================================================
Exposes HTTP endpoints for Career Engine to query autonomous Antigravity agents.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import google.antigravity as agy

from python_agents.services.oracle_service import generate_screening_answer
from python_agents.services.self_healer import diagnose_provider, heal_provider
from python_agents.services.headless_applier import fill_application_form
from python_agents.services.resume_tailorer import tailor_resume_bullets

app = FastAPI(
    title="Career Engine — Antigravity Agent Core",
    version="1.0.0",
    description="Autonomous Agent Gateway powered by the Google Antigravity SDK."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Oracle Models
class OracleRequest(BaseModel):
    question: str
    company: Optional[str] = None
    jobTitle: Optional[str] = None
    jobDescription: Optional[str] = None
    profileContext: Optional[Dict[str, Any]] = None
    maxLength: Optional[int] = None

class OracleResponse(BaseModel):
    answer: str
    thoughts: List[str]
    success: bool

# 2. Healer Models
class HealRequest(BaseModel):
    provider: str
    dryRun: bool = False

# 3. Applier Models
class ApplyRequest(BaseModel):
    url: str
    candidateProfile: Optional[Dict[str, Any]] = None
    autoSubmit: bool = False

# 4. Tailor Models
class TailorRequest(BaseModel):
    jobDescription: str
    bullets: List[str]
    candidateSkills: Optional[List[str]] = None

@app.get("/")
async def root():
    return {
        "service": "Career Engine — Google Antigravity Agent Core",
        "status": "online",
        "documentation": "/docs",
        "health": "/health",
        "agents": ["oracle", "self_healer", "headless_applier", "resume_tailorer"]
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Career Engine Antigravity Agent Core",
        "sdk": getattr(agy, "__file__", "active"),
        "agents": ["oracle", "self_healer", "headless_applier", "resume_tailorer"]
    }

@app.post("/oracle/answer", response_model=OracleResponse)
async def api_oracle_answer(req: OracleRequest):
    try:
        result = await generate_screening_answer(
            question=req.question,
            company=req.company,
            job_title=req.jobTitle,
            job_description=req.jobDescription,
            profile_context=req.profileContext,
            max_length=req.maxLength,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/healer/diagnose")
async def api_healer_diagnose(req: HealRequest):
    try:
        return await diagnose_provider(req.provider)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/healer/heal")
async def api_healer_heal(req: HealRequest):
    try:
        return await heal_provider(req.provider, dry_run=req.dryRun)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/applier/fill")
async def api_applier_fill(req: ApplyRequest):
    try:
        return await fill_application_form(
            url=req.url,
            candidate_profile=req.candidateProfile,
            auto_submit=req.autoSubmit,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/tailor/bullets")
async def api_tailor_bullets(req: TailorRequest):
    try:
        return await tailor_resume_bullets(
            job_description=req.jobDescription,
            current_bullets=req.bullets,
            candidate_skills=req.candidateSkills,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import os
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    uvicorn.run("python_agents.main:app", host=host, port=port, reload=False)
