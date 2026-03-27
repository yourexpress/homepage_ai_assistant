"""Public site-content and visitor comments helpers."""

from __future__ import annotations

from fastapi import APIRouter

from app.config import settings
from app.models import SiteContentResponse
from app.services.happy_auth import is_enabled as happy_mode_enabled
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
