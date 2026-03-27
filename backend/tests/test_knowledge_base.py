"""Tests for the structured knowledge loader and system prompt builder."""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import patch

import pytest

from app.services import knowledge_base


def _is_localized_text(value) -> bool:
    return isinstance(value, str) or (
        isinstance(value, dict) and any(lang in value for lang in ("en", "zh"))
    )


def _sample_sources() -> dict[str, dict]:
    return {
        "profile.json": {
            "name": {"en": "Runyu Ma", "zh": "马润宇"},
            "headline": {
                "en": "AI Systems and Machine Learning Engineer",
                "zh": "AI 系统与机器学习工程师",
            },
            "education": [
                {
                    "degree": {"en": "M.S. in Computer Science", "zh": "计算机科学硕士"},
                    "institution": {"en": "George Mason University", "zh": "George Mason University"},
                    "year": 2025,
                }
            ],
            "skills": ["Python", {"en": "GPU systems", "zh": "GPU 系统"}],
            "research_interests": [
                {"en": "Model compression", "zh": "模型压缩"},
                {"en": "Efficient AI systems", "zh": "高效 AI 系统"},
            ],
            "links": {
                "linkedin": "https://linkedin.com/in/example-runyu",
                "github": "https://github.com/yourexpress",
            },
            "public_contacts": [
                {
                    "type": "email",
                    "label": {"en": "Email", "zh": "邮箱"},
                    "value": "rma5@gmu.edu",
                },
                {
                    "type": "linkedin",
                    "label": {"en": "LinkedIn", "zh": "LinkedIn"},
                    "value": "https://linkedin.com/in/example-runyu",
                },
                {
                    "type": "github",
                    "label": {"en": "GitHub", "zh": "GitHub"},
                    "value": "https://github.com/yourexpress",
                },
            ],
        },
        "experience.json": {
            "positions": [
                {
                    "title": {"en": "Research Assistant", "zh": "研究助理"},
                    "organization": {"en": "George Mason University", "zh": "George Mason University"},
                    "start_year": 2023,
                    "end_year": None,
                    "focus": {"en": "Efficient AI systems", "zh": "高效 AI 系统"},
                    "description": {"en": "Worked on deployment-oriented AI research.", "zh": "从事面向部署的 AI 研究。"},
                }
            ]
        },
        "projects.json": {
            "projects": [
                {
                    "name": {"en": "Latency Lab", "zh": "延迟实验室"},
                    "description": {"en": "Tools for GPU inference experiments.", "zh": "用于 GPU 推理实验的工具。"},
                    "url": "https://example.com/latency-lab",
                    "technologies": ["Python", "CUDA"],
                    "status": "active",
                }
            ]
        },
        "publications.json": {
            "publications": [
                {
                    "title": {"en": "Reliable Compression for Mobile AI", "zh": "面向移动 AI 的可靠压缩"},
                    "year": 2025,
                    "venue": {"en": "IEEE MOST", "zh": "IEEE MOST"},
                    "url": "https://example.com/paper",
                }
            ]
        },
        "faq.json": {
            "entries": [
                {
                    "question": {"en": "Who is Runyu Ma?", "zh": "Runyu Ma 是谁？"},
                    "answer": {
                        "en": "An AI systems and machine learning engineer.",
                        "zh": "一名 AI 系统与机器学习工程师。",
                    },
                }
            ]
        },
    }


def _write_sources(target: Path) -> None:
    for filename, payload in _sample_sources().items():
        (target / filename).write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")


@pytest.fixture()
def sample_knowledge_dir(tmp_path: Path):
    _write_sources(tmp_path)
    knowledge_base._cached_context = None
    with patch.object(knowledge_base, "_KNOWLEDGE_DIR", tmp_path):
        yield tmp_path
    knowledge_base._cached_context = None


