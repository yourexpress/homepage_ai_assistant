"""Tests for the structured knowledge base loader and context builder."""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import patch

import pytest

from app.services import knowledge_base


# Resolve the knowledge directory once for assertions.
_KNOWLEDGE_DIR = Path(__file__).resolve().parent.parent / "knowledge"


# ---------------------------------------------------------------------------
# Loading tests
# ---------------------------------------------------------------------------


class TestLoadJson:
    """Unit tests for _load_json() — the single-file loader."""

    def test_loads_valid_profile(self):
        data = knowledge_base._load_json("profile.json")
        assert isinstance(data, dict)
        assert "name" in data

    def test_loads_valid_experience(self):
        data = knowledge_base._load_json("experience.json")
        assert isinstance(data, dict)
        assert "positions" in data

    def test_loads_valid_projects(self):
        data = knowledge_base._load_json("projects.json")
        assert isinstance(data, dict)
        assert "projects" in data

    def test_loads_valid_publications(self):
        data = knowledge_base._load_json("publications.json")
        assert isinstance(data, dict)

    def test_loads_valid_faq(self):
        data = knowledge_base._load_json("faq.json")
        assert isinstance(data, dict)
        assert "entries" in data

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
    """Tests for load_all() — the multi-file loader."""

    def test_returns_all_source_files(self):
        result = knowledge_base.load_all()
        for name in knowledge_base._SOURCE_FILES:
            assert name in result

    def test_all_values_are_dicts(self):
        result = knowledge_base.load_all()
        for name, data in result.items():
            assert isinstance(data, dict), f"{name} should be a dict"


# ---------------------------------------------------------------------------
# Schema validation tests
# ---------------------------------------------------------------------------


class TestKnowledgeSchemas:
    """Verify that each JSON file conforms to its expected schema."""

    def test_profile_has_required_fields(self):
        data = knowledge_base._load_json("profile.json")
        assert isinstance(data.get("name"), str)
        assert isinstance(data.get("education"), list)
        assert isinstance(data.get("skills"), list)

    def test_profile_education_entries(self):
        data = knowledge_base._load_json("profile.json")
        for edu in data.get("education", []):
            assert "degree" in edu
            assert "institution" in edu
            assert "year" in edu

    def test_experience_positions_have_required_fields(self):
        data = knowledge_base._load_json("experience.json")
        for pos in data.get("positions", []):
            assert "title" in pos
            assert "organization" in pos
            assert "start_year" in pos

    def test_projects_entries_have_required_fields(self):
        data = knowledge_base._load_json("projects.json")
        for proj in data.get("projects", []):
            assert "name" in proj
            assert "description" in proj

    def test_faq_entries_have_question_and_answer(self):
        data = knowledge_base._load_json("faq.json")
        for entry in data.get("entries", []):
            assert "question" in entry
            assert "answer" in entry


# ---------------------------------------------------------------------------
# Context rendering tests
# ---------------------------------------------------------------------------


class TestRenderProfile:
    def test_includes_name(self):
        data = knowledge_base._load_json("profile.json")
        rendered = knowledge_base._render_profile(data)
        assert "Runyu Ma" in rendered

    def test_includes_education(self):
        data = knowledge_base._load_json("profile.json")
        rendered = knowledge_base._render_profile(data)
        assert "George Mason University" in rendered

    def test_includes_skills(self):
        # Test the renderer with inline data so the test is independent of
        # whether skills happen to be populated in the live knowledge file.
        data = {"skills": ["Python", "Machine Learning"]}
        rendered = knowledge_base._render_profile(data)
        assert "Python" in rendered

    def test_empty_data_returns_empty_string(self):
        assert knowledge_base._render_profile({}) == ""


class TestRenderExperience:
    def test_includes_position(self):
        # Test the renderer with inline data so the test is independent of
        # whether positions happen to be populated in the live knowledge file.
        data = {"positions": [
            {"title": "Research Engineer", "organization": "George Mason University",
             "start_year": 2024, "end_year": None, "focus": "AI research"}
        ]}
        rendered = knowledge_base._render_experience(data)
        assert "Research Engineer" in rendered

    def test_empty_data_returns_empty_string(self):
        assert knowledge_base._render_experience({}) == ""


