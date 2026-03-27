"""Tests for the knowledge-file validator CLI script."""

from __future__ import annotations

import json
import sys
from pathlib import Path

# Add the scripts directory to sys.path so we can import the module directly.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
from validate_knowledge import main, validate_file  # noqa: E402


def _write(tmp_path: Path, name: str, data: object) -> Path:
    """Write *data* as JSON to *tmp_path / name* and return the path."""
    path = tmp_path / name
    path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    return path


def _localized(en: str, zh: str) -> dict[str, str]:
    return {"en": en, "zh": zh}


class TestValidFileAccepted:
    """A well-formed file should produce zero errors."""

    def test_valid_profile_with_plain_strings(self, tmp_path: Path) -> None:
        path = _write(
            tmp_path,
            "profile.json",
            {
                "name": "Jane Doe",
                "headline": "Software Engineer",
                "education": [
                    {"degree": "BSc Computer Science", "institution": "MIT", "year": 2022}
                ],
                "skills": ["Python", "Go"],
            },
        )
        assert validate_file(path) == []

    def test_valid_profile_with_bilingual_fields(self, tmp_path: Path) -> None:
        path = _write(
            tmp_path,
            "profile.json",
            {
                "name": _localized("Jane Doe", "简·杜"),
                "headline": _localized("Engineer", "工程师"),
                "education": [
                    {
                        "degree": _localized("BSc", "学士"),
                        "institution": _localized("MIT", "麻省理工学院"),
                        "year": 2022,
                    }
                ],
                "skills": ["Python", _localized("Distributed systems", "分布式系统")],
                "location_public": _localized("Boston, MA", "美国波士顿地区"),
                "links": {"github": "https://github.com/janedoe"},
                "research_interests": [_localized("Systems", "系统研究")],
            },
        )
        assert validate_file(path) == []

    def test_valid_experience(self, tmp_path: Path) -> None:
        path = _write(
            tmp_path,
            "experience.json",
            {
                "positions": [
                    {
                        "title": _localized("Engineer", "工程师"),
                        "organization": _localized("Acme Corp", "艾克米公司"),
                        "start_year": 2020,
                        "end_year": None,
                        "focus": _localized("Backend", "后端"),
                    }
                ]
            },
        )
        assert validate_file(path) == []

    def test_valid_projects(self, tmp_path: Path) -> None:
        path = _write(
            tmp_path,
            "projects.json",
            {
                "projects": [
                    {
                        "name": _localized("My App", "我的应用"),
                        "description": _localized("Does things.", "可以完成一些功能。"),
                        "technologies": ["Python"],
                        "status": "active",
                    }
                ]
            },
        )
        assert validate_file(path) == []

    def test_valid_publications_empty_list(self, tmp_path: Path) -> None:
        path = _write(tmp_path, "publications.json", {"publications": []})
        assert validate_file(path) == []

    def test_valid_faq(self, tmp_path: Path) -> None:
        path = _write(
            tmp_path,
            "faq.json",
            {
                "entries": [
                    {
                        "question": _localized("What do you do?", "你是做什么的？"),
                        "answer": _localized("I code.", "我写代码。"),
                    }
                ]
            },
        )
        assert validate_file(path) == []


class TestMissingRequiredKey:
    """Missing required keys should be reported as errors."""

    def test_profile_missing_name(self, tmp_path: Path) -> None:
        path = _write(
            tmp_path,
            "profile.json",
            {"headline": "Engineer", "education": [], "skills": []},
        )
        errors = validate_file(path)
        assert any("missing required key 'name'" in error for error in errors)

    def test_experience_missing_positions(self, tmp_path: Path) -> None:
        path = _write(tmp_path, "experience.json", {})
        errors = validate_file(path)
        assert any("missing required key 'positions'" in error for error in errors)

    def test_faq_missing_entries(self, tmp_path: Path) -> None:
        path = _write(tmp_path, "faq.json", {})
        errors = validate_file(path)
        assert any("missing required key 'entries'" in error for error in errors)