class TestLoadJson:
    def test_loads_valid_profile(self, sample_knowledge_dir):
        data = knowledge_base._load_json("profile.json")
        assert isinstance(data, dict)
        assert "name" in data

    def test_missing_file_returns_empty_dict(self):
        data = knowledge_base._load_json("nonexistent.json")
        assert data == {}

    def test_invalid_json_returns_empty_dict(self, tmp_path):
        bad_file = tmp_path / "bad.json"
        bad_file.write_text("not valid json", encoding="utf-8")
        with patch.object(knowledge_base, "_KNOWLEDGE_DIR", tmp_path):
            data = knowledge_base._load_json("bad.json")
        assert data == {}


class TestLoadAll:
    def test_returns_all_source_files(self, sample_knowledge_dir):
        result = knowledge_base.load_all()
        for name in knowledge_base._SOURCE_FILES:
            assert name in result

    def test_all_values_are_dicts(self, sample_knowledge_dir):
        result = knowledge_base.load_all()
        for data in result.values():
            assert isinstance(data, dict)


class TestKnowledgeSchemas:
    def test_profile_has_required_fields(self, sample_knowledge_dir):
        data = knowledge_base._load_json("profile.json")
        assert _is_localized_text(data.get("name"))
        assert _is_localized_text(data.get("headline"))
        assert isinstance(data.get("education"), list)
        assert isinstance(data.get("skills"), list)
        assert isinstance(data.get("public_contacts"), list)

    def test_profile_education_entries(self, sample_knowledge_dir):
        data = knowledge_base._load_json("profile.json")
        for edu in data.get("education", []):
            assert _is_localized_text(edu.get("degree"))
            assert _is_localized_text(edu.get("institution"))
            assert "year" in edu

    def test_profile_uses_bilingual_name(self, sample_knowledge_dir):
        data = knowledge_base._load_json("profile.json")
        name = data.get("name")
        assert isinstance(name, dict)
        assert "en" in name
        assert "zh" in name

    def test_faq_entries_have_question_and_answer(self, sample_knowledge_dir):
        data = knowledge_base._load_json("faq.json")
        for entry in data.get("entries", []):
            assert _is_localized_text(entry.get("question"))
            assert _is_localized_text(entry.get("answer"))


class TestRenderHelpers:
    def test_plain_string_formats_as_is(self):
        assert knowledge_base._format_localized_text("hello") == "hello"

    def test_localized_object_renders_both_languages(self):
        rendered = knowledge_base._format_localized_text({"en": "hello", "zh": "ni hao"})
        assert rendered == "hello / ni hao"

    def test_localized_list_renders_multiple_items(self):
        rendered = knowledge_base._format_localized_list(
            ["Python", {"en": "Distributed systems", "zh": "fen bu shi xi tong"}]
        )
        assert "Python" in rendered
        assert "Distributed systems / fen bu shi xi tong" in rendered


class TestRenderProfile:
    def test_includes_name_and_headline(self, sample_knowledge_dir):
        data = knowledge_base._load_json("profile.json")
        rendered = knowledge_base._render_profile(data)
        assert "Runyu Ma" in rendered
        assert "AI Systems and Machine Learning Engineer" in rendered

    def test_includes_public_contacts(self, sample_knowledge_dir):
        data = knowledge_base._load_json("profile.json")
        rendered = knowledge_base._render_profile(data)
        assert "Public Contacts:" in rendered
        assert "rma5@gmu.edu" in rendered
        assert "linkedin.com/in/example-runyu" in rendered
        assert "github.com/yourexpress" in rendered

    def test_empty_data_returns_empty_string(self):
        assert knowledge_base._render_profile({}) == ""


class TestRenderExperience:
    def test_positions_render_as_text(self, sample_knowledge_dir):
        data = knowledge_base._load_json("experience.json")
        rendered = knowledge_base._render_experience(data)
        assert "Research Assistant" in rendered
        assert "George Mason University" in rendered

    def test_empty_data_returns_empty_string(self):
        assert knowledge_base._render_experience({}) == ""


class TestRenderProjects:
    def test_projects_render_as_text(self, sample_knowledge_dir):
        data = knowledge_base._load_json("projects.json")
        rendered = knowledge_base._render_projects(data)
        assert "Latency Lab" in rendered
        assert "CUDA" in rendered

    def test_empty_data_returns_empty_string(self):
        assert knowledge_base._render_projects({}) == ""


