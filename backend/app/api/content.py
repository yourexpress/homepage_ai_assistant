"""Public site-content and homepage data helpers."""

from __future__ import annotations

from fastapi import APIRouter

from app.config import settings
from app.models import PortfolioDataResponse, SiteContentResponse
from app.services.happy_auth import is_enabled as happy_mode_enabled
from app.services.knowledge_base import load_all
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