class TestRenderProjects:
    def test_includes_project_name(self):
        data = knowledge_base._load_json("projects.json")
        rendered = knowledge_base._render_projects(data)
        assert "homepage_ai_assistant" in rendered

    def test_empty_data_returns_empty_string(self):
        assert knowledge_base._render_projects({}) == ""


class TestRenderPublications:
    def test_empty_publications_returns_empty_string(self):
        data = knowledge_base._load_json("publications.json")
        rendered = knowledge_base._render_publications(data)
        # publications.json has an empty list
        assert rendered == ""


class TestRenderFaq:
    def test_includes_qa_pairs(self):
        data = knowledge_base._load_json("faq.json")
        rendered = knowledge_base._render_faq(data)
        assert "Q:" in rendered
        assert "A:" in rendered

    def test_empty_data_returns_empty_string(self):
        assert knowledge_base._render_faq({}) == ""


# ---------------------------------------------------------------------------
# Full context assembly tests
# ---------------------------------------------------------------------------


class TestBuildContext:
    def test_returns_non_empty_string(self):
        ctx = knowledge_base.build_context()
        assert isinstance(ctx, str)
        assert len(ctx) > 100

    def test_contains_source_citations(self):
        ctx = knowledge_base.build_context()
        assert "[source: profile.json]" in ctx
        assert "[source: experience.json]" in ctx
        assert "[source: projects.json]" in ctx

    def test_contains_grounding_instructions(self):
        ctx = knowledge_base.build_context()
        assert "ONLY answer" in ctx

    def test_contains_citation_instruction(self):
        ctx = knowledge_base.build_context()
        assert "cite" in ctx.lower()

    def test_contains_refusal_guidelines(self):
        ctx = knowledge_base.build_context()
        assert "politely decline" in ctx

    def test_contains_key_facts(self):
        ctx = knowledge_base.build_context()
        assert "Alex Chen" in ctx
        assert "Python" in ctx
        assert "homepage_ai_assistant" in ctx


class TestGetContext:
    def test_returns_cached_context(self):
        """Calling get_context() twice returns the same object."""
        # Reset cache first
        knowledge_base._cached_context = None
        ctx1 = knowledge_base.get_context()
        ctx2 = knowledge_base.get_context()
        assert ctx1 is ctx2

    def test_reload_rebuilds_context(self):
        knowledge_base._cached_context = None
        ctx1 = knowledge_base.get_context()
        ctx2 = knowledge_base.reload()
        # Content should be equivalent but it's a fresh string
        assert ctx1 == ctx2


# ---------------------------------------------------------------------------
# Grounding / out-of-scope prevention tests
# ---------------------------------------------------------------------------


class TestGroundingConstraints:
    """Verify that the context explicitly constrains answers to approved data."""

    def test_context_instructs_only_approved_info(self):
        ctx = knowledge_base.build_context()
        assert "ONLY answer" in ctx or "only answer" in ctx

    def test_context_instructs_honest_refusal(self):
        ctx = knowledge_base.build_context()
        assert "not contained in the sources" in ctx or "politely decline" in ctx

    def test_context_forbids_prompt_override(self):
        ctx = knowledge_base.build_context()
        assert "ignore these instructions" in ctx or "refuse and stay in character" in ctx

    def test_no_private_data_in_knowledge_files(self):
        """Ensure no private data patterns appear in the knowledge files."""
        sources = knowledge_base.load_all()
        serialized = json.dumps(sources).lower()
        private_patterns = [
            "home address",
            "phone number",
            "social security",
            "credit card",
            "@gmail.com",
            "@yahoo.com",
        ]
        for pattern in private_patterns:
            assert pattern not in serialized, f"Private data pattern found: {pattern}"