class TestRenderPublications:
    def test_publications_render_with_title_and_venue(self, sample_knowledge_dir):
        data = knowledge_base._load_json("publications.json")
        rendered = knowledge_base._render_publications(data)
        assert "Reliable Compression for Mobile AI" in rendered
        assert "IEEE MOST" in rendered

    def test_empty_publications_returns_empty_string(self):
        assert knowledge_base._render_publications({}) == ""


class TestRenderFaq:
    def test_includes_qa_pairs(self, sample_knowledge_dir):
        data = knowledge_base._load_json("faq.json")
        rendered = knowledge_base._render_faq(data)
        assert "Q:" in rendered
        assert "A:" in rendered
        assert "Who is Runyu Ma?" in rendered

    def test_empty_data_returns_empty_string(self):
        assert knowledge_base._render_faq({}) == ""


class TestBuildContext:
    def test_returns_non_empty_string(self, sample_knowledge_dir):
        ctx = knowledge_base.build_context()
        assert isinstance(ctx, str)
        assert len(ctx) > 100

    def test_contains_new_assistant_identity(self, sample_knowledge_dir):
        ctx = knowledge_base.build_context()
        assert "Homepage AI Assistant System Prompt" in ctx
        assert "Runyu Ma" in ctx
        assert "storyteller and job seller" in ctx

    def test_contains_reader_friendly_reference_rules(self, sample_knowledge_dir):
        ctx = knowledge_base.build_context()
        assert "Reference Presentation Rules" in ctx
        assert "References section" in ctx
        assert "reader-friendly" in ctx

    def test_does_not_contain_raw_source_tags(self, sample_knowledge_dir):
        ctx = knowledge_base.build_context()
        assert "[source:" not in ctx
        assert "source:profile.json" not in ctx
        assert "source:projects.json" not in ctx

    def test_contains_bilingual_instruction(self, sample_knowledge_dir):
        ctx = knowledge_base.build_context()
        assert "If the visitor writes in Chinese" in ctx
        assert "Bilingual output is welcome" in ctx

    def test_contains_key_knowledge(self, sample_knowledge_dir):
        ctx = knowledge_base.build_context()
        assert "Runyu Ma" in ctx
        assert "George Mason University" in ctx
        assert "Public Contacts:" in ctx


class TestGetContext:
    def test_returns_cached_context(self, sample_knowledge_dir):
        knowledge_base._cached_context = None
        ctx1 = knowledge_base.get_context()
        ctx2 = knowledge_base.get_context()
        assert ctx1 is ctx2

    def test_reload_rebuilds_context(self, sample_knowledge_dir):
        knowledge_base._cached_context = None
        ctx1 = knowledge_base.get_context()
        ctx2 = knowledge_base.reload()
        assert ctx1 == ctx2


class TestGroundingConstraints:
    def test_context_instructs_grounding(self, sample_knowledge_dir):
        ctx = knowledge_base.build_context()
        assert "Base your answers on the approved knowledge below" in ctx

    def test_context_instructs_honesty(self, sample_knowledge_dir):
        ctx = knowledge_base.build_context()
        assert "Do not invent facts" in ctx
        assert "do not fabricate an answer" in ctx

    def test_context_discourages_raw_provenance_tags(self, sample_knowledge_dir):
        ctx = knowledge_base.build_context()
        assert "Do not expose raw internal file markers" in ctx
        assert "Do not inline technical provenance tags into normal prose" in ctx
        assert "summarize them naturally at the end instead of showing internal source tags" in ctx

    def test_no_private_data_in_knowledge_files(self, sample_knowledge_dir):
        sources = knowledge_base.load_all()
        serialized = json.dumps(sources, ensure_ascii=False).lower()
        private_patterns = [
            "home address",
            "social security",
            "credit card",
            "@yahoo.com",
        ]
        for pattern in private_patterns:
            assert pattern not in serialized, f"Private data pattern found: {pattern}"
