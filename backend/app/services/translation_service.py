"""Helpers for auto-syncing bilingual site content."""

from __future__ import annotations

import json
import logging
from typing import Any

from app.services import llm_client

logger = logging.getLogger("translation_service")


async def translate_text(text: str, source_lang: str, target_lang: str) -> str:
    """Translate a short piece of website copy using the existing LLM client."""
    if not text.strip():
        return text

    response = await llm_client.complete(
        [
            {
                "role": "system",
                "content": (
                    "You translate short website copy. "
                    "Return only the translated text with no notes, quotes, or labels."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Translate the following text from {source_lang} to {target_lang}. "
                    f"Keep the meaning natural and concise.\n\n{text}"
                ),
            },
        ]
    )
    return response.text.strip() or text


async def sync_bilingual_content(old_content: dict[str, Any], new_content: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    synced, notes = await _sync_node(old_content, new_content, path="content")
    if not isinstance(synced, dict):
        raise ValueError("Synced site content must remain a JSON object.")
    return synced, notes


async def _sync_node(old_node: Any, new_node: Any, *, path: str) -> tuple[Any, list[str]]:
    if _is_localized_pair(new_node):
        synced, notes = await _sync_localized_pair(old_node if isinstance(old_node, dict) else {}, new_node, path=path)
        return synced, notes

    if isinstance(new_node, list):
        synced_list: list[Any] = []
        notes: list[str] = []
        old_items = old_node if isinstance(old_node, list) else []
        for index, item in enumerate(new_node):
            old_item = old_items[index] if index < len(old_items) else None
            synced_item, item_notes = await _sync_node(old_item, item, path=f"{path}[{index}]")
            synced_list.append(synced_item)
            notes.extend(item_notes)
        return synced_list, notes

    if isinstance(new_node, dict):
        synced_dict: dict[str, Any] = {}
        notes: list[str] = []
        old_dict = old_node if isinstance(old_node, dict) else {}
        for key, value in new_node.items():
            synced_value, child_notes = await _sync_node(old_dict.get(key), value, path=f"{path}.{key}")
            synced_dict[key] = synced_value
            notes.extend(child_notes)
        return synced_dict, notes

    return new_node, []


async def _sync_localized_pair(old_pair: dict[str, Any], new_pair: dict[str, Any], *, path: str) -> tuple[dict[str, str], list[str]]:
    old_en = _string_or_empty(old_pair.get("en"))
    old_zh = _string_or_empty(old_pair.get("zh"))
    new_en = _string_or_empty(new_pair.get("en"))
    new_zh = _string_or_empty(new_pair.get("zh"))
    notes: list[str] = []

    if not new_en and new_zh:
        translated = await _safe_translate(new_zh, "Chinese", "English", path, notes)
        new_en = translated or new_en
    elif not new_zh and new_en:
        translated = await _safe_translate(new_en, "English", "Chinese", path, notes)
        new_zh = translated or new_zh
    elif new_en != old_en and new_zh == old_zh:
        translated = await _safe_translate(new_en, "English", "Chinese", path, notes)
        if translated:
            new_zh = translated
    elif new_zh != old_zh and new_en == old_en:
        translated = await _safe_translate(new_zh, "Chinese", "English", path, notes)
        if translated:
            new_en = translated

    return {"en": new_en, "zh": new_zh}, notes


async def _safe_translate(
    text: str,
    source_lang: str,
    target_lang: str,
    path: str,
    notes: list[str],
) -> str:
    try:
        translated = await translate_text(text, source_lang, target_lang)
        notes.append(f"Auto-synced {path} from {source_lang} to {target_lang}.")
        return translated
    except Exception as exc:
        logger.warning("Auto-translation failed at %s: %s", path, exc)
        notes.append(f"Skipped auto-sync for {path} because translation was unavailable.")
        return ""


def _is_localized_pair(value: Any) -> bool:
    return isinstance(value, dict) and set(value.keys()).issubset({"en", "zh"}) and (
        "en" in value or "zh" in value
    )


def _string_or_empty(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""
