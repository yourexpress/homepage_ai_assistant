#!/usr/bin/env python3
"""CLI validator for knowledge JSON files.

Validates one or more knowledge files against the expected schemas before
they are deployed to the backend.  Run this after filling in the templates
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
- Required keys inside nested list entries (education, positions, …) are
  present and have the expected types.
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

# ---------------------------------------------------------------------------
# Schema definitions
# ---------------------------------------------------------------------------

# Each schema entry is:
#   (key, expected_type_or_types, required)
#
# expected_type_or_types may be a single Python type or a tuple of types.

_PROFILE_SCHEMA: list[tuple[str, type | tuple, bool]] = [
    ("name", str, True),
    ("headline", str, True),
    ("education", list, True),
    ("skills", list, True),
    ("location_public", str, False),
    ("links", dict, False),
    ("research_interests", list, False),
]

_EDUCATION_ENTRY_SCHEMA: list[tuple[str, type | tuple, bool]] = [
    ("degree", str, True),
    ("institution", str, True),
    ("year", int, True),
]

_EXPERIENCE_SCHEMA: list[tuple[str, type | tuple, bool]] = [
    ("positions", list, True),
]

_POSITION_ENTRY_SCHEMA: list[tuple[str, type | tuple, bool]] = [
    ("title", str, True),
    ("organization", str, True),
    ("start_year", int, True),
]

_PROJECTS_SCHEMA: list[tuple[str, type | tuple, bool]] = [
    ("projects", list, True),
]

_PROJECT_ENTRY_SCHEMA: list[tuple[str, type | tuple, bool]] = [
    ("name", str, True),
    ("description", str, True),
]

_PUBLICATIONS_SCHEMA: list[tuple[str, type | tuple, bool]] = [
    ("publications", list, True),
]

_PUBLICATION_ENTRY_SCHEMA: list[tuple[str, type | tuple, bool]] = [
    ("title", str, True),
    ("year", int, True),
]

_FAQ_SCHEMA: list[tuple[str, type | tuple, bool]] = [
    ("entries", list, True),
]

_FAQ_ENTRY_SCHEMA: list[tuple[str, type | tuple, bool]] = [
    ("question", str, True),
    ("answer", str, True),
]

# Map each canonical filename to (top-level schema, child list key, child schema)
_FILE_SCHEMAS: dict[str, tuple[
    list[tuple[str, type | tuple, bool]],
    str | None,
    list[tuple[str, type | tuple, bool]] | None,
]] = {
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
    re.compile(r"\b\d{1,5}\s+\w+\s+(street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr)\b", re.IGNORECASE),
    re.compile(r"\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b"),  # phone number
    re.compile(r"\b[A-Za-z0-9._%+\-]+@(gmail|yahoo|hotmail|outlook|icloud)\.com\b", re.IGNORECASE),
]

# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------


def _type_name(t: type | tuple) -> str:
    """Return a human-readable type name for error messages."""
    if isinstance(t, tuple):
        return " or ".join(x.__name__ for x in t)
    return t.__name__


def _check_schema(
    data: dict[str, Any],
    schema: list[tuple[str, type | tuple, bool]],
    context: str,
) -> list[str]:
    """Validate *data* against *schema*, returning a list of error strings."""
    errors: list[str] = []
    for key, expected_type, required in schema:
        if key not in data:
            if required:
                errors.append(f"{context}: missing required key '{key}'")
        else:
            value = data[key]
            # bool is a subclass of int in Python; treat bools as NOT valid ints
            if isinstance(expected_type, tuple):
                valid = isinstance(value, expected_type) and not (
                    int in expected_type and isinstance(value, bool)
                )
            else:
                valid = isinstance(value, expected_type) and not (
                    expected_type is int and isinstance(value, bool)
                )
            if not valid:
                errors.append(
                    f"{context}: key '{key}' must be {_type_name(expected_type)}, "
                    f"got {type(value).__name__}"
                )
    return errors


def _check_private_data(data: Any, path: str) -> list[str]:
    """Recursively scan string values for private-data patterns."""
    errors: list[str] = []
    if isinstance(data, str):
        for pattern in _PRIVATE_DATA_PATTERNS:
            if pattern.search(data):
                errors.append(
                    f"{path}: possible private data detected — "
                    f"matches pattern '{pattern.pattern}'"
                )
    elif isinstance(data, dict):
        for k, v in data.items():
            errors.extend(_check_private_data(v, f"{path}.{k}"))
    elif isinstance(data, list):
        for i, item in enumerate(data):
            errors.extend(_check_private_data(item, f"{path}[{i}]"))
    return errors


def validate_file(path: Path) -> list[str]:
    """Validate a single knowledge file, returning a list of error strings.

    Parameters
    ----------
    path:
        Absolute or relative path to the JSON file.

    Returns
    -------
    list[str]
        Empty list if the file is valid; otherwise one or more error messages.
    """
    errors: list[str] = []
    filename = path.name

    # 1. File must exist
    if not path.exists():
        return [f"{path}: file not found"]

    # 2. Must be valid JSON
    try:
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)
    except json.JSONDecodeError as exc:
        return [f"{path}: invalid JSON — {exc}"]
    except OSError as exc:
        return [f"{path}: cannot read file — {exc}"]

    # 3. Top-level value must be a dict
    if not isinstance(data, dict):
        return [f"{path}: top-level value must be a JSON object, got {type(data).__name__}"]

    # 4. Schema validation
    schema_entry = _FILE_SCHEMAS.get(filename)
    if schema_entry is None:
        # Unknown filename — only check that it is a non-empty dict
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
                        f"{path}: {child_key}[{idx}] must be a JSON object, "
                        f"got {type(entry).__name__}"
                    )
                    continue
                errors.extend(
                    _check_schema(entry, child_schema, f"{path} {child_key}[{idx}]")
                )

    # 5. Private-data scan
    errors.extend(_check_private_data(data, str(path)))

    return errors


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------


def main(argv: list[str] | None = None) -> int:
    """Parse arguments and validate each supplied file.

    Returns
    -------
    int
        Exit code: 0 (all valid) or 1 (one or more errors found).
    """
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
            print(f"❌  {file_path}")
            for err in errors:
                print(f"    {err}")
        else:
            print(f"✅  {file_path}")

    if all_valid:
        print("\nAll files are valid.")
        return 0
    else:
        print("\nValidation failed. Fix the errors above before deploying.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
