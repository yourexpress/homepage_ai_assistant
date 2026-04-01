"""Public site-content and homepage data helpers."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.config import settings
from app.models import PortfolioDataResponse, SiteContentResponse
from app.services.happy_auth import is_enabled as happy_mode_enabled
from app.services.knowledge_base import load_all
from app.services.resume_store import resume_store
from app.services.site_content_store import site_content_store

router = APIRouter()


@router.get("/content", response_model=SiteContentResponse)
async def get_site_content() -> SiteContentResponse:
    return SiteContentResponse(
        content=site_content_store.load(),
        capabilities={
            "happy_mode_enabled": happy_mode_enabled(),
            "manager_enabled": bool(settings.admin_api_key),
            "comments_enabled": True,
            "session_history_enabled": True,
        },
    )


@router.get("/portfolio", response_model=PortfolioDataResponse)
async def get_portfolio_data() -> PortfolioDataResponse:
    sources = load_all()
    return PortfolioDataResponse(
        profile=sources.get("profile.json", {}),
        experience=sources.get("experience.json", {}),
        projects=sources.get("projects.json", {}),
        publications=sources.get("publications.json", {}),
    )


@router.get("/resume/latest")
async def download_latest_resume() -> FileResponse:
    """Serve the most recent resume for public download."""
    meta = resume_store.latest()
    path = resume_store.latest_path()
    if meta is None or path is None:
        raise HTTPException(status_code=404, detail="No resume uploaded yet.")
    return FileResponse(
        path=str(path),
        filename=meta["filename"],
        media_type="application/octet-stream",
    )


@router.get("/resume/info")
async def resume_info() -> dict:
    """Return metadata for the latest uploaded resume (public)."""
    meta = resume_store.latest()
    if meta is None:
        return {"available": False}
    return {"available": True, **meta}
