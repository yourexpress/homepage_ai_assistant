"""Tests for the knowledge-file validator CLI script.

Covers:
- validate_file() returns no errors for a correctly shaped file
- validate_file() returns specific errors for missing required keys
- validate_file() returns an error for wrong value types
- validate_file() returns an error for an invalid JSON file
- validate_file() returns an error for a missing file
- validate_file() returns an error when a top-level value is not a dict
- validate_file() flags private-data patterns in string values
- validate_file() accepts empty publications list (valid)
- validate_file() validates child entries (education, positions, etc.)
- main() returns exit code 0 for valid files and 1 for invalid files
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

# Add the scripts directory to sys.path so we can import the module directly.
sys.path.insert(
    0,
    str(Path(__file__).resolve().parent.parent / "scripts"),
)
from validate_knowledge import main, validate_file  # noqa: E402


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _write(tmp_path: Path, name: str, data: object) -> Path:
    """Write *data* as JSON to *tmp_path / name* and return the path."""
    p = tmp_path / name
    p.write_text(json.dumps(data), encoding="utf-8")
    return p


# ---------------------------------------------------------------------------
# Valid files — no errors expected
# ---------------------------------------------------------------------------


class TestValidFileAccepted:
    """A well-formed file should produce zero errors."""

    def test_valid_profile(self, tmp_path: Path) -> None:
        p = _write(tmp_path, "profile.json", {
            "name": "Jane Doe",
            "headline": "Software Engineer",
            "education": [
                {"degree": "BSc Computer Science", "institution": "MIT", "year": 2022}
            ],
            "skills": ["Python", "Go"],
        })
        assert validate_file(p) == []

    def test_valid_experience(self, tmp_path: Path) -> None:
        p = _write(tmp_path, "experience.json", {
            "positions": [
                {
                    "title": "Engineer",
                    "organization": "Acme Corp",
                    "start_year": 2020,
                    "end_year": None,
                    "focus": "Backend",
                }
            ]
        })
        assert validate_file(p) == []

    def test_valid_projects(self, tmp_path: Path) -> None:
        p = _write(tmp_path, "projects.json", {
            "projects": [
                {
                    "name": "My App",
                    "description": "Does things.",
                    "technologies": ["Python"],
                    "status": "active",
                }
            ]
        })
        assert validate_file(p) == []

    def test_valid_publications(self, tmp_path: Path) -> None:
        p = _write(tmp_path, "publications.json", {
            "publications": [
                {"title": "A Paper", "year": 2023, "venue": "NeurIPS"}
            ]
        })
        assert validate_file(p) == []

    def test_valid_publications_empty_list(self, tmp_path: Path) -> None:
        p = _write(tmp_path, "publications.json", {"publications": []})
        assert validate_file(p) == []

    def test_valid_faq(self, tmp_path: Path) -> None:
        p = _write(tmp_path, "faq.json", {
            "entries": [
                {"question": "What do you do?", "answer": "I code."}
            ]
        })
        assert validate_file(p) == []

    def test_valid_profile_with_optional_fields(self, tmp_path: Path) -> None:
        p = _write(tmp_path, "profile.json", {
            "name": "Jane Doe",
            "headline": "Engineer",
            "education": [
                {"degree": "MSc", "institution": "Oxford", "year": 2021}
            ],
            "skills": ["Rust"],
            "location_public": "London, UK",
            "links": {"github": "https://github.com/janedoe"},
            "research_interests": ["Systems"],
        })
        assert validate_file(p) == []


# ---------------------------------------------------------------------------
# Missing required top-level keys
# ---------------------------------------------------------------------------


class TestMissingRequiredKey:
    """Missing required keys should be reported as errors."""

    def test_profile_missing_name(self, tmp_path: Path) -> None:
        p = _write(tmp_path, "profile.json", {
            "headline": "Engineer",
            "education": [],
            "skills": [],
        })
        errors = validate_file(p)
        assert any("missing required key 'name'" in e for e in errors)

    def test_profile_missing_education(self, tmp_path: Path) -> None:
        p = _write(tmp_path, "profile.json", {
            "name": "Jane",
            "headline": "Engineer",
            "skills": [],
        })
        errors = validate_file(p)
        assert any("missing required key 'education'" in e for e in errors)

    def test_experience_missing_positions(self, tmp_path: Path) -> None:
        p = _write(tmp_path, "experience.json", {})
        errors = validate_file(p)
        assert any("missing required key 'positions'" in e for e in errors)

    def test_projects_missing_projects(self, tmp_path: Path) -> None:
        p = _write(tmp_path, "projects.json", {})
        errors = validate_file(p)
        assert any("missing required key 'projects'" in e for e in errors)

    def test_publications_missing_publications(self, tmp_path: Path) -> None:
        p = _write(tmp_path, "publications.json", {})
        errors = validate_file(p)
        assert any("missing required key 'publications'" in e for e in errors)

    def test_faq_missing_entries(self, tmp_path: Path) -> None:
        p = _write(tmp_path, "faq.json", {})
        errors = validate_file(p)
        assert any("missing required key 'entries'" in e for e in errors)


# ---------------------------------------------------------------------------
# Wrong value types
# ---------------------------------------------------------------------------


class TestWrongTypes:
    """Wrong value types should be reported as errors."""

    def test_profile_name_not_string(self, tmp_path: Path) -> None:
        p = _write(tmp_path, "profile.json", {
            "name": 42,
            "headline": "Engineer",
            "education": [],
            "skills": [],
        })
        errors = validate_file(p)
        assert any("'name' must be str" in e for e in errors)

    def test_profile_skills_not_list(self, tmp_path: Path) -> None:
        p = _write(tmp_path, "profile.json", {
            "name": "Jane",
            "headline": "Engineer",
            "education": [],
            "skills": "python",
        })
        errors = validate_file(p)
        assert any("'skills' must be list" in e for e in errors)

    def test_education_year_not_int(self, tmp_path: Path) -> None:
        p = _write(tmp_path, "profile.json", {
            "name": "Jane",
            "headline": "Engineer",
            "education": [
                {"degree": "BSc", "institution": "MIT", "year": "2022"}
            ],
            "skills": [],
        })
        errors = validate_file(p)
        assert any("'year' must be int" in e for e in errors)

    def test_position_start_year_is_bool_rejected(self, tmp_path: Path) -> None:
        # bool is a subclass of int in Python — must be rejected
        p = _write(tmp_path, "experience.json", {
            "positions": [
                {"title": "Dev", "organization": "Co", "start_year": True}
            ]
        })
        errors = validate_file(p)
        assert any("'start_year' must be int" in e for e in errors)

    def test_publication_year_not_int(self, tmp_path: Path) -> None:
        p = _write(tmp_path, "publications.json", {
            "publications": [{"title": "Paper", "year": "twenty-twenty"}]
        })
        errors = validate_file(p)
        assert any("'year' must be int" in e for e in errors)


# ---------------------------------------------------------------------------
# File-level errors
# ---------------------------------------------------------------------------


class TestFileLevelErrors:
    """Errors that apply to the file as a whole."""

    def test_missing_file(self, tmp_path: Path) -> None:
        p = tmp_path / "does_not_exist.json"
        errors = validate_file(p)
        assert any("file not found" in e for e in errors)

    def test_invalid_json(self, tmp_path: Path) -> None:
        p = tmp_path / "profile.json"
        p.write_text("{bad json", encoding="utf-8")
        errors = validate_file(p)
        assert any("invalid JSON" in e for e in errors)

    def test_top_level_array_rejected(self, tmp_path: Path) -> None:
        p = _write(tmp_path, "profile.json", [1, 2, 3])
        errors = validate_file(p)
        assert any("top-level value must be a JSON object" in e for e in errors)

    def test_top_level_string_rejected(self, tmp_path: Path) -> None:
        p = tmp_path / "profile.json"
        p.write_text('"just a string"', encoding="utf-8")
        errors = validate_file(p)
        assert any("top-level value must be a JSON object" in e for e in errors)


# ---------------------------------------------------------------------------
# Child-entry validation
# ---------------------------------------------------------------------------


class TestChildEntryValidation:
    """Required keys inside nested list entries must be checked."""

    def test_education_entry_missing_degree(self, tmp_path: Path) -> None:
        p = _write(tmp_path, "profile.json", {
            "name": "Jane",
            "headline": "Engineer",
            "education": [{"institution": "MIT", "year": 2022}],
            "skills": [],
        })
        errors = validate_file(p)
        assert any("missing required key 'degree'" in e for e in errors)

    def test_position_entry_missing_title(self, tmp_path: Path) -> None:
        p = _write(tmp_path, "experience.json", {
            "positions": [{"organization": "Acme", "start_year": 2021}]
        })
        errors = validate_file(p)
        assert any("missing required key 'title'" in e for e in errors)

    def test_project_entry_missing_description(self, tmp_path: Path) -> None:
        p = _write(tmp_path, "projects.json", {
            "projects": [{"name": "App"}]
        })
        errors = validate_file(p)
        assert any("missing required key 'description'" in e for e in errors)

    def test_faq_entry_missing_answer(self, tmp_path: Path) -> None:
        p = _write(tmp_path, "faq.json", {
            "entries": [{"question": "What?"}]
        })
        errors = validate_file(p)
        assert any("missing required key 'answer'" in e for e in errors)

    def test_non_dict_child_entry_reported(self, tmp_path: Path) -> None:
        p = _write(tmp_path, "faq.json", {
            "entries": ["not an object"]
        })
        errors = validate_file(p)
        assert any("must be a JSON object" in e for e in errors)


# ---------------------------------------------------------------------------
# Private-data detection
# ---------------------------------------------------------------------------


class TestPrivateDataDetection:
    """Private data patterns in string values should be flagged."""

    def test_flags_personal_email(self, tmp_path: Path) -> None:
        p = _write(tmp_path, "faq.json", {
            "entries": [
                {
                    "question": "Contact?",
                    "answer": "Email me at jane@gmail.com",
                }
            ]
        })
        errors = validate_file(p)
        assert any("private data" in e for e in errors)

    def test_flags_phone_number(self, tmp_path: Path) -> None:
        p = _write(tmp_path, "profile.json", {
            "name": "Jane",
            "headline": "Call 555-123-4567 for info",
            "education": [{"degree": "BSc", "institution": "MIT", "year": 2022}],
            "skills": [],
        })
        errors = validate_file(p)
        assert any("private data" in e for e in errors)

    def test_flags_street_address(self, tmp_path: Path) -> None:
        p = _write(tmp_path, "profile.json", {
            "name": "Jane",
            "headline": "Engineer",
            "location_public": "123 Main Street",
            "education": [{"degree": "BSc", "institution": "MIT", "year": 2022}],
            "skills": [],
        })
        errors = validate_file(p)
        assert any("private data" in e for e in errors)

    def test_clean_file_no_private_data_errors(self, tmp_path: Path) -> None:
        p = _write(tmp_path, "profile.json", {
            "name": "Jane Doe",
            "headline": "Software Engineer",
            "education": [
                {"degree": "BSc", "institution": "MIT", "year": 2022}
            ],
            "skills": ["Python"],
            "location_public": "London, UK",
            "links": {"github": "https://github.com/janedoe"},
        })
        errors = validate_file(p)
        assert errors == []


# ---------------------------------------------------------------------------
# main() exit codes
# ---------------------------------------------------------------------------


class TestMainExitCodes:
    """main() should return 0 on success and 1 on failure."""

    def test_main_returns_0_for_valid_files(self, tmp_path: Path) -> None:
        p = _write(tmp_path, "profile.json", {
            "name": "Jane Doe",
            "headline": "Engineer",
            "education": [{"degree": "BSc", "institution": "MIT", "year": 2022}],
            "skills": ["Python"],
        })
        result = main([str(p)])
        assert result == 0

    def test_main_returns_1_for_invalid_file(self, tmp_path: Path) -> None:
        p = _write(tmp_path, "profile.json", {"headline": "No name here"})
        result = main([str(p)])
        assert result == 1

    def test_main_returns_1_when_one_file_invalid(self, tmp_path: Path) -> None:
        good = _write(tmp_path, "experience.json", {
            "positions": [
                {"title": "Dev", "organization": "Co", "start_year": 2021}
            ]
        })
        bad = _write(tmp_path, "faq.json", {})  # missing 'entries'
        result = main([str(good), str(bad)])
        assert result == 1

    def test_main_returns_0_for_multiple_valid_files(self, tmp_path: Path) -> None:
        p1 = _write(tmp_path, "publications.json", {"publications": []})
        p2 = _write(tmp_path, "faq.json", {
            "entries": [{"question": "Q?", "answer": "A."}]
        })
        result = main([str(p1), str(p2)])
        assert result == 0

    def test_main_returns_1_for_missing_file(self, tmp_path: Path) -> None:
        result = main([str(tmp_path / "nonexistent.json")])
        assert result == 1
