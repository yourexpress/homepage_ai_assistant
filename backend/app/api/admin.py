"""Protected admin endpoints for editable site content and owner-only readers."""

from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException

from app.config import settings
from math import ceil
from typing import Literal

from fastapi import Query

from app.models import (
    CommentListResponse,
    CommentResponse,
    SiteContentResponse,
    SiteContentUpdateRequest,
    SiteContentUpdateResponse,
)
from app.services.comments_store import comments_store
from app.services.happy_auth import is_enabled as happy_mode_enabled
from app.services.site_content_store import site_content_store

router = APIRouter()
ADMIN_COMMENTS_PAGE_SIZE = 20


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


@router.get("/admin/comments", response_model=CommentListResponse)
async def get_admin_comments(
    sort: Literal["latest", "likest"] = Query(default="latest"),
    page: int = Query(default=1, ge=1),
    x_admin_key: str | None = Header(default=None, alias="X-Admin-Key"),
) -> CommentListResponse:
    _require_admin_key(x_admin_key)
    items, total_items = comments_store.list_comments(
        sort=sort,
        page=page,
        page_size=ADMIN_COMMENTS_PAGE_SIZE,
    )
    total_pages = max(1, ceil(total_items / ADMIN_COMMENTS_PAGE_SIZE))
    return CommentListResponse(
        items=[CommentResponse(**item) for item in items],
        page=page,
        page_size=ADMIN_COMMENTS_PAGE_SIZE,
        total_items=total_items,
        total_pages=total_pages,
        sort=sort,
    )
