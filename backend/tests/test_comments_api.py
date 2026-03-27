"""Integration tests for visitor comments endpoints."""

from __future__ import annotations

from pathlib import Path


class TestCommentsApi:
    async def test_create_and_list_comments(self, client, tmp_path, monkeypatch):
        from app.config import settings

        monkeypatch.setattr(settings, "comments_file", str(tmp_path / "comments.json"))

        response = await client.post(
            "/api/comments",
            json={
                "author": "Visitor",
                "website_rating": 5,
                "resume_rating": 4,
                "body": "Clean site and clear profile story.",
            },
        )
        assert response.status_code == 200
        created = response.json()
        assert created["author"] == "Visitor"
        assert created["score"] == 0

        listing = await client.get("/api/comments?sort=latest&page=1")
        assert listing.status_code == 200
        data = listing.json()
        assert data["page_size"] == 5
        assert data["total_items"] == 1
        assert data["items"][0]["body"] == "Clean site and clear profile story."

    async def test_vote_updates_score(self, client, tmp_path, monkeypatch):
        from app.config import settings

        monkeypatch.setattr(settings, "comments_file", str(tmp_path / "comments.json"))

        created = await client.post(
            "/api/comments",
            json={
                "author": "Visitor",
                "website_rating": 5,
                "resume_rating": 5,
                "body": "Strong presentation.",
            },
        )
        comment_id = created.json()["id"]

        voted = await client.post(
            f"/api/comments/{comment_id}/vote",
            json={"direction": "up"},
        )
        assert voted.status_code == 200
        assert voted.json()["upvotes"] == 1
        assert voted.json()["score"] == 1
