"""Integration tests for public site-content endpoint."""

from __future__ import annotations


class TestContentApi:
    async def test_content_includes_profile_sections(self, client, tmp_path, monkeypatch):
        from app.config import settings

        monkeypatch.setattr(settings, "site_content_file", str(tmp_path / "site_content.json"))

        response = await client.get("/api/content")
        assert response.status_code == 200

        data = response.json()
        content = data["content"]

        assert content["about_title"]["en"] == "About me"
        assert len(content["about_paragraphs"]) == 2
        assert len(content["research_items"]) >= 4
        assert content["tools_items"][0]["href"] == "metrics.html"
        assert content["contact_items"][0]["href"] == "mailto:rma5@gmu.edu"
        assert data["capabilities"]["session_history_enabled"] is True

    async def test_portfolio_endpoint_returns_public_sections(self, client):
        response = await client.get("/api/portfolio")
        assert response.status_code == 200

        data = response.json()
        assert "profile" in data
        assert "experience" in data
        assert "projects" in data
        assert "publications" in data
