"""Integration tests for admin content editing, comments reader, and happy mode endpoints."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch


class TestAdminSiteContent:
    async def test_requires_admin_key(self, client):
        response = await client.get("/api/admin/site-content")
        assert response.status_code in (401, 503)

    async def test_load_and_update_site_content(self, client, tmp_path, monkeypatch):
        from app.config import settings

        monkeypatch.setattr(settings, "admin_api_key", "secret-key")
        monkeypatch.setattr(settings, "site_content_file", str(tmp_path / "site_content.json"))

        load_response = await client.get(
            "/api/admin/site-content",
            headers={"X-Admin-Key": "secret-key"},
        )
        assert load_response.status_code == 200
        content = load_response.json()["content"]
        content["hero_title"]["en"] = "Updated English title"

        with patch(
            "app.services.translation_service.translate_text",
            AsyncMock(return_value="更新后的中文标题"),
        ):
            save_response = await client.put(
                "/api/admin/site-content",
                headers={"X-Admin-Key": "secret-key"},
                json={"content": content},
            )

        assert save_response.status_code == 200
        saved = save_response.json()
        assert saved["content"]["hero_title"]["en"] == "Updated English title"
        assert saved["content"]["hero_title"]["zh"] == "更新后的中文标题"
        assert saved["sync_notes"]

    async def test_admin_comments_reader_returns_comments(self, client, tmp_path, monkeypatch):
        from app.config import settings

        monkeypatch.setattr(settings, "admin_api_key", "secret-key")
        monkeypatch.setattr(settings, "comments_file", str(tmp_path / "comments.json"))

        created = await client.post(
            "/api/comments",
            json={
                "author": "Visitor",
                "website_rating": 5,
                "resume_rating": None,
                "body": "Clear academic homepage.",
            },
        )
        assert created.status_code == 200

        response = await client.get(
            "/api/admin/comments?sort=latest&page=1",
            headers={"X-Admin-Key": "secret-key"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total_items"] == 1
        assert data["page_size"] == 20
        assert data["items"][0]["body"] == "Clear academic homepage."


    async def test_profile_override_fields_stored_and_returned(self, client, tmp_path, monkeypatch):
        from app.config import settings

        monkeypatch.setattr(settings, "admin_api_key", "secret-key")
        monkeypatch.setattr(settings, "site_content_file", str(tmp_path / "site_content.json"))

        load_response = await client.get(
            "/api/admin/site-content",
            headers={"X-Admin-Key": "secret-key"},
        )
        assert load_response.status_code == 200
        content = load_response.json()["content"]

        assert content["profile_name"] == {"en": "", "zh": ""}
        assert content["profile_headline"] == {"en": "", "zh": ""}
        assert content["profile_about_paragraphs"] == []
        assert content["profile_education"] == []
        assert content["profile_research_interests"] == []
        assert content["profile_contact_items"] == []

        content["profile_name"] = {"en": "Test Name", "zh": "测试名字"}
        content["profile_headline"] = {"en": "Test Headline", "zh": "测试头衔"}
        content["profile_education"] = [
            {
                "degree": {"en": "M.S. Computer Science", "zh": "计算机科学硕士"},
                "institution": {"en": "Test University", "zh": "测试大学"},
                "year": 2025,
            }
        ]
        content["profile_research_interests"] = [{"en": "AI Safety", "zh": "AI 安全"}]
        content["profile_contact_items"] = [
            {
                "label": {"en": "Email", "zh": "邮箱"},
                "value": {"en": "test@example.com", "zh": "test@example.com"},
                "href": "mailto:test@example.com",
            }
        ]

        with patch(
            "app.services.translation_service.translate_text",
            AsyncMock(return_value="翻译文本"),
        ):
            save_response = await client.put(
                "/api/admin/site-content",
                headers={"X-Admin-Key": "secret-key"},
                json={"content": content},
            )

        assert save_response.status_code == 200
        saved = save_response.json()["content"]
        assert saved["profile_name"]["en"] == "Test Name"
        assert saved["profile_education"][0]["degree"]["en"] == "M.S. Computer Science"
        assert saved["profile_research_interests"][0]["en"] == "AI Safety"
        assert saved["profile_contact_items"][0]["href"] == "mailto:test@example.com"


class TestHappyMode:
    async def test_wrong_code_returns_wrong_answer(self, client, monkeypatch):
        from app.config import settings

        monkeypatch.setattr(settings, "happy_mode_enabled", True)
        monkeypatch.setattr(settings, "happy_mode_access_code", "abc")

        response = await client.post(
            "/api/happy/challenge",
            json={"code": "wrong", "session_id": "session-1"},
        )
        assert response.status_code == 200
        assert response.json()["message"] == "wrong answer"

    async def test_correct_code_and_answer_returns_token(self, client, monkeypatch):
        from app.config import settings

        monkeypatch.setattr(settings, "happy_mode_enabled", True)
        monkeypatch.setattr(settings, "happy_mode_access_code", "abc")
        monkeypatch.setattr(settings, "happy_mode_question", "Do you love me?")
        monkeypatch.setattr(settings, "happy_mode_expected_answer", "yes")
        monkeypatch.setattr(settings, "happy_mode_secret", "secret")

        challenge = await client.post(
            "/api/happy/challenge",
            json={"code": "abc", "session_id": "session-1"},
        )
        assert challenge.status_code == 200
        assert challenge.json()["question"] == "Do you love me?"

        verify = await client.post(
            "/api/happy/verify",
            json={"code": "abc", "answer": "yes", "session_id": "session-1"},
        )
        assert verify.status_code == 200
        assert verify.json()["ok"] is True
        assert verify.json()["token"]
