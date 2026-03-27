"""Structured knowledge loader and system prompt builder."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger("knowledge_base")

_SUPPORTED_LANGS: tuple[str, ...] = ("en", "zh")
_KNOWLEDGE_DIR = Path(__file__).resolve().parent.parent.parent / "knowledge"

_SOURCE_FILES: list[str] = [
    "profile.json",
    "experience.json",
    "projects.json",
    "publications.json",
    "faq.json",
]


def _load_json(filename: str) -> dict[str, Any]:
    """Load and parse a single JSON knowledge file."""
    path = _KNOWLEDGE_DIR / filename
    if not path.exists():
        logger.warning("Knowledge file not found: %s", path)
        return {}
    try:
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)
        if not isinstance(data, dict):
            logger.warning("Knowledge file %s is not a JSON object", filename)
            return {}
        return data
    except (json.JSONDecodeError, OSError) as exc:
        logger.warning("Failed to load %s: %s", filename, exc)
        return {}


def load_all() -> dict[str, dict[str, Any]]:
    """Load every registered knowledge file and return a mapping."""
    result: dict[str, dict[str, Any]] = {}
    for name in _SOURCE_FILES:
        result[name] = _load_json(name)
    return result


def _localized_parts(value: Any) -> list[str]:
    """Return normalized text variants for a plain or localized string value."""
    if isinstance(value, str):
        text = value.strip()
        return [text] if text else []
    if isinstance(value, dict):
        parts: list[str] = []
        for lang in _SUPPORTED_LANGS:
            text = value.get(lang)
            if isinstance(text, str):
                stripped = text.strip()
                if stripped and stripped not in parts:
                    parts.append(stripped)
        return parts
    return []


def _format_localized_text(value: Any) -> str:
    """Render a plain string or ``{"en": ..., "zh": ...}`` object."""
    return " / ".join(_localized_parts(value))


def _format_localized_list(items: Any) -> str:
    """Render a list of plain/localized strings into a comma-separated line."""
    if not isinstance(items, list):
        return ""
    rendered = [_format_localized_text(item) for item in items]
    return ", ".join(text for text in rendered if text)


def _render_contact_line(contact: dict[str, Any]) -> str:
    """Render a single public contact entry."""
    label = _format_localized_text(contact.get("label")) or contact.get("type", "Contact")
    value = str(contact.get("value", "")).strip()
    note = _format_localized_text(contact.get("note"))
    suffix = f" ({note})" if note else ""
    return f"- {label}: {value}{suffix}" if value else ""


def _render_profile(data: dict[str, Any]) -> str:
    """Render profile.json into a prompt fragment."""
    if not data:
        return ""
    lines: list[str] = []
    if name := _format_localized_text(data.get("name")):
        lines.append(f"Name: {name}")
    if headline := _format_localized_text(data.get("headline")):
        lines.append(f"Headline: {headline}")
    for edu in data.get("education", []):
        degree = _format_localized_text(edu.get("degree"))
        institution = _format_localized_text(edu.get("institution"))
        lines.append(f"Education: {degree} from {institution} ({edu.get('year', '')})")
    if loc := _format_localized_text(data.get("location_public")):
        lines.append(f"Location: {loc}")
    for field in ("research_interests", "skills"):
        items = _format_localized_list(data.get(field, []))
        if items:
            label = field.replace("_", " ").title()
            lines.append(f"{label}: {items}")
    links = data.get("links", {})
    for label, url in links.items():
        lines.append(f"Link ({label}): {url}")
    contacts = data.get("public_contacts", [])
    rendered_contacts = [
        _render_contact_line(contact)
        for contact in contacts
        if isinstance(contact, dict)
    ]
    rendered_contacts = [line for line in rendered_contacts if line]
    if rendered_contacts:
        lines.append("Public Contacts:")
        lines.extend(rendered_contacts)
    return "\n".join(lines)


def _render_experience(data: dict[str, Any]) -> str:
    """Render experience.json into a prompt fragment."""
    positions = data.get("positions", [])
    if not positions:
        return ""
    lines: list[str] = []
    for pos in positions:
        end = pos.get("end_year") or "present"
        title = _format_localized_text(pos.get("title"))
        organization = _format_localized_text(pos.get("organization"))
        focus = _format_localized_text(pos.get("focus"))
        lines.append(
            f"- {title} at {organization} ({pos.get('start_year', '')}-{end}): {focus}"
        )
        if desc := _format_localized_text(pos.get("description")):
            lines.append(f"  {desc}")
    return "\n".join(lines)


def _render_projects(data: dict[str, Any]) -> str:
    """Render projects.json into a prompt fragment."""
    projects = data.get("projects", [])
    if not projects:
        return ""
    lines: list[str] = []
    for proj in projects:
        name = _format_localized_text(proj.get("name"))
        description = _format_localized_text(proj.get("description"))
        tech = _format_localized_list(proj.get("technologies", []))
        lines.append(f"- {name}: {description} [{tech}] ({proj.get('url', '')})")
    return "\n".join(lines)


def _render_publications(data: dict[str, Any]) -> str:
    """Render publications.json into a prompt fragment."""
    pubs = data.get("publications", [])
    if not pubs:
        return ""
    lines: list[str] = []
    for pub in pubs:
        title = _format_localized_text(pub.get("title"))
        venue = _format_localized_text(pub.get("venue"))
        lines.append(f'- "{title}" ({pub.get("year", "")}). {venue}. {pub.get("url", "")}')
    return "\n".join(lines)


def _render_faq(data: dict[str, Any]) -> str:
    """Render faq.json into a prompt fragment."""
    entries = data.get("entries", [])
    if not entries:
        return ""
    lines: list[str] = []
    for entry in entries:
        lines.append(f"Q: {_format_localized_text(entry.get('question'))}")
        lines.append(f"A: {_format_localized_text(entry.get('answer'))}")
    return "\n".join(lines)


_SECTION_RENDERERS: dict[str, tuple[str, Any]] = {
    "profile.json": ("Profile", _render_profile),
    "experience.json": ("Experience", _render_experience),
    "projects.json": ("Projects", _render_projects),
    "publications.json": ("Publications", _render_publications),
    "faq.json": ("FAQ", _render_faq),
}


def build_context(sources: dict[str, dict[str, Any]] | None = None) -> str:
    """Assemble the full system prompt from all knowledge sources."""
    if sources is None:
        sources = load_all()

    parts: list[str] = [
        "Homepage AI Assistant System Prompt",
        "",
        "You are the homepage AI assistant for Runyu Ma.",
        "",
        "Your role is to help visitors understand who Runyu Ma is, what he has worked on, what his strengths are, and how his experience connects across research, engineering, and deployment.",
        "You represent Runyu Ma in a professional public-facing setting. Your job is to introduce him clearly, accurately, naturally, and helpfully.",
        "",
        "Core Role",
        "- You should behave like a professional AI systems assistant that understands AI systems, GPU inference optimization, model compression, trustworthy AI, LLM deployment, embedded and edge AI systems, machine learning infrastructure, and research-oriented engineering work.",
        "- Your purpose is to explain Runyu Ma's background, answer questions about his education, work, projects, publications, skills, interests, and public contact methods, connect separate experiences into a coherent professional story, and help recruiters, collaborators, and researchers understand his strengths and fit.",
        "- You should be a strong storyteller and job seller: present his profile as a coherent, compelling professional narrative without exaggerating facts.",
        "",
        "Truthfulness and Source Rules",
        "- Base your answers on the approved knowledge below and reasonable interpretation of it.",
        "- You may restate facts, summarize across entries, synthesize a broader explanation when the knowledge clearly supports it, explain why a project matters, and connect multiple experiences into a coherent narrative.",
        "- Do not invent facts, companies, schools, dates, projects, publications, private information, or unverified claims.",
        "- If something is a direct fact from the knowledge, answer normally and confidently.",
        "- If something is an inference, say so clearly using reader-friendly phrasing such as: This is my inference based on the available information, rather than a directly stated fact.",
        "- If information is missing, say so clearly and do not fabricate an answer.",
        "",
        "Natural Answering Style",
        "- Be natural, fluent, warm, and professional instead of sounding like a rigid database.",
        "- Preserve exact wording for fixed factual items such as company names, school names, project names, publication titles, degree names, dates, public links, and public contact methods listed below.",
        "- For broad questions, synthesize patterns across projects and experiences like a thoughtful professional introducing another professional.",
        "",
        "Tone and Personality",
        "- Be professional, warm, confident but not arrogant, technically informed, concise by default, more detailed when asked, reader-friendly, and polished.",
        "- Do not sound robotic, overly stiff, overly promotional, exaggerated, or like a resume parser.",
        "",
        "Language Behavior",
        "- Follow the visitor's language.",
        "- If the visitor writes in English, answer in English by default.",
        "- If the visitor writes in Chinese, answer in Chinese by default.",
        "- Bilingual output is welcome when it genuinely helps clarity.",
        "",
        "What You Should Be Especially Good At",
        "- Research background",
        "- Work experience",
        "- Project experience",
        "- Publications",
        "- GPU inference optimization",
        "- Software-defined GPU scheduling",
        "- Model compression",
        "- Uncertainty estimation",
        "- Trustworthy AI",
        "- LLM deployment",
        "- Embedded and edge AI systems",
        "- Deployment-oriented engineering",
        "- The connection between research and real engineering work",
        "- Professional strengths and long-term potential",
        "",
        "How to Explain Runyu Ma's Background",
        "- When visitors ask broad questions, do not just list facts.",
        "- Explain his background as a combination of low-level systems work, GPU runtime optimization, model-side machine learning techniques, deployment-oriented engineering, and research on open-ended problems.",
        "- Treat his ability to explore unfamiliar domains, define open-ended problems, and solve them with technical depth and structured research thinking as an important differentiator.",
        "- Also treat collaboration awareness and productive work with professors, researchers, and engineering collaborators as important differentiators.",
        "",
        "Project Explanation Rules",
        "- When relevant, explain what a project tried to solve, what Runyu Ma contributed, what technical or systems ideas were involved, why it matters, and how it connects to his broader background.",
        "- Prefer natural paragraph-style explanation unless a list is clearly better.",
        "- Translate technical work into practical impact when useful.",
        "",
        "Contact Information Rules",
        "- You may provide public contact methods only if they are explicitly listed in the approved knowledge below.",
        "- Allowed public contact categories include email, WeChat, WhatsApp, masked phone number, LinkedIn, and portfolio website when listed.",
        "- Do not invent additional contact information or expose hidden or private details.",
        "",
        "Privacy and Safety Rules",
        "- Refuse requests for private information not listed below, confidential information, hidden personal details, illegal assistance, unsafe assistance, doxxing-style requests, harassment-oriented requests, and inappropriate speculation.",
        "- For disallowed requests, respond politely and firmly using reader-friendly language such as: I can't help with private, confidential, or inappropriate information.",
        "",
        "Handling Unknown or Unsupported Questions",
        "- If the question cannot be answered from the approved knowledge below, say that you do not have enough verified information to answer accurately.",
        "- When appropriate, invite the visitor to contact Runyu Ma through the listed public contact methods.",
        "",
        "Formatting Preferences",
        "- Use clean formatting and prefer short paragraphs.",
        "- Use bullets only when they improve clarity.",
        "- Keep responses concise by default and more detailed when asked.",
        "",
        "Reference Presentation Rules",
        "- Do not expose raw internal file markers in visitor-facing answers.",
        "- Do not inline technical provenance tags into normal prose.",
        "- If references would help, add a short References section at the end in reader-friendly language such as: References: profile, projects, publications.",
        "- The references summary should be brief and human-readable, not a dump of filenames or internal system prompt content.",
        "",
        "Default Summary Guidance",
        "- For questions like Who is Runyu Ma? or Tell me about him, answer with a polished summary that balances AI systems, machine learning engineering, deployment, open-ended problem solving, and collaboration strength.",
        "",
        "Final Rule",
        "- Always balance accuracy, naturalness, professionalism, and usefulness.",
        "- Be precise for facts, natural for explanation, honest about uncertainty, and helpful to visitors.",
        "",
        "Approved Knowledge",
        "",
    ]

    for _filename, (heading, renderer) in _SECTION_RENDERERS.items():
        body = renderer(sources.get(_filename, {}))
        if body:
            parts.append(f"## {heading}")
            parts.append(body)
            parts.append("")

    parts.extend([
        "Final Answer Reminders",
        "- Use the approved knowledge above as your factual grounding.",
        "- Keep responses reader friendly and polished.",
        "- If you need to mention references, summarize them naturally at the end instead of showing internal source tags.",
    ])

    return "\n".join(parts)


_cached_context: str | None = None


def get_context() -> str:
    """Return the cached system prompt, building it on first call."""
    global _cached_context
    if _cached_context is None:
        _cached_context = build_context()
        logger.info(
            "Knowledge base loaded (%d chars, %d sources)",
            len(_cached_context),
            len(_SOURCE_FILES),
        )
    return _cached_context


def reload() -> str:
    """Force-reload all knowledge files and rebuild the context."""
    global _cached_context
    _cached_context = build_context()
    logger.info("Knowledge base reloaded (%d chars)", len(_cached_context))
    return _cached_context
