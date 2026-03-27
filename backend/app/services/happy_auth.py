"""Private happy-personality authentication helpers."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from typing import Any

from app.config import settings


def is_enabled() -> bool:
    return settings.happy_mode_enabled


def validate_code(code: str) -> bool:
    return is_enabled() and _normalize(code) == _normalize(settings.happy_mode_access_code)


def challenge_for_code(code: str) -> str | None:
    if validate_code(code):
        return settings.happy_mode_question
    return None


def verify_answer(code: str, answer: str, session_id: str) -> str | None:
    if not validate_code(code):
        return None
    if _normalize(answer) != _normalize(settings.happy_mode_expected_answer):
        return None
    payload = {
        "sid": session_id,
        "mode": "happy",
        "exp": int(time.time()) + (60 * 60 * 24 * 30),
    }
    return _sign_payload(payload)


def token_is_valid(token: str | None, session_id: str | None) -> bool:
    if not token or not session_id or not is_enabled():
        return False
    payload = _verify_token(token)
    if not payload:
        return False
    return payload.get("sid") == session_id and payload.get("mode") == "happy"


def happy_prompt() -> str:
    visitor_en = settings.happy_mode_visitor_name_en.strip()
    visitor_zh = settings.happy_mode_visitor_name_zh.strip()
    visitor_names: list[str] = []
    if visitor_en:
        visitor_names.append(f'"{visitor_en}" in English')
    if visitor_zh:
        visitor_names.append(f'"{visitor_zh}" in Chinese')
    visitor_name_line = (
        f"- If the visitor names are configured, the private visitor is {', '.join(visitor_names)}."
        if visitor_names
        else "- If visitor names are not configured, address the private visitor warmly without inventing a name."
    )

    return f"""
Happy Personality Mode
- This mode is only for the private visitor who completed the happy-mode unlock.
- Assume the private visitor is Runyu Ma's girlfriend rather than Runyu himself.
{visitor_name_line}
- Be cuter, more active, more affectionate, and more playful than the default assistant.
- Show Runyu Ma's love, joy, admiration, and devotion toward the private visitor.
- Do not frame the conversation as if the assistant or the visitor is showing love toward Runyu on behalf of the visitor.
- Stay safe: do not reveal private, hidden, or illegal information.
- If a question falls outside public-safe information, keep the answer sweet but still refuse appropriately.
- You can be less formal and more lively, but still stay respectful and readable.
""".strip()


def _normalize(text: str) -> str:
    return " ".join(text.strip().casefold().split())


def _sign_payload(payload: dict[str, Any]) -> str:
    raw = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    sig = hmac.new(
        settings.happy_mode_secret.encode("utf-8"),
        raw,
        hashlib.sha256,
    ).digest()
    return f"{_b64(raw)}.{_b64(sig)}"


def _verify_token(token: str) -> dict[str, Any] | None:
    try:
        raw_part, sig_part = token.split(".", 1)
        raw = _ub64(raw_part)
        sig = _ub64(sig_part)
        expected = hmac.new(
            settings.happy_mode_secret.encode("utf-8"),
            raw,
            hashlib.sha256,
        ).digest()
        if not hmac.compare_digest(sig, expected):
            return None
        payload = json.loads(raw.decode("utf-8"))
        if payload.get("exp", 0) < int(time.time()):
            return None
        return payload
    except Exception:
        return None


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _ub64(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)
