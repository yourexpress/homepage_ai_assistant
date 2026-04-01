"""Tests for resume upload/download endpoints and ResumeStore service."""

from __future__ import annotations

import io
from unittest.mock import patch

import pytest


# ---------------------------------------------------------------------------
# ResumeStore unit tests
# ---------------------------------------------------------------------------

class TestResumeStore:
    """Unit tests for the ``ResumeStore`` service."""

    def test_save_and_latest(self, tmp_path, monkeypatch):
        from app.config import settings
        monkeypatch.setattr(settings, "data_dir", str(tmp_path))

        from app.services.resume_store import ResumeStore
        store = ResumeStore()

        meta = store.save(b"%PDF-1.4 fake", "my_resume.pdf")
        assert meta["filename"] == "my_resume.pdf"
        assert "uploaded_at" in meta

        latest = store.latest()
        assert latest is not None
        assert latest["filename"] == "my_resume.pdf"

        path = store.latest_path()
        assert path is not None
        assert path.exists()

    def test_retention_keeps_only_three(self, tmp_path, monkeypatch):
        from app.config import settings
        monkeypatch.setattr(settings, "data_dir", str(tmp_path))

        from app.services.resume_store import ResumeStore
        store = ResumeStore()

        for i in range(5):
            store.save(b"%PDF-1.4 data", f"resume_{i}.pdf")

        # Only three files (plus meta JSON) should remain.
        resume_dir = tmp_path / "resumes"
        pdf_files = list(resume_dir.glob("resume_*.pdf"))
        assert len(pdf_files) == 3

        latest = store.latest()
        assert latest["filename"] == "resume_4.pdf"

    def test_rejects_unsupported_extension(self, tmp_path, monkeypatch):
        from app.config import settings
        monkeypatch.setattr(settings, "data_dir", str(tmp_path))

        from app.services.resume_store import ResumeStore
        store = ResumeStore()

        with pytest.raises(ValueError, match="Unsupported file type"):
            store.save(b"data", "readme.txt")

    def test_rejects_oversized_file(self, tmp_path, monkeypatch):
        from app.config import settings
        monkeypatch.setattr(settings, "data_dir", str(tmp_path))

        from app.services.resume_store import ResumeStore
        store = ResumeStore()

        with pytest.raises(ValueError, match="File too large"):
            store.save(b"x" * (10 * 1024 * 1024 + 1), "huge.pdf")

    def test_latest_returns_none_when_empty(self, tmp_path, monkeypatch):
        from app.config import settings
        monkeypatch.setattr(settings, "data_dir", str(tmp_path))

        from app.services.resume_store import ResumeStore
        store = ResumeStore()

        assert store.latest() is None
        assert store.latest_path() is None


# ---------------------------------------------------------------------------
# Admin resume upload endpoint tests
# ---------------------------------------------------------------------------

class TestAdminResumeUpload:
    """Integration tests for POST /api/admin/resume."""

    async def test_upload_requires_admin_key(self, client):
        response = await client.post(
            "/api/admin/resume",
            files={"file": ("resume.pdf", b"%PDF-1.4 data", "application/pdf")},
        )
        assert response.status_code in (401, 503)

    async def test_upload_and_retrieve(self, client, tmp_path, monkeypatch):
        from app.config import settings
        monkeypatch.setattr(settings, "admin_api_key", "secret-key")
        monkeypatch.setattr(settings, "data_dir", str(tmp_path))

        upload = await client.post(
            "/api/admin/resume",
            files={"file": ("resume.pdf", b"%PDF-1.4 data", "application/pdf")},
            headers={"X-Admin-Key": "secret-key"},
        )
        assert upload.status_code == 200
        data = upload.json()
        assert data["ok"] is True
        assert data["filename"] == "resume.pdf"
        assert "uploaded_at" in data

    async def test_upload_rejects_bad_extension(self, client, tmp_path, monkeypatch):
        from app.config import settings
        monkeypatch.setattr(settings, "admin_api_key", "secret-key")
        monkeypatch.setattr(settings, "data_dir", str(tmp_path))

        response = await client.post(
            "/api/admin/resume",
            files={"file": ("readme.txt", b"hello", "text/plain")},
            headers={"X-Admin-Key": "secret-key"},
        )
        assert response.status_code == 400
        assert "Unsupported" in response.json()["detail"]

    async def test_admin_latest_resume_info(self, client, tmp_path, monkeypatch):
        from app.config import settings
        monkeypatch.setattr(settings, "admin_api_key", "secret-key")
        monkeypatch.setattr(settings, "data_dir", str(tmp_path))

        # Before upload → no resume
        resp = await client.get(
            "/api/admin/resume/latest",
            headers={"X-Admin-Key": "secret-key"},
        )
        assert resp.status_code == 200
        assert resp.json()["resume"] is None

        # Upload
        await client.post(
            "/api/admin/resume",
            files={"file": ("cv.pdf", b"%PDF-1.4 data", "application/pdf")},
            headers={"X-Admin-Key": "secret-key"},
        )

        resp = await client.get(
            "/api/admin/resume/latest",
            headers={"X-Admin-Key": "secret-key"},
        )
        assert resp.status_code == 200
        assert resp.json()["resume"]["filename"] == "cv.pdf"


# ---------------------------------------------------------------------------
# Public resume download endpoint tests
# ---------------------------------------------------------------------------

class TestPublicResumeDownload:
    """Integration tests for GET /api/resume/latest and /api/resume/info."""

    async def test_download_404_when_none(self, client, tmp_path, monkeypatch):
        from app.config import settings
        monkeypatch.setattr(settings, "data_dir", str(tmp_path))

        response = await client.get("/api/resume/latest")
        assert response.status_code == 404

    async def test_info_when_none(self, client, tmp_path, monkeypatch):
        from app.config import settings
        monkeypatch.setattr(settings, "data_dir", str(tmp_path))

        response = await client.get("/api/resume/info")
        assert response.status_code == 200
        assert response.json()["available"] is False

    async def test_download_after_upload(self, client, tmp_path, monkeypatch):
        from app.config import settings
        monkeypatch.setattr(settings, "admin_api_key", "secret-key")
        monkeypatch.setattr(settings, "data_dir", str(tmp_path))

        await client.post(
            "/api/admin/resume",
            files={"file": ("resume.pdf", b"%PDF-1.4 data", "application/pdf")},
            headers={"X-Admin-Key": "secret-key"},
        )

        info = await client.get("/api/resume/info")
        assert info.status_code == 200
        assert info.json()["available"] is True
        assert info.json()["filename"] == "resume.pdf"

        download = await client.get("/api/resume/latest")
        assert download.status_code == 200
        assert download.content == b"%PDF-1.4 data"
