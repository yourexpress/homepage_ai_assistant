"""Integration tests for public site-content endpoint."""

from __future__ import annotations

import json

from app.services import knowledge_base


def _write_knowledge_file(directory, name, payload):
    (directory / name).write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")


class TestContentApi:
    async def test_content_includes_feedback_sections(self, client, tmp_path, monkeypatch):
        from app.config import settings

        monkeypatch.setattr(settings, "site_content_file", str(tmp_path / "site_content.json"))

        response = await client.get("/api/content")
        assert response.status_code == 200

        data = response.json()
        content = data["content"]

        assert content["about_title"]["en"] == "Brief introduction"
        assert content["section_comments_title"]["en"] == "Share feedback"
        assert content["section_comments_body"]["en"] == "Leave a short note about the site or profile presentation."
        assert content["contact_items"][0]["href"] == "mailto:rma5@gmu.edu"
        assert data["capabilities"]["session_history_enabled"] is True

    async def test_portfolio_endpoint_handles_missing_private_knowledge(self, client, tmp_path, monkeypatch):
        monkeypatch.setattr(knowledge_base, "_KNOWLEDGE_DIR", tmp_path)
        knowledge_base._cached_context = None

        response = await client.get("/api/portfolio")
        assert response.status_code == 200

        data = response.json()
        assert data["profile"] == {}
        assert data["experience"] == {}
        assert data["projects"] == {}
        assert data["publications"] == {}

    async def test_portfolio_endpoint_returns_runtime_knowledge(self, client, tmp_path, monkeypatch):
        knowledge_dir = tmp_path / "knowledge"
        knowledge_dir.mkdir()
        _write_knowledge_file(
            knowledge_dir,
            "profile.json",
            {
                "name": {"en": "Runyu Ma", "zh": "马润宇"},
                "headline": {"en": "AI Engineer", "zh": "AI 工程师"},
                "education": [],
                "skills": [],
            },
        )
        _write_knowledge_file(knowledge_dir, "experience.json", {"positions": []})
        _write_knowledge_file(
            knowledge_dir,
            "projects.json",
            {
                "projects": [
                    {
                        "name": {"en": "Latency Lab", "zh": "延迟实验室"},
                        "description": {"en": "Inference tooling", "zh": "推理工具"},
                        "technologies": ["Python"],
                        "status": "active",
                    }
                ]
            },
        )
        _write_knowledge_file(knowledge_dir, "publications.json", {"publications": []})
        _write_knowledge_file(knowledge_dir, "faq.json", {"entries": []})

        monkeypatch.setattr(knowledge_base, "_KNOWLEDGE_DIR", knowledge_dir)
        knowledge_base._cached_context = None

        response = await client.get("/api/portfolio")
        assert response.status_code == 200

        data = response.json()
        assert data["profile"]["name"]["en"] == "Runyu Ma"
        assert data["projects"]["projects"][0]["name"]["en"] == "Latency Lab"
