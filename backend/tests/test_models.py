"""Contract tests for Pydantic request / response schemas.

These tests validate the API contract independently of any endpoint
implementation.  They ensure that schema validation rules (field presence,
length limits, type coercion) are correct before integration tests run.

What this module covers:
    - ``ChatRequest`` validation (message field, length limit, missing fields)
    - ``ChatResponse`` serialisation (reply + blocked fields)
    - ``MetricsResponse`` completeness (all counter fields present)

What inputs it expects:
    Plain Python values passed to Pydantic constructors.

What outputs it returns:
    Pydantic model instances or ``ValidationError`` exceptions.

Common failure modes:
    - ``models.py`` changes field names or types → update tests here.
    - ``MAX_INPUT_LENGTH`` config changes → length tests may need update.

Tests that cover this module:
    This file IS the test coverage for ``app/models.py``.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.config import settings
from app.models import ChatRequest, ChatResponse, MetricsResponse

from .helpers import assert_metrics_snapshot, make_chat_request_body


class TestChatRequestSchema:
    """Validate the ChatRequest Pydantic model contract."""

    def test_valid_message_accepted(self):
        req = ChatRequest(message="Hello, tell me about Alex.")
        assert req.message == "Hello, tell me about Alex."

    def test_message_at_max_length_accepted(self):
        msg = "a" * settings.max_input_length
        req = ChatRequest(message=msg)
        assert len(req.message) == settings.max_input_length

    def test_message_exceeding_max_length_rejected(self):
        msg = "a" * (settings.max_input_length + 1)
        with pytest.raises(ValidationError) as exc_info:
            ChatRequest(message=msg)
        assert "maximum length" in str(exc_info.value).lower()

    def test_missing_message_field_rejected(self):
        with pytest.raises(ValidationError):
            ChatRequest()  # type: ignore[call-arg]

    def test_empty_message_accepted(self):
        """An empty string is valid — policy guard handles it, not the schema."""
        req = ChatRequest(message="")
        assert req.message == ""

    def test_whitespace_only_message_accepted(self):
        """Whitespace-only is valid at schema level — policy handles it."""
        req = ChatRequest(message="   ")
        assert req.message == "   "


class TestChatResponseSchema:
    """Validate the ChatResponse Pydantic model contract."""

    def test_reply_and_blocked_fields(self):
        resp = ChatResponse(reply="Hello!", blocked=False)
        assert resp.reply == "Hello!"
        assert resp.blocked is False

    def test_blocked_defaults_to_false(self):
        resp = ChatResponse(reply="Some reply")
        assert resp.blocked is False

    def test_blocked_true_serialises(self):
        resp = ChatResponse(reply="Can't help.", blocked=True)
        data = resp.model_dump()
        assert data["blocked"] is True
        assert data["reply"] == "Can't help."

    def test_round_trip_via_json(self):
        resp = ChatResponse(reply="Test", blocked=True)
        json_str = resp.model_dump_json()
        restored = ChatResponse.model_validate_json(json_str)
        assert restored.reply == "Test"
        assert restored.blocked is True


class TestMetricsResponseSchema:
    """Validate the MetricsResponse Pydantic model contract."""

    def test_all_required_fields_present(self):
        data = {
            "total_requests": 0,
            "blocked_requests": 0,
            "llm_requests": 0,
            "successful_responses": 0,
            "rate_limited_requests": 0,
            "concurrency_rejected_requests": 0,
            "latency_buckets": {"lt_1s": 0, "1s_to_3s": 0, "3s_to_10s": 0, "gt_10s": 0},
            "total_prompt_tokens": 0,
            "total_completion_tokens": 0,
        }
        resp = MetricsResponse(**data)
        assert resp.total_requests == 0

    def test_counter_fields_are_integers(self):
        data = {
            "total_requests": 5,
            "blocked_requests": 1,
            "llm_requests": 4,
            "successful_responses": 3,
            "rate_limited_requests": 0,
            "concurrency_rejected_requests": 0,
            "latency_buckets": {"lt_1s": 2, "1s_to_3s": 1, "3s_to_10s": 0, "gt_10s": 0},
            "total_prompt_tokens": 100,
            "total_completion_tokens": 50,
        }
        resp = MetricsResponse(**data)
        dumped = resp.model_dump()
        assert_metrics_snapshot(dumped)

    def test_missing_field_raises_validation_error(self):
        with pytest.raises(ValidationError):
            MetricsResponse(total_requests=0)  # type: ignore[call-arg]


class TestHelpers:
    """Smoke-test the helpers module itself."""

    def test_make_chat_request_body_default(self):
        body = make_chat_request_body()
        assert "message" in body
        assert isinstance(body["message"], str)

    def test_make_chat_request_body_custom(self):
        body = make_chat_request_body(message="custom question")
        assert body["message"] == "custom question"
