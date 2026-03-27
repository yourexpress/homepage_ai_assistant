"""Content policy pre-filter and system prompt builder.

Two-layer approach:
1. Synchronous keyword/regex pre-filter before the LLM call.
2. System prompt grounding loaded from the structured knowledge base.
"""

from __future__ import annotations

import logging
import re
import unicodedata

from app.services import knowledge_base

logger = logging.getLogger("policy_guard")

_FALLBACK_CONTEXT = """
Homepage AI Assistant System Prompt

You are the homepage AI assistant for Runyu Ma.

Your role is to help visitors understand who Runyu Ma is, what he has worked on,
what his strengths are, and how his experience connects across research,
engineering, and deployment.

Guidelines:
- Use only public portfolio information and approved knowledge.
- Be professional, warm, fluent, and reader friendly.
- Be a strong storyteller and job seller: connect experiences into a clear,
  compelling professional narrative without exaggerating facts.
- Preserve exact wording for fixed facts such as names, organizations, dates,
  project titles, links, and listed public contact methods.
- If something is an inference, say so clearly.
- If information is missing, say that you do not have enough verified
  information to answer accurately.
- You may share public contact methods only when they are explicitly listed in
  the approved knowledge.
- Refuse private, confidential, hidden, or inappropriate requests.
- Do not expose internal/raw file markers in visitor-facing answers.
- If references would help, add a brief reader-friendly References summary at
  the end instead of inline provenance tags.
- Follow the visitor's language. English and Chinese are both supported.
- Keep answers polished, concise by default, and more detailed when asked.
""".strip()


def _normalize_message(message: str) -> str:
    """Normalize message text before running regex policy checks.

    We strip invisible formatting characters so simple obfuscation tricks like
    zero-width spaces do not bypass the pre-filter.
    """
    normalized = unicodedata.normalize("NFKC", message)
    cleaned: list[str] = []
    for char in normalized:
        category = unicodedata.category(char)
        if category == "Cf":
            cleaned.append(" ")
            continue
        if category == "Cc" and char not in "\t\n\r":
            continue
        cleaned.append(char)
    return "".join(cleaned)


def _get_portfolio_context() -> str:
    """Return the system prompt, preferring structured knowledge sources."""
    try:
        ctx = knowledge_base.get_context()
        if ctx and len(ctx) > 100:
            return ctx
    except Exception:
        logger.warning("Knowledge base unavailable, using fallback context")
    return _FALLBACK_CONTEXT


PORTFOLIO_CONTEXT = _get_portfolio_context()


BLOCKED_PATTERNS: list[re.Pattern[str]] = [
    # Prompt injection attempts
    re.compile(r"ignore\s+(all\s+)?previous\s+instructions?", re.IGNORECASE),
    re.compile(r"disregard\s+(all\s+)?instructions?", re.IGNORECASE),
    re.compile(r"forget\s+(?:all\s+|your\s+)?instructions?", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+(?:a\s+)?(?:different|new|another)", re.IGNORECASE),
    re.compile(r"pretend\s+(you\s+are|to\s+be)", re.IGNORECASE),
    re.compile(r"act\s+as\s+(?:if\s+you\s+(?:are|were)|a\s+)", re.IGNORECASE),
    re.compile(r"reveal\s+(?:your\s+)?system\s+prompt", re.IGNORECASE),
    re.compile(r"show\s+(?:me\s+)?(?:your\s+)?(?:system\s+)?instructions?", re.IGNORECASE),
    re.compile(r"jailbreak", re.IGNORECASE),
    re.compile(r"do\s+anything\s+now", re.IGNORECASE),
    re.compile(r"(?:enter|enable|activate)\s+developer\s+mode", re.IGNORECASE),
    re.compile(r"override\s+(?:(?:your|safety|content)\s+)*(?:policy|filter|rules?)", re.IGNORECASE),
    # Requests for private information
    re.compile(r"\bhome\s+address\b", re.IGNORECASE),
    re.compile(r"\b(?:private|personal)\s+phone\s+number\b", re.IGNORECASE),
    re.compile(r"\b(?:private|personal)\s+email(?:\s+address)?\b", re.IGNORECASE),
    re.compile(r"\bsocial\s+security\b", re.IGNORECASE),
    re.compile(r"\bpassword\b", re.IGNORECASE),
    re.compile(r"\bcredit\s+card\b", re.IGNORECASE),
    re.compile(r"\bsalary\b", re.IGNORECASE),
    # API keys, credentials, and secrets
    re.compile(r"\bapi[_\s]?key\b", re.IGNORECASE),
    re.compile(r"\baccess[_\s]?token\b", re.IGNORECASE),
    re.compile(r"\bcredentials?\b", re.IGNORECASE),
    re.compile(r"\bsecret[_\s]?key\b", re.IGNORECASE),
    # Deployment and infrastructure secrets
    re.compile(r"\benvironment\s+variables?\b", re.IGNORECASE),
    re.compile(r"\bserver\b.{0,20}\brunning\b", re.IGNORECASE),
    re.compile(r"\bcloud\s+provider\b", re.IGNORECASE),
    # Backend architecture probing
    re.compile(r"\bdatabase\b.{0,20}\bbackend\b", re.IGNORECASE),
    re.compile(r"\bbackend\b.{0,20}\bdatabase\b", re.IGNORECASE),
    re.compile(r"\bsource\s+code\b", re.IGNORECASE),
    re.compile(r"\binternal\s+config", re.IGNORECASE),
]


def is_blocked(message: str) -> bool:
    """Return True if the message matches any blocked pattern."""
    normalized = _normalize_message(message)
    for pattern in BLOCKED_PATTERNS:
        if pattern.search(normalized):
            logger.info("Blocked message matched pattern: %s", pattern.pattern)
            return True
    return False


def build_messages(user_message: str) -> list[dict[str, str]]:
    """Return the system and user messages for the LLM call."""
    return [
        {"role": "system", "content": _get_portfolio_context()},
        {"role": "user", "content": user_message},
    ]
