"""Protected admin endpoints for editable site content."""

from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException

from app.config import settings
from app.models import SiteContentResponse, SiteContentUpdateRequest, SiteContentUpdateResponse
from app.services.happy_auth import is_enabled as happy_mode_enabled
from app.services.site_content_store import site_content_store

router = APIRouter()


def _require_admin_key(x_admin_key: str | None) -> None:
    if not settings.admin_api_key:
        raise HTTPException(status_code=503, detail="Manager entrance is not configured.")
    if x_admin_key != settings.admin_api_key:
        raise HTTPException(status_code=401, detail="Invalid admin key.")


@router.get("/admin/site-content", response_model=SiteContentResponse)
async def get_admin_site_content(
    x_admin_key: str | None = Header(default=None, alias="X-Admin-Key"),
) -> SiteContentResponse:
    _require_admin_key(x_admin_key)
    return SiteContentResponse(
        content=site_content_store.load(),
        capabilities={
            "happy_mode_enabled": happy_mode_enabled(),
            "manager_enabled": True,
            "comments_enabled": True,
            "session_history_enabled": True,
        },
    )


@router.put("/admin/site-content", response_model=SiteContentUpdateResponse)
async def update_admin_site_content(
    request: SiteContentUpdateRequest,
    x_admin_key: str | None = Header(default=None, alias="X-Admin-Key"),
) -> SiteContentUpdateResponse:
    _require_admin_key(x_admin_key)
    content, notes = await site_content_store.update(request.content)
    return SiteContentUpdateResponse(content=content, sync_notes=notes)
