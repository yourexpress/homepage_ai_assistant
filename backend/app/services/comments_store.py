"""File-backed visitor comments storage."""

from __future__ import annotations

import json
import threading
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from app.config import settings


class CommentsStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()

    @property
    def path(self) -> Path:
        return settings.comments_path

    def _ensure_parent(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def _load_all(self) -> list[dict[str, Any]]:
        self._ensure_parent()
        if not self.path.exists():
            self._save_all([])
            return []
        with open(self.path, encoding="utf-8") as fh:
            data = json.load(fh)
        return data if isinstance(data, list) else []

    def _save_all(self, comments: list[dict[str, Any]]) -> None:
        self._ensure_parent()
        with open(self.path, "w", encoding="utf-8") as fh:
            json.dump(comments, fh, ensure_ascii=False, indent=2)

    def create_comment(self, author: str, website_rating: int, resume_rating: int, body: str) -> dict[str, Any]:
        with self._lock:
            comments = self._load_all()
            comment = {
                "id": uuid.uuid4().hex,
                "author": author,
                "website_rating": website_rating,
                "resume_rating": resume_rating,
                "body": body,
                "created_at": datetime.now(UTC).isoformat(),
                "upvotes": 0,
                "downvotes": 0,
            }
            comments.append(comment)
            self._save_all(comments)
            return _with_score(comment)

    def list_comments(self, *, sort: str, page: int, page_size: int) -> tuple[list[dict[str, Any]], int]:
        with self._lock:
            comments = [_with_score(comment) for comment in self._load_all()]
        if sort == "likest":
            comments.sort(key=lambda item: (item["score"], item["upvotes"], item["created_at"]), reverse=True)
        else:
            comments.sort(key=lambda item: item["created_at"], reverse=True)
        total_items = len(comments)
        start = (page - 1) * page_size
        end = start + page_size
        return comments[start:end], total_items

    def vote(self, comment_id: str, direction: str) -> dict[str, Any] | None:
        with self._lock:
            comments = self._load_all()
            for comment in comments:
                if comment.get("id") != comment_id:
                    continue
                if direction == "up":
                    comment["upvotes"] = int(comment.get("upvotes", 0)) + 1
                else:
                    comment["downvotes"] = int(comment.get("downvotes", 0)) + 1
                self._save_all(comments)
                return _with_score(comment)
        return None


def _with_score(comment: dict[str, Any]) -> dict[str, Any]:
    enriched = dict(comment)
    enriched["score"] = int(enriched.get("upvotes", 0)) - int(enriched.get("downvotes", 0))
    return enriched


comments_store = CommentsStore()
