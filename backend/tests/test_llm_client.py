"""Unit tests for the LLM client factory (_get_client)."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

import app.services.llm_client as llm_client_module
from app.services.llm_client import _get_client


@pytest.fixture(autouse=True)
def reset_client():
    """Reset the global client singleton before and after each test."""
    llm_client_module._client = None
    yield
    llm_client_module._client = None


class TestGetClient:
    def test_creates_client_with_api_key_only_when_base_url_empty(self, monkeypatch):
        monkeypatch.setattr(llm_client_module.settings, "openai_api_key", "my-key")
        monkeypatch.setattr(llm_client_module.settings, "openai_base_url", "")

        with patch("app.services.llm_client.AsyncOpenAI") as mock_cls:
            mock_cls.return_value = MagicMock()
            _get_client()

        mock_cls.assert_called_once_with(api_key="my-key")

    def test_creates_client_with_base_url_when_configured(self, monkeypatch):
        url = "https://generativelanguage.googleapis.com/v1beta/openai/"
        monkeypatch.setattr(llm_client_module.settings, "openai_api_key", "gemini-key")
        monkeypatch.setattr(llm_client_module.settings, "openai_base_url", url)

        with patch("app.services.llm_client.AsyncOpenAI") as mock_cls:
            mock_cls.return_value = MagicMock()
            _get_client()

        mock_cls.assert_called_once_with(api_key="gemini-key", base_url=url)

    def test_base_url_kwarg_absent_when_empty(self, monkeypatch):
        monkeypatch.setattr(llm_client_module.settings, "openai_api_key", "key")
        monkeypatch.setattr(llm_client_module.settings, "openai_base_url", "")

        with patch("app.services.llm_client.AsyncOpenAI") as mock_cls:
            mock_cls.return_value = MagicMock()
            _get_client()

        _, kwargs = mock_cls.call_args
        assert "base_url" not in kwargs

    def test_returns_singleton(self, monkeypatch):
        monkeypatch.setattr(llm_client_module.settings, "openai_api_key", "key")
        monkeypatch.setattr(llm_client_module.settings, "openai_base_url", "")

        with patch("app.services.llm_client.AsyncOpenAI") as mock_cls:
            mock_cls.return_value = MagicMock()
            c1 = _get_client()
            c2 = _get_client()

        assert c1 is c2
        mock_cls.assert_called_once()