class TestWrongTypes:
    """Wrong value types should be reported as errors."""

    def test_profile_name_not_string_or_localized_object(self, tmp_path: Path) -> None:
        path = _write(
            tmp_path,
            "profile.json",
            {"name": 42, "headline": "Engineer", "education": [], "skills": []},
        )
        errors = validate_file(path)
        assert any("'name': must be str or localized text object" in error for error in errors)

    def test_profile_skills_not_list(self, tmp_path: Path) -> None:
        path = _write(
            tmp_path,
            "profile.json",
            {"name": "Jane", "headline": "Engineer", "education": [], "skills": "python"},
        )
        errors = validate_file(path)
        assert any("'skills': must be list" in error for error in errors)

    def test_localized_object_with_invalid_language_key(self, tmp_path: Path) -> None:
        path = _write(
            tmp_path,
            "faq.json",
            {
                "entries": [
                    {"question": {"fr": "Bonjour"}, "answer": "Hi"}
                ]
            },
        )
        errors = validate_file(path)
        assert any("unsupported language key 'fr'" in error for error in errors)

    def test_localized_object_with_non_string_translation(self, tmp_path: Path) -> None:
        path = _write(
            tmp_path,
            "faq.json",
            {
                "entries": [
                    {"question": {"en": 123}, "answer": "Hi"}
                ]
            },
        )
        errors = validate_file(path)
        assert any("localized field 'en' must be str" in error for error in errors)

    def test_education_year_not_int(self, tmp_path: Path) -> None:
        path = _write(
            tmp_path,
            "profile.json",
            {
                "name": "Jane",
                "headline": "Engineer",
                "education": [{"degree": "BSc", "institution": "MIT", "year": "2022"}],
                "skills": [],
            },
        )
        errors = validate_file(path)
        assert any("'year': must be int" in error for error in errors)


class TestFileLevelErrors:
    """Errors that apply to the file as a whole."""

    def test_missing_file(self, tmp_path: Path) -> None:
        path = tmp_path / "does_not_exist.json"
        errors = validate_file(path)
        assert any("file not found" in error for error in errors)

    def test_invalid_json(self, tmp_path: Path) -> None:
        path = tmp_path / "profile.json"
        path.write_text("{bad json", encoding="utf-8")
        errors = validate_file(path)
        assert any("invalid JSON" in error for error in errors)

    def test_top_level_array_rejected(self, tmp_path: Path) -> None:
        path = _write(tmp_path, "profile.json", [1, 2, 3])
        errors = validate_file(path)
        assert any("top-level value must be a JSON object" in error for error in errors)


class TestChildEntryValidation:
    """Required keys inside nested list entries must be checked."""

    def test_education_entry_missing_degree(self, tmp_path: Path) -> None:
        path = _write(
            tmp_path,
            "profile.json",
            {
                "name": "Jane",
                "headline": "Engineer",
                "education": [{"institution": "MIT", "year": 2022}],
                "skills": [],
            },
        )
        errors = validate_file(path)
        assert any("missing required key 'degree'" in error for error in errors)

    def test_non_dict_child_entry_reported(self, tmp_path: Path) -> None:
        path = _write(tmp_path, "faq.json", {"entries": ["not an object"]})
        errors = validate_file(path)
        assert any("must be a JSON object" in error for error in errors)


class TestPrivateDataDetection:
    """Private data patterns in string values should be flagged."""

    def test_flags_personal_email_inside_localized_answer(self, tmp_path: Path) -> None:
        path = _write(
            tmp_path,
            "faq.json",
            {
                "entries": [
                    {
                        "question": "Contact?",
                        "answer": _localized("Email me at jane@gmail.com", "请发邮件给我"),
                    }
                ]
            },
        )
        errors = validate_file(path)
        assert any("private data" in error for error in errors)

    def test_clean_file_no_private_data_errors(self, tmp_path: Path) -> None:
        path = _write(
            tmp_path,
            "profile.json",
            {
                "name": _localized("Jane Doe", "简·杜"),
                "headline": _localized("Software Engineer", "软件工程师"),
                "education": [
                    {"degree": "BSc", "institution": "MIT", "year": 2022}
                ],
                "skills": ["Python"],
                "location_public": _localized("London, UK", "英国伦敦"),
                "links": {"github": "https://github.com/janedoe"},
            },
        )
        assert validate_file(path) == []


class TestMainExitCodes:
    """main() should return 0 on success and 1 on failure."""

    def test_main_returns_0_for_valid_files(self, tmp_path: Path) -> None:
        path = _write(
            tmp_path,
            "profile.json",
            {
                "name": "Jane Doe",
                "headline": "Engineer",
                "education": [{"degree": "BSc", "institution": "MIT", "year": 2022}],
                "skills": ["Python"],
            },
        )
        assert main([str(path)]) == 0

    def test_main_returns_1_for_invalid_file(self, tmp_path: Path) -> None:
        path = _write(tmp_path, "profile.json", {"headline": "No name here"})
        assert main([str(path)]) == 1

    def test_main_returns_0_for_multiple_valid_files(self, tmp_path: Path) -> None:
        publications = _write(tmp_path, "publications.json", {"publications": []})
        faq = _write(
            tmp_path,
            "faq.json",
            {"entries": [{"question": "Q?", "answer": "A."}]},
        )
        assert main([str(publications), str(faq)]) == 0
