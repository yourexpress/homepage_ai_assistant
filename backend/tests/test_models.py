"""Contract tests for request and response models."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.config import settings
from app.models import ChatRequest, ChatResponse, MetricsResponse

from .helpers import assert_metrics_snapshot, make_chat_request_body


class TestChatRequestSchema:
    def test_valid_message_accepted(self):
        req = ChatRequest(message="Hello, tell me about Alex.")
        assert req.message == "Hello, tell me about Alex."

    def test_message_at_max_length_accepted(self):
        msg = "a" * settings.max_input_length
        req = ChatRequest(message=msg)
        assert len(req.message) == settings.max_input_length

    def test_message_exceeding_max_length_rejected(self):
        msg = "a" * (settings.max_input_length + 1)
        with pytest.raises(ValidationError):
            ChatRequest(message=msg)

    def test_missing_message_field_rejected(self):
        with pytest.raises(ValidationError):
            ChatRequest()  # type: ignore[call-arg]

    def test_history_messages_accepted(self):
        req = ChatRequest(
            message="Follow up question",
            history=[
                {"role": "user", "content": "Tell me about the projects."},
                {"role": "assistant", "content": "Here are the public projects."},
            ],
            session_id="session-1",
        )
        assert len(req.history) == 2
        assert req.session_id == "session-1"

    def test_history_over_limit_rejected(self):
        with pytest.raises(ValidationError):
            ChatRequest(
                message="Hello",
                history=[
                    {"role": "user", "content": "x"}
                    for _ in range(settings.max_history_messages + 1)
                ],
            )


class TestChatResponseSchema:
    def test_reply_and_blocked_fields(self):
        resp = ChatResponse(reply="Hello!", blocked=False)
        assert resp.reply == "Hello!"
        assert resp.blocked is False

    def test_blocked_defaults_to_false(self):
        resp = ChatResponse(reply="Some reply")
        assert resp.blocked is False
        assert resp.happy_mode_active is False

    def test_round_trip_via_json(self):
        resp = ChatResponse(reply="Test", blocked=True, happy_mode_active=True)
        restored = ChatResponse.model_validate_json(resp.model_dump_json())
        assert restored.reply == "Test"
        assert restored.blocked is True
        assert restored.happy_mode_active is True


class TestMetricsResponseSchema:
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
        assert_metrics_snapshot(resp.model_dump())

    def test_missing_field_raises_validation_error(self):
        with pytest.raises(ValidationError):
            MetricsResponse(total_requests=0)  # type: ignore[call-arg]


class TestHelpers:
    def test_make_chat_request_body_default(self):
        body = make_chat_request_body()
        assert "message" in body
        assert isinstance(body["message"], str)

    def test_make_chat_request_body_custom(self):
        body = make_chat_request_body(message="custom question")
        assert body["message"] == "custom question"
