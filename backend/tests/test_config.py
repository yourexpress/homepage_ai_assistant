"""Tests for the application configuration module.

These tests verify that ``app/config.py`` loads sensible defaults and
that configuration properties parse correctly.  They run without a
``.env`` file so they reflect the test-mode experience.

What this module covers:
    - ``Settings`` loads defaults without ``.env``
    - ``origins_list`` property parses comma-separated values
    - Default values match expected constants

What inputs it expects:
    No external inputs — tests use the ``Settings()`` constructor directly.

What outputs it returns:
    ``Settings`` instances with validated field values.

Common failure modes:
    - ``.env`` file present in ``backend/`` → may override defaults.
    - ``pydantic-settings`` version change → model_config may differ.

Tests that cover this module:
    This file IS the test coverage for ``app/config.py``.
"""

from __future__ import annotations

from app.config import Settings, settings


class TestSettingsDefaults:
    """Verify that Settings loads reasonable defaults without .env."""

    def test_settings_instantiates(self):
        s = Settings()
        assert s is not None

    def test_default_openai_model(self):
        s = Settings()
        assert s.openai_model == "gpt-4o-mini"

    def test_default_max_input_length(self):
        s = Settings()
        assert s.max_input_length == 1000

    def test_default_rate_limit_burst(self):
        s = Settings()
        assert s.rate_limit_burst == 10

    def test_default_rate_limit_refill_interval(self):
        s = Settings()
        assert s.rate_limit_refill_interval == 600

    def test_default_max_concurrent_requests(self):
        s = Settings()
        assert s.max_concurrent_requests == 10

    def test_default_trust_proxy_headers_false(self):
        s = Settings()
        assert s.trust_proxy_headers is False

    def test_default_app_version(self):
        s = Settings()
        assert s.app_version == "1.0.0"

    def test_default_happy_mode_visitor_names_are_empty(self):
        s = Settings()
        assert s.happy_mode_visitor_name_en == ""
        assert s.happy_mode_visitor_name_zh == ""


class TestOriginsListProperty:
    """Verify that origins_list parses the comma-separated allowed_origins."""

    def test_single_origin(self):
        s = Settings(allowed_origins="https://example.com")
        assert s.origins_list == ["https://example.com"]

    def test_multiple_origins(self):
        s = Settings(allowed_origins="https://a.com, https://b.com")
        assert s.origins_list == ["https://a.com", "https://b.com"]

    def test_empty_string_returns_empty_list(self):
        s = Settings(allowed_origins="")
        assert s.origins_list == []

    def test_whitespace_trimmed(self):
        s = Settings(allowed_origins="  https://a.com , https://b.com  ")
        assert s.origins_list == ["https://a.com", "https://b.com"]


class TestGlobalSingleton:
    """Verify the module-level settings singleton."""

    def test_global_settings_is_a_settings_instance(self):
        assert isinstance(settings, Settings)

    def test_global_settings_has_openai_key(self):
        assert hasattr(settings, "openai_api_key")
