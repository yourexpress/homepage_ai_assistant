"""File-backed resume storage keeping the last three uploaded copies.

What it does:
    Manages resume file uploads in a dedicated directory, keeping at most
    three copies (oldest deleted first).  Provides helpers to retrieve
    the latest copy's metadata and file path.

Inputs:
    - Binary file content + original filename via ``save()``.
    - No input for ``latest()`` / ``latest_path()``.

Outputs:
    - ``save()``  → dict with ``filename`` and ``uploaded_at`` ISO string.
    - ``latest()`` → dict or ``None``.
    - ``latest_path()`` → ``Path`` or ``None``.

Common failure modes:
    - Data directory not writable → ``OSError`` propagated to caller.
    - No resume uploaded yet      → ``latest()`` returns ``None``.
"""

from __future__ import annotations

import json
import threading
import time
from pathlib import Path
from typing import Any

from app.config import settings

_MAX_COPIES = 3
_META_FILE = "resume_meta.json"
_ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx"}
_MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


class ResumeStore:
    """Thread-safe resume storage backed by the filesystem."""

    def __init__(self) -> None:
        self._lock = threading.RLock()

    @property
    def _dir(self) -> Path:
        return settings.data_dir_path / "resumes"

    @property
    def _meta_path(self) -> Path:
        return self._dir / _META_FILE

    def _ensure_dir(self) -> None:
        self._dir.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def save(self, content: bytes, original_filename: str) -> dict[str, Any]:
        """Persist a new resume, enforcing the three-copy retention policy.

        Returns metadata dict ``{ filename, uploaded_at }`` for the saved copy.
        Raises ``ValueError`` for disallowed extensions or oversized files.
        """
        ext = Path(original_filename).suffix.lower()
        if ext not in _ALLOWED_EXTENSIONS:
            raise ValueError(
                f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(_ALLOWED_EXTENSIONS))}"
            )
        if len(content) > _MAX_FILE_SIZE:
            raise ValueError(
                f"File too large ({len(content)} bytes). Maximum is {_MAX_FILE_SIZE} bytes."
            )

        with self._lock:
            self._ensure_dir()
            meta = self._load_meta()

            timestamp = int(time.time())
            # Use a counter that grows across the full lifetime of the meta list
            # to guarantee unique stored names even for rapid consecutive saves.
            seq = max((e.get("seq", 0) for e in meta), default=0) + 1 if meta else 1
            stored_name = f"resume_{timestamp}_{seq}{ext}"
            dest = self._dir / stored_name
            dest.write_bytes(content)

            entry: dict[str, Any] = {
                "filename": original_filename,
                "stored_name": stored_name,
                "seq": seq,
                "uploaded_at": time.strftime(
                    "%Y-%m-%dT%H:%M:%SZ", time.gmtime(timestamp)
                ),
            }
            meta.append(entry)

            # Enforce retention: keep only the newest _MAX_COPIES.
            while len(meta) > _MAX_COPIES:
                oldest = meta.pop(0)
                old_path = self._dir / oldest["stored_name"]
                if old_path.exists():
                    old_path.unlink()

            self._write_meta(meta)
            return {"filename": entry["filename"], "uploaded_at": entry["uploaded_at"]}

    def latest(self) -> dict[str, Any] | None:
        """Return metadata for the most recent resume, or ``None``."""
        with self._lock:
            meta = self._load_meta()
            if not meta:
                return None
            entry = meta[-1]
            return {"filename": entry["filename"], "uploaded_at": entry["uploaded_at"]}

    def latest_path(self) -> Path | None:
        """Return the filesystem path to the most recent resume, or ``None``."""
        with self._lock:
            meta = self._load_meta()
            if not meta:
                return None
            path = self._dir / meta[-1]["stored_name"]
            return path if path.exists() else None

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    def _load_meta(self) -> list[dict[str, Any]]:
        if not self._meta_path.exists():
            return []
        with open(self._meta_path, encoding="utf-8") as fh:
            data = json.load(fh)
        return data if isinstance(data, list) else []

    def _write_meta(self, meta: list[dict[str, Any]]) -> None:
        self._ensure_dir()
        with open(self._meta_path, "w", encoding="utf-8") as fh:
            json.dump(meta, fh, ensure_ascii=False, indent=2)


resume_store = ResumeStore()
