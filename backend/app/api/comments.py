"""Visitor comments endpoints."""

from __future__ import annotations

from math import ceil
from typing import Literal

from fastapi import APIRouter, HTTPException, Query

from app.models import (
    CommentCreateRequest,
    CommentListResponse,
    CommentResponse,
    CommentVoteRequest,
)
from app.services.comments_store import comments_store

router = APIRouter()
PAGE_SIZE = 5


@router.get("/comments", response_model=CommentListResponse)
async def list_comments(
    sort: Literal["latest", "likest"] = Query(default="latest"),
    page: int = Query(default=1, ge=1),
) -> CommentListResponse:
    items, total_items = comments_store.list_comments(sort=sort, page=page, page_size=PAGE_SIZE)
    total_pages = max(1, ceil(total_items / PAGE_SIZE))
    return CommentListResponse(
        items=[CommentResponse(**item) for item in items],
        page=page,
        page_size=PAGE_SIZE,
        total_items=total_items,
        total_pages=total_pages,
        sort=sort,
    )


@router.post("/comments", response_model=CommentResponse)
async def create_comment(request: CommentCreateRequest) -> CommentResponse:
    comment = comments_store.create_comment(
        author=request.author,
        website_rating=request.website_rating,
        resume_rating=request.resume_rating,
        body=request.body,
    )
    return CommentResponse(**comment)


@router.post("/comments/{comment_id}/vote", response_model=CommentResponse)
async def vote_on_comment(comment_id: str, request: CommentVoteRequest) -> CommentResponse:
    comment = comments_store.vote(comment_id, request.direction)
    if comment is None:
        raise HTTPException(status_code=404, detail="Comment not found.")
    return CommentResponse(**comment)
