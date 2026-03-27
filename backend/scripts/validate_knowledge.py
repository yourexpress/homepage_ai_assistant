#!/usr/bin/env python3
"""CLI validator for knowledge JSON files.

Validates one or more knowledge files against the expected schemas before
they are deployed to the backend. Run this after filling in the templates
and before uploading files to the server.

Usage
-----
    python backend/scripts/validate_knowledge.py path/to/profile.json ...

Exit codes
----------
    0  All files are valid.
    1  One or more files have validation errors.

What is checked
---------------
- The file exists and is valid JSON.
- The top-level value is a JSON object (dict), not an array or primitive.
- Required top-level keys are present and have the expected types.
- Required keys inside nested list entries are present and have the expected
  types.
- Localized text fields accept either a plain string or
  ``{"en": "...", "zh": "..."}``.
- No obviously private data patterns (home address, personal email, phone
  number) appear in string values.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

_SUPPORTED_LANGS: tuple[str, ...] = ("en", "zh")
_LOCALIZED_TEXT = "localized_text"
_LOCALIZED_TEXT_LIST = "localized_text_list"

# ---------------------------------------------------------------------------
# Schema definitions
# ---------------------------------------------------------------------------

SchemaType = type | tuple[type, ...] | str
SchemaEntry = tuple[str, SchemaType, bool]

_PROFILE_SCHEMA: list[SchemaEntry] = [
    ("name", _LOCALIZED_TEXT, True),
    ("headline", _LOCALIZED_TEXT, True),
    ("education", list, True),
    ("skills", _LOCALIZED_TEXT_LIST, True),
    ("location_public", _LOCALIZED_TEXT, False),
    ("links", dict, False),
    ("research_interests", _LOCALIZED_TEXT_LIST, False),
    ("public_contacts", list, False),
]

_EDUCATION_ENTRY_SCHEMA: list[SchemaEntry] = [
    ("degree", _LOCALIZED_TEXT, True),
    ("institution", _LOCALIZED_TEXT, True),
    ("year", int, True),
]

_PUBLIC_CONTACT_ENTRY_SCHEMA: list[SchemaEntry] = [
    ("type", str, True),
    ("label", _LOCALIZED_TEXT, True),
    ("value", str, True),
    ("note", _LOCALIZED_TEXT, False),
]

_EXPERIENCE_SCHEMA: list[SchemaEntry] = [
    ("positions", list, True),
]

_POSITION_ENTRY_SCHEMA: list[SchemaEntry] = [
    ("title", _LOCALIZED_TEXT, True),
    ("organization", _LOCALIZED_TEXT, True),
    ("start_year", int, True),
    ("end_year", (int, type(None)), False),
    ("focus", _LOCALIZED_TEXT, False),
    ("description", _LOCALIZED_TEXT, False),
]

_PROJECTS_SCHEMA: list[SchemaEntry] = [
    ("projects", list, True),
]

_PROJECT_ENTRY_SCHEMA: list[SchemaEntry] = [
    ("name", _LOCALIZED_TEXT, True),
    ("description", _LOCALIZED_TEXT, True),
    ("url", str, False),
    ("technologies", _LOCALIZED_TEXT_LIST, False),
    ("status", str, False),
]

_PUBLICATIONS_SCHEMA: list[SchemaEntry] = [
    ("publications", list, True),
]

_PUBLICATION_ENTRY_SCHEMA: list[SchemaEntry] = [
    ("title", _LOCALIZED_TEXT, True),
    ("year", int, True),
    ("venue", _LOCALIZED_TEXT, False),
    ("url", str, False),
]

_FAQ_SCHEMA: list[SchemaEntry] = [
    ("entries", list, True),
]

_FAQ_ENTRY_SCHEMA: list[SchemaEntry] = [
    ("question", _LOCALIZED_TEXT, True),
    ("answer", _LOCALIZED_TEXT, True),
]

_FILE_SCHEMAS: dict[str, tuple[list[SchemaEntry], str | None, list[SchemaEntry] | None]] = {
    "profile.json": (_PROFILE_SCHEMA, "education", _EDUCATION_ENTRY_SCHEMA),
    "experience.json": (_EXPERIENCE_SCHEMA, "positions", _POSITION_ENTRY_SCHEMA),
    "projects.json": (_PROJECTS_SCHEMA, "projects", _PROJECT_ENTRY_SCHEMA),
    "publications.json": (_PUBLICATIONS_SCHEMA, "publications", _PUBLICATION_ENTRY_SCHEMA),
    "faq.json": (_FAQ_SCHEMA, "entries", _FAQ_ENTRY_SCHEMA),
}


# ---------------------------------------------------------------------------
# Private-data patterns
# ---------------------------------------------------------------------------

_PRIVATE_DATA_PATTERNS: list[re.Pattern[str]] = [
    re.compile(
        r"\b\d{1,5}\s+\w+\s+(street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr)\b",
        re.IGNORECASE,
    ),
    re.compile(r"\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b"),
    re.compile(
        r"\b[A-Za-z0-9._%+\-]+@(gmail|yahoo|hotmail|outlook|icloud)\.com\b",
        re.IGNORECASE,
    ),
]


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------

def _type_name(t: SchemaType) -> str:
    """Return a human-readable type name for error messages."""
    if isinstance(t, tuple):
        return " or ".join(x.__name__ for x in t)
    if isinstance(t, str):
        if t == _LOCALIZED_TEXT:
            return "str or localized text object"
        if t == _LOCALIZED_TEXT_LIST:
            return "list of str/localized text objects"
        return t
    return t.__name__


def _validate_localized_text(value: Any, context: str) -> list[str]:
    """Validate a plain string or ``{"en": ..., "zh": ...}`` object."""
    if isinstance(value, str):
        return []
    if not isinstance(value, dict):
        return [f"{context}: must be str or localized text object, got {type(value).__name__}"]

    errors: list[str] = []
    if not any(lang in value for lang in _SUPPORTED_LANGS):
        errors.append(f"{context}: localized text object must include 'en' or 'zh'")

    for key, text in value.items():
        if key not in _SUPPORTED_LANGS:
            errors.append(f"{context}: unsupported language key '{key}'")
            continue
        if not isinstance(text, str):
            errors.append(f"{context}: localized field '{key}' must be str, got {type(text).__name__}")
        elif not text.strip():
            errors.append(f"{context}: localized field '{key}' must not be empty")

    return errors


def _validate_value(value: Any, expected_type: SchemaType, context: str) -> list[str]:
    """Validate a single value against a schema marker or Python type."""
    if expected_type == _LOCALIZED_TEXT:
        return _validate_localized_text(value, context)

    if expected_type == _LOCALIZED_TEXT_LIST:
        if not isinstance(value, list):
            return [f"{context}: must be list, got {type(value).__name__}"]
        errors: list[str] = []
        for idx, item in enumerate(value):
            errors.extend(_validate_localized_text(item, f"{context}[{idx}]"))
        return errors

    if isinstance(expected_type, tuple):
        valid = isinstance(value, expected_type) and not (
            int in expected_type and isinstance(value, bool)
        )
    else:
        valid = isinstance(value, expected_type) and not (
            expected_type is int and isinstance(value, bool)
        )

    if valid:
        return []

    return [
        f"{context}: must be {_type_name(expected_type)}, got {type(value).__name__}"
    ]


def _check_schema(data: dict[str, Any], schema: list[SchemaEntry], context: str) -> list[str]:
    """Validate *data* against *schema*, returning a list of error strings."""
    errors: list[str] = []
    for key, expected_type, required in schema:
        if key not in data:
            if required:
                errors.append(f"{context}: missing required key '{key}'")
            continue
        errors.extend(_validate_value(data[key], expected_type, f"{context}: key '{key}'"))
    return errors


def _check_private_data(data: Any, path: str) -> list[str]:
    """Recursively scan string values for private-data patterns."""
    errors: list[str] = []
    if isinstance(data, str):
        for pattern in _PRIVATE_DATA_PATTERNS:
            if pattern.search(data):
                errors.append(
                    f"{path}: possible private data detected - matches pattern '{pattern.pattern}'"
                )
    elif isinstance(data, dict):
        for key, value in data.items():
            if key == "public_contacts":
                continue
            errors.extend(_check_private_data(value, f"{path}.{key}"))
    elif isinstance(data, list):
        for idx, item in enumerate(data):
            errors.extend(_check_private_data(item, f"{path}[{idx}]"))
    return errors


def validate_file(path: Path) -> list[str]:
    """Validate a single knowledge file, returning a list of error strings."""
    errors: list[str] = []
    filename = path.name

    if not path.exists():
        return [f"{path}: file not found"]

    try:
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)
    except json.JSONDecodeError as exc:
        return [f"{path}: invalid JSON - {exc}"]
    except OSError as exc:
        return [f"{path}: cannot read file - {exc}"]

    if not isinstance(data, dict):
        return [f"{path}: top-level value must be a JSON object, got {type(data).__name__}"]

    schema_entry = _FILE_SCHEMAS.get(filename)
    if schema_entry is None:
        if not data:
            errors.append(f"{path}: file is an empty JSON object")
        return errors

    top_schema, child_key, child_schema = schema_entry
    errors.extend(_check_schema(data, top_schema, str(path)))

    if child_key and child_schema and child_key in data:
        entries = data[child_key]
        if isinstance(entries, list):
            for idx, entry in enumerate(entries):
                if not isinstance(entry, dict):
                    errors.append(
                        f"{path}: {child_key}[{idx}] must be a JSON object, got {type(entry).__name__}"
                    )
                    continue
                errors.extend(
                    _check_schema(entry, child_schema, f"{path} {child_key}[{idx}]")
                )

    if filename == "profile.json" and "links" in data and isinstance(data["links"], dict):
        for label, url in data["links"].items():
            if not isinstance(label, str):
                errors.append(f"{path}: links keys must be str, got {type(label).__name__}")
            if not isinstance(url, str):
                errors.append(f"{path}: links['{label}'] must be str, got {type(url).__name__}")

    if filename == "profile.json" and "public_contacts" in data:
        contacts = data["public_contacts"]
        if isinstance(contacts, list):
            for idx, contact in enumerate(contacts):
                if not isinstance(contact, dict):
                    errors.append(
                        f"{path}: public_contacts[{idx}] must be a JSON object, got {type(contact).__name__}"
                    )
                    continue
                errors.extend(
                    _check_schema(
                        contact,
                        _PUBLIC_CONTACT_ENTRY_SCHEMA,
                        f"{path} public_contacts[{idx}]",
                    )
                )

    errors.extend(_check_private_data(data, str(path)))
    return errors


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main(argv: list[str] | None = None) -> int:
    """Parse arguments and validate each supplied file."""
    parser = argparse.ArgumentParser(
        description=(
            "Validate knowledge JSON files before deploying to the backend. "
            "Pass one or more file paths as arguments."
        )
    )
    parser.add_argument(
        "files",
        metavar="FILE",
        nargs="+",
        type=Path,
        help="Path(s) to the JSON knowledge file(s) to validate.",
    )
    args = parser.parse_args(argv)

    all_valid = True
    for file_path in args.files:
        errors = validate_file(file_path)
        if errors:
            all_valid = False
            print(f"X {file_path}")
            for err in errors:
                print(f"    {err}")
        else:
            print(f"OK {file_path}")

    if all_valid:
        print("\nAll files are valid.")
        return 0

    print("\nValidation failed. Fix the errors above before deploying.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
