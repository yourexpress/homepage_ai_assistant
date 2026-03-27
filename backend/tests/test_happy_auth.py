"""Unit tests for happy-mode auth helpers."""

from __future__ import annotations

from app.config import settings
from app.services import happy_auth


class TestHappyPrompt:
    def test_prompt_mentions_girlfriend_context(self, monkeypatch):
        monkeypatch.setattr(settings, "happy_mode_visitor_name_en", "Luna")
        monkeypatch.setattr(settings, "happy_mode_visitor_name_zh", "露娜")

        prompt = happy_auth.happy_prompt()

        assert "girlfriend" in prompt
        assert "Luna" in prompt
        assert "露娜" in prompt
        assert "Show Runyu Ma's love" in prompt


class TestHappyTokens:
    def test_token_is_bound_to_session(self, monkeypatch):
        monkeypatch.setattr(settings, "happy_mode_enabled", True)
        monkeypatch.setattr(settings, "happy_mode_access_code", "abc")
        monkeypatch.setattr(settings, "happy_mode_expected_answer", "yes")
        monkeypatch.setattr(settings, "happy_mode_secret", "secret")

        token = happy_auth.verify_answer("abc", "yes", "session-1")

        assert token
        assert happy_auth.token_is_valid(token, "session-1") is True
        assert happy_auth.token_is_valid(token, "session-2") is False
