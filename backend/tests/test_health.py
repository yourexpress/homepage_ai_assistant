"""Tests for GET /api/health and GET /api/readiness endpoints.

Written *before* implementation (test-first / TDD).

Test matrix (from API_DESIGN.md Appendix A):

| Test                                           | Purpose                                    |
|------------------------------------------------|--------------------------------------------|
| test_health_returns_200                        | Liveness probe responds                    |
| test_health_returns_ok_status                  | Status field is "ok"                       |
| test_health_includes_version                   | Version field is present                   |
| test_readiness_returns_200                     | Readiness probe responds                   |
| test_readiness_checks_knowledge_base           | Knowledge check is "ok" with valid files   |
| test_readiness_degraded_without_knowledge      | Knowledge check degrades gracefully        |
| test_readiness_includes_all_checks             | All expected check keys are present        |
"""

from __future__ import annotations

from unittest.mock import patch

import pytest

# ------------------------------------------------------------------ Health ---


class TestHealth:
    """Liveness probe: GET /api/health."""

    @pytest.mark.anyio
    async def test_health_returns_200(self, client):
        resp = await client.get("/api/health")
        assert resp.status_code == 200

    @pytest.mark.anyio
    async def test_health_returns_ok_status(self, client):
        data = (await client.get("/api/health")).json()
        assert data["status"] == "ok"

    @pytest.mark.anyio
    async def test_health_includes_version(self, client):
        data = (await client.get("/api/health")).json()
        assert "version" in data
        assert isinstance(data["version"], str)
        assert len(data["version"]) > 0


# --------------------------------------------------------------- Readiness ---


class TestReadiness:
    """Readiness probe: GET /api/readiness."""

    @pytest.mark.anyio
    async def test_readiness_returns_200(self, client):
        resp = await client.get("/api/readiness")
        assert resp.status_code == 200

    @pytest.mark.anyio
    async def test_readiness_checks_knowledge_base(self, client):
        """With real knowledge files loaded, knowledge_base check is 'ok'."""
        data = (await client.get("/api/readiness")).json()
        assert data["checks"]["knowledge_base"] == "ok"

    @pytest.mark.anyio
    async def test_readiness_degraded_without_knowledge(self, client):
        """When knowledge context is very short, status degrades gracefully."""
        with patch(
            "app.api.health.get_context", return_value=""
        ):
            data = (await client.get("/api/readiness")).json()
            assert data["checks"]["knowledge_base"] in ("degraded", "unavailable")
            assert data["status"] != "ok"

    @pytest.mark.anyio
    async def test_readiness_includes_all_checks(self, client):
        """Response contains all expected check keys."""
        data = (await client.get("/api/readiness")).json()
        assert "knowledge_base" in data["checks"]
        assert "llm_configured" in data["checks"]

    @pytest.mark.anyio
    async def test_readiness_includes_version(self, client):
        data = (await client.get("/api/readiness")).json()
        assert "version" in data
        assert isinstance(data["version"], str)

    @pytest.mark.anyio
    async def test_readiness_knowledge_exception_handled(self, client):
        """If knowledge loading raises, check is 'unavailable'."""
        with patch(
            "app.api.health.get_context",
            side_effect=RuntimeError("disk error"),
        ):
            data = (await client.get("/api/readiness")).json()
            assert data["checks"]["knowledge_base"] == "unavailable"
            assert data["status"] != "ok"
