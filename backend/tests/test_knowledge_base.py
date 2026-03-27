"""Tests for the structured knowledge loader and system prompt builder."""

from __future__ import annotations

import json
from unittest.mock import patch

from app.services import knowledge_base


def _is_localized_text(value) -> bool:
    return isinstance(value, str) or (
        isinstance(value, dict) and any(lang in value for lang in ("en", "zh"))
    )


class TestLoadJson:
    def test_loads_valid_profile(self):
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
    def test_returns_all_source_files(self):
        result = knowledge_base.load_all()
        for name in knowledge_base._SOURCE_FILES:
            assert name in result

    def test_all_values_are_dicts(self):
        result = knowledge_base.load_all()
        for data in result.values():
            assert isinstance(data, dict)


class TestKnowledgeSchemas:
    def test_profile_has_required_fields(self):
        data = knowledge_base._load_json("profile.json")
        assert _is_localized_text(data.get("name"))
        assert _is_localized_text(data.get("headline"))
        assert isinstance(data.get("education"), list)
        assert isinstance(data.get("skills"), list)
        assert isinstance(data.get("public_contacts"), list)

    def test_profile_education_entries(self):
        data = knowledge_base._load_json("profile.json")
        for edu in data.get("education", []):
            assert _is_localized_text(edu.get("degree"))
            assert _is_localized_text(edu.get("institution"))
            assert "year" in edu

    def test_profile_uses_bilingual_name(self):
        data = knowledge_base._load_json("profile.json")
        name = data.get("name")
        assert isinstance(name, dict)
        assert "en" in name
        assert "zh" in name

    def test_faq_entries_have_question_and_answer(self):
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
    def test_includes_name_and_headline(self):
        data = knowledge_base._load_json("profile.json")
        rendered = knowledge_base._render_profile(data)
        assert "Runyu Ma" in rendered
        assert "AI Systems and Machine Learning Engineer" in rendered

    def test_includes_public_contacts(self):
        data = knowledge_base._load_json("profile.json")
        rendered = knowledge_base._render_profile(data)
        assert "Public Contacts:" in rendered
        assert "rma5@gmu.edu" in rendered
        assert "github.com/yourexpress" in rendered

    def test_empty_data_returns_empty_string(self):
        assert knowledge_base._render_profile({}) == ""


class TestRenderExperience:
    def test_empty_positions_render_as_empty_string(self):
        data = knowledge_base._load_json("experience.json")
        rendered = knowledge_base._render_experience(data)
        assert rendered == ""

    def test_empty_data_returns_empty_string(self):
        assert knowledge_base._render_experience({}) == ""


class TestRenderProjects:
    def test_empty_projects_render_as_empty_string(self):
        data = knowledge_base._load_json("projects.json")
        rendered = knowledge_base._render_projects(data)
        assert rendered == ""

    def test_empty_data_returns_empty_string(self):
        assert knowledge_base._render_projects({}) == ""


class TestRenderPublications:
    def test_empty_publications_returns_empty_string(self):
        data = knowledge_base._load_json("publications.json")
        rendered = knowledge_base._render_publications(data)
        assert rendered == ""


class TestRenderFaq:
    def test_includes_qa_pairs(self):
        data = knowledge_base._load_json("faq.json")
        rendered = knowledge_base._render_faq(data)
        assert "Q:" in rendered
        assert "A:" in rendered
        assert "Who is Runyu Ma?" in rendered

    def test_empty_data_returns_empty_string(self):
        assert knowledge_base._render_faq({}) == ""


class TestBuildContext:
    def test_returns_non_empty_string(self):
        ctx = knowledge_base.build_context()
        assert isinstance(ctx, str)
        assert len(ctx) > 100

    def test_contains_new_assistant_identity(self):
        ctx = knowledge_base.build_context()
        assert "Homepage AI Assistant System Prompt" in ctx
        assert "Runyu Ma" in ctx
        assert "storyteller and job seller" in ctx

    def test_contains_reader_friendly_reference_rules(self):
        ctx = knowledge_base.build_context()
        assert "Reference Presentation Rules" in ctx
        assert "References section" in ctx
        assert "reader-friendly" in ctx

    def test_does_not_contain_raw_source_tags(self):
        ctx = knowledge_base.build_context()
        assert "[source:" not in ctx
        assert "source:profile.json" not in ctx
        assert "source:projects.json" not in ctx

    def test_contains_bilingual_instruction(self):
        ctx = knowledge_base.build_context()
        assert "If the visitor writes in Chinese" in ctx
        assert "Bilingual output is welcome" in ctx

    def test_contains_key_knowledge(self):
        ctx = knowledge_base.build_context()
        assert "Runyu Ma" in ctx
        assert "George Mason University" in ctx
        assert "Public Contacts:" in ctx


class TestGetContext:
    def test_returns_cached_context(self):
        knowledge_base._cached_context = None
        ctx1 = knowledge_base.get_context()
        ctx2 = knowledge_base.get_context()
        assert ctx1 is ctx2

    def test_reload_rebuilds_context(self):
        knowledge_base._cached_context = None
        ctx1 = knowledge_base.get_context()
        ctx2 = knowledge_base.reload()
        assert ctx1 == ctx2


class TestGroundingConstraints:
    def test_context_instructs_grounding(self):
        ctx = knowledge_base.build_context()
        assert "Base your answers on the approved knowledge below" in ctx

    def test_context_instructs_honesty(self):
        ctx = knowledge_base.build_context()
        assert "Do not invent facts" in ctx
        assert "do not fabricate an answer" in ctx

    def test_context_discourages_raw_provenance_tags(self):
        ctx = knowledge_base.build_context()
        assert "Do not expose raw internal file markers" in ctx
        assert "Do not inline technical provenance tags into normal prose" in ctx
        assert "summarize them naturally at the end instead of showing internal source tags" in ctx

    def test_no_private_data_in_knowledge_files(self):
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
